import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import mammoth from "mammoth"
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

    // 1. Determine Document Type based on Prisma Enum
    let docType: 'EDITABLE' | 'PDF' | 'PPT' = 'EDITABLE'
    if (extension === 'pdf') docType = 'PDF'
    if (extension === 'ppt' || extension === 'pptx') docType = 'PPT'

    const isReadOnly = docType === 'PDF' || docType === 'PPT'

    let parsedContent = ""
    let format = "html"
    let fileUrl = null

    // 2. Process based on Type
    if (isReadOnly) {
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`
      const uploadDir = path.join(process.cwd(), 'public', 'uploads')
      await mkdir(uploadDir, { recursive: true })
      await writeFile(path.join(uploadDir, fileName), buffer)
      fileUrl = `/uploads/${fileName}`
    } else {
      if (extension === "docx") {
        const result = await mammoth.convertToHtml({ buffer })
        parsedContent = result.value
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

    // 3. Assign Workspace
    let targetWorkspaceId = workspaceId
    if (!targetWorkspaceId || targetWorkspaceId === "undefined") {
      const defaultWorkspace = await prisma.workspace.findFirst()
      if (defaultWorkspace) targetWorkspaceId = defaultWorkspace.id
    }

    if (!targetWorkspaceId) {
        return NextResponse.json({ error: "No workspace available" }, { status: 400 })
    }

    // 4. Create Database Entry
    // FIX: content is null for READONLY, [] for EDITABLE
    const document = await prisma.document.create({
      data: {
        title: file.name.replace(/\.[^/.]+$/, ""),
        content: isReadOnly ? null : (parsedContent ? JSON.parse(JSON.stringify([{ type: "paragraph", content: parsedContent }])) : []),        file_url: fileUrl, 
        file_name: file.name,
        file_size: file.size,
        workspace_id: targetWorkspaceId,
        ...(folderId && folderId !== "undefined" ? { folder_id: folderId } : {}),
        owner_id: session.user.id,
        type: docType,
        status: 'DRAFT',
        visibility: 'PRIVATE'
      }
    })

    return NextResponse.json({ document })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json({ error: "Failed to import document" }, { status: 500 })
  }
}