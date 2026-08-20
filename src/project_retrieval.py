import json
import math
import re
from pathlib import Path, PurePosixPath

from src.project_files import get_project_files


PROJECTS_DATA_DIR = Path(
    "projects_data"
)


PROJECT_TEXT_EXTENSIONS = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".java",
    ".c",
    ".h",
    ".cpp",
    ".cc",
    ".cxx",
    ".hpp",
    ".cs",
    ".go",
    ".rs",
    ".php",
    ".rb",
    ".swift",
    ".kt",
    ".kts",
    ".html",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".json",
    ".xml",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".cfg",
    ".conf",
    ".env",
    ".md",
    ".txt",
    ".sql",
    ".sh",
    ".bat",
    ".ps1",
}


PROJECT_TEXT_FILENAMES = {
    "dockerfile",
    "makefile",
    "procfile",
    ".gitignore",
    ".dockerignore",
}


CHUNK_MAX_CHARS = 6000
CHUNK_MAX_LINES = 140
CHUNK_OVERLAP_LINES = 12

SEARCH_RESULT_LIMIT = 6
DEEP_BATCH_SIZE = 4


STOP_WORDS = {
    "the",
    "a",
    "an",
    "is",
    "are",
    "of",
    "to",
    "for",
    "in",
    "on",
    "with",
    "from",
    "and",
    "or",
    "this",
    "that",
    "file",
    "project",
    "code",

    "bu",
    "şu",
    "bir",
    "ve",
    "veya",
    "ile",
    "için",
    "dosya",
    "dosyada",
    "proje",
    "projede",
    "kod",
    "nasıl",
    "neden",
    "nedir",
}


DEEP_REQUEST_TERMS = {
    "deeply",
    "in depth",
    "in-depth",
    "comprehensive",
    "thorough",
    "entire file",
    "whole file",
    "entire folder",
    "whole folder",

    "derinlemesine",
    "detaylı incele",
    "detaylı analiz",
    "baştan sona",
    "tüm dosyayı",
    "bütün dosyayı",
    "dosyanın tamamını",
    "tüm klasörü",
    "bütün klasörü",
}


def get_search_terms(
    text: str,
):

    words = re.findall(
        r"[\w./\\-]+",
        text.casefold(),
    )

    return {
        word
        for word in words
        if (
            len(word) >= 2
            and
            word not in STOP_WORDS
        )
    }


def is_deep_request(
    question: str,
):

    normalized = (
        question.casefold()
    )

    return any(
        term in normalized
        for term in DEEP_REQUEST_TERMS
    )


def is_text_project_file(
    file_data: dict,
):

    extension = (
        file_data["extension"]
        .casefold()
    )

    file_name = (
        file_data["file_name"]
        .casefold()
    )

    return (
        extension in
        PROJECT_TEXT_EXTENSIONS
        or
        file_name in
        PROJECT_TEXT_FILENAMES
    )


def get_safe_project_file_path(
    project_id: str,
    relative_path: str,
):

    project_root = (
        PROJECTS_DATA_DIR /
        project_id
    ).resolve()

    normalized_path = PurePosixPath(
        relative_path.replace(
            "\\",
            "/",
        )
    )

    file_path = (
        project_root /
        Path(
            *normalized_path.parts
        )
    ).resolve()

    try:

        file_path.relative_to(
            project_root
        )

    except ValueError:

        return None

    return file_path


def read_project_file(
    project_id: str,
    relative_path: str,
):

    file_path = (
        get_safe_project_file_path(
            project_id,
            relative_path,
        )
    )

    if (
        file_path is None
        or
        not file_path.exists()
        or
        not file_path.is_file()
    ):

        return None

    try:

        return file_path.read_text(
            encoding="utf-8"
        )

    except UnicodeDecodeError:

        try:

            return file_path.read_text(
                encoding="utf-8-sig"
            )

        except UnicodeDecodeError:

            return None


def chunk_file_content(
    relative_path: str,
    content: str,
):

    lines = content.splitlines()

    if not lines:

        return []

    chunks = []

    start = 0

    while start < len(lines):

        end = start
        character_count = 0

        while (
            end < len(lines)
            and
            end - start <
            CHUNK_MAX_LINES
        ):

            next_length = (
                len(lines[end])
                + 1
            )

            if (
                character_count > 0
                and
                character_count
                + next_length
                >
                CHUNK_MAX_CHARS
            ):

                break

            character_count += (
                next_length
            )

            end += 1

        if end == start:

            end = start + 1

        chunk_text = "\n".join(
            lines[
                start:end
            ]
        )

        chunks.append(
            {
                "path":
                    relative_path,

                "start_line":
                    start + 1,

                "end_line":
                    end,

                "content":
                    chunk_text,
            }
        )

        if end >= len(lines):

            break

        start = max(
            end
            - CHUNK_OVERLAP_LINES,
            start + 1,
        )

    return chunks


