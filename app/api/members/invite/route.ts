import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MailService } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { email, role } = await req.json();
    
    // 1. Check if an active user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    // 2. NEW: Check if a pending invitation already exists
    const existingInvite = await prisma.invitation.findFirst({
      where: { 
        email,
        status: 'PENDING'
      }
    });

    if (existingInvite) {
      return NextResponse.json({ error: "An invitation is already pending for this email." }, { status: 400 });
    }

    // 3. Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiration

    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        token,
        invited_by: session.user.id,
        expires_at: expiresAt
      }
    });

    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/accept?token=${token}`;
    
    await MailService.send('invite', email, {
      invite_url: inviteUrl,
      inviter_name: session.user.name || 'An Admin',
      workspace_name: 'DocHub'
    });

    return NextResponse.json(invitation);
  } catch (error) {
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}