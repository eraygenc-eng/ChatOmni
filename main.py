from langchain.messages import AIMessage, AIMessageChunk
from src.agent import get_agent
from src.citations import get_web_sources
from src.tools import set_rag_pdf
from src.context import Context


# Load the ChatOmni agent
agent = get_agent()

# Configuration for short-term memory
config = {
    "configurable": {
        "thread_id": "current_chat"
    }
}

# Configuration for long-term memory
context = Context(
    user_id="local_user"
)

print("ChatOmni is ready. Type 'exit' to stop.\n")


while True:
    # Get user input
    user_input = input("You: ")

    # Stop the program
    if user_input.lower() == "exit":
        print("ChatOmni: Goodbye!")
        break

    # Load a PDF
    if user_input.lower() == "/pdf" or user_input.lower().startswith("/pdf "):
        pdf_path = user_input[4:].strip().strip('"')

        if not pdf_path:
            print("ChatOmni: Please provide a PDF path.\n")
            continue

        try:
            set_rag_pdf(pdf_path)
            print(f"ChatOmni: PDF loaded: {pdf_path}\n")

        except (FileNotFoundError, ValueError) as e:
            print(f"ChatOmni: {e}\n")

        continue

    # Stream the agent response
    print("ChatOmni: ", end="", flush=True)

    final_response = None

    for chunk in agent.stream(
        {
            "messages": [
                {
                    "role": "user",
                    "content": user_input
                }
            ]
        },
        config=config,
        context=context,
        stream_mode=["messages", "updates"],
        version="v2"
    ):

        # Stream LLM tokens as they are generated
        if chunk["type"] == "messages":
            token, metadata = chunk["data"]

            # Stream LLM tokens as they are generated
            if chunk["type"] == "messages":
                token, metadata = chunk["data"]

                if (
                    isinstance(token, AIMessageChunk)
                    and metadata.get("langgraph_node") == "model"
                    and token.text
                ):
                    print(token.text, end="", flush=True)

        # Capture completed AI messages for citations
        elif chunk["type"] == "updates":
            for source, update in chunk["data"].items():
                if source == "model" and "messages" in update:
                    message = update["messages"][-1]

                    if (
                        isinstance(message, AIMessage)
                        and not message.tool_calls
                    ):
                        final_response = message

    print("\n")

    # Get web sources from the final response
    if final_response is not None:
        sources = get_web_sources(final_response)

        # Print sources if web search was used
        if sources:
            print("Sources: ")

            for index, source in enumerate(sources, start=1):
                print(f"{index}. {source['title']}")
                print(f"   {source['url']}")

            print()