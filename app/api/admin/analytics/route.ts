import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const [
      totalDocuments,
      totalWorkspaces,
      activeUsersCount,
      pendingReviews,
      totalStorage,
      totalShared
    ] = await Promise.all([
      prisma.document.count({ where: { is_deleted: false } }),
      prisma.workspace.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.reviewRequest.count({ where: { status: 'PENDING' } }),
      prisma.document.aggregate({ _sum: { file_size: true } }),
      prisma.documentShare.count()
    ])

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)
    
    const logs = await prisma.activityLog.findMany({
      where: { created_at: { gte: sevenDaysAgo } },
      select: { created_at: true, action: true }
    })

    const chartMap = new Map()
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo)
      d.setDate(d.getDate() + i)
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      chartMap.set(label, { name: label, Created: 0, Edited: 0, Reviewed: 0, Shared: 0, Deleted: 0 })
    }

    logs.forEach(log => {
      const label = new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (chartMap.has(label)) {
        const entry = chartMap.get(label)
        const action = log.action as string;
        if (action === 'DOCUMENT_CREATED' || action === 'DOCUMENT_IMPORTED') entry.Created++
        else if (action === 'DOCUMENT_EDITED') entry.Edited++
        else if (action === 'REVIEW_REQUESTED' || action === 'REVIEW_APPROVED' || action === 'REVIEW_REJECTED' || action === 'REVIEW_COMPLETED') entry.Reviewed++
        else if (action === 'DOCUMENT_SHARED') entry.Shared++
        else if (action === 'DOCUMENT_DELETED' || action === 'PERMANENT_DELETE') entry.Deleted++
      }
    })

    const activityData = Array.from(chartMap.values())

    return NextResponse.json({
      total_documents: totalDocuments,
      total_workspaces: totalWorkspaces,
      active_users: activeUsersCount,
      pending_reviews: pendingReviews,
      storage_bytes: totalStorage._sum.file_size || 0,
      activity_data: activityData,
      shared_documents: totalShared
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}