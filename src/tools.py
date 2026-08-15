from langchain.tools import tool
from pathlib import Path
from rag_pdf_assistant import RAGPipeline
from typing import Literal
import requests


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