import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: { wid: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { name } = await req.json()
  const workspace = await prisma.workspace.update({
    where: { id: params.wid },
    data: { name }
  })
  return NextResponse.json(workspace)
}

export async function DELETE(req: Request, { params }: { params: { wid: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Standard Prisma delete cascades to all nested folders and documents
  await prisma.workspace.delete({ where: { id: params.wid } })
  return NextResponse.json({ success: true })
}