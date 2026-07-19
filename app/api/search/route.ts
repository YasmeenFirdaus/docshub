import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { searchDocuments } from '@/lib/search'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/search?q=query&workspace_id=wid&folder_id=fid
 *
 * Scope rules:
 * - No scope params = search ALL accessible workspaces (universal)
 * - workspace_id set = search within that workspace only
 * - folder_id set = search within that folder (and nested) only
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const query = searchParams.get('q')?.trim()
  const workspaceId = searchParams.get('workspace_id')
  const folderId = searchParams.get('folder_id')

  if (!query || query.length < 2) return NextResponse.json([])

  let workspaceIds: string[] | undefined

  if (workspaceId) {
    workspaceIds = [workspaceId]
  } else {
    // Restrict to user's accessible workspaces
    const memberships = await prisma.workspaceMember.findMany({
      where: { user_id: session.user.id },
      select: { workspace_id: true },
    })
    workspaceIds = memberships.map((m) => m.workspace_id)
  }

  let results = await searchDocuments({
    query,
    userId: session.user.id,
    userRole: session.user.role,
    workspaceIds,
  })

  // Apply folder scope filter client-side (recursive folder search via SQL is complex)
  if (folderId) {
    const folderIds = await getNestedFolderIds(folderId)
    results = results.filter((r) => r.folder_id && folderIds.includes(r.folder_id))
  }

  return NextResponse.json(results)
}

async function getNestedFolderIds(folderId: string): Promise<string[]> {
  const ids: string[] = [folderId]
  const queue = [folderId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    const children = await prisma.folder.findMany({
      where: { parent_id: currentId },
      select: { id: true },
    })
    for (const child of children) {
      ids.push(child.id)
      queue.push(child.id)
    }
  }

  return ids
}
