import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// 1. GET: Load the document into the editor
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        workspace: true,
        folder: true
      }
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Basic security: Ensure the user actually owns this document (we will expand this for shared docs later)
    if (document.owner_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error("GET Document Error:", error)
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 })
  }
}

// 2. PATCH: Handle the real-time Autosave
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    
    // Update the document with the debounced title and content from BlockNote
    const updatedDocument = await prisma.document.update({
      where: { 
        id: params.id,
        // Double check ownership before allowing an update
        owner_id: session.user.id 
      },
      data: {
        title: body.title,
        content: body.content,
      }
    })

    return NextResponse.json(updatedDocument)
  } catch (error) {
    console.error("PATCH Document Error:", error)
    return NextResponse.json({ error: "Failed to save document" }, { status: 500 })
  }
}