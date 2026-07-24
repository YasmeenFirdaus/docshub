import { prisma } from "@/lib/prisma"
import { extractPlainText, updateSearchVector } from "@/lib/search"
import { logActivity } from "@/lib/activity"

export async function canAccessDocument(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    omit: { content: true },
    include: {
      workspace: {
        include: {
          members: true,
        },
      },
      folder: true,
      shares: true,
    },
  })

  if (!document) return null

  const isOwner = document.owner_id === userId
  const memberObj = document.workspace.members.find((m: any) => m.user_id === userId)
  const isMember = !!memberObj
  const isWorkspaceAdmin = memberObj?.role === "ADMIN"

  const explicitShare = document.shares.find((s: any) => s.shared_with === userId)
  
  const contributors = await prisma.$queryRaw<Array<{ user_id: string }>>`
    SELECT user_id FROM document_contributors WHERE document_id = ${documentId}
  `
  const isContributor = contributors.some((c: any) => c.user_id === userId)

  const isPublished = document.visibility === "PUBLISHED"
  
  const canRead = isOwner || (isPublished && isMember) || !!explicitShare || isContributor
  
  const canEdit = isOwner || isWorkspaceAdmin || (explicitShare?.permission === "EDIT") || (isPublished && document.workspace_edit && isMember)

  if (!canRead) return null

  // Fetch content separately to avoid Prisma JSON recursion limit
  const rawData: any[] = await prisma.$queryRawUnsafe(
    'SELECT content::text as content_str FROM documents WHERE id = $1',
    documentId
  )
  if (rawData.length > 0 && rawData[0].content_str) {
    try {
       (document as any).content = JSON.parse(rawData[0].content_str)
    } catch (e) {
       console.error("Failed to parse raw content string:", e)
       ;(document as any).content = []
    }
  } else {
    (document as any).content = []
  }

  return { ...document, contributors, canRead, canEdit }
}

export async function updateDocumentContent(
  documentId: string, 
  userId: string, 
  newContent: any, 
  newTitle: string, 
  reason: string = "AUTOSAVE", 
  isContentChanged: boolean = true
) {
  const newContentText = newContent ? extractPlainText(newContent) : "";

  await prisma.$transaction(async (tx) => {
    if (isContentChanged) {
      // Update document and increment version atomically
      await tx.$executeRawUnsafe(
        `UPDATE documents SET title = $1, content = $2::jsonb, content_text = $3, updated_at = NOW(), current_version = current_version + 1 WHERE id = $4`,
        newTitle,
        JSON.stringify(newContent),
        newContentText,
        documentId
      )

      // Fetch the newly incremented version
      const updatedDocs: any[] = await tx.$queryRawUnsafe(
        `SELECT current_version FROM documents WHERE id = $1`,
        documentId
      )
      const newVersion = updatedDocs[0]?.current_version || 1

      // Insert document version
      await tx.$executeRawUnsafe(
        `INSERT INTO document_versions (id, document_id, content, version, saved_by, reason, created_at) VALUES (gen_random_uuid(), $1, $2::jsonb, $3, $4, $5::"VersionReason", NOW())`,
        documentId,
        JSON.stringify(newContent),
        newVersion,
        userId,
        reason
      )
    } else {
      // Only title or metadata changed (or no change at all)
      await tx.$executeRawUnsafe(
        `UPDATE documents SET title = $1, updated_at = NOW() WHERE id = $2`,
        newTitle,
        documentId
      )
    }
  })

  await updateSearchVector(documentId)

  const updatedDocument = await prisma.document.findUnique({
    where: { id: documentId }
  })

  if (isContentChanged || reason === "RESTORED") {
    void logActivity(userId, reason === "RESTORED" ? "DOCUMENT_RESTORED" : "DOCUMENT_EDITED", {
      operation: reason === "RESTORED" ? "RESTORE" : "EDIT",
      resource_type: "DOCUMENT",
      resource_id: documentId,
      resource_label: newTitle,
      source: "Editor",
      previous: reason === "RESTORED" ? { version: "Unknown" } : undefined, // Could enrich this later
    })
  }

  return updatedDocument
}
