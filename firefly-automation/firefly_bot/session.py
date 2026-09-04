"""Verificação de sessão: detecta, pausa e nunca automatiza login."""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any
from patchright.async_api import TimeoutError as PatchrightTimeoutError, async_playwright

from .config import Config
from .selectors import SELECTORS, UnconfirmedSelectorError, locator_for
from .state_reader import StateReader


class SessionNotAuthenticatedError(RuntimeError):
    pass


class SessionManager:
    def __init__(
        self, page: object, state_reader: StateReader, config: Config | None = None
    ):
        self.page = page
        self.state_reader = state_reader
        self.config = config or Config()

    async def require_authenticated(self, job_id: int | None = None) -> None:
        url = self.page.url.lower()
        if any(token in url for token in ("/login", "/auth", "/signin")):
            raise SessionNotAuthenticatedError("sessão expirada ou tela de login detectada")
        if not SELECTORS["logged_in_marker"].confirmed:
            raise UnconfirmedSelectorError("logged_in_marker precisa ser confirmado manualmente")
        marker = locator_for(self.page, "logged_in_marker")
        try:
            await marker.wait_for(
                state="visible", timeout=self.config.selector_timeout_ms
            )
        except PatchrightTimeoutError as exc:
            raise SessionNotAuthenticatedError(
                "marcador de sessão autenticada não está visível"
            ) from exc


async def probe_session(config: Config) -> dict[str, Any]:
    """Abre Chrome headless com profile_dir e verifica autenticação real no Firefly."""
    profile_dir = config.profile_dir
    if not profile_dir.exists():
        return {
            "authenticated": False,
            "reason": f"PROFILE_NOT_FOUND: Diretório de perfil não existe em {profile_dir}",
            "profile_dir": str(profile_dir),
        }
    
    default_dir = profile_dir / "Default"
    if not default_dir.exists():
        return {
            "authenticated": False,
            "reason": f"PROFILE_INCOMPLETE: Subdiretório Default ausente em {profile_dir}",
            "profile_dir": str(profile_dir),
        }

    try:
        from .chrome_profile import close_existing_profile_chrome
        close_existing_profile_chrome(profile_dir)
    except Exception:
        pass

    try:
        async with async_playwright() as playwright:
            context = await playwright.chromium.launch_persistent_context(
                user_data_dir=str(profile_dir),
                channel=config.chrome_channel,
                headless=True,
                viewport={"width": 1920, "height": 1080},
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--no-first-run",
                    "--no-default-browser-check"
                ],
                ignore_default_args=["--enable-automation"],
            )
            try:
                page = context.pages[0] if context.pages else await context.new_page()
                try:
                    await page.goto(config.firefly_url, wait_until="domcontentloaded", timeout=config.nav_timeout_ms)
                    await asyncio.sleep(4)
                except Exception as nav_err:
                    return {
                        "authenticated": False,
                        "reason": f"NAVIGATION_FAILED: {nav_err}",
                        "profile_dir": str(profile_dir),
                    }

                url = page.url.lower()
                if any(token in url for token in ("/login", "/auth", "/signin")):
                    return {
                        "authenticated": False,
                        "reason": f"REDIRECTED_TO_LOGIN: {page.url}",
                        "profile_dir": str(profile_dir),
                    }

                # Avalia marcadores de login e modais de inscrição
                login_detected = await page.evaluate('''() => {
                    const seen = new Set();
                    let found = false;
                    function walk(root) {
                        if (!root || seen.has(root)) return;
                        seen.add(root);
                        const all = root.querySelectorAll ? Array.from(root.querySelectorAll('*')) : [];
                        for (const el of all) {
                            const text = (el.innerText || el.textContent || '').trim().toLowerCase();
                            if (text === 'fazer logon' || text === 'sign in' || text.includes('crie grátis todos os dias')) {
                                if (el.offsetWidth || el.offsetHeight) {
                                    found = true;
                                    return;
                                }
                            }
                            if (el.shadowRoot) walk(el.shadowRoot);
                        }
                    }
                    walk(document);
                    return found;
                }''')

                if login_detected:
                    return {
                        "authenticated": False,
                        "reason": "LOGIN_REQUIRED: Botão de logon ou modal de autenticação visível na página",
                        "profile_dir": str(profile_dir),
                    }

                production_ui_ready = "/generate/video" in page.url.lower()
                return {
                    "authenticated": True,
                    "production_ui_ready": production_ui_ready,
                    "reason": (
                        "Sessão autenticada e compositor de vídeo acessível no Adobe Firefly"
                        if production_ui_ready
                        else "Sessão autenticada, mas compositor de vídeo indisponível"
                    ),
                    "profile_dir": str(profile_dir),
                }
            finally:
                await context.close()
    except Exception as exc:
        return {
            "authenticated": False,
            "reason": f"PROBE_EXCEPTION: {exc}",
            "profile_dir": str(profile_dir),
        }
