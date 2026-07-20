import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspaceId');

  const isAdmin = session.user.role === 'ADMIN';

  try {
    let users;
    let invitations: any[] = [];

    const userWhere: any = {};
    const inviteWhere: any = { status: 'PENDING' };

    if (workspaceId) {
      userWhere.workspaces = { some: { workspace_id: workspaceId } };
      inviteWhere.workspace_id = workspaceId;
    } else if (!isAdmin) {
      const myWorkspaces = await prisma.workspaceMember.findMany({
        where: { user_id: session.user.id },
        select: { workspace_id: true }
      });
      const workspaceIds = myWorkspaces.map(w => w.workspace_id);
      userWhere.workspaces = { some: { workspace_id: { in: workspaceIds } } };
    }

    users = await prisma.user.findMany({
      where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
      select: { id: true, name: true, email: true, role: true, status: true, created_at: true },
      orderBy: { created_at: 'desc' }
    });

    invitations = await prisma.invitation.findMany({
      where: inviteWhere,
      select: { id: true, email: true, role: true, expires_at: true, created_at: true },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({ users, invitations });
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}