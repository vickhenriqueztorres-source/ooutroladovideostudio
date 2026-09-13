import base64
import os
import random
import re
import sys
import time
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from playwright.sync_api import Page, Download, TimeoutError as PlaywrightTimeoutError

from src.selectors import (
    SELECTORS,
    CONFIRMATION_PATTERNS,
    RATE_LIMIT_PATTERNS
)
from src.auth import is_session_active, is_cloudflare_present, ensure_authenticated
from src.storage import save_image, append_manifest, ensure_dirs


# ANSI Colors para logs no terminal
class Colors:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


def slugify(text: str, max_length: int = 40) -> str:
    """Gera um slug limpo para o nome do arquivo da imagem."""
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "_", text).strip("_")
    return text[:max_length] if text else "imagem_gerada"


def parse_wait_time_seconds(text: str) -> Optional[int]:
    """Tenta extrair tempo de espera de mensagens de rate limit (minutos/segundos/horas)."""
    text_lower = text.lower()
    
    # Ex: "tente novamente em 2 minutos" ou "try again in 5 minutes"
    min_match = re.search(r"(\d+)\s*(?:minutos|minuto|minutes|minute|mins|min|m\b)", text_lower)
    if min_match:
        return int(min_match.group(1)) * 60

    # Ex: "tente novamente em 45 segundos" ou "try again in 30 seconds"
    sec_match = re.search(r"(\d+)\s*(?:segundos|segundo|seconds|second|secs|sec|s\b)", text_lower)
    if sec_match:
        return int(sec_match.group(1))

    # Ex: "tente novamente em 1 hora"
    hr_match = re.search(r"(\d+)\s*(?:horas|hora|hours|hour|h\b)", text_lower)
    if hr_match:
        return int(hr_match.group(1)) * 3600

    return None


