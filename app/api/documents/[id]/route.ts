import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { canAccessDocument, updateDocumentContent } from "@/lib/document"
import crypto from "crypto"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const document = await canAccessDocument(params.id, session.user.id)
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json(document)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const document = await canAccessDocument(params.id, session.user.id)
    if (!document) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()

    const newTitle = body.title ?? document.title;
    const newContent = body.content ?? (document as any).content;
    const reason = body.reason || "AUTOSAVE"

    let isContentChanged = false;
    if (body.content) {
      const oldHash = crypto.createHash('sha256').update(JSON.stringify((document as any).content)).digest('hex')
      const newHash = crypto.createHash('sha256').update(JSON.stringify(newContent)).digest('hex')
      isContentChanged = oldHash !== newHash
    }

    const updatedDocument = await updateDocumentContent(params.id, session.user.id, newContent, newTitle, reason, isContentChanged)

    return NextResponse.json(updatedDocument)
  } catch (error: any) {
    console.error("PATCH error:", error)
    require('fs').writeFileSync('patch_error.log', String(error) + '\n' + (error.stack || ''))
    return NextResponse.json({ error: "Failed to save document", details: String(error) }, { status: 500 })
  }
}

