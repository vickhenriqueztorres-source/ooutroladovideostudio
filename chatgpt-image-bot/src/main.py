import argparse
import json
import sys
import time
from pathlib import Path
from typing import List, Set, Dict, Any, Optional

# Garante suporte completo a UTF-8 no terminal Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from src.browser import launch_persistent_browser, load_config
from src.auth import ensure_authenticated, is_session_active
from src.storage import ensure_dirs
from src.generator import Generator, Colors


def load_queue(queue_path: str = "prompts/queue.txt") -> List[str]:
    """Lê a fila de prompts ignorando linhas vazias e comentários (#)."""
    path = Path(queue_path)
    if not path.is_absolute():
        base_dir = Path(__file__).resolve().parent.parent
        path = base_dir / queue_path

    if not path.exists():
        return []

    prompts = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line_clean = line.strip()
            if line_clean and not line_clean.startswith("#"):
                prompts.append(line_clean)
    return prompts


def load_completed_prompts(manifest_path: str = "output/manifest.jsonl") -> Set[str]:
    """Lê o arquivo de manifesto e retorna o conjunto de prompts com status='success'."""
    path = Path(manifest_path)
    if not path.is_absolute():
        base_dir = Path(__file__).resolve().parent.parent
        path = base_dir / manifest_path

    if not path.exists():
        return set()

    completed = set()
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                data = json.loads(line.strip())
                if data.get("status") == "success" and data.get("prompt"):
                    completed.add(data.get("prompt").strip())
            except Exception:
                pass
    return completed


def get_configured_accounts(config: dict) -> List[Dict[str, Any]]:
    """Retorna o pool de contas configurado ou cria o padrão de 3 contas."""
    accounts = config.get("accounts")
    if accounts and isinstance(accounts, list) and len(accounts) > 0:
        return accounts
    return [
        {"id": 1, "name": "Conta 1", "profile_dir": "C:/Users/brend/chatgpt_bot_session_1"},
        {"id": 2, "name": "Conta 2", "profile_dir": "C:/Users/brend/chatgpt_bot_session_2"},
        {"id": 3, "name": "Conta 3", "profile_dir": "C:/Users/brend/chatgpt_bot_session_3"}
    ]


def setup_login(config_path: str = "config.yaml", account_id: Optional[int] = None) -> bool:
    """
    Comando --setup-login:
    Abre o navegador persistente para a conta selecionada (1, 2 ou 3),
    executa o fluxo de login manual assistido e salva a sessão no perfil correspondente.
    """
    config = load_config(config_path)
    url = config.get("url", "https://chatgpt.com/")
    auth_timeout = config.get("auth_timeout_s", 300)
    
    accounts = get_configured_accounts(config)
    target_account = None
    if account_id:
        for acc in accounts:
            if acc.get("id") == account_id:
                target_account = acc
                break
        if not target_account:
            target_account = {
                "id": account_id,
                "name": f"Conta {account_id}",
                "profile_dir": f"C:/Users/brend/chatgpt_bot_session_{account_id}"
            }
    else:
        target_account = accounts[0]

    profile_dir = target_account.get("profile_dir", f"C:/Users/brend/chatgpt_bot_session_{target_account.get('id', 1)}")

    print("\n=======================================================")
    print(f"🚀 CHATGPT IMAGE BOT: CONFIGURAÇÃO DE LOGIN ({target_account['name'].upper()})")
    print("=======================================================")
    print(f"📁 Diretório de perfil: {profile_dir}")
    print(f"🌐 URL alvo: {url}")
    print("👉 Faça o login no Google/ChatGPT na janela do navegador que vai abrir.")
    print("=======================================================\n")

    playwright, context, page = launch_persistent_browser(
        config_path=config_path,
        profile_dir_override=profile_dir,
        skip_cdp=True
    )

    try:
        success = ensure_authenticated(page, url=url, timeout_s=auth_timeout)

        if success:
            artifacts_dir = Path(__file__).resolve().parent.parent / "output" / "artifacts"
            artifacts_dir.mkdir(parents=True, exist_ok=True)
            screenshot_path = artifacts_dir / f"session_verified_account_{target_account.get('id', 1)}.png"
            page.screenshot(path=str(screenshot_path))
            print(f"📸 Screenshot da sessão salvo em: {screenshot_path}")
            print(f"\n✅ Sessão da {target_account['name']} salva com sucesso em:\n   {profile_dir}")
            return True
        else:
            print(f"\n❌ Falha na autenticação ou tempo limite excedido para {target_account['name']}.")
            return False
    finally:
        print("🔒 Fechando navegador e salvando perfil...")
        context.close()
        playwright.stop()