def build_chunks(
    project_id: str,
    files: list[dict],
):

    chunks = []
    skipped_files = []

    for file_data in files:

        relative_path = (
            file_data[
                "relative_path"
            ]
        )

        content = read_project_file(
            project_id,
            relative_path,
        )

        if content is None:

            skipped_files.append(
                relative_path
            )

            continue

        chunks.extend(
            chunk_file_content(
                relative_path,
                content,
            )
        )

    return (
        chunks,
        skipped_files,
    )


def detect_file_from_question(
    project_files: list[dict],
    question: str,
):

    normalized_question = (
        question.casefold()
    )

    matches = []

    for file_data in project_files:

        relative_path = (
            file_data[
                "relative_path"
            ]
            .casefold()
        )

        file_name = (
            file_data[
                "file_name"
            ]
            .casefold()
        )

        if (
            relative_path
            in normalized_question
            or
            file_name
            in normalized_question
        ):

            matches.append(
                file_data
            )

    if len(matches) == 1:

        return matches[0]

    return None


def resolve_target_file(
    project_files: list[dict],
    target: str,
    question: str,
):

    clean_target = (
        target.strip()
        .strip('"')
        .strip("'")
        .replace(
            "\\",
            "/",
        )
        .casefold()
    )

    if not clean_target:

        detected = (
            detect_file_from_question(
                project_files,
                question,
            )
        )

        return detected

    exact_path_matches = [
        file_data
        for file_data in project_files
        if (
            file_data[
                "relative_path"
            ]
            .replace(
                "\\",
                "/",
            )
            .casefold()
            ==
            clean_target
        )
    ]

    if len(
        exact_path_matches
    ) == 1:

        return (
            exact_path_matches[0]
        )

    file_name_matches = [
        file_data
        for file_data in project_files
        if (
            file_data[
                "file_name"
            ]
            .casefold()
            ==
            clean_target
        )
    ]

    if len(
        file_name_matches
    ) == 1:

        return (
            file_name_matches[0]
        )

    suffix_matches = [
        file_data
        for file_data in project_files
        if (
            file_data[
                "relative_path"
            ]
            .replace(
                "\\",
                "/",
            )
            .casefold()
            .endswith(
                f"/{clean_target}"
            )
        )
    ]

    if len(
        suffix_matches
    ) == 1:

        return (
            suffix_matches[0]
        )

    return None


def resolve_scope_files(
    project_files: list[dict],
    target: str,
):

    clean_target = (
        target.strip()
        .strip("/")
        .strip("\\")
        .replace(
            "\\",
            "/",
        )
        .casefold()
    )

    if not clean_target:

        return []

    matches = []

    for file_data in project_files:

        relative_path = (
            file_data[
                "relative_path"
            ]
            .replace(
                "\\",
                "/",
            )
            .casefold()
        )

        path_parts = (
            PurePosixPath(
                relative_path
            )
            .parts
        )

        if (
            relative_path.startswith(
                f"{clean_target}/"
            )
            or
            clean_target
            in path_parts[:-1]
        ):

            matches.append(
                file_data
            )

    return matches


def score_chunk(
    chunk: dict,
    search_terms: set[str],
):

    if not search_terms:

        return 0

    path = (
        chunk["path"]
        .casefold()
    )

    content = (
        chunk["content"]
        .casefold()
    )

    score = 0

    for term in search_terms:

        if term in path:

            score += 8

        occurrence_count = (
            content.count(
                term
            )
        )

        score += min(
            occurrence_count,
            5,
        )

    return score


def select_relevant_chunks(
    chunks: list[dict],
    question: str,
):

    search_terms = (
        get_search_terms(
            question
        )
    )

    scored_chunks = [
        (
            score_chunk(
                chunk,
                search_terms,
            ),
            chunk,
        )

        for chunk in chunks
    ]

    scored_chunks.sort(
        key=lambda item: item[0],
        reverse=True,
    )

    positive_chunks = [
        chunk
        for score, chunk
        in scored_chunks
        if score > 0
    ]

    if positive_chunks:

        return positive_chunks[
            :SEARCH_RESULT_LIMIT
        ]

    return chunks[
        :SEARCH_RESULT_LIMIT
    ]


