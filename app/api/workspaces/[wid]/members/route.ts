import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { wid: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = params.wid;

    // Verify the user is a member of this workspace (or admin)
    const isMember = await prisma.workspaceMember.findFirst({
      where: { workspace_id: workspaceId, user_id: session.user.id }
    });

    if (!isMember && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspace_id: workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar_url: true,
            role: true
          }
        }
      },
      orderBy: { joined_at: 'asc' }
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Workspace members fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