class Generator:
    """
    Máquina de Estados para Geração Autônoma de Imagens no ChatGPT Web.
    """

    def __init__(self, page: Page, config: Dict[str, Any]):
        self.page = page
        self.config = config
        
        self.output_dir = Path(config.get("output_dir", "output"))
        self.manifest_file = Path(config.get("manifest_file", "output/manifest.jsonl"))
        self.typing_min_ms = config.get("typing_delay_min_ms", 30)
        self.typing_max_ms = config.get("typing_delay_max_ms", 90)
        self.max_retries = config.get("max_retries", 3)
        self.rate_limit_margin_s = config.get("rate_limit_margin_s", 30)
        self.stabilize_polls = config.get("stabilize_polls", 3)
        self.stabilize_interval_s = config.get("stabilize_interval_s", 2)
        self.timeout_geracao_s = config.get("timeout_geracao_s", 180)
        self.delay_min_ms = config.get("delay_min_ms", 1000)
        self.delay_max_ms = config.get("delay_max_ms", 3000)
        self.rotate_on_rate_limit = config.get("rotate_on_rate_limit", True)
        self.account_rate_limited = False
        self.rate_limit_message = ""
        
        ensure_dirs(str(self.output_dir))

    def log(self, state: str, message: str, color: str = Colors.CYAN) -> None:
        """Imprime log formatado e colorido da transição de estado."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"{Colors.BOLD}[{timestamp}]{Colors.RESET} {color}{state}:{Colors.RESET} {message}")

    # =========================================================================
    # ESTADO 1: DIGITAR (HUMAN TYPING)
    # =========================================================================
    def state_type_prompt(self, prompt: str) -> bool:
        """
        Digita o prompt no composer ProseMirror caractere a caractere com delays aleatórios
        e clica no botão de enviar ou pressiona Enter.
        """
        self.log("⌨️  [1/7] DIGITAR", f"Preenchendo prompt de forma humana ({len(prompt)} caracteres)...", Colors.BLUE)
        
        try:
            composer = self.page.locator(SELECTORS["prompt_textarea"]).first
            composer.wait_for(state="visible", timeout=15000)
            composer.click()
            self.page.wait_for_timeout(300)

            # Digitação natural via teclado no elemento ativo
            try:
                for char in prompt:
                    self.page.keyboard.type(char, delay=random.randint(self.typing_min_ms, self.typing_max_ms))
            except Exception:
                self.page.keyboard.insert_text(prompt)

            self.page.wait_for_timeout(random.randint(500, 1000))

            # Envio: tenta botão de enviar ou Enter
            send_btn = self.page.locator(SELECTORS["send_button"]).first
            if send_btn.is_visible(timeout=1500) and send_btn.is_enabled():
                try:
                    send_btn.click()
                except Exception:
                    self.page.keyboard.press("Enter")
            else:
                self.page.keyboard.press("Enter")

            self.log("🚀 [1/7] DIGITAR", "Prompt enviado com sucesso!", Colors.GREEN)
            return True
        except Exception as e:
            self.log("❌ [1/7] DIGITAR", f"Erro ao digitar prompt: {e}", Colors.RED)
            return False

    # =========================================================================
    # ESTADO 2: AGUARDAR ESTABILIZAÇÃO
    # =========================================================================
    def state_wait_for_response(self) -> Tuple[str, str]:
        """
        Aguarda a geração da resposta estabilizar:
        - Indicador de streaming/stop desaparece.
        - DOM da resposta para de alterar por N polls consecutivos.
        Retorna (status, assistant_text).
        Status possíveis: 'READY', 'CONFIRMATION_NEEDED', 'RATE_LIMITED', 'TIMEOUT', 'CLOUDFLARE'
        """
        self.log("⏳ [2/7] AGUARDAR", "Aguardando início e estabilização da resposta...", Colors.CYAN)
        start_time = time.time()
        
        # Pausa inicial para o ChatGPT registrar e iniciar o processamento
        time.sleep(3)
        
        last_dom_content = ""
        stable_count = 0

        while time.time() - start_time < self.timeout_geracao_s:
            # 1. Checa Cloudflare
            if is_cloudflare_present(self.page):
                self.log("⚠️ [2/7] CLOUDFLARE", "Desafio de segurança detectado! Resolva manualmente na janela do navegador.", Colors.YELLOW)
                time.sleep(5)
                continue

            # 2. Obtém a última mensagem do assistente
            assistant_nodes = self.page.locator(SELECTORS["assistant_message"])
            node_count = assistant_nodes.count()
            
            if node_count > 0:
                last_node = assistant_nodes.last
                try:
                    current_text = last_node.inner_text().strip()
                except Exception:
                    current_text = ""

                # 3. Verifica Rate Limit
                for pattern in RATE_LIMIT_PATTERNS:
                    if pattern in current_text.lower():
                        self.log("🛑 [2/7] RATE LIMIT", f"Mensagem de limite detectada: '{current_text}'", Colors.YELLOW)
                        return "RATE_LIMITED", current_text

                # 4. Verifica se uma imagem já apareceu no DOM
                has_image = self.page.locator(SELECTORS["generated_image"]).count() > 0 or self.page.locator(SELECTORS["image_download_button"]).count() > 0
                
                # 5. Verifica se está em streaming
                is_streaming = (
                    self.page.locator(SELECTORS["stop_generating_button"]).count() > 0 or
                    self.page.locator(SELECTORS["streaming_indicator"]).count() > 0
                )

                # Se não está gerando ativamente, verifica estabilidade do conteúdo
                if not is_streaming:
                    if current_text == last_dom_content or (has_image and stable_count >= 1):
                        stable_count += 1
                        if stable_count >= self.stabilize_polls:
                            # 6. Verifica se é pergunta de confirmação
                            for conf_pattern in CONFIRMATION_PATTERNS:
                                if conf_pattern in current_text.lower() and not has_image:
                                    self.log("💬 [2/7] CONFIRMAÇÃO", f"ChatGPT solicitou confirmação: '{current_text}'", Colors.YELLOW)
                                    return "CONFIRMATION_NEEDED", current_text

                            self.log("✨ [2/7] AGUARDAR", "Resposta estabilizada!", Colors.GREEN)
                            return "READY", current_text
                    else:
                        stable_count = 0
                        last_dom_content = current_text

            time.sleep(self.stabilize_interval_s)

        self.log("⚠️ [2/7] AGUARDAR", "Tempo limite de geração atingido.", Colors.RED)
        return "TIMEOUT", ""

    # =========================================================================
    # ESTADO 3: BAIXAR IMAGEM (PRIORIDADE MÁXIMA)
    # =========================================================================
    def state_download_image(self, prompt: str) -> Optional[Path]:
        """
        Localiza a imagem gerada e realiza o download imediatamente.
        Prioridade 1: Botão de download nativo do ChatGPT (via expect_download).
        Prioridade 2: Extração de src (blob / data url / http) e gravação direta dos bytes.
        """
        self.log("📥 [3/7] BAIXAR", "Procurando imagem gerada para download imediato...", Colors.BLUE)
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        slug = slugify(prompt)
        target_filename = f"{slug}_{timestamp_str}.png"
        target_path = self.output_dir / target_filename

        # Aguarda 2 segundos para renderização dos botões e imagem
        self.page.wait_for_timeout(2000)

        # 1. Método Prioritário: Extração direta via Canvas/Memória GPU (100% confiável)
        try:
            self.log("🔍 [3/7] BAIXAR", "Tentando extração direta via Canvas/GPU no DOM...", Colors.CYAN)
            img_data = self.page.evaluate("""
                () => {
                    const turns = Array.from(document.querySelectorAll("article[data-testid*='conversation-turn'], div.agent-turn, [data-message-author-role='assistant']"));
                    const searchScope = turns.length > 0 ? turns[turns.length - 1] : (document.querySelector('main') || document.body);
                    const imgs = Array.from(searchScope.querySelectorAll('img'));
                    const candidate = imgs.find(img => {
                        const rect = img.getBoundingClientRect();
                        const src = img.src || '';
                        const alt = (img.alt || '').toLowerCase();
                        const isNotAvatar = !alt.includes('user') && !alt.includes('chatgpt') && !src.includes('avatar') && !src.includes('profile');
                        const isNotSvg = !src.startsWith('data:image/svg') && !src.endsWith('.svg');
                        const hasRealImageSize = (img.naturalWidth >= 400 && img.naturalHeight >= 400) || (rect.width >= 300 && rect.height >= 300);
                        return isNotAvatar && isNotSvg && hasRealImageSize;
                    });
                    if (!candidate) return null;
                    
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = candidate.naturalWidth || candidate.width || 1024;
                        canvas.height = candidate.naturalHeight || candidate.height || 1024;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(candidate, 0, 0);
                        return {
                            type: 'base64',
                            data: canvas.toDataURL('image/png').split(',')[1],
                            src: candidate.src
                        };
                    } catch (e) {
                        return {
                            type: 'src',
                            src: candidate.src
                        };
                    }
                }
            """)

            if img_data and img_data.get("data"):
                img_bytes = base64.b64decode(img_data["data"])
                if len(img_bytes) >= 40000:
                    save_image(img_bytes, target_filename, str(self.output_dir))
                    if target_path.exists() and target_path.stat().st_size >= 40000:
                        self.log("✅ [3/7] BAIXAR", f"Imagem extraída e salva com perfeição via Canvas: {target_path} ({target_path.stat().st_size} bytes)", Colors.GREEN)
                        return target_path
                    elif target_path.exists():
                        target_path.unlink(missing_ok=True)

            if img_data and img_data.get("src") and img_data["src"].startswith("http"):
                try:
                    response = self.page.request.get(img_data["src"])
                    if response.status == 200 and len(response.body()) >= 40000:
                        save_image(response.body(), target_filename, str(self.output_dir))
                        if target_path.exists() and target_path.stat().st_size >= 40000:
                            self.log("✅ [3/7] BAIXAR", f"Imagem HTTP salva com sucesso: {target_path} ({target_path.stat().st_size} bytes)", Colors.GREEN)
                            return target_path
                        elif target_path.exists():
                            target_path.unlink(missing_ok=True)
                except Exception:
                    pass

        except Exception as e:
            self.log("⚠️ [3/7] BAIXAR", f"Aviso na extração direta: {e}", Colors.YELLOW)

        # 2. Método Alternativo: Botão de download com expect_download
        download_btns = self.page.locator(SELECTORS["image_download_button"])
        if download_btns.count() > 0:
            btn = download_btns.last
            try:
                self.log("🎯 [3/7] BAIXAR", "Tentando botão nativo de download...", Colors.CYAN)
                with self.page.expect_download(timeout=8000) as download_info:
                    btn.click(timeout=3000)
                download = download_info.value
                download.save_as(str(target_path))
                
                if target_path.exists() and target_path.stat().st_size >= 40000:
                    self.log("✅ [3/7] BAIXAR", f"Imagem salva via botão de download: {target_path} ({target_path.stat().st_size} bytes)", Colors.GREEN)
                    return target_path
                elif target_path.exists():
                    target_path.unlink(missing_ok=True)
            except Exception:
                pass

        # 3. Método de Contingência: Screenshot do elemento de imagem
        try:
            candidates = self.page.locator("article[data-testid*='conversation-turn'] img, div.agent-turn img, main img")
            for i in range(candidates.count() - 1, -1, -1):
                el = candidates.nth(i)
                box = el.bounding_box()
                if box and box["width"] >= 300 and box["height"] >= 300:
                    el.screenshot(path=str(target_path))
                    if target_path.exists() and target_path.stat().st_size >= 40000:
                        self.log("✅ [3/7] BAIXAR", f"Screenshot do elemento de imagem salvo: {target_path} ({target_path.stat().st_size} bytes)", Colors.GREEN)
                        return target_path
                    elif target_path.exists():
                        target_path.unlink(missing_ok=True)
        except Exception as e:
            self.log("❌ [3/7] BAIXAR", f"Erro no screenshot de contingência: {e}", Colors.RED)

        self.log("❌ [3/7] BAIXAR", "Nenhuma imagem válida pôde ser salva nesta tentativa.", Colors.RED)
        return None
        return None

    # =========================================================================
    # ESTADO 4: CONFIRMAÇÃO
    # =========================================================================
    def state_handle_confirmation(self) -> bool:
        """
        Responde positivamente à pergunta de confirmação do ChatGPT ("Sim, gere a imagem agora.").
        """
        self.log("💬 [4/7] CONFIRMAÇÃO", "Respondendo afirmativamente ao pedido de confirmação...", Colors.YELLOW)
        return self.state_type_prompt("Sim, gere a imagem agora.")

    # =========================================================================
    # ESTADO 5: RATE LIMIT HANDLING
    # =========================================================================
    def state_handle_rate_limit(self, message: str) -> None:
        """
        Calcula o tempo de espera do rate limit, aguarda e registra o evento.
        """
        wait_s = parse_wait_time_seconds(message)
        if not wait_s:
            wait_s = 60  # Padrão de 1 minuto caso não encontre no texto
            
        total_sleep = wait_s + self.rate_limit_margin_s
        self.log("🛑 [5/7] RATE LIMIT", f"Aguardando {total_sleep}s ({total_sleep // 60}m) antes de retentar o mesmo prompt...", Colors.YELLOW)
        time.sleep(total_sleep)

    # =========================================================================
    # ESTADO 6: NOVO CHAT (LIMPEZA DE CONTEXTO)
    # =========================================================================
    def state_open_new_chat(self) -> None:
        """
        Abre um novo chat limpo para o próximo prompt (otimização crítica).
        """
        self.log("🧹 [6/7] NOVO CHAT", "Limpando contexto para o próximo prompt...", Colors.CYAN)
        url = self.config.get("url", "https://chatgpt.com/")
        try:
            new_btn = self.page.locator(SELECTORS["new_chat_button"]).first
            if new_btn.is_visible(timeout=1000):
                new_btn.click()
                self.page.wait_for_timeout(2000)
            else:
                self.page.goto(url, wait_until="domcontentloaded")
                self.page.wait_for_timeout(2000)
        except Exception:
            self.page.goto(url, wait_until="domcontentloaded")
            self.page.wait_for_timeout(2000)

    # =========================================================================
    # PIPELINE PRINCIPAL DO PROMPT
    # =========================================================================
    def process_prompt(self, prompt: str) -> bool:
        """
        Executa a máquina de estados completa para um único prompt.
        """
        self.log("🎯 INÍCIO", f"Processando prompt: \"{prompt}\"", Colors.HEADER)
        
        attempts = 0
        max_confirmations = 2
        confirmations_done = 0

        while attempts < self.max_retries:
            attempts += 1
            self.log("🔄 TENTATIVA", f"Tentativa {attempts}/{self.max_retries} para o prompt...", Colors.BLUE)

            # 1. DIGITAR
            if not self.state_type_prompt(prompt):
                self.log("⚠️ DIGITAR", "Falha na digitação. Retentando...", Colors.YELLOW)
                time.sleep(3)
                continue

            # 2. AGUARDAR
            status, text = self.state_wait_for_response()

            # 3. CONFIRMAÇÃO
            if status == "CONFIRMATION_NEEDED" and confirmations_done < max_confirmations:
                confirmations_done += 1
                self.state_handle_confirmation()
                status, text = self.state_wait_for_response()

            # 4. RATE LIMIT
            if status == "RATE_LIMITED":
                self.account_rate_limited = True
                self.rate_limit_message = text
                if self.rotate_on_rate_limit:
                    self.log("🛑 [4/7] RATE LIMIT", f"Limite de cota atingido nesta conta: '{text}'. Acionando rotação imediata para a próxima conta...", Colors.YELLOW)
                    return False
                self.state_handle_rate_limit(text)
                continue  # Retenta o mesmo prompt

            if status == "TIMEOUT":
                self.log("⚠️ [2/7] AGUARDAR", "Tempo limite esgotado sem resposta ou imagem. Tentando novamente...", Colors.YELLOW)
                time.sleep(3)
                continue

            # 5. BAIXAR
            saved_file = self.state_download_image(prompt)
            if saved_file and saved_file.exists():
                # SUCESSO!
                size_bytes = saved_file.stat().st_size
                manifest_entry = {
                    "prompt": prompt,
                    "filename": saved_file.name,
                    "filepath": str(saved_file.resolve()),
                    "timestamp": datetime.now().isoformat(),
                    "status": "success",
                    "attempts": attempts,
                    "size_bytes": size_bytes
                }
                append_manifest(manifest_entry, str(self.manifest_file))
                self.log("🎉 [7/7] SUCESSO", f"Imagem concluída e registrada no manifesto: {saved_file.name}", Colors.GREEN)
                
                # Novo chat e delay entre prompts
                self.state_open_new_chat()
                delay = random.randint(self.delay_min_ms, self.delay_max_ms) / 1000.0
                time.sleep(delay)
                return True

            self.log("⚠️ TENTATIVA", f"Tentativa {attempts} não gerou imagem baixável.", Colors.YELLOW)
            time.sleep(3)

        if self.account_rate_limited:
            self.log("🔄 [7/7] ROTAÇÃO", "Prompt preservado na fila para processamento pela próxima conta do pool.", Colors.YELLOW)
            return False

        # Se falhou após max_retries, faz 1 tentativa final com reload
        self.log("🔄 RECUPERAÇÃO", "Executando recarga da página para tentativa final de contingência...", Colors.YELLOW)
        try:
            self.page.reload(wait_until="domcontentloaded")
            time.sleep(5)
            if ensure_authenticated(self.page, url=self.config.get("url", "https://chatgpt.com/"), timeout_s=60):
                self.state_type_prompt(prompt)
                status, text = self.state_wait_for_response()
                if status == "RATE_LIMITED":
                    self.account_rate_limited = True
                    self.rate_limit_message = text
                    self.log("🔄 [7/7] ROTAÇÃO", "Rate limit detectado na contingência. Preservando prompt para próxima conta.", Colors.YELLOW)
                    return False
                saved_file = self.state_download_image(prompt)
                if saved_file and saved_file.exists():
                    manifest_entry = {
                        "prompt": prompt,
                        "filename": saved_file.name,
                        "filepath": str(saved_file.resolve()),
                        "timestamp": datetime.now().isoformat(),
                        "status": "success",
                        "attempts": attempts + 1,
                        "size_bytes": saved_file.stat().st_size
                    }
                    append_manifest(manifest_entry, str(self.manifest_file))
                    self.log("🎉 [7/7] SUCESSO", f"Imagem recuperada na tentativa final: {saved_file.name}", Colors.GREEN)
                    self.state_open_new_chat()
                    return True
        except Exception as e:
            self.log("❌ RECUPERAÇÃO", f"Erro na tentativa final: {e}", Colors.RED)

        # Registra falha no manifesto
        manifest_entry = {
            "prompt": prompt,
            "filename": None,
            "filepath": None,
            "timestamp": datetime.now().isoformat(),
            "status": "failed",
            "attempts": attempts + 1,
            "size_bytes": 0
        }
        append_manifest(manifest_entry, str(self.manifest_file))
        self.log("❌ [7/7] FALHA", f"Prompt falhou após todas as tentativas.", Colors.RED)
        self.state_open_new_chat()
        return False
