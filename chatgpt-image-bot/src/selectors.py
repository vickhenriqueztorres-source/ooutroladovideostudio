"""
Centralização de todos os seletores CSS, XPath e padrões de texto da interface do ChatGPT (chatgpt.com).
Suporta UI em Português (PT-BR) e Inglês (EN) com ProseMirror rich-text editor.
"""

SELECTORS = {
    # 1. Campo de entrada de prompt visível (ProseMirror / ContentEditable)
    "prompt_textarea": (
        "div#prompt-textarea, "
        "div.ProseMirror, "
        "div[contenteditable='true'], "
        "#prompt-textarea:not(.wcDTda_fallbackTextarea), "
        "p.placeholder, "
        "textarea:not(.wcDTda_fallbackTextarea), "
        "textarea[id='mobile-composer-prompt']"
    ),

    # 2. Botão de enviar prompt
    "send_button": (
        "button[data-testid='send-button'], "
        "button[aria-label*='Enviar'], "
        "button[aria-label*='Send'], "
        "button[data-testid='composer-speech-button'] + button, "
        "button:has(svg path[d*='M15.192']), "
        "button[aria-label*='prompt']"
    ),

    # 3. Indicador de streaming / botão de parar geração
    "stop_generating_button": (
        "button[data-testid='stop-button'], "
        "button[aria-label*='Parar'], "
        "button[aria-label*='Stop'], "
        "button:has(svg rect)"
    ),

    # 4. Indicador de streaming ativo no DOM
    "streaming_indicator": (
        ".result-streaming, "
        "[data-is-streaming='true'], "
        "span.animate-spin, "
        "div.result-thinking"
    ),

    # 5. Containers de mensagens do assistente (ambos os aliases)
    "assistant_message": (
        "[data-message-author-role='assistant'], "
        "div.agent-turn, "
        "article[data-testid*='conversation-turn']"
    ),
    "assistant_message_container": (
        "[data-message-author-role='assistant'], "
        "div.agent-turn, "
        "article[data-testid*='conversation-turn']"
    ),

    # 6. Imagem gerada no ChatGPT / DALL-E 3
    "generated_image": (
        "article[data-testid*='conversation-turn'] img[alt*='imagem' i], "
        "article[data-testid*='conversation-turn'] img[alt*='image' i], "
        "article[data-testid*='conversation-turn'] img[src*='dall-e'], "
        "article[data-testid*='conversation-turn'] img[src*='oaidalleapiprodscus'], "
        "article[data-testid*='conversation-turn'] img[src*='blob:'], "
        "article[data-testid*='conversation-turn'] img:not([alt*='User']):not([alt*='ChatGPT'])"
    ),

    # 7. Botão de download de imagem
    "image_download_button": (
        "button[aria-label*='Baixar' i], "
        "button[aria-label*='Download' i], "
        "a[download], "
        "button[data-testid*='download']"
    ),

    # 8. Botão de Novo Chat (+ ou lápis)
    "new_chat_button": (
        "a[href='/'], "
        "button[aria-label*='Novo chat' i], "
        "button[aria-label*='New chat' i], "
        "a[data-testid='create-new-chat-button']"
    ),

    # 9. Verificação de sessão logada / perfil
    "user_avatar": (
        "button[data-testid='profile-button'], "
        "img[alt*='User' i], "
        "button[aria-label*='perfil' i], "
        "button[aria-label*='profile' i]"
    ),

    # 10. Desafio Cloudflare
    "cloudflare_challenge": (
        "#challenge-running, "
        "#cf-challenge-running, "
        "iframe[src*='challenges.cloudflare.com']"
    )
}

CONFIRMATION_PATTERNS = [
    r"você quer que eu gere",
    r"devo gerar",
    r"gostaria que eu crie",
    r"deseja que eu gere",
    r"posso gerar essa imagem",
    r"would you like me to generate",
    r"should i generate",
    r"do you want me to create",
    r"shall i proceed"
]

RATE_LIMIT_PATTERNS = [
    r"você atingiu o limite",
    r"tente novamente em (\d+)\s*(segundos|minutos|horas|s|m|h)",
    r"tente novamente após",
    r"tente novamente mais tarde",
    r"limite de mensagens atingido",
    r"limite de criação de imagens",
    r"limite de uso atingido",
    r"you've reached your limit",
    r"try again in (\d+)\s*(seconds|minutes|hours|s|m|h)",
    r"try again after",
    r"try again later",
    r"image creation limit",
    r"usage limit",
    r"too many requests",
    r"rate limit"
]
