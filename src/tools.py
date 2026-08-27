from langchain.tools import tool, ToolRuntime
from pathlib import Path
from rag_pdf_assistant import RAGPipeline
from typing import Literal
import requests
import uuid
import json
from src.context import Context
from src.code_sandbox import run_code_sandbox
import re
from src.project_files import get_project_files
from src.project_retrieval import retrieve_project_context
from src.artifacts import build_artifact


GENERATED_CODE_DIR = (
    Path("uploads") /
    "generated"
)

GENERATED_CODE_DIR.mkdir(
    parents=True,
    exist_ok=True
)


ALLOWED_GENERATED_EXTENSIONS = {
    ".py",
    ".js",
    ".mjs",
    ".cjs",
    ".java",
    ".c",
    ".h",
    ".cpp",
    ".cc",
    ".cxx",
    ".hpp",
    ".cs",
    ".go",
    ".txt",
}


MAX_GENERATED_FILE_SIZE = (
    200 * 1024
)

MAX_GENERATED_ARTIFACT_SIZE = (
    25 * 1024 * 1024
)

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
    ".dockerfile",
}

MAX_PROJECT_FILE_READ_SIZE = (
    300 * 1024
)

MAX_PROJECT_SEARCH_RESULTS = 6


def get_project_search_terms(
    question: str
):

    words = re.findall(
        r"[A-Za-z0-9_./\\-]+",
        question.lower(),
    )

    stop_words = {
        "the",
        "a",
        "an",
        "is",
        "are",
        "in",
        "on",
        "of",
        "to",
        "for",
        "and",
        "or",
        "this",
        "that",
        "with",
        "from",
        "my",
        "project",
        "code",
        "file",
        "files",

        "bu",
        "şu",
        "bir",
        "ve",
        "veya",
        "ile",
        "için",
        "projede",
        "proje",
        "kod",
        "dosya",
        "dosyada",
        "nerede",
        "nasıl",
        "neden",
    }

    return {
        word
        for word in words
        if (
            len(word) >= 2
            and word not in stop_words
        )
    }


def score_project_file(
    file_data: dict,
    search_terms: set[str],
) -> int:

    relative_path = (
        file_data["relative_path"]
        .lower()
    )

    file_name = (
        file_data["file_name"]
        .lower()
    )

    score = 0

    for term in search_terms:

        if term == file_name:
            score += 20

        if term in file_name:
            score += 10

        if term in relative_path:
            score += 5

    return score


