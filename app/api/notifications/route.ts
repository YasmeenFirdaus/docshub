import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // 1. Get incoming shares (exclude where we are the owner)
    const shares = await prisma.documentShare.findMany({
      where: { 
        shared_with: session.user.id,
        document: { owner_id: { not: session.user.id } }
      },
      include: {
        document: { select: { title: true, id: true, owner: { select: { name: true, email: true } } } },
      },
      orderBy: { created_at: 'desc' },
      take: 20
    })

    // 2. Get incoming pending review requests (exclude where we requested it)
    const reviews = await prisma.reviewRequest.findMany({
      where: { 
        reviewer_id: session.user.id, 
        status: 'PENDING',
        requested_by: { not: session.user.id }
      },
      include: {
        document: { select: { title: true, id: true } },
        requester: { select: { name: true, email: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 20
    })

    // 3. Format and combine
    const formattedShares = shares.map(share => ({
      id: `share-${share.document_id}`,
      type: 'share',
      documentId: share.document_id,
      documentTitle: share.document.title,
      senderName: share.document.owner.name || share.document.owner.email,
      createdAt: share.created_at,
    }))

    const formattedReviews = reviews.map(review => ({
      id: review.id,
      type: 'review',
      documentId: review.document_id,
      documentTitle: review.document.title,
      senderName: review.requester.name || review.requester.email,
      createdAt: review.created_at,
    }))

    const notifications = [...formattedShares, ...formattedReviews].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
