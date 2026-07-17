import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  // Only Admins should be able to view the full member list
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 1. Fetch all active users
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true, 
        status: true,
        created_at: true 
      },
      orderBy: { created_at: 'desc' }
    });

    // 2. Fetch all pending invitations
    const invitations = await prisma.invitation.findMany({
      where: { status: 'PENDING' },
      select: { 
        id: true, 
        email: true, 
        role: true, 
        expires_at: true,
        created_at: true 
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({ users, invitations });
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}