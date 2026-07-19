import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MailService } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { email, role, workspace_id } = await req.json();

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const existingInvite = await prisma.invitation.findFirst({
      where: {
        email,
        status: "PENDING",
        ...(workspace_id ? { workspace_id } : {}),
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "An invitation is already pending for this email." },
        { status: 400 },
      );
    }

    const targetWorkspaceId =
      workspace_id ??
      (
        await prisma.workspaceMember.findFirst({
          where: { user_id: session.user.id },
          orderBy: { joined_at: "asc" },
          select: { workspace_id: true },
        })
      )?.workspace_id;

    if (!targetWorkspaceId) {
      return NextResponse.json(
        { error: "You are not assigned to any workspace." },
        { status: 400 },
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        token,
        invited_by: session.user.id,
        workspace_id: targetWorkspaceId,
        expires_at: expiresAt,
      },
    });

    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/accept?token=${token}`;

    await MailService.send("invite", email, {
      invite_url: inviteUrl,
      inviter_name: session.user.name || "An Admin",
      workspace_name: "DocHub",
    });

    return NextResponse.json(invitation);
  } catch (error) {
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}
