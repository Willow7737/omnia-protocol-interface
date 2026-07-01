'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ConfigModal } from '@/components/config-modal';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { Network, LogIn, Settings, ArrowRight, Activity, DollarSign, Vote, Zap, Layers, Sparkles, BarChart3, Bell, Shield, Fingerprint } from 'lucide-react';
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground/40 text-sm">Loading...</div>
      </div>
    );
  }

  // Not configured — show login or manual config
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center p-4 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-md w-full text-center relative">
          <div className="mb-6 inline-block p-5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl glow">
            <Network className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2 gradient-text">Omnia Protocol</h1>
          <p className="text-foreground/50 mb-8">
            Connect to your Omnia node to access the complete monitoring, governance, and economics dashboard.
          </p>

          {isSupabaseConfigured ? (
            <div className="space-y-3">
              <Link href="/login">
                <Button size="lg" className="w-full h-12 gap-2 glow">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="w-full h-12 gap-2 glass hover:glow transition-all"
                onClick={() => setConfigOpen(true)}
              >
                <Settings className="w-4 h-4" />
                Manual Configuration
              </Button>
            </div>
          ) : (
            <Button size="lg" onClick={() => setConfigOpen(true)} className="gap-2 glow">
              Connect to Node
              <ArrowRight className="w-4 h-4" />
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
              <div className="mb-6 p-5 glass rounded-2xl flex items-center gap-4 animate-in">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-semibold ring-1 ring-primary/20">
                  {(supabaseUser.email ?? '?')[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    Welcome back, <strong>{supabaseUser.email}</strong>
                  </p>
                  <p className="text-xs text-foreground/50 font-mono">{did}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <div className="w-2 h-2 rounded-full bg-green-400 pulse-glow" />
                  Connected
                </div>
              </div>
            )}

            <h1 className="text-3xl font-bold mb-2 text-foreground">Dashboard</h1>
            <p className="text-foreground/50 mb-8">
              Select a section from the sidebar to monitor your node and participate in governance.
            </p>

            {/* Grid of cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <DashboardCard
                title="Node Monitor"
                description="Track node status, peers, and finalized height"
                href="/monitor"
                icon={Network}
                color="from-blue-500/20 to-blue-500/5"
              />
              <DashboardCard
                title="Governance"
                description="View proposals, vote, and discuss"
                href="/governance"
                icon={Vote}
                color="from-purple-500/20 to-purple-500/5"
              />
              <DashboardCard
                title="Validators"
                description="Monitor validator performance and slashing"
                href="/validators"
                icon={Zap}
                color="from-yellow-500/20 to-yellow-500/5"
              />
              <DashboardCard
                title="Economics"
                description="Register DIDs, check balances, spend UBC"
                href="/economics"
                icon={DollarSign}
                color="from-green-500/20 to-green-500/5"
              />
              <DashboardCard
                title="Events"
                description="Submit and explore consensus events"
                href="/events"
                icon={Activity}
                color="from-cyan-500/20 to-cyan-500/5"
              />
              <DashboardCard
                title="Shards"
                description="Submit operations to any domain shard"
                href="/shards"
                icon={Layers}
                color="from-orange-500/20 to-orange-500/5"
              />
              <DashboardCard
                title="Identity"
                description="DID management, biometric binding, recovery"
                href="/identity"
                icon={Fingerprint}
                color="from-pink-500/20 to-pink-500/5"
              />
              <DashboardCard
                title="Ceremony"
                description="ZK trusted setup coordination and transcript"
                href="/ceremony"
                icon={Sparkles}
                color="from-indigo-500/20 to-indigo-500/5"
              />
              <DashboardCard
                title="Analytics"
                description="UBC volume, events per hour, top senders"
                href="/analytics"
                icon={BarChart3}
                color="from-teal-500/20 to-teal-500/5"
              />
              <DashboardCard
                title="Notifications"
                description="Slash events, proposal changes, ceremony milestones"
                href="/notifications"
                icon={Bell}
                color="from-red-500/20 to-red-500/5"
              />
              <DashboardCard
                title="Profile"
                description="Your DID, display name, and transfer history"
                href="/profile"
                icon={Settings}
                color="from-gray-500/20 to-gray-500/5"
              />
              <DashboardCard
                title="Admin"
                description="Register DIDs, mint UBC, advance epochs"
                href="/admin"
                icon={Shield}
                color="from-rose-500/20 to-rose-500/5"
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
  icon: Icon,
  color,
}: {
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  icon: typeof Network;
  color: string;
}) {
  const content = (
    <div className={`block p-6 glass rounded-2xl hover:glow transition-all duration-300 cursor-pointer h-full group`}>
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6 text-foreground/80" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-foreground/50">{description}</p>
    </div>
  );

  return <a href={href}>{content}</a>;
}
