'use client';

import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/sidebar';
import { CardListSkeleton } from '@/components/loading';
import { AuthGuard } from '@/components/auth-guard';
import { ConfigModal } from '@/components/config-modal';
import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Bell, CheckCircle2, Trophy, ArrowRight, Info, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  user_id: string | null;
  did: string | null;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
}

const fetcher = async (url: string): Promise<NotificationsResponse> => {
  const res = await fetch(url);
  if (!res.ok) return { notifications: [], unread_count: 0 };
  return res.json();
};

const KIND_ICON: Record<string, typeof Bell> = {
  slash: AlertCircle,
  proposal: Trophy,
  ceremony: CheckCircle2,
  transfer: ArrowRight,
  info: Info,
};

const KIND_COLOR: Record<string, string> = {
  slash: 'text-red-700',
  proposal: 'text-amber-700',
  ceremony: 'text-purple-700',
  transfer: 'text-green-700',
  info: 'text-blue-700',
};

export default function NotificationsPage() {
  const { isConfigured, isSupabaseConfigured } = useAuth();
  const [configOpen, setConfigOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  const { data, mutate } = useSWR<NotificationsResponse>(
    isSupabaseConfigured ? '/api/notifications?limit=100' : null,
    fetcher,
    { refreshInterval: 30000, revalidateOnFocus: false },
  );

  if (!isConfigured) {
    return (
      <AuthGuard>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-1.5">No node connected</h2>
            <p className="text-sm text-muted-foreground mb-5">Add your node&apos;s endpoint and token to load this page.</p>
            <Button onClick={() => setConfigOpen(true)}>Open node settings</Button>
          </div>
        </div>
        <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
      </div>
      </AuthGuard>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <AuthGuard>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">Notifications</h1>
            <div className="p-4 bg-amber-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-foreground/70">
                Notifications require Supabase. Sign in via the login page to access them.
              </p>
            </div>
          </div>
        </div>
      </div>
      </AuthGuard>
    );
  }

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unread_count ?? 0;

  const handleMarkAllRead = async () => {
    setMarking(true);
    try {
      await fetch('/api/notifications', { method: 'POST' });
      mutate();
    } finally {
      setMarking(false);
    }
  };

  return (
    <AuthGuard>
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
            <p className="text-foreground/60">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllRead} disabled={marking} variant="outline">
              {marking ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Mark all as read
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-3xl mx-auto space-y-3">
            {!data ? (
              <CardListSkeleton count={3} />
            ) : notifications.length === 0 ? (
              <Card className="bg-card/50">
                <CardContent className="pt-12 pb-12 text-center">
                  <Bell className="w-12 h-12 text-foreground/30 mx-auto mb-4" />
                  <p className="text-foreground/60">No notifications yet.</p>
                  <p className="text-xs text-foreground/40 mt-2">
                    You&apos;ll see notifications here when validators get slashed, proposals change
                    status, ceremony milestones are reached, or someone replies to your comments.
                  </p>
                </CardContent>
              </Card>
            ) : (
              notifications.map((n) => {
                const Icon = KIND_ICON[n.kind] ?? Info;
                const color = KIND_COLOR[n.kind] ?? 'text-foreground/60';
                const isUnread = !n.read_at;
                return (
                  <Card
                    key={n.id}
                    className={`bg-card/50 hover:bg-card/70 transition-colors cursor-pointer ${
                      isUnread ? 'border-primary/40' : ''
                    }`}
                    onClick={() => {
                      if (n.link) window.location.href = n.link;
                    }}
                  >
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3">
                        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm ${isUnread ? 'font-semibold text-foreground' : 'text-foreground/70'}`}>
                              {n.title}
                            </p>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          {n.body && (
                            <p className="text-sm text-foreground/60 mt-1">{n.body}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-foreground/40">
                            <span>{new Date(n.created_at).toLocaleString()}</span>
                            {n.did && (
                              <code className="font-mono">{n.did.slice(0, 16)}…</code>
                            )}
                            {n.link && (
                              <Link
                                href={n.link}
                                onClick={(e) => e.stopPropagation()}
                                className="text-primary hover:underline"
                              >
                                View →
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
    </AuthGuard>
  );
}
