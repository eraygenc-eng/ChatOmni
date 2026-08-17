import json
import base64
import uuid
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from langchain.messages import (
    AIMessage,
    AIMessageChunk,
)

from src.agent import get_agent
from src.citations import get_web_sources
from src.context import Context
from src.tools import set_rag_pdf


app = FastAPI()

UPLOAD_DIR = Path("uploads")

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)

IMAGE_UPLOAD_DIR = (
    UPLOAD_DIR / "images"
)

IMAGE_UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True
)

ALLOWED_IMAGE_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}


MAX_IMAGE_SIZE = (
    20 * 1024 * 1024
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


agent = get_agent()


config = {
    "configurable": {
        "thread_id": "current_chat"
    }
}


context = Context(
    user_id="local_user"
)


class ChatRequest(BaseModel):
    message: str
    image_id: str | None = None

def build_user_message(
    request: ChatRequest
):

    if not request.image_id:

        return {
            "role": "user",
            "content": request.message,
        }


    image_id = Path(
        request.image_id
    ).name


    if (
        image_id !=
        request.image_id
    ):
        raise ValueError(
            "Invalid image ID."
        )


    image_path = (
        IMAGE_UPLOAD_DIR /
        image_id
    )


    if not image_path.exists():
        raise ValueError(
            "Uploaded image was not found."
        )


    suffix = (
        image_path
        .suffix
        .lower()
    )


    mime_type = (
        ALLOWED_IMAGE_TYPES
        .get(suffix)
    )


    if not mime_type:
        raise ValueError(
            "Unsupported image format."
        )


    image_bytes = (
        image_path.read_bytes()
    )


    image_base64 = (
        base64.b64encode(
            image_bytes
        )
        .decode("utf-8")
    )


    return {
        "role": "user",

        "content": [
            {
                "type": "text",
                "text":
                    request.message,
            },

            {
                "type": "image",
                "base64":
                    image_base64,
                "mime_type":
                    mime_type,
            },
        ],
    }


def get_tool_display_name(
    tool_name: str
) -> str:

    if not tool_name:
        return "Tool"

    normalized = tool_name.lower()

    if (
        "memory" in normalized
        or "memories" in normalized
        or "saved" in normalized
    ):
        return "Memory"

    if (
        "calculator" in normalized
        or "calculate" in normalized
        or normalized == "math"
    ):
        return "Calculator"

    if (
        "currency" in normalized
        or "exchange" in normalized
    ):
        return "Currency"

    if (
        "rag" in normalized
        or "pdf" in normalized
    ):
        return "RAG"

    if (
        "web" in normalized
        or "search" in normalized
    ):
        return "Web"

    return (
        tool_name
        .replace("_", " ")
        .replace("-", " ")
        .title()
    )


def create_stream_event(
    event_type: str,
    **data,
) -> str:

    event = {
        "type": event_type,
        **data,
    }

    return (
        json.dumps(
            event,
            ensure_ascii=False,
        )
        + "\n"
    )


@app.get("/health")
def health_check():

    return {
        "status": "ok"
    }

@app.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...)
):

    original_name = Path(
        file.filename or "document.pdf"
    ).name


    if (
        Path(original_name)
        .suffix
        .lower()
        != ".pdf"
    ):
        raise HTTPException(
            status_code=400,
            detail="Selected file is not a PDF."
        )


    file_bytes = await file.read()


    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded PDF is empty."
        )


    saved_name = (
        f"{uuid.uuid4().hex}_"
        f"{original_name}"
    )


    saved_path = (
        UPLOAD_DIR /
        saved_name
    )


    try:
        saved_path.write_bytes(
            file_bytes
        )

        set_rag_pdf(
            saved_path
        )

    except Exception as error:

        if saved_path.exists():
            saved_path.unlink()

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )


    return {
        "status": "ok",
        "filename": original_name
    }

