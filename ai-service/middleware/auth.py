import os
import json
from fastapi import Request, HTTPException
from typing import Any, Dict


def verify_token(request: Request) -> Dict[str, Any]:
    """
    Verify the JWT token forwarded from Next.js.
    Next.js sends the decoded token JSON as the Bearer value since
    we are internal service-to-service — no need for signature verification
    in dev. In production, verify against NEXTAUTH_SECRET using PyJWT.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")

    token_str = auth[7:]

    try:
        token = json.loads(token_str)
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token format")

    if not token.get("id") or not token.get("role"):
        raise HTTPException(status_code=401, detail="Invalid token payload")

    return token
