import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "OWNER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "25")
    const page = parseInt(searchParams.get("page") || "1")
    const skip = (page - 1) * limit
    const search = searchParams.get("search") || ""

    const whereClause: any = {}
    
    if (search) {
      whereClause.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        // Action is enum, so search must match exactly, but it's tricky to partial search an enum in Prisma without raw queries.
        // We'll just search the JSON meta target field if they type a document name
        {
          meta: {
            path: ['resource_label'],
            string_contains: search
          }
        },
        {
          entity_id: { contains: search, mode: 'insensitive' }
        }
      ]
    }

    const [rawLogs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { name: true, email: true, avatar_url: true }
          }
        }
      }),
      prisma.activityLog.count({ where: whereClause })
    ])

    const logs = rawLogs.map(log => {
      let story = "Performed action"
      const meta = log.meta as any || {}
      const op = meta.operation || log.action

      switch (op) {
        case 'CREATE': story = `Created ${meta.resource_type?.toLowerCase() || 'item'}`; break;
        case 'EDIT': story = `Edited ${meta.resource_type?.toLowerCase() || 'item'} content`; break;
        case 'RENAME': story = `Renamed ${meta.resource_type?.toLowerCase() || 'item'}`; break;
        case 'MOVE': story = `Moved ${meta.resource_type?.toLowerCase() || 'item'}`; break;
        case 'STATUS_CHANGE': 
          const prevSuffix = meta.previous?.workspace_edit ? ' (can edit)' : ' (can view)';
          const currSuffix = meta.current?.workspace_edit ? ' (can edit)' : ' (can view)';
          const prevStatus = meta.previous?.status === 'PUBLISHED' ? `PUBLISHED${prevSuffix}` : meta.previous?.status || 'Unknown';
          const currStatus = meta.current?.status === 'PUBLISHED' ? `PUBLISHED${currSuffix}` : meta.current?.status || 'Unknown';
          story = `Changed status from ${prevStatus} to ${currStatus}`; 
          break;
        case 'UPDATE_REVIEW_STATUS':
          story = `Changed review status from ${meta.previous?.status || 'Unknown'} to ${meta.current?.status || 'Unknown'}`;
          break;
        case 'SHARE': 
          const count = meta.current?.shared_with?.length || 0;
          story = `Shared ${meta.resource_type?.toLowerCase() || 'item'} with ${count} member${count !== 1 ? 's' : ''}`;
          break;
        case 'REVOKE_SHARE':
          story = `Revoked share access`;
          break;
        case 'REQUEST_REVIEW':
          const rCount = meta.current?.reviewer_ids?.length || 0;
          story = `Requested review from ${rCount} member${rCount !== 1 ? 's' : ''}`;
          break;
        case 'RESTORE': story = `Restored ${meta.resource_type?.toLowerCase() || 'item'}`; break;
        case 'DELETE': story = `Deleted ${meta.resource_type?.toLowerCase() || 'item'}`; break;
        case 'PERMANENT_DELETE': story = `Permanently deleted ${meta.resource_type?.toLowerCase() || 'item'}`; break;
        case 'DUPLICATE': story = `Duplicated ${meta.resource_type?.toLowerCase() || 'item'}`; break;
        case 'ARCHIVE': story = `Archived ${meta.resource_type?.toLowerCase() || 'item'}`; break;
        case 'UNARCHIVE': story = `Unarchived ${meta.resource_type?.toLowerCase() || 'item'}`; break;
        case 'TOGGLE_FAVORITE': story = meta.current?.favorite ? `Favorited ${meta.resource_type?.toLowerCase() || 'item'}` : `Unfavorited ${meta.resource_type?.toLowerCase() || 'item'}`; break;
        case 'LOGIN': story = 'Logged in'; break;
        default: 
          if (op.includes('_CREATED')) story = 'Created item';
          else if (op.includes('_EDITED')) story = 'Edited item';
          else if (op.includes('_DELETED')) story = 'Deleted item';
      }

      return {
        ...log,
        story,
      }
    })

    return NextResponse.json({ logs, total, page, limit })
  } catch (error: any) {
    console.error("Activity GET error:", error)
    return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 })
  }
}
