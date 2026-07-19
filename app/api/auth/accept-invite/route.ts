import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { token, name, password } = await req.json();

    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (
      !invitation ||
      invitation.status !== "PENDING" ||
      invitation.expires_at < new Date()
    ) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: invitation.email,
          name,
          password_hash: hashedPassword,
          role: invitation.role,
          status: "ACTIVE",
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspace_id: invitation.workspace_id,
          user_id: user.id,
          role: invitation.role,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to accept invitation:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 },
    );
  }
}
