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

export async function updateDocumentStatus(documentId: string, status: DocumentStatus, workspaceEdit: boolean = true) {
  return requestJson(`/api/documents/${documentId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "STATUS", payload: { status, workspace_edit: workspaceEdit } }),
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

export async function restoreDocument(documentId: string) {
  return requestJson(`/api/documents/${documentId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "RESTORE" })
  });
}

export async function permanentDeleteDocument(documentId: string) {
  return requestJson(`/api/documents/${documentId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "PERMANENT_DELETE" })
  });
}

export async function duplicateDocument(documentId: string) {
  return requestJson<{ document: { id: string } }>(`/api/documents/${documentId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "DUPLICATE" })
  });
}

export async function addReviewers(documentId: string, reviewerIds: string[], comment?: string) {
  const payload: any = { reviewerIds };
  if (comment?.trim()) payload.comment = comment.trim();

  return requestJson(`/api/documents/${documentId}/actions`, {
    method: "POST",
    body: JSON.stringify({ action: "REQUEST_REVIEW", payload }),
  });
}

export async function addContributors(documentId: string, userIds: string[]) {
  return requestJson(`/api/documents/${documentId}/contributors`, {
    method: "POST",
    body: JSON.stringify({ user_ids: userIds }),
  });
}

export async function fetchDocumentMoveTargets() {
  return requestJson<WorkspaceNode[]>(`/api/workspaces`);
}

export async function fetchWorkspaceMembers(workspaceId: string) {
  return requestJson<Person[]>(`/api/workspaces/${workspaceId}/members`);
}
