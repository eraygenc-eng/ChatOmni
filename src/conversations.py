import os
from dotenv import load_dotenv
from psycopg import Connection
from psycopg.rows import dict_row

load_dotenv()

POSTGRES_URI = os.getenv("POSTGRES_URI")

if not POSTGRES_URI:
    raise RuntimeError("POSTGRES_URI was not found in the environment.")

# Opens a new PostgreSQL connection.
def get_connection():

    return Connection.connect(
        POSTGRES_URI,
        autocommit=True,
        row_factory=dict_row,
    )

# Creates the chat_conversations table if it does not exist.
def setup_conversations():

    with get_connection() as connection:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS chat_conversations (
                    chat_id TEXT PRIMARY KEY,
                    title TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )

# Adds a new chat or updates its last used time.
def ensure_chat(
    chat_id: str
):
    # Cleans chat_id and uses "current_chat" if it is empty.
    chat_id = (
        chat_id.strip()
        or
        "current_chat"
    )

    with get_connection() as connection:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO chat_conversations (
                    chat_id,
                    title
                )
                VALUES (
                    %s,
                    %s
                )
                ON CONFLICT (chat_id)
                DO UPDATE SET
                    updated_at = NOW()
                """,
                (
                    chat_id,
                    "New Chat",
                ),
            )

# Gets the current title of a chat.
def get_chat_title(
    chat_id: str
):

    chat_id = (
        chat_id.strip()
        or
        "current_chat"
    )


    with get_connection() as connection:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT title
                FROM chat_conversations
                WHERE chat_id = %s
                """,
                (
                    chat_id,
                ),
            )


            row = cursor.fetchone()


    if not row:
        return None


    return row["title"]

# Updates the title of a chat.
def update_chat_title(
    chat_id: str,
    title: str
):

    chat_id = (
        chat_id.strip()
        or
        "current_chat"
    )


    title = (
        title.strip()
        or
        "New Chat"
    )


    with get_connection() as connection:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE chat_conversations
                SET
                    title = %s,
                    updated_at = NOW()
                WHERE chat_id = %s
                """,
                (
                    title,
                    chat_id,
                ),
            )

# Deletes a chat from the chat list.
def delete_chat(
    chat_id: str
):

    chat_id = (
        chat_id.strip()
        or
        "current_chat"
    )


    with get_connection() as connection:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                DELETE FROM chat_conversations
                WHERE chat_id = %s
                """,
                (
                    chat_id,
                ),
            )

# Gets saved chats, newest first.
def get_chats():

    with get_connection() as connection:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    chat_id,
                    title,
                    created_at,
                    updated_at
                FROM chat_conversations
                ORDER BY updated_at DESC
                """
            )

            rows = cursor.fetchall()


    return [
        {
            "chat_id":
                row["chat_id"],

            "title":
                row["title"],

            "created_at":
                row["created_at"].isoformat(),

            "updated_at":
                row["updated_at"].isoformat(),
        }

        for row in rows
    ]      
 
# Makes sure the chat table is ready when the app starts.
setup_conversations()