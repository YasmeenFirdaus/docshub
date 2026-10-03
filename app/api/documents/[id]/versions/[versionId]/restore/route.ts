import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canAccessDocument, updateDocumentContent } from "@/lib/document"

export async function POST(req: Request, { params }: { params: { id: string, versionId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const document = await canAccessDocument(params.id, session.user.id)
    if (!document || !document.canRead) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!document.canEdit) {
      return NextResponse.json({ error: "You do not have edit permissions to restore this document" }, { status: 403 })
    }

    const version = await prisma.documentVersion.findUnique({
      where: { id: params.versionId, document_id: params.id }
    })

    if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 })

    // Use the exact same validation and save pipeline as a normal save
    const updatedDocument = await updateDocumentContent(
      params.id, 
      session.user.id, 
      version.content, 
      document.title, 
      "RESTORED", 
      true
    )

    return NextResponse.json(updatedDocument)
  } catch (error: any) {
    console.error("Restore error:", error)
    return NextResponse.json({ error: "Failed to restore version" }, { status: 500 })
  }
}
