import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    
    // Verify user has access to this workspace before creating a folder
    const hasAccess = await prisma.workspaceMember.findUnique({
      where: {
        workspace_id_user_id: {
          workspace_id: body.workspace_id,
          user_id: session.user.id
        }
      }
    })

    if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const folder = await prisma.folder.create({
      data: {
        name: body.name,
        workspace_id: body.workspace_id,
        parent_id: body.parent_id || null // Allows for infinite nesting
      }
    })

    return NextResponse.json(folder)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 })
  }
}