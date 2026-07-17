import type { DocumentStatus, Person, WorkspaceNode } from "./types";

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : "Request failed";
    throw new Error(message);
  }

  return data as T;
}

export async function renameDocument(documentId: string, title: string) {
  return requestJson(`/api/documents/${documentId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "RENAME", payload: { title } }),
  });
}

export async function updateDocumentStatus(documentId: string, status: DocumentStatus) {
  return requestJson(`/api/documents/${documentId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "STATUS", payload: { status } }),
  });
}

export async function moveDocument(documentId: string, workspaceId: string, folderId: string | null) {
  return requestJson(`/api/documents/${documentId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "MOVE", payload: { workspace_id: workspaceId, folder_id: folderId } }),
  });
}

export async function toggleFavorite(documentId: string) {
  return requestJson(`/api/documents/${documentId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "TOGGLE_FAVORITE" })
  });
}

export async function archiveDocument(documentId: string) {
  return requestJson(`/api/documents/${documentId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "ARCHIVE" })
  });
}

export async function deleteDocument(documentId: string) {
  return requestJson(`/api/documents/${documentId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "DELETE" })
  });
}

export async function addReviewer(documentId: string, reviewerId: string, comment?: string) {
  const payload: Record<string, string> = { reviewer_id: reviewerId };
  if (comment?.trim()) payload.comment = comment.trim();

  return requestJson(`/api/documents/${documentId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "REQUEST_REVIEW", payload }),
  });
}

// Note: Ensure you have a dedicated route for this, or add 'SHARE' to your unified actions switch
export async function addContributors(documentId: string, userIds: string[], permission: "VIEW" | "EDIT" = "VIEW") {
  return requestJson(`/api/documents/${documentId}/share`, {
    method: "POST",
    body: JSON.stringify({ shared_with: userIds, permission }),
  });
}

export async function fetchDocumentMoveTargets() {
  return requestJson<WorkspaceNode[]>(`/api/workspaces`);
}

export async function fetchWorkspaceMembers(workspaceId: string) {
  return requestJson<Person[]>(`/api/workspaces/${workspaceId}/members`);
}