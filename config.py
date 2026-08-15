from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

def get_model():
    return ChatOpenAI(
        model = "gpt-5.6-terra",
        use_responses_api=True,
        output_version="responses/v1"  # Use the new Responses API output format
    )