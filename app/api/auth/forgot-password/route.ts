import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true },
    })

    // Always return success to prevent email enumeration
    if (!user) return NextResponse.json({ success: true })

    const token = randomUUID()
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { reset_token: token, reset_token_expires: expires },
    })

    // Fire-and-forget — don't block the response on email delivery
    sendPasswordResetEmail({ to: user.email, token }).catch((err) =>
      console.error('Failed to send password reset email:', err)
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
