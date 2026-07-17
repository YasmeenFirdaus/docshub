import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request, { params }: { params: { fid: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name } = await req.json()
  const folder = await prisma.folder.update({
    where: { id: params.fid },
    data: { name }
  })
  return NextResponse.json(folder)
}

export async function DELETE(req: Request, { params }: { params: { fid: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.folder.delete({ where: { id: params.fid } })
  return NextResponse.json({ success: true })
}