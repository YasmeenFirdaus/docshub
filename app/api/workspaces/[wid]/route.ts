import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH() {
  return NextResponse.json(
    { error: "Space editing is backend-only" },
    { status: 403 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Space deletion is backend-only" },
    { status: 403 }
  );
}