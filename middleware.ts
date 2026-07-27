import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Admin Route Protection
    if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/home', req.url))
    }

    // Role-based redirects for authenticated users hitting root
    if (path === '/') {
      if (token?.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url))
      }
      return NextResponse.redirect(new URL('/home', req.url))
    }
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const publicPaths = ['/login', '/forgot-password', '/reset-password', '/invite/accept']
        if (publicPaths.some(p => req.nextUrl.pathname.startsWith(p))) {
          return true
        }
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}