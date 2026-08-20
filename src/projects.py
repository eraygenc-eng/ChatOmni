import os
import uuid

from dotenv import load_dotenv
from psycopg import Connection
from psycopg.rows import dict_row


load_dotenv()


POSTGRES_URI = os.getenv(
    "POSTGRES_URI"
)


if not POSTGRES_URI:
    raise RuntimeError(
        "POSTGRES_URI was not found in the environment."
    )


def get_connection():

    return Connection.connect(
        POSTGRES_URI,
        autocommit=True,
        row_factory=dict_row,
    )


# Database Setup
def setup_projects():

    with get_connection() as connection:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS projects (
                    project_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )


# Create Project
def create_project(
    name: str,
    user_id: str = "local_user",
):

    project_id = str(
        uuid.uuid4()
    )

    clean_name = (
        name.strip()
        or
        "Untitled Project"
    )

    with get_connection() as connection:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO projects (
                    project_id,
                    user_id,
                    name
                )
                VALUES (
                    %s,
                    %s,
                    %s
                )
                RETURNING
                    project_id,
                    user_id,
                    name,
                    created_at,
                    updated_at
                """,
                (
                    project_id,
                    user_id,
                    clean_name,
                ),
            )

            row = cursor.fetchone()

    return {
        "project_id":
            row["project_id"],

        "user_id":
            row["user_id"],

        "name":
            row["name"],

        "created_at":
            row["created_at"].isoformat(),

        "updated_at":
            row["updated_at"].isoformat(),
    }


# Get Projects
def get_projects(
    user_id: str = "local_user",
):

    with get_connection() as connection:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    project_id,
                    user_id,
                    name,
                    created_at,
                    updated_at
                FROM projects
                WHERE user_id = %s
                ORDER BY updated_at DESC
                """,
                (
                    user_id,
                ),
            )

            rows = cursor.fetchall()

    return [
        {
            "project_id":
                row["project_id"],

            "user_id":
                row["user_id"],

            "name":
                row["name"],

            "created_at":
                row["created_at"].isoformat(),

            "updated_at":
                row["updated_at"].isoformat(),
        }

        for row in rows
    ]

# Get Single Project
def get_project(
    project_id: str,
    user_id: str = "local_user",
):

    with get_connection() as connection:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    project_id,
                    user_id,
                    name,
                    created_at,
                    updated_at
                FROM projects
                WHERE
                    project_id = %s
                    AND user_id = %s
                """,
                (
                    project_id,
                    user_id,
                ),
            )

            row = cursor.fetchone()

    if not row:
        return None

    return {
        "project_id":
            row["project_id"],

        "user_id":
            row["user_id"],

        "name":
            row["name"],

        "created_at":
            row["created_at"].isoformat(),

        "updated_at":
            row["updated_at"].isoformat(),
    }


# Delete Project
def delete_project(
    project_id: str,
    user_id: str = "local_user",
):

    with get_connection() as connection:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                DELETE FROM projects
                WHERE
                    project_id = %s
                    AND user_id = %s
                """,
                (
                    project_id,
                    user_id,
                ),
            )


setup_projects()