@app.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...)
):

    original_name = Path(
        file.filename
        or
        "image.png"
    ).name


    suffix = (
        Path(original_name)
        .suffix
        .lower()
    )


    mime_type = (
        ALLOWED_IMAGE_TYPES
        .get(suffix)
    )


    if not mime_type:
        raise HTTPException(
            status_code=400,

            detail=(
                "Unsupported image format. "
                "Use PNG, JPG, JPEG, or WEBP."
            )
        )


    file_bytes = await file.read()


    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty."
        )


    if (
        len(file_bytes) >
        MAX_IMAGE_SIZE
    ):
        raise HTTPException(
            status_code=400,

            detail=(
                "Image is too large. "
                "Maximum size is 20 MB."
            )
        )


    image_id = (
        f"{uuid.uuid4().hex}"
        f"{suffix}"
    )


    saved_path = (
        IMAGE_UPLOAD_DIR /
        image_id
    )


    try:

        saved_path.write_bytes(
            file_bytes
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


    return {
        "status": "ok",

        "image_id":
            image_id,

        "filename":
            original_name,

        "mime_type":
            mime_type,
    }


@app.post("/chat")
def chat(
    request: ChatRequest
):

    user_message = (
        build_user_message(
            request
        )
    )

    result = agent.invoke(
        {
            "messages": [
                user_message
            ]
        },
        config=config,
        context=context,
    )

    response = (
        result["messages"][-1]
    )

    return {
        "response": response.text
    }


@app.post("/chat/stream")
def chat_stream(
    request: ChatRequest
):

    def generate():

        user_message = (
            build_user_message(
                request
            )
        )

        used_tools = set()

        final_response = None


        for chunk in agent.stream(
            {
                "messages": [user_message]
            },
            config=config,
            context=context,
            stream_mode=[
                "messages",
                "updates",
            ],
            version="v2",
        ):

            # ==================================
            # STREAM TOKENS
            # ==================================

            if (
                chunk["type"]
                == "messages"
            ):

                token, metadata = (
                    chunk["data"]
                )

                if (
                    isinstance(
                        token,
                        AIMessageChunk,
                    )
                    and
                    metadata.get(
                        "langgraph_node"
                    )
                    == "model"
                    and token.text
                ):

                    yield (
                        create_stream_event(
                            "token",
                            content=
                                token.text,
                        )
                    )


            # ==================================
            # AGENT UPDATES
            # ==================================

            elif (
                chunk["type"]
                == "updates"
            ):

                for (
                    source,
                    update,
                ) in (
                    chunk["data"].items()
                ):

                    if not isinstance(
                        update,
                        dict,
                    ):
                        continue


                    messages = (
                        update.get(
                            "messages"
                        )
                    )

                    if not messages:
                        continue


                    message = (
                        messages[-1]
                    )


                    if not isinstance(
                        message,
                        AIMessage,
                    ):
                        continue


                    # --------------------------
                    # SAVE FINAL AI RESPONSE
                    # --------------------------

                    if not (
                        message.tool_calls
                    ):
                        final_response = (
                            message
                        )


                    # --------------------------
                    # CUSTOM TOOL DETECTION
                    # --------------------------

                    for tool_call in (
                        message.tool_calls
                        or []
                    ):

                        tool_name = (
                            tool_call.get(
                                "name"
                            )
                        )

                        if not tool_name:
                            continue


                        display_name = (
                            get_tool_display_name(
                                tool_name
                            )
                        )


                        if (
                            display_name
                            in used_tools
                        ):
                            continue


                        used_tools.add(
                            display_name
                        )


                        yield (
                            create_stream_event(
                                "tool",
                                name=
                                    display_name,
                            )
                        )


        # ==================================
        # WEB SEARCH DETECTION
        # ==================================
        #
        # OpenAI built-in web search is not
        # always exposed through the normal
        # AIMessage.tool_calls field.
        #
        # Instead, detect it from the web
        # citations contained in the final
        # AI response.
        # ==================================

        if final_response is not None:

            web_sources = (
                get_web_sources(
                    final_response
                )
            )

            if (
                web_sources
                and
                "Web"
                not in used_tools
            ):

                used_tools.add(
                    "Web"
                )

                yield (
                    create_stream_event(
                        "tool",
                        name="Web",
                    )
                )


        # ==================================
        # STREAM COMPLETE
        # ==================================

        yield (
            create_stream_event(
                "done"
            )
        )


    return StreamingResponse(
        generate(),
        media_type=(
            "application/x-ndjson; "
            "charset=utf-8"
        ),
    )