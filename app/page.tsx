'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { ConfigModal } from '@/components/config-modal';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import {
  Network,
  LogIn,
  Settings,
  ArrowRight,
  Activity,
  DollarSign,
  Vote,
  Zap,
  Layers,
  Sparkles,
  BarChart3,
  Bell,
  Shield,
  Fingerprint,
  User as UserIcon,
} from 'lucide-react';

const sections = [
  { title: 'Node Monitor', description: 'Node status, peers, and finalized height', href: '/monitor', icon: Network },
  { title: 'Governance', description: 'Read proposals, vote, and discuss', href: '/governance', icon: Vote },
  { title: 'Validators', description: 'Validator performance and slashing', href: '/validators', icon: Zap },
  { title: 'Economics', description: 'Register DIDs, check balances, spend UBC', href: '/economics', icon: DollarSign },
  { title: 'Events', description: 'Submit and explore consensus events', href: '/events', icon: Activity },
  { title: 'Shards', description: 'Submit operations to any domain shard', href: '/shards', icon: Layers },
  { title: 'Identity', description: 'DID management, biometric binding, recovery', href: '/identity', icon: Fingerprint },
  { title: 'Ceremony', description: 'ZK trusted setup coordination and transcript', href: '/ceremony', icon: Sparkles },
  { title: 'Analytics', description: 'UBC volume, events per hour, top senders', href: '/analytics', icon: BarChart3 },
  { title: 'Notifications', description: 'Slash events, proposals, ceremony milestones', href: '/notifications', icon: Bell },
  { title: 'Profile', description: 'Your DID, display name, and transfer history', href: '/profile', icon: UserIcon },
  { title: 'Admin', description: 'Register DIDs, mint UBC, advance epochs', href: '/admin', icon: Shield },
];

export default function Page() {
  const { isConfigured, isSupabaseConfigured, supabaseUser, did, isLoading } = useAuth();
  const [configOpen, setConfigOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading…</div>
      </div>
    );
  }

  // Not connected — landing
  if (!isConfigured) {
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

  // Connected — dashboard
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full">
            {supabaseUser && (
              <div className="mb-6 px-4 py-3 bg-card border border-border rounded-2xl flex items-center gap-3 animate-in">
                <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground/70 text-sm font-semibold shrink-0">
                  {(supabaseUser.email ?? '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    Signed in as <strong className="font-semibold">{supabaseUser.email}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{did}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-green-600 pulse-glow" />
                  Connected
                </div>
              </div>
            )}

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1.5">Dashboard</h1>
            <p className="text-muted-foreground mb-8">
              Everything on your node, in one place.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sections.map((s) => (
                <Link key={s.href} href={s.href} className="group">
                  <div className="h-full p-5 bg-card border border-border rounded-2xl transition-all duration-150 group-hover:border-foreground/25 group-hover:shadow-sm">
                    <s.icon className="w-5 h-5 text-muted-foreground mb-3 transition-colors group-hover:text-primary" />
                    <h3 className="font-semibold text-[15px] mb-0.5">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-snug">{s.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}
