import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.workspaceMember.findMany({
    where: { user_id: session.user.id },
    include: {
      workspace: {
        include: {
          tenant: true,
          folders: { orderBy: { order: "asc" } },
        },
      },
    },
    orderBy: { joined_at: "asc" },
  });

  const tenant = memberships[0]?.workspace.tenant ?? null;
  const workspaces = memberships.map((m) => m.workspace);

  return NextResponse.json({ tenant, workspaces });
}

export async function POST() {
  return NextResponse.json(
    { error: "Space creation is backend-only" },
    { status: 403 }
  );
}