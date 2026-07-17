import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Fetch all documents for the table
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const documents = await prisma.document.findMany({
      where: { 
        is_deleted: false,
        owner_id: session.user.id
      },
      orderBy: { updated_at: 'desc' },
      include: {
        folder: { select: { name: true } },
        workspace: { select: { name: true } },
        owner: { select: { name: true } }
      }
    })
    
    return NextResponse.json(documents)
  } catch (error) {
    console.error("GET Documents Error:", error)
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}

// Create a new document
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    let targetWorkspaceId = body.workspace_id

    // FIX: If no workspace is provided (e.g., clicking "+ New" from All Docs),
    // automatically assign the document to the first available workspace.
    if (!targetWorkspaceId) {
      const defaultWorkspace = await prisma.workspace.findFirst()
      
      if (!defaultWorkspace) {
        return NextResponse.json({ error: "You must create a Workspace before creating documents." }, { status: 400 })
      }
      
      targetWorkspaceId = defaultWorkspace.id
    }
    
    const document = await prisma.document.create({
      data: {
        title: body.title || "Untitled Document",
        content: [], // Empty array initializes a blank BlockNote editor
        owner_id: session.user.id,
        workspace_id: targetWorkspaceId,
        // Only include folder_id if it exists to avoid null relation errors
        ...(body.folder_id ? { folder_id: body.folder_id } : {}),
        type: 'EDITABLE',
        status: 'DRAFT',
        visibility: 'PRIVATE'
      }
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error("POST Document Error:", error)
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 })
  }
}