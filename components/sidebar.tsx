'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ConfigModal } from './config-modal';
import { NotificationBell } from './notifications/notification-bell';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Network,
  Vote,
  DollarSign,
  Activity,
  Zap,
  Settings,
  LogOut,
  Shield,
  Fingerprint,
  Layers,
  Sparkles,
  BarChart3,
  Bell,
  User as UserIcon,
  LogIn,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Node Monitor', href: '/monitor', icon: Network },
  { name: 'Governance', href: '/governance', icon: Vote },
  { name: 'Validators', href: '/validators', icon: Zap },
  { name: 'Economics', href: '/economics', icon: DollarSign },
  { name: 'Events', href: '/events', icon: Activity },
  { name: 'Shards', href: '/shards', icon: Layers },
  { name: 'Identity', href: '/identity', icon: Fingerprint },
  { name: 'Ceremony', href: '/ceremony', icon: Sparkles },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Profile', href: '/profile', icon: UserIcon },
  { name: 'Admin', href: '/admin', icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const { supabaseUser, did, signOut, isSupabaseConfigured } = useAuth();
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <>
      <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Logo + brand */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center glow">
              <Network className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-lg text-sidebar-foreground tracking-tight">Omnia</h1>
              <p className="text-xs text-sidebar-foreground/50 font-medium">Protocol Dashboard</p>
            </div>
          </div>
        </div>

        {/* User info */}
        {supabaseUser && (
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary text-sm font-semibold ring-1 ring-primary/20">
                {(supabaseUser.email ?? '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate font-medium">{supabaseUser.email}</p>
                <p className="text-xs text-foreground/40 font-mono truncate">{did}</p>
              </div>
              <NotificationBell />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground glow'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  <Icon className={`w-[18px] h-[18px] ${isActive ? '' : 'opacity-70'}`} />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setConfigOpen(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
          {isSupabaseConfigured && supabaseUser ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10"
              onClick={() => signOut()}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          ) : isSupabaseConfigured ? (
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </>
  );
}
