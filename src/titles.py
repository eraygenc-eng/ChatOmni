from config import get_model

from src.conversations import (
    get_chat_title,
    update_chat_title,
)

title_model = get_model()


# Generates a short title from the first user message.
def generate_chat_title(
    message: str
) -> str:

    message = message.strip()


    if not message:
        return "New Chat"


    prompt = f"""
Create a short chat title based on the user's message.

Rules:
- Use the same language as the user.
- Use 2 to 6 words.
- Describe the main topic.
- Do not use quotation marks.
- Do not add a period at the end.
- Return only the title.
- Ignore technical metadata inside square brackets.

User message:
{message[:1000]}
"""


    response = title_model.invoke(
        prompt
    )


    title = (
        response.text
        .strip()
        .strip('"')
        .strip("'")
        .strip("`")
        .strip()
    )


    title = " ".join(
        title.split()
    )


    if not title:
        return "New Chat"


    return title[:60]

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
        current_title != "New Chat"
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
            or
            "New Chat"
        )