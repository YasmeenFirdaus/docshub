import os
from openai import AsyncOpenAI

provider = os.getenv("AI_PROVIDER", "openai").lower()

if provider == "gemini":
    client = AsyncOpenAI(
        api_key=os.getenv("GEMINI_API_KEY", ""),
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )
    MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
else:
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
    MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
