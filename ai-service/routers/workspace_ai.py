from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Any, Optional, List
from middleware.auth import verify_token
from openai import AsyncOpenAI
import os
import json

router = APIRouter()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class WorkspaceQueryRequest(BaseModel):
    query: str
    workspaceIds: Optional[List[str]] = []
    documents: Optional[List[dict]] = []  # [{id, title, content_text}] sent by the proxy
    action: Optional[str] = "ask"


class CompareRequest(BaseModel):
    doc_a: dict  # {title, content}
    doc_b: dict  # {title, content}
    query: Optional[str] = "Compare these two documents"


@router.post("/query")
async def workspace_query(req: Request, body: WorkspaceQueryRequest):
    verify_token(req)

    # Build context from documents the UI provides directly
    doc_snippets = "\n\n".join([
        f"Document: {d.get('title', 'Untitled')}\n{str(d.get('content_text', d.get('content', '')))[:1000]}"
        for d in (body.documents or [])[:10]
    ])

    context_section = f"\nWorkspace documents:\n{doc_snippets}" if doc_snippets else ""

    system = (
        "You are an AI assistant for a workspace knowledge base."
        + context_section
        + "\n\nAnswer the user accurately. If no documents are available, say so."
    )

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": body.query},
        ],
        max_tokens=1200,
    )
    return {"answer": response.choices[0].message.content}


@router.post("/compare")
async def compare_documents(req: Request, body: CompareRequest):
    verify_token(req)

    from routers.document_ai import content_to_text
    text_a = content_to_text(body.doc_a.get("content"))
    text_b = content_to_text(body.doc_b.get("content"))
    title_a = body.doc_a.get("title", "Document A")
    title_b = body.doc_b.get("title", "Document B")

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": "You are a document comparison assistant. Compare documents clearly, noting similarities, differences, and key distinctions.",
            },
            {
                "role": "user",
                "content": f"""{body.query}

--- {title_a} ---
{text_a[:4000]}

--- {title_b} ---
{text_b[:4000]}""",
            },
        ],
        max_tokens=1000,
    )
    return {"comparison": response.choices[0].message.content}
