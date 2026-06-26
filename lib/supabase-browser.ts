/**
 * Browser-side Supabase client.
 *
 * Uses the anon key (public — safe to expose). Auth state is stored in
 * cookies via @supabase/ssr so it persists across reloads.
 */
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copy .env.local.example to .env.local and fill in the values.',
    );
  }

  return createBrowserClient(url, anonKey);
}
