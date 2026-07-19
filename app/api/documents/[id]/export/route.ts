import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportToDocx } from "@/lib/export/docx";
import { exportToPdf } from "@/lib/export/pdf";

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const format = req.nextUrl.searchParams.get("format");
  if (format !== "docx" && format !== "pdf") {
    return NextResponse.json({ error: "Unsupported format. Use ?format=docx or ?format=pdf" }, { status: 400 });
  }

  // Fetch doc using raw query to bypass Prisma JSON recursion limit
  const rows: any[] = await prisma.$queryRawUnsafe(
    "SELECT id, title, content::text as content_str, owner_id, workspace_id FROM documents WHERE id = $1 AND is_deleted = false",
    params.id
  );

  if (!rows.length) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const doc = rows[0];

  // Verify user can read this document
  const member = await prisma.workspaceMember.findFirst({
    where: { workspace_id: doc.workspace_id, user_id: session.user.id },
  });
  const share = await prisma.documentShare.findFirst({
    where: { document_id: params.id, shared_with: session.user.id },
  });
  const isOwner = doc.owner_id === session.user.id;

  if (!isOwner && !member && !share) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let blocks: any[] = [];
  try {
    blocks = doc.content_str ? JSON.parse(doc.content_str) : [];
  } catch {
    blocks = [];
  }

  const title = doc.title ?? "Document";

  if (format === "docx") {
    const buffer = await exportToDocx(blocks, title);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(title)}.docx"`,
      },
    });
  }

  // format === "pdf"
  const buffer = await exportToPdf(blocks, title);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(title)}.pdf"`,
    },
  });
}
