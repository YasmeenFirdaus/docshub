import type { DocumentStatus, Person, WorkspaceNode } from "./types";

function getSource() {
  if (typeof window === 'undefined') return "Unknown";
  const path = window.location.pathname;
  if (path === '/' || path === '/all-docs') return "All Docs";
  if (path.includes('/workspace')) return "Folder";
  if (path.includes('/document/')) return "Editor";
  if (path.includes('/admin')) return "System";
  if (path.includes('/favorites')) return "Favorites";
  if (path.includes('/recent')) return "Recent";
  if (path.includes('/trash')) return "Trash";
  if (path.includes('/shared-with-me')) return "Shared with Me";
  return "Unknown";
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  let finalInit = { ...init };
  if (init?.body && typeof init.body === 'string') {
    try {
      const parsed = JSON.parse(init.body);
      if (!parsed.source) {
        parsed.source = getSource();
        finalInit.body = JSON.stringify(parsed);
      }
    } catch (e) {}
  }

  const response = await fetch(input, {
    ...finalInit,
    headers: {
      "Content-Type": "application/json",
      ...(finalInit?.headers ?? {}),
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
    body: JSON.stringify({ user_ids: userIds, source: getSource() }),
  });
}

export async function fetchDocumentMoveTargets() {
  return requestJson<WorkspaceNode[]>(`/api/workspaces`);
}

export async function fetchWorkspaceMembers(workspaceId: string) {
  return requestJson<Person[]>(`/api/workspaces/${workspaceId}/members`);
}
