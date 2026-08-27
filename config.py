from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

MODEL_IDS = {
    "luna": "gpt-5.6-luna",
    "terra": "gpt-5.6-terra"
}

def get_model(model_name: str = "luna"):
    normalized_name = (model_name.strip().lower())

    model_id = MODEL_IDS.get(normalized_name)

    if model_id is None:
        raise ValueError(f"Unsupported model: {model_name}")

    return ChatOpenAI(
        model=model_id,
        use_responses_api=True,
        output_version="responses/v1",
         max_tokens=8192,
        timeout=120,
        max_retries=2
    )