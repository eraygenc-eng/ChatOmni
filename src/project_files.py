import os

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
def setup_project_files():

    with get_connection() as connection:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS project_files (
                    file_id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    relative_path TEXT NOT NULL,
                    file_name TEXT NOT NULL,
                    extension TEXT,
                    size_bytes BIGINT NOT NULL DEFAULT 0,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                    CONSTRAINT project_files_project_path_unique
                    UNIQUE (
                        project_id,
                        relative_path
                    )
                )
                """
            )

def replace_project_files(
    project_id: str,
    files: list[dict],
):

    with get_connection() as connection:

        with connection.transaction():

            with connection.cursor() as cursor:

                cursor.execute(
                    """
                    DELETE FROM project_files
                    WHERE project_id = %s
                    """,
                    (
                        project_id,
                    ),
                )

                for file_data in files:

                    cursor.execute(
                        """
                        INSERT INTO project_files (
                            file_id,
                            project_id,
                            relative_path,
                            file_name,
                            extension,
                            size_bytes
                        )
                        VALUES (
                            %s,
                            %s,
                            %s,
                            %s,
                            %s,
                            %s
                        )
                        """,
                        (
                            file_data["file_id"],
                            project_id,
                            file_data["relative_path"],
                            file_data["file_name"],
                            file_data["extension"],
                            file_data["size_bytes"],
                        ),
                    )


def get_project_files(
    project_id: str
):

    with get_connection() as connection:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    file_id,
                    project_id,
                    relative_path,
                    file_name,
                    extension,
                    size_bytes,
                    created_at,
                    updated_at
                FROM project_files
                WHERE project_id = %s
                ORDER BY relative_path ASC
                """,
                (
                    project_id,
                ),
            )

            rows = cursor.fetchall()

    return [
        {
            "file_id":
                row["file_id"],

            "project_id":
                row["project_id"],

            "relative_path":
                row["relative_path"],

            "file_name":
                row["file_name"],

            "extension":
                row["extension"],

            "size_bytes":
                row["size_bytes"],

            "created_at":
                row["created_at"].isoformat(),

            "updated_at":
                row["updated_at"].isoformat(),
        }

        for row in rows
    ]


def delete_project_files(
    project_id: str
):

    with get_connection() as connection:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                DELETE FROM project_files
                WHERE project_id = %s
                """,
                (
                    project_id,
                ),
            )

setup_project_files()