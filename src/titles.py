import re
import unicodedata

from config import get_model

from src.conversations import (
    get_chat_title,
    update_chat_title,
)


title_model = get_model()

DEFAULT_TITLE = "New Chat"
MAX_TITLE_WORDS = 6
MAX_TITLE_LENGTH = 60


# Checks whether a character belongs to the Latin alphabet.
# This keeps Turkish characters such as ç, ğ, ı, İ, ö, ş, ü.
def is_latin_letter(character: str) -> bool:

    if not character.isalpha():
        return False

    try:
        return "LATIN" in unicodedata.name(character)
    except ValueError:
        return False


# Removes unsupported characters from generated titles.
def sanitize_title(
    title: str
) -> str:

    if not isinstance(title, str):
        return ""

    title = (
        title
        .strip()
        .strip('"')
        .strip("'")
        .strip("`")
        .strip()
    )

    # Remove prefixes the model may occasionally add.
    title = re.sub(
        r"^(title|chat title|başlık|sohbet başlığı)\s*:\s*",
        "",
        title,
        flags=re.IGNORECASE,
    )

    cleaned_characters = []

    for character in title:

        if (
            is_latin_letter(character)
            or character.isdigit()
            or character.isspace()
            or character in "-&/"
        ):
            cleaned_characters.append(character)

    title = "".join(cleaned_characters)

    # Normalize repeated whitespace.
    title = " ".join(
        title.split()
    )

    # Enforce the maximum word count in code,
    # instead of relying only on the model prompt.
    words = title.split()

    if len(words) > MAX_TITLE_WORDS:
        title = " ".join(
            words[:MAX_TITLE_WORDS]
        )

    return title[:MAX_TITLE_LENGTH].strip()


# Creates a simple fallback title from the user's message
# if the model returns an invalid title.
def create_fallback_title(
    message: str
) -> str:

    cleaned_message = sanitize_title(
        message
    )

    if not cleaned_message:
        return DEFAULT_TITLE

    words = cleaned_message.split()

    return " ".join(
        words[:MAX_TITLE_WORDS]
    )[:MAX_TITLE_LENGTH]


# Generates a short title from the first user message.
def generate_chat_title(
    message: str
) -> str:

    message = message.strip()

    if not message:
        return DEFAULT_TITLE

    prompt = f"""
Create one short chat title based only on the user's message.

Strict rules:
- Use the same language as the user's message.
- Chat titles should be in Turkish or English when the message is Turkish or English.
- Use 2 to 6 words.
- Describe the main topic of the message.
- Return only the title.
- Do not write "Title:", "Chat title:", "Başlık:" or similar prefixes.
- Do not use quotation marks.
- Do not add a period at the end.
- Do not use emojis.
- Do not mix languages unnecessarily.
- Do not insert Chinese, Japanese, Korean, Cyrillic, Arabic or other unrelated scripts.
- Ignore technical metadata inside square brackets.
- Never add information that is not present in the user's message.

User message:
{message[:1000]}
"""

    response = title_model.invoke(
        prompt
    )

    raw_title = (
        response.text
        if hasattr(response, "text")
        else str(response.content)
    )

    title = sanitize_title(
        raw_title
    )

    if not title:
        return create_fallback_title(
            message
        )

    return title


# Creates a title only if the chat still has the default title.
def create_title_if_needed(
    chat_id: str,
    message: str,
    user_id: str
):

    current_title = get_chat_title(
        chat_id,
        user_id
    )

    if (
        current_title
        and
        current_title != DEFAULT_TITLE
    ):
        return current_title

    try:

        title = generate_chat_title(
            message
        )

        update_chat_title(
            chat_id,
            title,
            user_id
        )

        return title

    except Exception as error:

        print(
            f"Chat title generation failed: {error}"
        )

        return (
            current_title
            or DEFAULT_TITLE
        )