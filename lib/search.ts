import { prisma } from './prisma'

/**
 * Strip BlockNote JSON content to plain text for full-text search indexing.
 */
export function extractPlainText(content: unknown): string {
  if (!content || typeof content !== 'object') return ''

  const blocks = (content as { content?: unknown[] }).content ?? 
                 (Array.isArray(content) ? content : [])

  return (blocks as unknown[])
    .map((block) => extractFromBlock(block))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractFromBlock(block: unknown): string {
  if (!block || typeof block !== 'object') return ''
  const b = block as Record<string, unknown>
  const parts: string[] = []

  // Handle inline content (text nodes)
  if (Array.isArray(b.content)) {
    for (const node of b.content) {
      if (typeof node === 'object' && node !== null) {
        const n = node as Record<string, unknown>
        if (n.type === 'text' && typeof n.text === 'string') {
          parts.push(n.text)
        } else if (n.type === 'mention' && typeof n.attrs === 'object') {
          const attrs = n.attrs as Record<string, unknown>
          if (typeof attrs.label === 'string') parts.push(attrs.label)
        } else if (n.type === 'docReference' && typeof n.attrs === 'object') {
          const attrs = n.attrs as Record<string, unknown>
          if (typeof attrs.title === 'string') parts.push(attrs.title)
        }
      }
    }
  }

  // Handle nested children (e.g. list items, toggle lists)
  if (Array.isArray(b.children)) {
    for (const child of b.children) {
      parts.push(extractFromBlock(child))
    }
  }

  return parts.join(' ')
}

/**
 * Update the search vector for a document.
 * Called after every content save, move, share, tag update, etc.
 */
export async function updateSearchVector(documentId: string) {
  await prisma.$executeRaw`
    UPDATE documents d
    SET search_vector = 
      setweight(to_tsvector('english', coalesce(d.title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(d.file_name, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(
        (SELECT name FROM folders WHERE id = d.folder_id), ''
      )), 'B') ||
      setweight(to_tsvector('english', coalesce(
        (SELECT name FROM users WHERE id = d.owner_id), ''
      )), 'B') ||
      setweight(to_tsvector('english', coalesce(
        (SELECT string_agg(t.name, ' ') FROM tags t JOIN document_tags dt ON t.id = dt.tag_id WHERE dt.document_id = d.id), ''
      )), 'B') ||
      setweight(to_tsvector('english', coalesce(
        (SELECT string_agg(u.name, ' ') FROM users u JOIN document_shares ds ON u.id = ds.shared_with WHERE ds.document_id = d.id), ''
      )), 'B') ||
      setweight(to_tsvector('english', coalesce(
        (SELECT string_agg(u.name, ' ') FROM users u JOIN review_requests rr ON u.id = rr.reviewer_id WHERE rr.document_id = d.id), ''
      )), 'B') ||
      setweight(to_tsvector('english', coalesce(d.content_text, '')), 'C')
    WHERE id = ${documentId}
  `
}

/**
 * Full-text search across documents accessible to the user.
 * Scope is determined by caller — passes workspace IDs to filter.
 */
export async function searchDocuments({
  query,
  userId,
  userRole,
  workspaceIds,
}: {
  query: string
  userId: string
  userRole: string
  workspaceIds?: string[]
}) {
  if (!query.trim()) return []

  const workspaceFilter = workspaceIds?.length
    ? `AND d.workspace_id = ANY(ARRAY[${workspaceIds.map((id) => `'${id}'`).join(',')}])`
    : ''

  const accessFilter =
    userRole === 'ADMIN'
      ? ''
      : `AND (
        d.owner_id = '${userId}'
        OR (d.status = 'PUBLISHED' AND d.visibility = 'WORKSPACE' AND EXISTS (
          SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = d.workspace_id AND wm.user_id = '${userId}'
        ))
        OR EXISTS (
          SELECT 1 FROM document_shares ds WHERE ds.document_id = d.id AND ds.shared_with = '${userId}'
        )
      )`

  const results = await prisma.$queryRawUnsafe<
    Array<{
      id: string
      title: string
      status: string
      workspace_id: string
      folder_id: string | null
      updated_at: Date
      rank: number
    }>
  >(`
    SELECT
      d.id, d.title, d.status, d.workspace_id, d.folder_id, d.updated_at,
      ts_rank(d.search_vector, plainto_tsquery('english', $1)) AS rank
    FROM documents d
    WHERE
      d.is_deleted = false
      AND d.is_archived = false
      AND d.search_vector @@ plainto_tsquery('english', $1)
      ${workspaceFilter}
      ${accessFilter}
    ORDER BY rank DESC
    LIMIT 30
  `, query)

  return results
}
