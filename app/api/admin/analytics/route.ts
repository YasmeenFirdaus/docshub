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
      totalStorage
    ] = await Promise.all([
      prisma.document.count({ where: { is_deleted: false } }),
      prisma.workspace.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.reviewRequest.count({ where: { status: 'PENDING' } }),
      prisma.document.aggregate({ _sum: { file_size: true } })
    ])

    // Mocking the 30-day activity data for the chart as per Phase 2 requirements
    // In production, you would group by created_at in Prisma
    const activityData = Array.from({ length: 7 }).map((_, i) => ({
      name: `Day ${i + 1}`,
      docs: Math.floor(Math.random() * 50) + 10
    }))

    return NextResponse.json({
      total_documents: totalDocuments,
      total_workspaces: totalWorkspaces,
      active_users: activeUsersCount,
      pending_reviews: pendingReviews,
      storage_bytes: totalStorage._sum.file_size || 0,
      activity_data: activityData
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}