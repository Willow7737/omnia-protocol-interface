import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/auth/callback']

// The landing page handles its own unauthenticated state (connect flow)
const LANDING = '/'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes and the landing page
  if (pathname === LANDING || PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
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

  // Supabase stores its session in cookies named sb-<project-ref>-auth-token
  // (optionally chunked as .0, .1, ...). Match that shape exactly — a loose
  // substring check would accept any cookie someone names *-auth-token.
  const hasSupabaseSession = request.cookies
    .getAll()
    .some((cookie) => /^sb-[a-z0-9]+-auth-token(\.\d+)?$/.test(cookie.name) && cookie.value)

  // Manual mode requires both the endpoint and the node JWT
  const manualJwt = request.cookies.get('omnia-manual-jwt')?.value
  const nodeEndpoint = request.cookies.get('omnia-node-endpoint')?.value

  if (hasSupabaseSession || (manualJwt && nodeEndpoint)) {
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
