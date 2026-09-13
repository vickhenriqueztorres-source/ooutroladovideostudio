import os
import yaml
import subprocess
import time
from pathlib import Path
from typing import Tuple, Optional
from playwright.sync_api import sync_playwright, Playwright, BrowserContext, Page
from src.stealth import apply_full_stealth


def load_config(config_path: str = "config.yaml") -> dict:
    """Carrega as configurações a partir do arquivo YAML."""
    path = Path(config_path)
    if not path.is_absolute():
        base_dir = Path(__file__).resolve().parent.parent
        resolved = base_dir / config_path
        if resolved.exists():
            path = resolved

    if not path.exists():
        raise FileNotFoundError(f"Arquivo de configuração não encontrado: {path}")

    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def try_connect_cdp(playwright: Playwright, cdp_url: str = "http://127.0.0.1:9222") -> Optional[Tuple[BrowserContext, Page]]:
    """
    Tenta conectar ao Google Chrome real que já está aberto pelo usuário via CDP.
    Garante 100% de reaproveitamento da sessão e login existente (sem bloqueios do Google).
    """
    try:
        browser = playwright.chromium.connect_over_cdp(cdp_url, timeout=3000)
        if len(browser.contexts) > 0:
            context = browser.contexts[0]
        else:
            context = browser.new_context()

        # Procura se já existe uma aba do ChatGPT aberta
        for p in context.pages:
            if "chatgpt.com" in p.url or "openai.com" in p.url:
                p.bring_to_front()
                return context, p

        # Se não houver aba do ChatGPT, usa a primeira ou abre uma nova
        if len(context.pages) > 0:
            page = context.pages[0]
        else:
            page = context.new_page()

        page.bring_to_front()
        return context, page
    except Exception:
        return None


def launch_persistent_browser(
    config_path: str = "config.yaml",
    profile_dir_override: Optional[str] = None,
    skip_cdp: bool = False
) -> Tuple[Playwright, BrowserContext, Page]:
    """
    Inicializa o navegador:
    1. Se skip_cdp=False e cdp ativo, tenta conectar ao Chrome real.
    2. Inicia o navegador persistente com perfil dedicado e blindagem Stealth.
    """
    config = load_config(config_path)
    base_dir = Path(__file__).resolve().parent.parent
    cdp_url = config.get("cdp_url", "http://127.0.0.1:9222")

    playwright = sync_playwright().start()

    # 1. Tenta conectar ao Chrome via CDP somente se skip_cdp for False e não houver override de perfil
    if not skip_cdp and not profile_dir_override:
        cdp_session = try_connect_cdp(playwright, cdp_url)
        if cdp_session is not None:
            context, page = cdp_session
            print(f"🔗 Conectado com sucesso ao seu Google Chrome real via porta 9222!")
            return playwright, context, page

    # 2. Navegador persistente isolado para a conta indicada
    target_profile = profile_dir_override or config.get("profile_dir", "C:/Users/brend/chatgpt_bot_session_1")
    profile_dir = Path(target_profile)
    if not profile_dir.is_absolute():
        profile_dir = base_dir / profile_dir

    profile_dir.mkdir(parents=True, exist_ok=True)

    chromium_args = [
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process,UserAgentClientHint",
        "--disable-infobars",
        "--disable-dev-shm-usage",
        "--disable-ipc-flooding-protection",
        "--lang=pt-BR,pt,en-US,en",
        "--no-sandbox",
        "--start-maximized"
    ]

    context = playwright.chromium.launch_persistent_context(
        user_data_dir=str(profile_dir),
        channel="chrome",
        headless=False,
        args=chromium_args,
        viewport=None,
        ignore_default_args=["--enable-automation"],
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/131.0.0.0 Safari/537.36"
        )
    )

    if len(context.pages) > 0:
        page = context.pages[0]
    else:
        page = context.new_page()

    apply_full_stealth(context, page)

    return playwright, context, page
