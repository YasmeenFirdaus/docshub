import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { randomUUID } from 'crypto'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateSearchVector } from '@/lib/search'

type Params = { params: { id: string } }

function normalizeUserIds(value: unknown) {
  if (!Array.isArray(value)) return null
  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())))
}

async function getDocumentAccess(documentId: string, userId: string, role?: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      workspace_id: true,
      owner_id: true,
      visibility: true,
      workspace_edit: true,
    },
  })

  if (!document) return null

  const [workspaceMember, share, contributor] = await Promise.all([
    prisma.workspaceMember.findFirst({
      where: { workspace_id: document.workspace_id, user_id: userId },
      select: { role: true },
    }),
    prisma.documentShare.findFirst({
      where: { document_id: document.id, shared_with: userId },
      select: { permission: true },
    }),
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM document_contributors
      WHERE document_id = ${document.id} AND user_id = ${userId}
      LIMIT 1
    `,
  ])

  const canEdit =
    document.owner_id === userId ||
    role === 'ADMIN' ||
    workspaceMember?.role === 'ADMIN' ||
    contributor.length > 0 ||
    (document.visibility === 'WORKSPACE' && document.workspace_edit && Boolean(workspaceMember)) ||
    share?.permission === 'EDIT'

  return { document, canEdit }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contributors = await prisma.$queryRaw<Array<{
    id: string
    permission: null
    user_id: string
    name: string | null
    email: string
    avatar_url: string | null
  }>>`
    SELECT dc.id, NULL::text AS permission, u.id AS user_id, u.name, u.email, u.avatar_url
    FROM document_contributors dc
    JOIN users u ON u.id = dc.user_id
    WHERE dc.document_id = ${params.id}
    ORDER BY dc.created_at ASC
  `

  return NextResponse.json(contributors.map((contributor) => ({
    id: contributor.id,
    permission: contributor.permission,
    user: {
      id: contributor.user_id,
      name: contributor.name,
      email: contributor.email,
      avatar_url: contributor.avatar_url,
    },
  })))
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const userIds = normalizeUserIds(body?.user_ids)
  if (!userIds) return NextResponse.json({ error: 'user_ids must be an array' }, { status: 400 })

  const access = await getDocumentAccess(params.id, session.user.id, session.user.role)
  if (!access) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  if (!access.canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (userIds.includes(access.document.owner_id)) {
    return NextResponse.json({ error: 'Owner is already a contributor' }, { status: 400 })
  }

  const memberCount = userIds.length
    ? await prisma.workspaceMember.count({
        where: {
          workspace_id: access.document.workspace_id,
          user_id: { in: userIds },
        },
      })
    : 0

  if (memberCount !== userIds.length) {
    return NextResponse.json({ error: 'One or more users are not workspace members' }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    if (userIds.length === 0) {
      await tx.$executeRaw`DELETE FROM document_contributors WHERE document_id = ${params.id}`
    } else {
      await tx.$executeRaw`
        DELETE FROM document_contributors
        WHERE document_id = ${params.id}
          AND NOT (user_id = ANY(${userIds}))
      `
    }

    for (const userId of userIds) {
      await tx.$executeRaw`
        INSERT INTO document_contributors (id, document_id, user_id)
        VALUES (${randomUUID()}, ${params.id}, ${userId})
        ON CONFLICT (document_id, user_id) DO NOTHING
      `
    }
  })

  try {
    await updateSearchVector(params.id)
  } catch (error) {
    console.error('Failed to update search vector:', error)
  }

  return NextResponse.json({ success: true })
}
