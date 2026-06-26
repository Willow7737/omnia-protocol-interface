'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useConfig } from '@/lib/config-context';
import { ConfigModal } from '@/components/config-modal';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Network, LogIn, Settings, ArrowRight } from 'lucide-react';
import Link from 'next/link';

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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground/60">Loading...</div>
      </div>
    );
  }

  // Not configured — show login or manual config
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6 inline-block p-4 bg-primary/10 rounded-lg">
            <Network className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">Omnia Protocol</h1>
          <p className="text-foreground/60 mb-8">
            Connect to your Omnia node to access the complete monitoring, governance, and economics dashboard.
          </p>

          {isSupabaseConfigured ? (
            <div className="space-y-3">
              <Link href="/login">
                <Button size="lg" className="w-full">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => setConfigOpen(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Manual Configuration
              </Button>
            </div>
          ) : (
            <Button size="lg" onClick={() => setConfigOpen(true)}>
              Connect to Node
            </Button>
          )}
        </div>
        <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
      </div>
    );
  }

  // Configured — show dashboard
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Welcome banner */}
            {supabaseUser && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                  {(supabaseUser.email ?? '?')[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    Signed in as <strong>{supabaseUser.email}</strong>
                  </p>
                  <p className="text-xs text-foreground/60 font-mono">{did}</p>
                </div>
              </div>
            )}

            <h1 className="text-3xl font-bold mb-2 text-foreground">Welcome to Omnia Dashboard</h1>
            <p className="text-foreground/60 mb-8">
              Select a section from the sidebar to monitor your node and participate in governance.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DashboardCard
                title="Node Monitor"
                description="Track node status, peers, and finalized height"
                href="/monitor"
              />
              <DashboardCard
                title="Governance"
                description="View proposals, vote, and discuss"
                href="/governance"
              />
              <DashboardCard
                title="Validators"
                description="Monitor validator performance and slashing"
                href="/validators"
              />
              <DashboardCard
                title="Economics"
                description="Register DIDs, check balances, spend UBC"
                href="/economics"
              />
              <DashboardCard
                title="Events"
                description="Submit and explore consensus events"
                href="/events"
              />
              <DashboardCard
                title="Shards"
                description="Submit operations to any domain shard"
                href="/shards"
              />
              <DashboardCard
                title="Identity"
                description="DID management, biometric binding, recovery"
                href="/identity"
              />
              <DashboardCard
                title="Ceremony"
                description="ZK trusted setup coordination and transcript"
                href="/ceremony"
              />
              <DashboardCard
                title="Analytics"
                description="UBC volume, events per hour, top senders"
                href="/analytics"
              />
              <DashboardCard
                title="Notifications"
                description="Slash events, proposal changes, ceremony milestones"
                href="/notifications"
              />
              <DashboardCard
                title="Profile"
                description="Your DID, display name, and transfer history"
                href="/profile"
              />
              <DashboardCard
                title="Admin"
                description="Register DIDs, mint UBC, advance epochs"
                href="/admin"
              />
              <DashboardCard
                title="Configuration"
                description="Update API endpoint and authentication"
                href="#"
                onClick={() => setConfigOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}

function DashboardCard({
  title,
  description,
  href,
  onClick,
}: {
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="block p-6 bg-card border border-border rounded-lg hover:border-primary/50 hover:bg-card/50 transition-all cursor-pointer h-full">
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-foreground/60">{description}</p>
    </div>
  );

  if (onClick) {
    return <div onClick={onClick}>{content}</div>;
  }

  return <a href={href}>{content}</a>;
}
