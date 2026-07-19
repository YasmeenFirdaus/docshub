import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function canAccessFolder(folderId: string, userId: string) {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: {
      id: true,
      workspace_id: true,
      workspace: {
        select: {
          members: {
            where: { user_id: userId },
            select: { id: true },
          },
        },
      },
    },
  })

  if (!folder) return null
  if (folder.workspace.members.length === 0) return null
  return folder
}

export async function PATCH(req: Request, { params }: { params: { fid: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const folder = await canAccessFolder(params.fid, session.user.id)
  if (!folder) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { name } = await req.json()
  const updated = await prisma.folder.update({
    where: { id: params.fid },
    data: { name },
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: Request, { params }: { params: { fid: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const folder = await canAccessFolder(params.fid, session.user.id)
  if (!folder) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.folder.delete({ where: { id: params.fid } })
  return NextResponse.json({ success: true })
}