def read_project_text_file(
    project_id: str,
    relative_path: str,
):

    project_root = (
        PROJECTS_DATA_DIR /
        project_id
    ).resolve()

    file_path = (
        project_root /
        relative_path
    ).resolve()

    try:
        file_path.relative_to(
            project_root
        )

    except ValueError:
        return None

    if (
        not file_path.exists()
        or
        not file_path.is_file()
    ):
        return None

    if (
        file_path.stat().st_size
        >
        MAX_PROJECT_FILE_READ_SIZE
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
        

@tool
def project_search(
    question: str,
    runtime: ToolRuntime[Context],
    mode: Literal[
        "targeted",
        "scoped",
        "deep",
    ] = "targeted",
    target: str = "",
    batch: int = 0,
) -> str:
    """
    Search and inspect files from the active ChatOmni Project.

    Modes:

    targeted:
        Use for a specific file or a focused project question.
        If the user explicitly names a file, only that file is searched.

    scoped:
        Use when the user asks about a specific folder or module.

    deep:
        Use when the user asks for a deep, complete, or comprehensive
        review of the whole project or uploaded ZIP.

    For deep reviews, results may be returned in multiple batches.
    When has_more is true, call this tool again using next_batch
    until every batch has been inspected.

    Never ask the user for a project ID.

    Args:
        question: The user's project-related request.
        mode: Retrieval mode.
        target: File path, filename, folder, or module when relevant.
        batch: Batch number for multi-batch deep reviews.
    """

    project_id = (
        runtime.context.project_id
    )

    if not project_id:

        return (
            "No active project is associated "
            "with this conversation."
        )

    return retrieve_project_context(
        project_id=project_id,
        question=question,
        mode=mode,
        target=target,
        batch=batch,
    )

@tool
def project_stats(
    runtime: ToolRuntime[Context],
    extension: str = "",
) -> str:
    """
    Get exact file and line-count statistics for the active ChatOmni Project.

    Use this tool for questions such as:
    - How many files are in the project?
    - How many .cs files are there?
    - How many Python files are there?
    - How many total lines of code are in the .cs files?
    - Show the line count of each file.

    This tool reads project files directly and does not use semantic
    retrieval or chunk-based project search.

    Args:
        extension:
            Optional file extension filter such as ".cs", ".py", ".js".
            Leave empty to include all readable project text/source files.
    """

    project_id = runtime.context.project_id

    if not project_id:
        return json.dumps(
            {
                "status": "error",
                "message": "No active project is associated with this conversation.",
            },
            ensure_ascii=False,
        )

    normalized_extension = extension.strip().lower()

    if normalized_extension and not normalized_extension.startswith("."):
        normalized_extension = f".{normalized_extension}"

    project_files = get_project_files(project_id)

    selected_files = []

    for file_data in project_files:

        relative_path = file_data["relative_path"]

        suffix = Path(relative_path).suffix.lower()

        if (
            normalized_extension
            and suffix != normalized_extension
        ):
            continue

        if (
            suffix not in PROJECT_TEXT_EXTENSIONS
        ):
            continue

        content = read_project_text_file(
            project_id,
            relative_path,
        )

        if content is None:
            continue

        line_count = len(content.splitlines())

        selected_files.append(
            {
                "path": relative_path,
                "extension": suffix,
                "lines": line_count,
            }
        )

    total_lines = sum(
        file_data["lines"]
        for file_data in selected_files
    )

    extension_counts = {}

    for file_data in selected_files:
        suffix = file_data["extension"]

        extension_counts[suffix] = (
            extension_counts.get(suffix, 0) + 1
        )

    return json.dumps(
        {
            "status": "ok",
            "extension_filter":
                normalized_extension or None,
            "file_count":
                len(selected_files),
            "total_lines":
                total_lines,
            "extension_counts":
                extension_counts,
            "files":
                selected_files,
        },
        ensure_ascii=False,
    )


@tool
def calculator(
    a: float,
    b: float,
    operation: Literal["add", "subtract", "multiply", "divide"]
) -> float:
    """Perform a basic mathematical operation.

    operation must be one of:
    - add
    - subtract
    - multiply
    - divide
    """

    if operation == "add":
        return a + b
    
    elif operation == "subtract":
        return a - b
    
    elif operation == "multiply":
        return a * b
    
    elif operation == "divide":
        if b == 0:
            raise ValueError("Cannot divide by zero")
        return a / b
    
    else:
        raise ValueError("Unknown Operation")


@tool
def code_sandbox(
    language: Literal[
        "python",
        "javascript",
        "java",
        "c",
        "cpp",
        "csharp",
        "go",
    ],
    code: str
) -> str:
    """
    Execute code inside an isolated Docker sandbox.

    Supported languages:
    Python, JavaScript, Java, C, C++, C#, and Go.

    Use this tool when the user explicitly asks to run, execute,
    test, verify, or debug code, or when executing code is useful
    for checking a programming result.

    Do not claim that code was executed unless this tool was used.

    Args:
        language: Programming language of the code.
        code: Source code to execute.
    """

    return run_code_sandbox(
        language,
        code
    )


@tool
def create_code_file(
    filename: str,
    content: str
) -> str:
    """
    Create a downloadable code or text file.

    Use this tool only when the user explicitly asks for code
    or text to be provided as an actual file.

    Examples:
    - "Give this to me as app.py"
    - "Create Program.cs"
    - "Provide the code as main.cpp"
    - "Save this as a .txt file"

    Args:
        filename: Name of the file including its extension.
        content: Complete text content of the file.
    """

    if not isinstance(
        filename,
        str
    ):

        return json.dumps({
            "status": "error",
            "message":
                "Filename must be a string."
        })


    filename = (
        filename.strip()
    )


    if not filename:

        return json.dumps({
            "status": "error",
            "message":
                "Filename cannot be empty."
        })


    if (
        "/" in filename
        or
        "\\" in filename
    ):

        return json.dumps({
            "status": "error",
            "message":
                "Filename cannot contain a path."
        })


    safe_filename = (
        Path(filename).name
    )


    if (
        safe_filename !=
        filename
    ):

        return json.dumps({
            "status": "error",
            "message":
                "Invalid filename."
        })


    suffix = (
        Path(safe_filename)
        .suffix
        .lower()
    )


    if (
        suffix not in
        ALLOWED_GENERATED_EXTENSIONS
    ):

        return json.dumps({
            "status": "error",
            "message":
                "Unsupported file extension."
        })


    if not isinstance(
        content,
        str
    ):

        return json.dumps({
            "status": "error",
            "message":
                "File content must be text."
        })


    file_bytes = (
        content.encode(
            "utf-8"
        )
    )


    if (
        len(file_bytes) >
        MAX_GENERATED_FILE_SIZE
    ):

        return json.dumps({
            "status": "error",
            "message":
                "Generated file is too large."
        })


    file_id = (
        f"{uuid.uuid4().hex}_"
        f"{safe_filename}"
    )


    file_path = (
        GENERATED_CODE_DIR /
        file_id
    )


    try:

        file_path.write_bytes(
            file_bytes
        )

    except Exception as error:

        return json.dumps({
            "status": "error",
            "message":
                str(error)
        })


    return json.dumps(
        {
            "status": "ok",
            "file_id":
                file_id,
            "filename":
                safe_filename,
            "extension":
                suffix,
            "size":
                len(file_bytes),
        },
        ensure_ascii=False,
    )

@tool
def create_artifact(
    filename: str,
    spec: dict,
) -> str:
    """
    Create a downloadable document or archive.

    Supported formats:
    DOCX, PDF, XLSX, PPTX, and ZIP.

    Use this tool when the user explicitly asks for an actual
    downloadable Word document, PDF, Excel workbook,
    PowerPoint presentation, or ZIP archive.

    The spec structure depends on the requested format.

    DOCX / PDF example:
    {
        "title": "Report",
        "subtitle": "Optional subtitle",
        "sections": [
            {
                "heading": "Introduction",
                "paragraphs": [
                    "First paragraph."
                ],
                "bullets": [
                    "First item",
                    "Second item"
                ],
                "tables": [
                    {
                        "headers": ["Column A", "Column B"],
                        "rows": [
                            ["Value 1", "Value 2"]
                        ]
                    }
                ]
            }
        ]
    }

    XLSX example:
    {
        "sheets": [
            {
                "name": "Results",
                "headers": ["Name", "Score"],
                "rows": [
                    ["Alice", 95],
                    ["Bob", 90]
                ]
            }
        ]
    }

    PPTX example:
    {
        "title": "Presentation Title",
        "subtitle": "Optional subtitle",
        "slides": [
            {
                "title": "Overview",
                "bullets": [
                    "First point",
                    "Second point"
                ]
            }
        ]
    }

    ZIP example:
    {
        "files": [
            {
                "path": "main.py",
                "content": "print('Hello')"
            },
            {
                "path": "README.md",
                "content": "# Project"
            }
        ]
    }

    Args:
        filename:
            Output filename including one of these extensions:
            .docx, .pdf, .xlsx, .pptx, .zip

        spec:
            Structured content used to build the requested artifact.
    """

    if not isinstance(
        filename,
        str,
    ):
        return json.dumps(
            {
                "status": "error",
                "message":
                    "Filename must be a string.",
            },
            ensure_ascii=False,
        )

    filename = filename.strip()

    if not filename:
        return json.dumps(
            {
                "status": "error",
                "message":
                    "Filename cannot be empty.",
            },
            ensure_ascii=False,
        )

    if (
        "/" in filename
        or
        "\\" in filename
    ):
        return json.dumps(
            {
                "status": "error",
                "message":
                    "Filename cannot contain a path.",
            },
            ensure_ascii=False,
        )

    safe_filename = Path(
        filename
    ).name

    if safe_filename != filename:
        return json.dumps(
            {
                "status": "error",
                "message":
                    "Invalid filename.",
            },
            ensure_ascii=False,
        )

    suffix = (
        Path(safe_filename)
        .suffix
        .lower()
    )

    allowed_extensions = {
        ".docx",
        ".pdf",
        ".xlsx",
        ".pptx",
        ".zip",
    }

    if suffix not in allowed_extensions:
        return json.dumps(
            {
                "status": "error",
                "message": (
                    "Unsupported artifact extension. "
                    "Supported formats are "
                    ".docx, .pdf, .xlsx, .pptx, and .zip."
                ),
            },
            ensure_ascii=False,
        )

    if not isinstance(
        spec,
        dict,
    ):
        return json.dumps(
            {
                "status": "error",
                "message":
                    "Artifact spec must be an object.",
            },
            ensure_ascii=False,
        )

    file_id = (
        f"{uuid.uuid4().hex}_"
        f"{safe_filename}"
    )

    file_path = (
        GENERATED_CODE_DIR /
        file_id
    )

    try:
        build_artifact(
            path=file_path,
            suffix=suffix,
            spec=spec,
        )

        if (
            not file_path.exists()
            or
            not file_path.is_file()
        ):
            raise ValueError(
                "Artifact generation did not produce a file."
            )

        file_size = (
            file_path.stat().st_size
        )

        if file_size == 0:
            raise ValueError(
                "Generated artifact is empty."
            )

        if (
            file_size
            >
            MAX_GENERATED_ARTIFACT_SIZE
        ):
            file_path.unlink(
                missing_ok=True
            )

            return json.dumps(
                {
                    "status": "error",
                    "message":
                        "Generated artifact is too large.",
                },
                ensure_ascii=False,
            )

    except Exception as error:

        if file_path.exists():
            file_path.unlink(
                missing_ok=True
            )

        return json.dumps(
            {
                "status": "error",
                "message":
                    str(error),
            },
            ensure_ascii=False,
        )

    return json.dumps(
        {
            "status": "ok",
            "file_id":
                file_id,
            "filename":
                safe_filename,
            "extension":
                suffix,
            "size":
                file_size,
        },
        ensure_ascii=False,
    )

@tool
def currency_converter(
    amount: float,
    from_currency : str,
    to_currency: str
) -> str:
    """
Convert an amount from one currency to another using the latest
available exchange rate.

Use ISO 4217 currency codes such as:
USD, EUR, TRY, GBP, DKK, CHF, JPY.

Args:
    amount: Amount of money to convert.
    from_currency: Source currency code.
    to_currency: Target currency code.
"""

    base = from_currency.strip().upper()
    quote = to_currency.strip().upper()

    if base == quote:
        return f"{amount:g} {base} = {amount:g} {quote}"

    url = f"https://api.frankfurter.dev/v2/rate/{base}/{quote}"

    try:
        response = requests.get(url, timeout = 10)
        response.raise_for_status()

        data = response.json()

        rate = data["rate"]
        date = data["date"]
        converted_amount = amount * rate

        return(
            f"{amount:g} {base} = {converted_amount:.4f} {quote}. "
            f"Exchange rate: 1 {base} = {rate} {quote}. "
            f"Rate date: {date}."
        )

    except requests.RequestException as error:
        return f"Currency conversion failed: {error}"

    except (KeyError, TypeError, ValueError):
        return "Currency conversion failed because the API returned an unexpected response."
    

# OpenAI built-in web search tool
web_search_tool = {
    "type": "web_search"
}

_active_pdf_path = None
_rag_pipeline = None


def set_rag_pdf(pdf_path):
    global _active_pdf_path, _rag_pipeline

    pdf_path = Path(pdf_path)

    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    # Get the file extension, for example: .pdf, .jpg, .txt
    if pdf_path.suffix.lower() != ".pdf":
        raise ValueError("Selected file is not a PDF.")

    _active_pdf_path = pdf_path

    # Reset the pipeline when the PDF changes
    _rag_pipeline = None


def get_rag_pipeline():
    global _rag_pipeline

    if _active_pdf_path is None:
        raise ValueError("No PDF has been loaded yet.")

    if _rag_pipeline is None:
        _rag_pipeline = RAGPipeline(_active_pdf_path)

    return _rag_pipeline


@tool
def rag_pdf(question: str) -> str:
    """
    Use this tool when the user asks a question about the loaded PDF document.
    Pass the user's PDF-related question as the input.
    """
    rag = get_rag_pipeline()
    return rag.ask(question)

@tool
def save_memory(
    memory: str,
    runtime: ToolRuntime[Context]
) -> str:
    """
    Save information to the user's long-term memory.

    Use this tool when the user explicitly asks to remember,
    save, store, or not forget some information.
    """

    if runtime.store is None:
        return "Long-term memory store is unavailable."

    user_id = runtime.context.user_id

    namespace = (
        "users",
        user_id,
        "explicit_memories"
    )

    # Using uuid4, create a unique ID for each saved memory
    memory_id = str(uuid.uuid4())

    runtime.store.put(
        namespace,
        memory_id,
        {
            "memory": memory
        }
    )

    return "Memory saved successfully."

# For read saved memories from long-term memory
@tool
def get_saved_memories(
    runtime: ToolRuntime[Context]
) -> str:
    """
    Retrieve the user's previously saved long-term memories.
    Use this when previously remembered user information may help answer the question.
    """

    if runtime.store is None:
        return "Long-term memory store is unavailable."

    user_id = runtime.context.user_id

    namespace = (
        "users",
        user_id,
        "explicit_memories"
    )

    memories = runtime.store.search(
        namespace,
        limit=100
    )

    if not memories:
        return "No saved memories found."

    return "\n".join(
        f"- {item.value['memory']}"
        for item in memories
        if "memory" in item.value
    )