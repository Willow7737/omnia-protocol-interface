/**
 * /auth/callback — Supabase OAuth + magic link redirect handler.
 *
 * After a user clicks the magic link in their email or completes the
 * GitHub/Google OAuth flow, Supabase redirects them here with a `code`
 * query parameter. This route exchanges the code for a session, then
 * redirects to the page they were originally trying to view.
 *
 * Without this route, the email magic link and OAuth redirects 404.
 */
import { NextResponse } from 'next/server';
import { createServerClientFromCookies } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  if (code) {
    try {
      const supabase = await createServerClientFromCookies();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('Code exchange error:', error.message);
        // Redirect to login with an error message
        const redirectUrl = new URL('/login', url.origin);
        redirectUrl.searchParams.set('error', 'auth_callback_failed');
        return NextResponse.redirect(redirectUrl);
      }
      // Success — session is now set in cookies. Redirect to the original page.
      return NextResponse.redirect(new URL(next, url.origin));
    } catch (e) {
      console.error('Callback error:', e);
      const redirectUrl = new URL('/login', url.origin);
      redirectUrl.searchParams.set('error', 'callback_exception');
      return NextResponse.redirect(redirectUrl);
    }
  }

  // No code param — redirect to login
  return NextResponse.redirect(new URL('/login', url.origin));
}
