from langchain.agents import create_agent
from config import get_model
from src.tools import calculator, web_search_tool, rag_pdf, currency_converter

SYSTEM_PROMPT = """
You are ChatOmni, a helpful AI assistant.

Respond in the same language as the user by default.
If the user asks for another language, follow the user's request.

Use web search when the user asks for current, recent, or time-sensitive information.
Use available tools only when they are useful.
Use the rag_pdf tool when the user asks about the loaded PDF document.

Be clear, helpful, and conversational.
"""

def get_agent():
    model = get_model()

    # Create ChatOmni agent
    return create_agent(
        model=model,
        tools=[calculator, web_search_tool, rag_pdf, currency_converter],
        system_prompt=SYSTEM_PROMPT
    )