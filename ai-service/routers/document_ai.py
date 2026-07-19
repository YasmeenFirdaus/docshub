from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Any, Optional, List
from middleware.auth import verify_token
from openai import AsyncOpenAI
import os
import json

router = APIRouter()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class AskRequest(BaseModel):
    documentId: str
    content: Optional[Any] = None
    title: str = "Untitled"
    query: str
    history: Optional[List[dict]] = []
    # Optional second document for compare
    compareDoc: Optional[dict] = None  # {title, content}


class SummarizeRequest(BaseModel):
    documentId: str
    content: Optional[Any] = None
    title: str = "Untitled"


class TagsRequest(BaseModel):
    documentId: str
    content: Optional[Any] = None
    title: str = "Untitled"


class SuggestEditsRequest(BaseModel):
    documentId: str
    content: Optional[Any] = None
    title: str = "Untitled"
    query: Optional[str] = None


def content_to_text(content: Any) -> str:
    """Flatten BlockNote JSON to plain text for context."""
    if not content:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, dict):
        blocks = content.get("content", [])
    elif isinstance(content, list):
        blocks = content
    else:
        return ""

    parts = []
    for block in blocks:
        if isinstance(block, dict):
            for inline in block.get("content", []):
                if isinstance(inline, dict) and inline.get("type") == "text":
                    parts.append(inline.get("text", ""))
    return " ".join(parts)


@router.post("/ask")
async def ask_document(req: Request, body: AskRequest):
    verify_token(req)

    doc_text = content_to_text(body.content)
    system = f'You are an AI assistant helping a user with their document titled "{body.title}".\nBe concise, helpful and accurate.\n\nDocument content:\n{doc_text[:8000]}'

    # If a compare doc is provided, inject it
    if body.compareDoc:
        compare_text = content_to_text(body.compareDoc.get("content"))
        compare_title = body.compareDoc.get("title", "Comparison Document")
        system += f'\n\nComparison document titled "{compare_title}":\n{compare_text[:4000]}'

    messages = [{"role": "system", "content": system}]
    for msg in (body.history or []):
        if msg.get("role") in ("user", "assistant"):
            messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": body.query})

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=1000,
    )
    return {"answer": response.choices[0].message.content}


@router.post("/summarize")
async def summarize_document(req: Request, body: SummarizeRequest):
    verify_token(req)
    doc_text = content_to_text(body.content)

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a document summarization assistant. Return a concise summary with key bullet points."},
            {"role": "user", "content": f'Summarize this document titled "{body.title}":\n\n{doc_text[:8000]}'},
        ],
        max_tokens=600,
    )
    return {"summary": response.choices[0].message.content}


@router.post("/suggest-tags")
async def suggest_tags(req: Request, body: TagsRequest):
    verify_token(req)
    doc_text = content_to_text(body.content)

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": 'You are a document tagging assistant. Return only a JSON object like {"tags": ["tag1", "tag2"]} with 3-7 short tags. No explanation.'},
            {"role": "user", "content": f'Suggest tags for this document titled "{body.title}":\n\n{doc_text[:4000]}'},
        ],
        max_tokens=150,
        response_format={"type": "json_object"},
    )
    try:
        result = json.loads(response.choices[0].message.content or "{}")
        tags = result.get("tags", [])
    except Exception:
        tags = []
    return {"tags": tags}


@router.post("/suggest-edits")
async def suggest_edits(req: Request, body: SuggestEditsRequest):
    verify_token(req)
    doc_text = content_to_text(body.content)
    instruction = body.query or "Suggest improvements to this document."

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a document editing assistant. Provide specific, actionable suggestions to improve clarity, structure, and content quality."},
            {"role": "user", "content": f'{instruction}\n\nDocument titled "{body.title}":\n\n{doc_text[:6000]}'},
        ],
        max_tokens=800,
    )
    return {"answer": response.choices[0].message.content}
