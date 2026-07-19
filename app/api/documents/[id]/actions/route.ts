import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ActivityType, DocumentStatus, Role, ReviewStatus } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateSearchVector } from "@/lib/search";

type DocumentAction =
  | "MOVE"
  | "STATUS"
  | "RENAME"
  | "ARCHIVE"
  | "RESTORE"
  | "DELETE"
  | "DUPLICATE"
  | "TOGGLE_FAVORITE"
  | "REQUEST_REVIEW"
  | "UPDATE_REVIEW_STATUS"
  | "PERMANENT_DELETE";

type ActionBody = {
  action?: unknown;
  payload?: unknown;
};

type PayloadObject = Record<string, unknown>;

function isRecord(value: unknown): value is PayloadObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return asString(value);
}

function asDocumentAction(value: unknown): DocumentAction | null {
  if (typeof value !== "string") return null;
  const allowed: DocumentAction[] = [
    "MOVE",
    "STATUS",
    "RENAME",
    "ARCHIVE",
    "RESTORE",
    "DELETE",
    "DUPLICATE",
    "TOGGLE_FAVORITE",
    "REQUEST_REVIEW",
    "UPDATE_REVIEW_STATUS",
    "PERMANENT_DELETE",
  ];
  return (allowed as readonly string[]).includes(value) ? (value as DocumentAction) : null;
}

function isDocumentStatus(value: unknown): value is DocumentStatus {
  return (
    typeof value === "string" &&
    Object.values(DocumentStatus).includes(value as DocumentStatus)
  );
}

function activityFor(action: DocumentAction): ActivityType {
  switch (action) {
    case "DELETE":
    case "PERMANENT_DELETE":
      return ActivityType.DOCUMENT_DELETED;
    case "REQUEST_REVIEW":
    case "UPDATE_REVIEW_STATUS":
      return ActivityType.REVIEW_REQUESTED;
    default:
      return ActivityType.DOCUMENT_EDITED;
  }
}

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { id?: string; role?: string | Role; email?: string | null; name?: string | null }
    | undefined;

  const userId = user?.id?.trim();
  if (!session || !userId) return null;

  const role = user?.role === Role.ADMIN || user?.role === "ADMIN" ? Role.ADMIN : Role.USER;

  return { session, userId, role };
}

