import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/auth/callback']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Allow static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/apple') ||
    pathname.startsWith('/placeholder') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json'
  ) {
    return NextResponse.next()
  }

  // Check for Supabase auth cookies (sb-<project-ref>-auth-token)
  const authCookie = request.cookies.getAll().find(
    (cookie) => cookie.name.includes('-auth-token') || cookie.name === 'omnia-manual-jwt'
  )

  // Check for manual JWT in cookies (fallback mode)
  const manualJwt = request.cookies.get('omnia-manual-jwt')?.value
  const nodeEndpoint = request.cookies.get('omnia-node-endpoint')?.value

  if (authCookie || (manualJwt && nodeEndpoint)) {
    return NextResponse.next()
  }

  // Not authenticated — redirect to login
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
