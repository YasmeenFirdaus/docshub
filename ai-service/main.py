from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# Load .env variables before importing routers (which initialize AsyncOpenAI using env variables)
from dotenv import load_dotenv
load_dotenv()

from routers import document_ai, workspace_ai, editor_ai

app = FastAPI(title="DocHub AI Service", version="1.0.0")

# CORS — only allow Next.js origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("NEXTJS_ORIGIN", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["*"],
)

app.include_router(document_ai.router, prefix="/ai/document")
app.include_router(workspace_ai.router, prefix="/ai/workspace")
app.include_router(editor_ai.router, prefix="/ai/editor")

@app.get("/health")
def health():
    return {"status": "ok"}
