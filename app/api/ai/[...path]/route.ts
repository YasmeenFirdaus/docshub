import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

async function handleProxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  // 1. Verify the caller is authenticated
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const path = params.path.join('/')
  const url = `${AI_SERVICE_URL}/ai/${path}`

  // 2. Build a minimal token payload the FastAPI auth middleware can parse.
  //    auth.py expects: Bearer <JSON string> with { id, role }
  const tokenPayload = JSON.stringify({
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
  })

  const body = req.method === 'POST' ? await req.text() : undefined

  try {
    const res = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenPayload}`,
      },
      body,
    })

    // Pass through non-OK statuses with their body
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error) {
    console.error('[AI proxy] error:', error)
    return NextResponse.json({ error: 'AI service unreachable' }, { status: 502 })
  }
}

export const GET = (req: NextRequest, context: any) => handleProxy(req, context)
export const POST = (req: NextRequest, context: any) => handleProxy(req, context)
