import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateSearchVector } from "@/lib/search"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const searchQuery = searchParams.get("search")
    const filtersParam = searchParams.get("filters")
    let sortParam = searchParams.get("sort") || "updated_at"
    const isTrash = searchParams.get("trash") === "true"
    const isShared = searchParams.get("shared") === "true"
    const isFavorites = searchParams.get("favorites") === "true"
    const isRecent = searchParams.get("recent") === "true"
    const queryWorkspaceId = searchParams.get("workspace_id")
    const queryFolderId = searchParams.get("folder_id")

    if (isRecent) sortParam = "updated_at"

    const memberships = await prisma.workspaceMember.findMany({
      where: { user_id: session.user.id },
      select: { workspace_id: true },
    })

    const workspaceIds = memberships.map((m) => m.workspace_id)
    const contributedDocuments = await prisma.$queryRaw<Array<{ document_id: string }>>`
      SELECT document_id FROM document_contributors WHERE user_id = ${session.user.id}
    `
    const contributedDocumentIds = contributedDocuments.map((item) => item.document_id)

    // Build the query where clause
    const whereClause: any = {
      is_deleted: isTrash,
      OR: [
        { owner_id: session.user.id },
        ...(workspaceIds.length ? [{ 
          workspace_id: { in: workspaceIds },
          status: "PUBLISHED"
        }] : []),
        ...(contributedDocumentIds.length ? [{ id: { in: contributedDocumentIds } }] : []),
        { shares: { some: { shared_with: session.user.id } } }
      ],
    }

    if (!whereClause.AND) whereClause.AND = []

    if (isShared) {
      whereClause.AND.push({ shares: { some: { shared_with: session.user.id } } })
    }

    if (isFavorites) {
      whereClause.AND.push({ favorites: { some: { user_id: session.user.id } } })
    }

    if (queryWorkspaceId) {
      whereClause.AND.push({ workspace_id: queryWorkspaceId })
    }

    if (queryFolderId) {
      whereClause.AND.push({ folder_id: queryFolderId })
    }

    if (filtersParam) {
      try {
        const filters = JSON.parse(filtersParam)
        if (!whereClause.AND) whereClause.AND = []
        
        for (const filter of filters) {
          const val = filter.value
          const op = filter.operator || 'eq'
          if (val === undefined || val === null || val === '') continue
          
          const getTextCondition = () => {
             if (op === 'is') return { equals: val, mode: 'insensitive' }
             if (op === 'is_not') return { not: { equals: val, mode: 'insensitive' } }
             if (op === 'not_contains') return { not: { contains: val, mode: 'insensitive' } }
             return { contains: val, mode: 'insensitive' }
          }
          
          const getDateCondition = () => {
             if (op === 'before') return { lt: new Date(val) }
             if (op === 'after') return { gt: new Date(val) }
             const startOfDay = new Date(val)
             startOfDay.setHours(0,0,0,0)
             const endOfDay = new Date(val)
             endOfDay.setHours(23,59,59,999)
             return { gte: startOfDay, lte: endOfDay }
          }
          
          const getEqualityCondition = () => {
             return op === 'neq' ? { not: val } : val
          }

          switch (filter.field) {
            case 'owner':
              whereClause.AND.push({ owner: { name: getTextCondition() } })
              break
            case 'contributors':
              if (typeof val === 'string') {
                const matchingContributorDocs = await prisma.$queryRaw<Array<{ document_id: string }>>`
                  SELECT dc.document_id
                  FROM document_contributors dc
                  JOIN users u ON u.id = dc.user_id
                  WHERE u.name ILIKE ${`%${val}%`} OR u.email ILIKE ${`%${val}%`}
                `
                whereClause.AND.push({
                  id: { in: matchingContributorDocs.map((item) => item.document_id) },
                })
              }
              break
            case 'reviewer':
              whereClause.AND.push({ review_requests: { some: { reviewer: { name: getTextCondition() } } } })
              break
            case 'review_status':
              whereClause.AND.push({ review_requests: { some: { status: getEqualityCondition() } } })
              break
            case 'status':
              whereClause.AND.push({ status: getEqualityCondition() })
              break
            case 'archived':
              whereClause.AND.push({ is_archived: getEqualityCondition() })
              break
            case 'favorites':
              const wantFav = (val === true && op === 'eq') || (val === false && op === 'neq')
              if (wantFav) {
                 whereClause.AND.push({ favorites: { some: { user_id: session.user.id } } })
              } else {
                 whereClause.AND.push({ favorites: { none: { user_id: session.user.id } } })
              }
              break
            case 'created_date':
              if (val) whereClause.AND.push({ created_at: getDateCondition() })
              break
            case 'updated_date':
              if (val) whereClause.AND.push({ updated_at: getDateCondition() })
              break
            case 'tags':
              if (op === 'is_not' || op === 'not_contains') {
                 // Not matching tag means none of the tags should match this condition
                 // E.g. "Tags is not X" -> it should not have tag X.
                 const positiveOp = op === 'is_not' ? 'is' : 'contains'
                 const posCondition = positiveOp === 'is' ? { equals: val, mode: 'insensitive' } : { contains: val, mode: 'insensitive' }
                 whereClause.AND.push({ tags: { none: { tag: { name: posCondition } } } })
              } else {
                 whereClause.AND.push({ tags: { some: { tag: { name: getTextCondition() } } } })
              }
              break
            case 'folder':
              whereClause.AND.push({ folder: { name: getTextCondition() } })
              break
            case 'workspace':
              whereClause.AND.push({ workspace: { name: getTextCondition() } })
              break
          }
        }
      } catch (e) {
        console.error("Filter parse error:", e)
      }
    }

    let ftsRanks: Record<string, number> = {}
    let ftsSnippets: Record<string, string> = {}

    if (searchQuery) {
      let rankedMatches = await prisma.$queryRawUnsafe<Array<{id: string, rank: number, snippet: string}>>(`
        SELECT id, 
               ts_rank(search_vector, websearch_to_tsquery('english', $1)) as rank,
               ts_headline('english', coalesce(content_text, title, ''), websearch_to_tsquery('english', $1), 'StartSel=<mark>, StopSel=</mark>, MaxWords=20, MinWords=5') as snippet
        FROM documents
        WHERE search_vector @@ websearch_to_tsquery('english', $1)
        ORDER BY rank DESC
        LIMIT 100
      `, searchQuery)
      
      // Fallback to pg_trgm for typo tolerance
      if (rankedMatches.length === 0 && searchQuery.length > 2) {
        rankedMatches = await prisma.$queryRawUnsafe<Array<{id: string, rank: number, snippet: string}>>(`
          SELECT id, GREATEST(similarity(coalesce(title, ''), $1), similarity(coalesce(content_text, ''), $1)) as rank, '' as snippet
          FROM documents
          WHERE coalesce(title, '') % $1 OR coalesce(content_text, '') % $1
          ORDER BY rank DESC
          LIMIT 100
        `, searchQuery)
      }

      const matchedIds = rankedMatches.map(m => m.id)
      for (const m of rankedMatches) {
        ftsRanks[m.id] = m.rank
        ftsSnippets[m.id] = m.snippet
      }

      whereClause.AND = [
        ...(whereClause.AND || []),
        { id: { in: matchedIds.length > 0 ? matchedIds : ['no-match-found'] } }
      ]
    }

    const documents = await prisma.document.findMany({
      omit: { content: true, content_text: true },
      where: whereClause,
      orderBy: { [sortParam === 'created_at' ? 'created_at' : 'updated_at']: "desc" },
      include: {
        folder: { select: { name: true } },
        workspace: { select: { name: true } },
        owner: { select: { name: true, email: true, avatar_url: true } },
        shares: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar_url: true } },
          },
        },
        favorites: {
          where: { user_id: session.user.id },
          select: { id: true }
        },
        review_requests: {
          include: {
            reviewer: { select: { id: true, name: true, email: true, avatar_url: true } },
          },
          orderBy: { created_at: 'desc' }
        },
      },
    })
    const documentIds = documents.map((doc) => doc.id)
    const contributorRows = documentIds.length
      ? await prisma.$queryRaw<Array<{
          document_id: string
          id: string
          user_id: string
          name: string | null
          email: string
          avatar_url: string | null
        }>>`
          SELECT dc.document_id, dc.id, u.id AS user_id, u.name, u.email, u.avatar_url
          FROM document_contributors dc
          JOIN users u ON u.id = dc.user_id
          WHERE dc.document_id = ANY(${documentIds})
          ORDER BY dc.created_at ASC
        `
      : []
    const contributorsByDocument = contributorRows.reduce<Record<string, Array<{ id: string; user: { id: string; name: string | null; email: string; avatar_url: string | null } }>>>((acc, row) => {
      if (!acc[row.document_id]) acc[row.document_id] = []
      acc[row.document_id].push({
        id: row.id,
        user: {
          id: row.user_id,
          name: row.name,
          email: row.email,
          avatar_url: row.avatar_url,
        },
      })
      return acc
    }, {})

    let formattedDocuments = documents.map(doc => {
      const is_favorite = doc.favorites && doc.favorites.length > 0;
      return {
        ...doc,
        contributors: contributorsByDocument[doc.id] ?? [],
        is_favorite,
        snippet: ftsSnippets[doc.id] || ""
      }
    })

    if (searchQuery) {
      formattedDocuments.sort((a, b) => {
        const rankA = ftsRanks[a.id] || 0
        const rankB = ftsRanks[b.id] || 0
        return rankB - rankA
      })
    }

    return NextResponse.json({ documents: formattedDocuments })
  } catch (error: any) {
    console.error("API /documents error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json()
    let targetWorkspaceId = body.workspace_id

    if (!targetWorkspaceId) {
      const membership = await prisma.workspaceMember.findFirst({
        where: { user_id: session.user.id },
        orderBy: { joined_at: "asc" },
        select: { workspace_id: true },
      })

      if (!membership) {
        return NextResponse.json(
          { error: "You are not assigned to any workspace." },
          { status: 400 },
        )
      }

      targetWorkspaceId = membership.workspace_id
    }

    const document = await prisma.document.create({
      data: {
        title: body.title || "Untitled Document",
        content: [],
        owner_id: session.user.id,
        workspace_id: targetWorkspaceId,
        ...(body.folder_id ? { folder_id: body.folder_id } : {}),
        type: "EDITABLE",
        status: "DRAFT",
        visibility: "PRIVATE",
      },
    })

    try {
      await updateSearchVector(document.id)
    } catch (error) {
      console.error("Failed to update search vector:", error)
    }

    const { logActivity } = await import('@/lib/activity')
    let contextName = undefined
    if (body.folder_id) {
      const f = await prisma.folder.findUnique({ where: { id: body.folder_id } })
      if (f) contextName = f.name
    } else {
      const w = await prisma.workspace.findUnique({ where: { id: targetWorkspaceId } })
      if (w) contextName = w.name
    }

    void logActivity(session.user.id, "DOCUMENT_CREATED", {
      operation: "CREATE",
      resource_type: "DOCUMENT",
      resource_id: document.id,
      resource_label: document.title,
      source: body.source || "Unknown",
      context: contextName
    })

    return NextResponse.json(document)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 })
  }
}