def dry_run_pipeline(config_path: str = "config.yaml") -> None:
    """
    Comando --dry-run:
    Lê a fila e o manifesto e exibe quais prompts seriam processados e quais serão pulados.
    """
    config = load_config(config_path)
    queue_file = config.get("prompts_file", "prompts/queue.txt")
    manifest_file = config.get("manifest_file", "output/manifest.jsonl")

    prompts = load_queue(queue_file)
    completed = load_completed_prompts(manifest_file)
    accounts = get_configured_accounts(config)

    print("\n=======================================================")
    print("🔍 CHATGPT IMAGE BOT: DRY-RUN (SIMULAÇÃO DE FILA & POOL)")
    print("=======================================================")
    print(f"📄 Arquivo de fila: {queue_file} ({len(prompts)} prompts)")
    print(f"📋 Manifesto: {manifest_file} ({len(completed)} prompts concluídos)")
    print(f"👥 Pool de Contas Disponíveis: {len(accounts)} contas")
    for acc in accounts:
        print(f"   - {acc['name']}: {acc['profile_dir']}")
    print()

    to_process = []
    for i, p in enumerate(prompts, 1):
        if p in completed:
            print(f"{Colors.YELLOW}[PULADO - CONCLUÍDO]{Colors.RESET} [{i}] {p}")
        else:
            print(f"{Colors.GREEN}[A PROCESSAR]{Colors.RESET} [{i}] {p}")
            to_process.append(p)

    print(f"\n📊 Total na fila: {len(prompts)} | Concluídos: {len(prompts) - len(to_process)} | Pendentes: {len(to_process)}\n")


