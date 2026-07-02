'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AuthGuard } from '@/components/auth-guard';
import { ConfigModal } from '@/components/config-modal';
import { Sidebar } from '@/components/sidebar';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import {
  Network,
  Settings,
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

export default function DashboardPage() {
  const { isConfigured, supabaseUser, did } = useAuth();
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-auto">
            <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full">
              {supabaseUser && (
                <div className="mb-6 px-4 py-3 bg-card border border-border rounded-2xl flex items-center gap-3 animate-in">
                  <UserAvatar user={supabaseUser} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      Signed in as <strong className="font-semibold">{supabaseUser.email}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{did}</p>
                  </div>
                  {isConfigured ? (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-green-600 pulse-glow" />
                      Connected
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      No node
                    </div>
                  )}
                </div>
              )}

              {!isConfigured && (
                <div className="mb-6 px-4 py-3 bg-amber-500/10 border border-yellow-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3">
                  <p className="text-sm text-foreground/70 flex-1">
                    No Omnia node is connected yet. Pages that read live node data will ask you
                    to add an endpoint and token.
                  </p>
                  <Button size="sm" variant="outline" className="gap-2 shrink-0" onClick={() => setConfigOpen(true)}>
                    <Settings className="w-4 h-4" />
                    Connect a node
                  </Button>
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
    </AuthGuard>
  );
}
