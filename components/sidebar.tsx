'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ConfigModal } from './config-modal';
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
  { name: 'Admin', href: '/admin', icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const { supabaseUser, did, signOut, isSupabaseConfigured } = useAuth();
  const [configOpen, setConfigOpen] = useState(false);

  return (
    <>
      <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Network className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-lg text-sidebar-foreground">Omnia</h1>
              <p className="text-xs text-sidebar-foreground/60">Protocol Dashboard</p>
            </div>
          </div>
        </div>

        {/* User info */}
        {supabaseUser && (
          <div className="p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
                {(supabaseUser.email ?? '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{supabaseUser.email}</p>
                <p className="text-xs text-foreground/40 font-mono truncate">{did}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1 overflow-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => setConfigOpen(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
          {isSupabaseConfigured && supabaseUser ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => signOut()}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          ) : isSupabaseConfigured ? (
            <Link href="/login">
              <Button variant="outline" size="sm" className="w-full justify-start">
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
