from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional
from middleware.auth import verify_token
from openai import AsyncOpenAI
import os

router = APIRouter()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

ACTION_PROMPTS = {
    "change_tone": "Rewrite the following text with a more engaging tone. Return only the rewritten text.",
    "make_professional": "Rewrite the following text to be more professional and formal. Return only the rewritten text.",
    "fix_grammar": "Fix all grammar, spelling, and punctuation errors in the following text. Return only the corrected text.",
    "simplify": "Simplify the following text to be clearer and easier to understand. Return only the simplified text.",
    "autocomplete": "Continue writing from where this text ends, maintaining the same style and context. Return only the continuation.",
    "suggest_edits": "Suggest improvements to the following text. Return the improved version only.",
    "shorten": "Make the following text more concise without losing key information. Return only the shortened text.",
    "expand": "Expand the following text with more detail and context. Return only the expanded text.",
}


class InlineRequest(BaseModel):
    selectedText: str
    action: str
    context: Optional[str] = None          # surrounding text
    documentContext: Optional[str] = None   # alias sent by the frontend


@router.post("/inline")
async def inline_transform(req: Request, body: InlineRequest):
    verify_token(req)

    prompt = ACTION_PROMPTS.get(body.action, "Improve the following text. Return only the improved text.")

    messages = [
        {"role": "system", "content": prompt},
    ]

    ctx = body.context or body.documentContext
    if ctx:
        messages.append({
            "role": "user",
            "content": f"Context (do not modify):\n{ctx[:500]}\n\nText to transform:\n{body.selectedText}",
        })
    else:
        messages.append({"role": "user", "content": body.selectedText})

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=800,
    )

    return {"result": response.choices[0].message.content}
