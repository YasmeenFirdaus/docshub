import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { importDocxToBlocks } from "@/lib/import/fromDocx"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get("file") as File
    const workspaceId = formData.get("workspace_id") as string
    const folderId = formData.get("folder_id") as string

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const extension = file.name.split('.').pop()?.toLowerCase()

    let docType: 'EDITABLE' | 'PDF' | 'PPT' = 'EDITABLE'
    if (extension === 'pdf') docType = 'PDF'
    if (extension === 'ppt' || extension === 'pptx') docType = 'PPT'

    const isReadOnly = docType === 'PDF' || docType === 'PPT'

    let parsedContent = ""
    let format = "html"
    let fileUrl = null

    if (isReadOnly) {
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`
      const uploadDir = path.join(process.cwd(), 'public', 'uploads')
      await mkdir(uploadDir, { recursive: true })
      await writeFile(path.join(uploadDir, fileName), buffer)
      fileUrl = `/uploads/${fileName}`
    } else {
      if (extension === "docx") {
        // Use normalizing pipeline: strips Word artifacts, preserves structure
        const { normalizedHtml } = await importDocxToBlocks(buffer, (html) => html as any);
        parsedContent = normalizedHtml
      } else if (extension === "md") {
        parsedContent = buffer.toString("utf-8")
        format = "markdown"
      } else if (extension === "json") {
        parsedContent = buffer.toString("utf-8")
        format = "json"
      } else if (extension === "html") {
        parsedContent = buffer.toString("utf-8")
        format = "html"
      } else {
        return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
      }
    }

    let targetWorkspaceId = workspaceId
    if (!targetWorkspaceId || targetWorkspaceId === "undefined") {
      const membership = await prisma.workspaceMember.findFirst({
        where: { user_id: session.user.id },
        orderBy: { joined_at: "asc" },
        select: { workspace_id: true },
      })

      if (membership) targetWorkspaceId = membership.workspace_id
    }

    if (!targetWorkspaceId) {
      return NextResponse.json(
        { error: "You are not assigned to any workspace." },
        { status: 400 },
      )
    }

    let document;
    await prisma.$transaction(async (tx) => {
      document = await tx.document.create({
        data: {
          title: file.name.replace(/\.[^/.]+$/, ""),
          content: (isReadOnly ? null : []) as any,
          file_url: fileUrl,
          file_name: file.name,
          file_size: file.size,
          workspace_id: targetWorkspaceId,
          ...(folderId && folderId !== "undefined" ? { folder_id: folderId } : {}),
          owner_id: session.user.id,
          type: docType,
          status: 'DRAFT',
          visibility: 'PRIVATE',
          current_version: 1,
        }
      })

      await tx.$executeRawUnsafe(
        `INSERT INTO document_versions (id, document_id, content, version, saved_by, reason, created_at) VALUES (gen_random_uuid(), $1, $2::jsonb, $3, $4, $5::"VersionReason", NOW())`,
        document.id,
        JSON.stringify(isReadOnly ? null : []),
        1,
        session.user.id,
        'IMPORTED'
      )
    })

    const { logActivity } = await import("@/lib/activity")
    void logActivity(session.user.id, "DOCUMENT_IMPORTED", {
      operation: "CREATE",
      resource_type: "DOCUMENT",
      resource_id: (document as any).id,
      resource_label: file.name,
      source: "Import Modal",
    })

    return NextResponse.json({ document, htmlContent: isReadOnly ? null : parsedContent })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json({ error: "Failed to import document" }, { status: 500 })
  }
}
