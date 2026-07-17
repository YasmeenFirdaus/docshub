import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Get all workspaces for the logged-in user
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workspaces = await prisma.workspace.findMany({
    where: {
      members: { some: { user_id: session.user.id } }
    },
    include: {
      folders: { orderBy: { order: 'asc' } } // Fetch folders to build the sidebar tree
    },
    orderBy: { created_at: 'desc' }
  })

  return NextResponse.json(workspaces)
}

// Create a new workspace (Admin only)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await req.json()
    // Generate a unique URL-friendly slug
    const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 7)

    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        description: body.description,
        slug: slug,
        icon: body.name.charAt(0).toUpperCase(),
        // Automatically add the creator as an ADMIN member of this workspace
        members: {
          create: {
            user_id: session.user.id,
            role: 'ADMIN'
          }
        }
      }
    })

    return NextResponse.json(workspace)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 })
  }
}