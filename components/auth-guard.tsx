'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

/**
 * Client-side auth gate.
 *
 * The middleware redirects requests with no auth cookies at all, but it
 * cannot tell a valid session from a stale one. This guard runs after the
 * real session check resolves:
 *
 *   - Supabase mode: requires a live Supabase session.
 *   - Manual mode (Supabase not configured): requires endpoint + token.
 *
 * While the session check is in flight it renders a centered spinner
 * instead of page chrome, so signed-out users never see the app shell.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, isSupabaseConfigured, supabaseUser, isConfigured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed = isSupabaseConfigured ? !!supabaseUser : isConfigured;

  useEffect(() => {
    if (!isLoading && !allowed) {
      if (isSupabaseConfigured) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      } else {
        // Manual mode with no config — the landing page owns the connect flow
        router.replace('/');
      }
    }
  }, [isLoading, allowed, isSupabaseConfigured, pathname, router]);

  if (isLoading || !allowed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
