'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ConfigModal } from '@/components/config-modal';
import { Button } from '@/components/ui/button';
import { LogIn, Settings, ArrowRight } from 'lucide-react';

/**
 * Landing page.
 *
 * Signed-out visitors see the connect/sign-in card. As soon as the user
 * is authenticated (Supabase session, or a manual endpoint + JWT), they
 * are redirected to /dashboard — the landing page never doubles as the
 * dashboard.
 */
export default function Page() {
  const { isConfigured, isSupabaseConfigured, supabaseUser, isLoading } = useAuth();
  const router = useRouter();
  const [configOpen, setConfigOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isAuthenticated = (isSupabaseConfigured && !!supabaseUser) || isConfigured;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [mounted, isLoading, isAuthenticated, router]);

  if (!mounted || isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
          <Image
            src="/omnia-lockup.png"
            alt="Omnia Protocol"
            width={120}
            height={205}
            className="mx-auto mb-6"
            priority
          />
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Connect to an Omnia node to monitor consensus, take part in
            governance, and manage the network economy.
          </p>

          {isSupabaseConfigured ? (
            <div className="space-y-2.5">
              <Link href="/login" className="block">
                <Button size="lg" className="w-full h-11 gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign in
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full h-11 gap-2"
                onClick={() => setConfigOpen(true)}
              >
                <Settings className="w-4 h-4" />
                Connect manually
              </Button>
            </div>
          ) : (
            <Button size="lg" className="w-full h-11 gap-2" onClick={() => setConfigOpen(true)}>
              Connect to a node
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="mt-4 text-center font-mono text-[11px] tracking-wide text-muted-foreground/70 lowercase">
          settlement-agnostic dag consensus
        </p>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}
