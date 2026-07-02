'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { ConfigModal } from './config-modal';
import { NotificationBell } from './notifications/notification-bell';
import { UserAvatar } from './user-avatar';
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
  Menu,
  X,
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

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <Image
        src="/omnia-mark.png"
        alt="Omnia Protocol"
        width={30}
        height={30}
        className="shrink-0"
        priority
      />
      <span className="font-mono text-[15px] tracking-wide text-sidebar-foreground lowercase">
        omnia
        <span className="text-sidebar-foreground/45"> protocol</span>
      </span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate}>
            <div
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors duration-150 ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-foreground font-semibold'
                  : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              }`}
            >
              <Icon
                className={`w-[18px] h-[18px] ${isActive ? 'text-primary' : ''}`}
                strokeWidth={isActive ? 2.25 : 2}
              />
              <span className="text-sm">{item.name}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

function UserBlock() {
  const { supabaseUser, did } = useAuth();
  if (!supabaseUser) return null;
  return (
    <div className="p-4 border-b border-sidebar-border">
      <div className="flex items-center gap-3">
        <UserAvatar user={supabaseUser} size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate font-medium">{supabaseUser.email}</p>
          <p className="text-xs text-muted-foreground font-mono truncate">{did}</p>
        </div>
        <NotificationBell />
      </div>
    </div>
  );
}

function FooterActions({ onConfigure }: { onConfigure: () => void }) {
  const { supabaseUser, signOut, isSupabaseConfigured } = useAuth();
  return (
    <div className="p-3 border-t border-sidebar-border space-y-1">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground"
        onClick={onConfigure}
      >
        <Settings className="w-4 h-4 mr-2" />
        Node settings
      </Button>
      {isSupabaseConfigured && supabaseUser ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10"
          onClick={() => signOut()}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </Button>
      ) : isSupabaseConfigured ? (
        <Link href="/login" className="block">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Sign in
          </Button>
        </Link>
      ) : null}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [configOpen, setConfigOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer on navigation and lock scroll while it's open
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        data-sidebar
        className="hidden md:flex w-64 h-screen bg-sidebar border-r border-sidebar-border flex-col"
      >
        <div className="px-5 py-5 border-b border-sidebar-border">
          <Brand />
        </div>
        <UserBlock />
        <NavList />
        <FooterActions onConfigure={() => setConfigOpen(true)} />
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-13 bg-sidebar/95 backdrop-blur-sm border-b border-sidebar-border flex items-center justify-between px-4">
        <Brand />
        <button
          type="button"
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((v) => !v)}
          className="p-2 -mr-2 rounded-lg text-foreground/70 hover:bg-secondary active:bg-secondary transition-colors"
        >
          {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-30">
          <div
            className="absolute inset-0 bg-foreground/25"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="absolute top-13 bottom-0 left-0 w-72 max-w-[85vw] bg-sidebar border-r border-sidebar-border flex flex-col animate-in">
            <UserBlock />
            <NavList onNavigate={() => setDrawerOpen(false)} />
            <FooterActions
              onConfigure={() => {
                setDrawerOpen(false);
                setConfigOpen(true);
              }}
            />
          </div>
        </div>
      )}

      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </>
  );
}
