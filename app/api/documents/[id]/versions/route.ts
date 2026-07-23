import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Minimal permission check: can user see the document?
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      select: { 
        owner_id: true, 
        current_version: true,
        workspace: { select: { members: { where: { user_id: session.user.id } } } },
        shares: { where: { shared_with: session.user.id } },
        contributors: { where: { user_id: session.user.id } }
      }
    })

    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 })

    const isOwner = document.owner_id === session.user.id
    const isMember = document.workspace.members.length > 0
    const isShared = document.shares.length > 0
    const isContributor = document.contributors.length > 0

    if (!isOwner && !isMember && !isShared && !isContributor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "25")
    const page = parseInt(searchParams.get("page") || "1")
    const skip = (page - 1) * limit

    const versions = await prisma.documentVersion.findMany({
      where: { document_id: params.id },
      orderBy: { version: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        version: true,
        reason: true,
        created_at: true,
        saved_by: true,
      }
    })

    // Fetch user details for saved_by
    const userIds = versions.map(v => v.saved_by).filter((id, i, arr) => arr.indexOf(id) === i)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    })
    
    const userMap = new Map(users.map(u => [u.id, u]))

    const formattedVersions = versions.map(v => ({
      ...v,
      saved_by_user: userMap.get(v.saved_by) || { name: 'Unknown', email: '' },
      is_current: v.version === document.current_version
    }))

    return NextResponse.json({ versions: formattedVersions, current_version: document.current_version })
  } catch (error: any) {
    console.error("Versions GET error:", error)
    return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 })
  }
}
