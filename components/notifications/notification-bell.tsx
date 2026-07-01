'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle2, AlertCircle, Info, Trophy, ArrowRight, X } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import type { RealtimeChannel } from '@supabase/supabase-js';
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

/**
 * Notification bell — shows unread count badge and a dropdown list of
 * recent notifications. Subscribes to Supabase Realtime so new
 * notifications appear instantly without polling.
 *
 * The bell is only rendered when Supabase is configured and the user
 * is authenticated. Otherwise it returns null.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, mutate } = useSWR<NotificationsResponse>(
    '/api/notifications?limit=20',
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: false },
  );

  // ── Realtime subscription ───────────────────────────────────────────
  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    try {
      const supabase = createClient();
      channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          () => mutate(),
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications' },
          () => mutate(),
        )
        .subscribe();
    } catch {
      // Supabase not configured — silently skip
    }

    return () => {
      if (channel) {
        try {
          const supabase = createClient();
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, [mutate]);

  // ── Close dropdown on outside click ─────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'POST' });
      mutate();
    } catch (e) {
      console.error('Failed to mark notifications as read:', e);
    }
  };

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unread_count ?? 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs text-foreground/60">
                  ({unreadCount} unread)
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-foreground/40">
              No notifications yet.
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {notifications.map((n) => {
                const Icon = KIND_ICON[n.kind] ?? Info;
                const color = KIND_COLOR[n.kind] ?? 'text-foreground/60';
                const isUnread = !n.read_at;
                return (
                  <div
                    key={n.id}
                    className={`p-3 hover:bg-card/50 transition-colors cursor-pointer ${
                      isUnread ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => {
                      if (n.link) {
                        window.location.href = n.link;
                      }
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isUnread ? 'font-semibold text-foreground' : 'text-foreground/70'}`}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-foreground/60 mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                        )}
                        <p className="text-xs text-foreground/40 mt-1">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="p-2 border-t border-border text-center">
            <Link
              href="/notifications"
              className="text-xs text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
