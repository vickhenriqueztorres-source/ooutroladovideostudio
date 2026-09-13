import time
from playwright.sync_api import Page
from src.selectors import SELECTORS


def is_cloudflare_present(page: Page) -> bool:
    """Verifica se há um desafio ou interstitial do Cloudflare na página."""
    try:
        challenge_element = page.locator(SELECTORS["cloudflare_challenge"]).first
        return challenge_element.is_visible(timeout=1000)
    except Exception:
        return False


def is_session_active(page: Page) -> bool:
    """
    Verifica se a conta está realmente LOGADA no ChatGPT.
    Usuários anônimos/deslogados têm o textarea visível, mas NÃO podem gerar imagens no DALL-E.
    """
    try:
        # 1. Se o avatar ou menu de perfil do usuário está visível, COM CERTEZA está logado!
        profile_el = page.locator("button[data-testid='profile-button'], div[data-testid='profile-button'], button[aria-label*='perfil' i], button[aria-label*='profile' i]")
        if profile_el.count() > 0 and profile_el.first.is_visible(timeout=500):
            return True

        # 2. Se a sidebar de conversas do usuário logado está visível
        nav_el = page.locator("nav a[href*='/c/'], nav[aria-label*='Histórico' i], nav[aria-label*='History' i]")
        if nav_el.count() > 0 and nav_el.first.is_visible(timeout=500):
            return True

        # 3. Se botões explícitos de login estiverem visíveis, NÃO está logado!
        login_btns = page.locator("button[data-testid='login-button'], button[data-testid='signup-button'], button:has-text('Entrar'), button:has-text('Log in'), button:has-text('Fazer login')")
        count = login_btns.count()
        if count > 0:
            for i in range(min(count, 3)):
                try:
                    if login_btns.nth(i).is_visible(timeout=300):
                        return False
                except Exception:
                    pass

        # 4. Campo de prompt ativo sem qualquer botão de login na tela
        textarea = page.locator(SELECTORS["prompt_textarea"]).first
        if textarea.is_visible(timeout=500):
            return True
    except Exception:
        pass

    return False


def ensure_authenticated(
    page: Page,
    url: str = "https://chatgpt.com/",
    timeout_s: int = 300
) -> bool:
    """
    Garante que a conta está autenticada. Se deslogada, aguarda o usuário logar no navegador.
    """
    print(f"🌐 Acessando {url}...")
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
    except Exception as e:
        print(f"⚠️ Aviso no carregamento: {e}")

    time.sleep(3)

    if is_session_active(page):
        print("✅ Sessão do ChatGPT ativa e autenticada!")
        return True

    print("\n=======================================================")
    print("⚠️ ATENÇÃO: CONTA NÃO ESTÁ LOGADA NO CHATGPT!")
    print("👉 Por favor, faça login com sua conta na janela do Google Chrome que abriu.")
    print(f"⏳ Aguardando você fazer login (tempo limite: {timeout_s}s)...")
    print("=======================================================\n")

    start_time = time.time()
    while time.time() - start_time < timeout_s:
        if is_session_active(page):
            print("🎉 Login detectado com sucesso! Sessão salva.")
            time.sleep(2)
            return True
        time.sleep(2)

    try:
        artifacts_dir = Path(__file__).resolve().parent.parent / "output" / "artifacts"
        artifacts_dir.mkdir(parents=True, exist_ok=True)
        debug_shot = artifacts_dir / f"auth_timeout_debug.png"
        page.screenshot(path=str(debug_shot))
        print(f"📸 Screenshot do estado final salvo em: {debug_shot}")
    except Exception:
        pass

    print("❌ Tempo limite esgotado sem detectar login.")
    return False
