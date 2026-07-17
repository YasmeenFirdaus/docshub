import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, name, password } = body;

    // 1. Verify the token exists and is valid
    const invitation = await prisma.invitation.findUnique({ 
      where: { token } 
    });

    if (!invitation || invitation.status !== 'PENDING' || invitation.expires_at < new Date()) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 400 });
    }

    // 2. Hash the new password securely
    const hashedPassword = await bcrypt.hash(password, 12);

    // 3. Create the user and update the invitation status in a single transaction
    await prisma.$transaction([
      prisma.user.create({
        data: {
          email: invitation.email,
          name: name,
          password_hash: hashedPassword,
          role: invitation.role,
          status: 'ACTIVE'
        }
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' }
      })
    ]);

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("❌ Failed to accept invitation:", error);
    return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
  }
}