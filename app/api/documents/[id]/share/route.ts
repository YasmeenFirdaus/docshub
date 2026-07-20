import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateSearchVector } from '@/lib/search'
import { sendShareNotification } from '@/lib/email'

type Params = { params: { id: string } }
type Permission = 'VIEW' | 'EDIT'

function normalizeShareBody(body: any): { sharedWith: string[]; permission: Permission; replacePermissionList: boolean } {
  const permission: Permission = body?.permission === 'EDIT' ? 'EDIT' : 'VIEW'
  const replacePermissionList = body?.replace === true
  const rawSharedWith = Array.isArray(body?.shared_with)
    ? body.shared_with
    : typeof body?.user_id === 'string'
      ? [body.user_id]
      : []

  const sharedWith = Array.from(new Set<string>(rawSharedWith.filter((value: unknown): value is string => (
    typeof value === 'string' && value.trim().length > 0
  )).map((value: string) => value.trim())))

  return { sharedWith, permission, replacePermissionList }
}

// POST /api/documents/:id/share
export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { sharedWith, permission, replacePermissionList } = normalizeShareBody(body)
  
  if (!Array.isArray(body?.shared_with) && typeof body?.user_id !== 'string') {
    return NextResponse.json({ error: 'shared_with must be an array of user IDs' }, { status: 400 })
  }

  const document = await prisma.document.findUnique({ where: { id: params.id } })
  if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  if (sharedWith.includes(document.owner_id)) {
    return NextResponse.json({ error: 'Owner already has access' }, { status: 400 })
  }

  const [workspaceMember, documentShare, contributor] = await Promise.all([
    prisma.workspaceMember.findFirst({
      where: { workspace_id: document.workspace_id, user_id: session.user.id },
      select: { role: true },
    }),
    prisma.documentShare.findFirst({
      where: { document_id: params.id, shared_with: session.user.id },
      select: { permission: true },
    }),
    prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM document_contributors
      WHERE document_id = ${params.id} AND user_id = ${session.user.id}
      LIMIT 1
    `,
  ])

  const canEditShares =
    document.owner_id === session.user.id ||
    session.user.role === 'ADMIN' ||
    workspaceMember?.role === 'ADMIN' ||
    contributor.length > 0 ||
    (document.visibility === 'WORKSPACE' && document.workspace_edit && Boolean(workspaceMember)) ||
    documentShare?.permission === 'EDIT'

  if (!canEditShares) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await prisma.$transaction(async (tx) => {
    const memberCount = sharedWith.length
      ? await tx.workspaceMember.count({
          where: {
            workspace_id: document.workspace_id,
            user_id: { in: sharedWith },
          },
        })
      : 0

    if (memberCount !== sharedWith.length) {
      throw new Error('One or more users are not workspace members')
    }
    
      if (replacePermissionList) {
        const existingForPermission = await tx.documentShare.findMany({
          where: { document_id: params.id, permission },
          select: { shared_with: true },
        })

        const requested = new Set(sharedWith)
        const toRemove = existingForPermission
          .map((share) => share.shared_with)
          .filter((userId) => !requested.has(userId))

        if (toRemove.length > 0) {
          await tx.documentShare.deleteMany({
            where: {
              document_id: params.id,
              permission,
              shared_with: { in: toRemove },
            },
          })
        }
      }

      for (const userId of sharedWith) {
        await tx.documentShare.upsert({
          where: {
            document_id_shared_with: {
              document_id: params.id,
              shared_with: userId,
            },
          },
          update: { permission },
          create: {
            document_id: params.id,
            shared_with: userId,
            permission,
          },
        })
      }
      
      await tx.activityLog.create({
        data: {
          user_id: session.user.id,
          action: 'DOCUMENT_SHARED',
          entity: 'document',
          entity_id: params.id,
          meta: { shared_with: sharedWith, permission }
        }
      })
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to share document'
    const status = message.includes('workspace members') ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }

  try {
    await updateSearchVector(params.id)
  } catch (error) {
    console.error("Failed to update search vector:", error)
  }

  // Fire-and-forget — don't block response on email delivery
  notifySharedUsers(params.id, sharedWith, session.user.id).catch(() => {})

  return NextResponse.json({ success: true })
}

// Helper called after successful share to send notifications
async function notifySharedUsers(
  documentId: string,
  sharedWith: string[],
  sharerId: string,
) {
  try {
    const [doc, sharer, recipients] = await Promise.all([
      prisma.document.findUnique({ where: { id: documentId }, select: { title: true } }),
      prisma.user.findUnique({ where: { id: sharerId }, select: { name: true, email: true } }),
      prisma.user.findMany({ where: { id: { in: sharedWith } }, select: { id: true, email: true } }),
    ])
    if (!doc || !sharer) return
    const sharerName = sharer.name || sharer.email || 'Someone'
    await Promise.allSettled(
      recipients.map((r) =>
        sendShareNotification({ to: r.email, docTitle: doc.title, docId: documentId, sharedByName: sharerName })
      )
    )
  } catch (err) {
    console.error('Share notification error:', err)
  }
}

// GET /api/documents/:id/share — list shares
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shares = await prisma.documentShare.findMany({
    where: { document_id: params.id },
    include: { user: { select: { id: true, name: true, email: true, avatar_url: true } } },
  })

  return NextResponse.json(shares)
}

// DELETE /api/documents/:id/share — revoke share
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const document = await prisma.document.findUnique({
    where: { id: params.id },
    select: { owner_id: true },
  })
  if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  if (document.owner_id !== session.user.id && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { user_id } = await req.json()
  await prisma.documentShare.deleteMany({
    where: { document_id: params.id, shared_with: user_id },
  })

  try {
    await updateSearchVector(params.id)
  } catch (error) {
    console.error("Failed to update search vector:", error)
  }

  return NextResponse.json({ success: true })
}
