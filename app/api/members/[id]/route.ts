import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { role, status } = body;

    if (params.id === session.user.id) {
       return NextResponse.json({ error: "Cannot modify yourself" }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (role) dataToUpdate.role = role;
    if (status) dataToUpdate.status = status;

    const user = await prisma.user.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to update member:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'OWNER')) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspaceId');

  try {
    if (params.id === session.user.id) {
       return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    if (workspaceId) {
      // Remove from the specific workspace
      await prisma.workspaceMember.deleteMany({
        where: { workspace_id: workspaceId, user_id: params.id },
      });
    } else {
      // If no workspaceId is provided, this is a global delete (only if admin)
      if (session.user.role === 'ADMIN') {
        await prisma.user.delete({
          where: { id: params.id },
        });
      } else {
        return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete member:", error);
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