def build_result(
    mode: str,
    items: list[dict],
    target: str | None = None,
    skipped_files: list[str] | None = None,
    batch: int = 0,
    total_batches: int = 1,
):

    has_more = (
        batch
        <
        total_batches - 1
    )

    return json.dumps(
        {
            "status":
                "ok",

            "mode":
                mode,

            "target":
                target,

            "batch":
                batch,

            "total_batches":
                total_batches,

            "has_more":
                has_more,

            "next_batch":
                (
                    batch + 1
                    if has_more
                    else None
                ),

            "items":
                items,

            "skipped_files":
                skipped_files
                or [],
        },
        ensure_ascii=False,
    )


def build_batched_result(
    mode: str,
    chunks: list[dict],
    batch: int,
    target: str | None = None,
    skipped_files: list[str] | None = None,
):

    if not chunks:

        return json.dumps(
            {
                "status":
                    "error",

                "message":
                    "No readable project content was found.",
            },
            ensure_ascii=False,
        )

    total_batches = (
        math.ceil(
            len(chunks)
            /
            DEEP_BATCH_SIZE
        )
    )

    if (
        batch < 0
        or
        batch >= total_batches
    ):

        return json.dumps(
            {
                "status":
                    "error",

                "message":
                    "Invalid project review batch.",
            },
            ensure_ascii=False,
        )

    start = (
        batch
        *
        DEEP_BATCH_SIZE
    )

    end = (
        start
        +
        DEEP_BATCH_SIZE
    )

    return build_result(
        mode=mode,
        target=target,
        items=chunks[
            start:end
        ],
        skipped_files=
            skipped_files,
        batch=batch,
        total_batches=
            total_batches,
    )


def retrieve_project_context(
    project_id: str,
    question: str,
    mode: str,
    target: str = "",
    batch: int = 0,
):

    project_files = (
        get_project_files(
            project_id
        )
    )

    text_files = [
        file_data
        for file_data
        in project_files
        if is_text_project_file(
            file_data
        )
    ]

    if not text_files:

        return json.dumps(
            {
                "status":
                    "error",

                "message":
                    "The active project has no readable text or source files.",
            },
            ensure_ascii=False,
        )

    # Targeted
    if mode == "targeted":

        target_file = (
            resolve_target_file(
                text_files,
                target,
                question,
            )
        )

        if target_file is not None:

            selected_files = [
                target_file
            ]

            chunks, skipped = (
                build_chunks(
                    project_id,
                    selected_files,
                )
            )

            if is_deep_request(
                question
            ):

                return (
                    build_batched_result(
                        mode="targeted",
                        chunks=chunks,
                        batch=batch,
                        target=
                            target_file[
                                "relative_path"
                            ],
                        skipped_files=
                            skipped,
                    )
                )

            relevant_chunks = (
                select_relevant_chunks(
                    chunks,
                    question,
                )
            )

            return build_result(
                mode="targeted",
                target=
                    target_file[
                        "relative_path"
                    ],
                items=
                    relevant_chunks,
                skipped_files=
                    skipped,
            )

        # No explicit file:
        # focused search across project.
        chunks, skipped = (
            build_chunks(
                project_id,
                text_files,
            )
        )

        relevant_chunks = (
            select_relevant_chunks(
                chunks,
                question,
            )
        )

        return build_result(
            mode="targeted",
            items=
                relevant_chunks,
            skipped_files=
                skipped,
        )
    
    # Scoped
    if mode == "scoped":

        scoped_files = (
            resolve_scope_files(
                text_files,
                target,
            )
        )

        if not scoped_files:

            return json.dumps(
                {
                    "status":
                        "error",

                    "message":
                        (
                            "No files were found "
                            "for the requested project scope."
                        ),
                },
                ensure_ascii=False,
            )

        chunks, skipped = (
            build_chunks(
                project_id,
                scoped_files,
            )
        )

        if is_deep_request(
            question
        ):

            return (
                build_batched_result(
                    mode="scoped",
                    chunks=chunks,
                    batch=batch,
                    target=target,
                    skipped_files=
                        skipped,
                )
            )

        relevant_chunks = (
            select_relevant_chunks(
                chunks,
                question,
            )
        )

        return build_result(
            mode="scoped",
            target=target,
            items=
                relevant_chunks,
            skipped_files=
                skipped,
        )

    # Deep Project Review
    if mode == "deep":

        chunks, skipped = (
            build_chunks(
                project_id,
                text_files,
            )
        )

        return (
            build_batched_result(
                mode="deep",
                chunks=chunks,
                batch=batch,
                target="whole-project",
                skipped_files=
                    skipped,
            )
        )

    return json.dumps(
        {
            "status":
                "error",

            "message":
                "Unknown project search mode.",
        },
        ensure_ascii=False,
    )