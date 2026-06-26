/**
 * Server-side Supabase clients.
 *
 * Two clients are provided:
 *   - createServerClientFromCookies() — respects the user's auth cookies
 *     (for user-scoped operations)
 *   - createServiceRoleClient() — uses the service role key, bypasses RLS
 *     (for sync operations and JWT minting)
 *
 * Both are server-only — never import from a client component.
 */
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Create a Supabase client that respects the user's auth cookies.
 * Use this for user-scoped operations (e.g. reading the current user's DID).
 *
 * In Next.js 16, `cookies()` returns a Promise — we await it.
 */
export async function createServerClientFromCookies() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as never),
          );
        } catch {
          // Called from a Server Component — cookies can't be set.
          // Safe to ignore if middleware refreshes the session.
        }
      },
    },
  });
}

/**
 * Create a Supabase client with the service role key.
 * Bypasses RLS — use ONLY for trusted server-side operations (sync, JWT mint).
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
        'The service role key is required for sync and JWT minting.',
    );
  }

  return createServiceClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