def run_pipeline(config_path: str = "config.yaml") -> bool:
    """
    Comando --run:
    Executa o pipeline completo com ROTAÇÃO AUTOMÁTICA ENTRE 3 CONTAS
    em caso de rate limit, cota esgotada ou limite de mensagens.
    """
    config = load_config(config_path)
    url = config.get("url", "https://chatgpt.com/")
    queue_file = config.get("prompts_file", "prompts/queue.txt")
    manifest_file = config.get("manifest_file", "output/manifest.jsonl")

    accounts = get_configured_accounts(config)

    print("\n=======================================================")
    print("🤖 CHATGPT IMAGE BOT: EXECUÇÃO COM POOL DE CONTAS")
    print("=======================================================")
    print(f"👥 Contas configuradas no pool: {len(accounts)}")
    for acc in accounts:
        print(f"   • {acc['name']} (ID {acc['id']}): {acc['profile_dir']}")
    print("=======================================================\n")

    prompts = load_queue(queue_file)
    completed = load_completed_prompts(manifest_file)
    pending_prompts = [p for p in prompts if p not in completed]

    if not pending_prompts:
        print("🎉 Todos os prompts da fila já foram concluídos anteriormente! (Retomada automática)")
        return True

    current_account_idx = 0
    exhausted_accounts = set()
    total_generated = 0
    total_failed = 0

    while True:
        # Atualiza pendentes lendo o manifesto atualizado
        completed = load_completed_prompts(manifest_file)
        pending_prompts = [p for p in prompts if p not in completed]

        if not pending_prompts:
            print("\n🎉 100% DOS PROMPTS FORAM CONCLUÍDOS COM SUCESSO!")
            break

        if len(exhausted_accounts) >= len(accounts):
            print("\n🛑 Todas as 3 contas atingiram seus limites de cota/rate limit.")
            print("⏳ Aguardando 120 segundos para retestar a primeira conta do pool...")
            time.sleep(120)
            exhausted_accounts.clear()

        account = accounts[current_account_idx]
        account_name = account["name"]
        profile_dir = account["profile_dir"]

        if account["id"] in exhausted_accounts:
            current_account_idx = (current_account_idx + 1) % len(accounts)
            continue

        print(f"\n=======================================================")
        print(f"🚀 INICIANDO SESSÃO: {account_name.upper()} ({profile_dir})")
        print(f"📊 Prompts pendentes: {len(pending_prompts)}")
        print(f"=======================================================")

        try:
            playwright, context, page = launch_persistent_browser(
                config_path=config_path,
                profile_dir_override=profile_dir,
                skip_cdp=True
            )
        except Exception as e:
            print(f"⚠️ Erro ao abrir navegador para {account_name}: {e}")
            exhausted_accounts.add(account["id"])
            current_account_idx = (current_account_idx + 1) % len(accounts)
            continue

        account_needs_switch = False

        try:
            print(f"🌐 Validando sessão no ChatGPT ({account_name})...")
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(3000)
            except Exception as e:
                print(f"⚠️ Timeout ou aviso ao carregar página: {e}")

            if not is_session_active(page):
                print(f"⚠️ Sessão da {account_name} não está autenticada.")
                print(f"👉 Por favor, faça login no ChatGPT na janela do Google Chrome que está aberta na tela.")
                auth_ok = ensure_authenticated(page, url=url, timeout_s=360)
                if not auth_ok:
                    print(f"❌ Login não detectado para {account_name}. Pulando para a próxima conta...")
                    exhausted_accounts.add(account["id"])
                    account_needs_switch = True
                else:
                    print(f"✅ {account_name} autenticada com sucesso! Iniciando geração de imagens...")

            if not account_needs_switch:
                generator = Generator(page, config)

                for index, prompt in enumerate(pending_prompts, 1):
                    # Se já foi concluído em outra tentativa, pula
                    if prompt in load_completed_prompts(manifest_file):
                        continue

                    print(f"\n-------------------------------------------------------")
                    print(f"📌 [{account_name}] PROMPT [{index}/{len(pending_prompts)}]")
                    print(f"-------------------------------------------------------")

                    ok = generator.process_prompt(prompt)

                    if ok:
                        total_generated += 1
                    else:
                        if generator.account_rate_limited:
                            print(f"\n🛑 [ROTAÇÃO ATIVADA] {account_name} atingiu limite de cota/mensagens: '{generator.rate_limit_message}'")
                            exhausted_accounts.add(account["id"])
                            account_needs_switch = True
                            break
                        else:
                            total_failed += 1

        finally:
            print(f"🔒 Fechando sessão de {account_name}...")
            try:
                context.close()
                playwright.stop()
            except Exception:
                pass

        current_account_idx = (current_account_idx + 1) % len(accounts)

    # Resumo final
    final_completed = load_completed_prompts(manifest_file)
    print("\n=======================================================")
    print("🏁 RESUMO DA EXECUÇÃO DO PIPELINE COM POOL DE CONTAS")
    print("=======================================================")
    print(f"✅ Total concluído no manifesto: {len(final_completed)}/{len(prompts)}")
    print(f"📁 Imagens salvas em: {config.get('output_dir', 'output')}/")
    print("=======================================================\n")

    return len(final_completed) == len(prompts)


def main():
    parser = argparse.ArgumentParser(
        description="ChatGPT Image Bot: Automação de geração de imagens com rotação multi-contas."
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--setup-login",
        action="store_true",
        help="Abre o navegador para login manual assistido e salva a sessão no perfil da conta."
    )
    group.add_argument(
        "--run",
        action="store_true",
        help="Executa o pipeline de geração de imagens com rotação automática entre as contas."
    )
    group.add_argument(
        "--dry-run",
        action="store_true",
        help="Simula a execução e exibe o status das contas e prompts pendentes."
    )
    parser.add_argument(
        "--account",
        type=int,
        choices=[1, 2, 3],
        default=None,
        help="Número da conta para login manual (1, 2 ou 3). Ex: --setup-login --account 1"
    )
    parser.add_argument(
        "--config",
        type=str,
        default="config.yaml",
        help="Caminho alternativo para o arquivo config.yaml (padrão: config.yaml)"
    )

    args = parser.parse_args()

    ensure_dirs()

    if args.setup_login:
        success = setup_login(config_path=args.config, account_id=args.account)
        sys.exit(0 if success else 1)
    elif args.dry_run:
        dry_run_pipeline(config_path=args.config)
        sys.exit(0)
    elif args.run:
        success = run_pipeline(config_path=args.config)
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
