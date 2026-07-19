import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { extractPlainText, updateSearchVector } from "@/lib/search"

async function canAccessDocument(documentId: string, userId: string) {
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
  const isMember = document.workspace.members.some((m) => m.user_id === userId)
  const isShared = document.shares.some((s) => s.shared_with === userId)
  const contributors = await prisma.$queryRaw<Array<{ user_id: string }>>`
    SELECT user_id FROM document_contributors WHERE document_id = ${documentId}
  `
  const isContributor = contributors.some((c) => c.user_id === userId)

  if (!isOwner && !isMember && !isShared && !isContributor) return null

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

  return { ...document, contributors }
}

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
    const newContentText = body.content ? extractPlainText(body.content) : document.content_text;

    // Use executeRaw to bypass Prisma's JSON recursion limit for large BlockNote documents
    await prisma.$executeRawUnsafe(
      `UPDATE documents SET title = $1, content = $2::jsonb, content_text = $3, updated_at = NOW() WHERE id = $4`,
      newTitle,
      JSON.stringify(newContent),
      newContentText,
      params.id
    )

    if (body.content || body.title) {
      await updateSearchVector(params.id)
    }

    const updatedDocument = await prisma.document.findUnique({
      where: { id: params.id }
    })

    return NextResponse.json(updatedDocument)
  } catch (error: any) {
    console.error("PATCH error:", error)
    require('fs').writeFileSync('patch_error.log', String(error) + '\n' + (error.stack || ''))
    return NextResponse.json({ error: "Failed to save document", details: String(error) }, { status: 500 })
  }
}