async function loadDocumentContext(documentId: string, userId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      title: true,
      workspace_id: true,
      folder_id: true,
      owner_id: true,
      visibility: true,
      workspace_edit: true,
      status: true,
      is_archived: true,
      is_deleted: true,
      deleted_at: true,
    },
  });

  if (!doc) return null;

  const workspaceMember = await prisma.workspaceMember.findFirst({
    where: {
      workspace_id: doc.workspace_id,
      user_id: userId,
    },
    select: { role: true },
  });

  const sharedWithUser = await prisma.documentShare.findFirst({
    where: {
      document_id: doc.id,
      shared_with: userId,
    },
    select: { id: true, permission: true },
  });
  const contributor = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM document_contributors
    WHERE document_id = ${doc.id} AND user_id = ${userId}
    LIMIT 1
  `;

  const isOwner = doc.owner_id === userId;
  const isWorkspaceAdmin = workspaceMember?.role === Role.ADMIN;

  const canRead =
    isOwner ||
    isWorkspaceAdmin ||
    (doc.visibility === "WORKSPACE" && Boolean(workspaceMember)) ||
    Boolean(sharedWithUser);

  const canEdit =
    isOwner ||
    isWorkspaceAdmin ||
    contributor.length > 0 ||
    (doc.visibility === "WORKSPACE" && doc.workspace_edit && Boolean(workspaceMember)) ||
    sharedWithUser?.permission === "EDIT";

  return {
    doc,
    canRead,
    canEdit,
  };
}

async function ensureMoveTargetAccess(
  destinationWorkspaceId: string,
  userId: string,
  userRole: Role,
) {
  if (userRole === Role.ADMIN) return true;

  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspace_id: destinationWorkspaceId,
      user_id: userId,
    },
    select: { id: true },
  });

  return Boolean(member);
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const identity = await getSessionUser();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documentId = params.id?.trim();
  if (!documentId) {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const action = asDocumentAction(body.action);
  const payload = isRecord(body.payload) ? body.payload : {};

  if (!action) {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const context = await loadDocumentContext(documentId, identity.userId);
  if (!context) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (!context.canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (context.doc.is_deleted && action !== "RESTORE" && action !== "PERMANENT_DELETE") {
    return NextResponse.json(
      { error: "Document is in trash" },
      { status: 409 },
    );
  }

  const mutatingActions: DocumentAction[] = [
    "MOVE",
    "STATUS",
    "RENAME",
    "ARCHIVE",
    "RESTORE",
    "DELETE",
    "DUPLICATE",
    "PERMANENT_DELETE",
    "REQUEST_REVIEW",
  ];

  const needsEditAccess = mutatingActions.includes(action);

  if (needsEditAccess && !context.canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      switch (action) {
        case "RENAME": {
          const title = asString(payload.title);
          if (!title) {
            throw new Error("Missing title");
          }

          const updated = await tx.document.update({
            where: { id: documentId },
            data: { title },
            select: {
              id: true,
              title: true,
              workspace_id: true,
              folder_id: true,
              status: true,
              is_archived: true,
              is_deleted: true,
              updated_at: true,
            },
          });

          await tx.activityLog.create({
            data: {
              user_id: identity.userId,
              action: ActivityType.DOCUMENT_EDITED,
              entity: "document",
              entity_id: documentId,
              meta: { action: "RENAME", title },
            },
          });

          return { document: updated };
        }

        case "STATUS": {
          const status = payload.status;
          if (!isDocumentStatus(status)) {
            throw new Error("Invalid status");
          }

          const visibility = status === "PUBLISHED" ? "WORKSPACE" : "PRIVATE";
          const workspace_edit =
            status === "PUBLISHED" && typeof payload.workspace_edit === "boolean"
              ? payload.workspace_edit
              : status === "PUBLISHED";

          const updated = await tx.document.update({
            where: { id: documentId },
            data: { status, visibility, workspace_edit },
            select: {
              id: true,
              title: true,
              workspace_id: true,
              folder_id: true,
              status: true,
              workspace_edit: true,
              is_archived: true,
              is_deleted: true,
              updated_at: true,
            },
          });

          await tx.activityLog.create({
            data: {
              user_id: identity.userId,
              action: ActivityType.DOCUMENT_EDITED,
              entity: "document",
              entity_id: documentId,
              meta: { action: "STATUS", status },
            },
          });

          return { document: updated };
        }

        case "MOVE": {
          let incomingFolderId = asNullableString(payload.folderId ?? payload.folder_id);
          const incomingWorkspaceId = asNullableString(payload.workspaceId ?? payload.workspace_id);

          // FIX: Map the UI's 'root' string to a null database value
          if (incomingFolderId === 'root') {
            incomingFolderId = null;
          }

          const targetFolder =
            incomingFolderId
              ? await tx.folder.findUnique({
                  where: { id: incomingFolderId },
                  select: { id: true, workspace_id: true },
                })
              : null;

          if (incomingFolderId && !targetFolder) {
            throw new Error("Folder not found");
          }

          const destinationWorkspaceId =
            targetFolder?.workspace_id ?? incomingWorkspaceId ?? context.doc.workspace_id;

          const targetWorkspaceAccessible = await ensureMoveTargetAccess(
            destinationWorkspaceId,
            identity.userId,
            identity.role,
          );

          if (!targetWorkspaceAccessible) {
            throw new Error("Cannot move into this workspace");
          }

          if (
            targetFolder &&
            targetFolder.workspace_id !== destinationWorkspaceId
          ) {
            throw new Error("Folder does not belong to destination workspace");
          }

          const updated = await tx.document.update({
            where: { id: documentId },
            data: {
              workspace_id: destinationWorkspaceId,
              folder_id: targetFolder?.id ?? null,
            },
            select: {
              id: true,
              title: true,
              workspace_id: true,
              folder_id: true,
              status: true,
              is_archived: true,
              is_deleted: true,
              updated_at: true,
            },
          });

          await tx.activityLog.create({
            data: {
              user_id: identity.userId,
              action: ActivityType.DOCUMENT_EDITED,
              entity: "document",
              entity_id: documentId,
              meta: {
                action: "MOVE",
                from: {
                  workspace_id: context.doc.workspace_id,
                  folder_id: context.doc.folder_id,
                },
                to: {
                  workspace_id: destinationWorkspaceId,
                  folder_id: targetFolder?.id ?? null,
                },
              },
            },
          });

          return { document: updated };
        }

        case "ARCHIVE": {
          const nextArchived =
            typeof payload.is_archived === "boolean"
              ? payload.is_archived
              : !context.doc.is_archived;

          const updated = await tx.document.update({
            where: { id: documentId },
            data: { is_archived: nextArchived },
            select: {
              id: true,
              title: true,
              workspace_id: true,
              folder_id: true,
              status: true,
              workspace_edit: true,
              is_archived: true,
              is_deleted: true,
              updated_at: true,
            },
          });

          await tx.activityLog.create({
            data: {
              user_id: identity.userId,
              action: ActivityType.DOCUMENT_EDITED,
              entity: "document",
              entity_id: documentId,
              meta: { action: nextArchived ? "ARCHIVE" : "UNARCHIVE" },
            },
          });

          return { document: updated };
        }

        case "DUPLICATE": {
          const source = await tx.document.findUnique({
            where: { id: documentId },
            select: {
              title: true,
              content: true,
              content_text: true,
              type: true,
              file_url: true,
              file_name: true,
              file_size: true,
              status: true,
              visibility: true,
              workspace_edit: true,
              workspace_id: true,
              folder_id: true,
              owner_id: true,
            },
          });

          if (!source) {
            throw new Error("Document not found");
          }

          const duplicate = await tx.document.create({
            data: {
              title: `${source.title} (Copy)`,
              content: source.content ?? undefined,
              content_text: source.content_text ?? undefined,
              type: source.type,
              file_url: source.file_url ?? undefined,
              file_name: source.file_name ?? undefined,
              file_size: source.file_size ?? undefined,
              status: source.status,
              visibility: source.visibility,
              workspace_edit: source.workspace_edit,
              workspace_id: source.workspace_id,
              folder_id: source.folder_id ?? undefined,
              owner_id: identity.userId,
            },
            select: {
              id: true,
              title: true,
              workspace_id: true,
              folder_id: true,
              status: true,
              workspace_edit: true,
              is_archived: true,
              is_deleted: true,
              updated_at: true,
            },
          });

          await tx.activityLog.create({
            data: {
              user_id: identity.userId,
              action: ActivityType.DOCUMENT_CREATED,
              entity: "document",
              entity_id: duplicate.id,
              meta: { action: "DUPLICATE", source_document_id: documentId },
            },
          });

          return { document: duplicate };
        }

        case "RESTORE": {
          const updated = await tx.document.update({
            where: { id: documentId },
            data: {
              is_deleted: false,
              deleted_at: null,
            },
            select: {
              id: true,
              title: true,
              workspace_id: true,
              folder_id: true,
              status: true,
              is_archived: true,
              is_deleted: true,
              updated_at: true,
            },
          });

          await tx.activityLog.create({
            data: {
              user_id: identity.userId,
              action: ActivityType.DOCUMENT_EDITED,
              entity: "document",
              entity_id: documentId,
              meta: { action: "RESTORE" },
            },
          });

          return { document: updated };
        }

        case "DELETE": {
          const updated = await tx.document.update({
            where: { id: documentId },
            data: {
              is_deleted: true,
              deleted_at: new Date(),
            },
            select: {
              id: true,
              title: true,
              workspace_id: true,
              folder_id: true,
              status: true,
              is_archived: true,
              is_deleted: true,
              deleted_at: true,
              updated_at: true,
            },
          });

          await tx.activityLog.create({
            data: {
              user_id: identity.userId,
              action: ActivityType.DOCUMENT_DELETED,
              entity: "document",
              entity_id: documentId,
              meta: { action: "DELETE", soft: true },
            },
          });

          return { document: updated };
        }

        case "PERMANENT_DELETE": {
          const deleted = await tx.document.delete({
            where: { id: documentId }
          });

          await tx.activityLog.create({
            data: {
              user_id: identity.userId,
              action: ActivityType.DOCUMENT_DELETED,
              entity: "document",
              entity_id: documentId,
              meta: { action: "PERMANENT_DELETE" },
            },
          });

          return { document: deleted };
        }

        case "TOGGLE_FAVORITE": {
          const existing = await tx.favorite.findFirst({
            where: {
              user_id: identity.userId,
              document_id: documentId,
            },
            select: { id: true },
          });

          let favorite: boolean;

          if (existing) {
            await tx.favorite.delete({
              where: { id: existing.id },
            });
            favorite = false;
          } else {
            await tx.favorite.create({
              data: {
                user_id: identity.userId,
                document_id: documentId,
              },
            });
            favorite = true;
          }

          await tx.activityLog.create({
            data: {
              user_id: identity.userId,
              action: ActivityType.DOCUMENT_EDITED,
              entity: "document",
              entity_id: documentId,
              meta: { action: "TOGGLE_FAVORITE", favorite },
            },
          });

          return { favorite };
        }

        case "REQUEST_REVIEW": {
          const reviewerId = asString(payload.reviewerId ?? payload.reviewer_id);
          const comment = asNullableString(payload.comment);

          if (!reviewerId) {
            throw new Error("Missing reviewerId");
          }

          const existingPending = await tx.reviewRequest.findFirst({
            where: {
              document_id: documentId,
              reviewer_id: reviewerId,
              status: ReviewStatus.PENDING,
            },
            select: { id: true },
          });

          if (existingPending) {
            return {
              reviewRequest: existingPending,
              duplicate: true,
            };
          }

          const reviewRequest = await tx.reviewRequest.create({
            data: {
              document_id: documentId,
              requested_by: identity.userId,
              reviewer_id: reviewerId,
              status: ReviewStatus.PENDING,
              comment: comment ?? undefined,
            },
            select: {
              id: true,
              document_id: true,
              requested_by: true,
              reviewer_id: true,
              status: true,
              created_at: true,
            },
          });

          await tx.activityLog.create({
            data: {
              user_id: identity.userId,
              action: ActivityType.REVIEW_REQUESTED,
              entity: "document",
              entity_id: documentId,
              meta: {
                action: "REQUEST_REVIEW",
                reviewer_id: reviewerId,
              },
            },
          });

          return { reviewRequest };
        }

        case "UPDATE_REVIEW_STATUS": {
          const statusRaw = asString(payload.status);
          if (!statusRaw) throw new Error("Missing status");
          const allowedStatuses = Object.values(ReviewStatus);
          if (!allowedStatuses.includes(statusRaw as ReviewStatus)) {
            throw new Error("Invalid review status");
          }
          
          const reviewerScopedRequest = await tx.reviewRequest.findFirst({
            where: {
              document_id: documentId,
              reviewer_id: identity.userId,
            },
            orderBy: { created_at: 'desc' }
          });

          const reviewRequest = reviewerScopedRequest ?? await tx.reviewRequest.findFirst({
            where: { document_id: documentId },
            orderBy: { created_at: 'desc' }
          });
          
          if (!reviewRequest) {
            const created = await tx.reviewRequest.create({
              data: {
                document_id: documentId,
                requested_by: identity.userId,
                reviewer_id: identity.userId,
                status: statusRaw as ReviewStatus,
                reviewed_at: statusRaw === ReviewStatus.PENDING ? null : new Date(),
              },
            });

            return { reviewRequest: created };
          }
          
          const updated = await tx.reviewRequest.update({
            where: { id: reviewRequest.id },
            data: {
              status: statusRaw as ReviewStatus,
              reviewed_at: statusRaw === ReviewStatus.PENDING ? null : new Date(),
            }
          });
          
          await tx.activityLog.create({
            data: {
              user_id: identity.userId,
              action: ActivityType.DOCUMENT_EDITED,
              entity: "document",
              entity_id: documentId,
              meta: {
                action: "UPDATE_REVIEW_STATUS",
                status: statusRaw,
              },
            },
          });
          
          return { reviewRequest: updated };
        }

        default:
          throw new Error("Unsupported action");
      }
    });

    if (mutatingActions.includes(action) || action === "UPDATE_REVIEW_STATUS") {
      try {
        const targetDocumentId =
          action === "DUPLICATE" && "document" in result && result.document?.id
            ? result.document.id
            : documentId;
        await updateSearchVector(targetDocumentId);
      } catch (error) {
        console.error("Failed to update search vector:", error);
      }
    }

    return NextResponse.json({ ok: true, action, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Document action failed";

    const status =
      message === "Missing title" ||
      message === "Invalid status" ||
      message === "Missing reviewerId" ||
      message === "Unsupported action"
        ? 400
        : message === "Folder not found" || message === "Folder does not belong to destination workspace"
          ? 400
          : message === "Cannot move into this workspace"
            ? 403
            : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
