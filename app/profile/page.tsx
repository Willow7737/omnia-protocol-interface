'use client';

import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/sidebar';
import { ConfigModal } from '@/components/config-modal';
import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, User, Loader2, Save, Fingerprint, ArrowRight, Activity, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface Profile {
  user_id: string;
  email: string | null;
  did: string | null;
  display_name: string | null;
  created_at: string | null;
}

interface UserTransfer {
  id: string;
  from_did: string;
  to_did: string;
  amount: number;
  new_balance: number;
  status: string;
  timestamp: number;
}

const profileFetcher = async (url: string): Promise<Profile> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
};

const transfersFetcher = async (url: string): Promise<UserTransfer[]> => {
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.transfers ?? [];
};

export default function ProfilePage() {
  const { isConfigured, isSupabaseConfigured, supabaseUser, did, apiClient } = useAuth();
  const [configOpen, setConfigOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Load profile from /api/profile
  const { data: profile, mutate: mutateProfile } = useSWR<Profile>(
    isSupabaseConfigured ? '/api/profile' : null,
    profileFetcher,
    { refreshInterval: 0 },
  );

  // Initialize display name field when profile loads
  if (profile && displayName === '' && profile.display_name) {
    setDisplayName(profile.display_name);
  }

  // Load the user's transfers from the Supabase mirror (filter by their DID)
  const { data: transfers } = useSWR<UserTransfer[]>(
    isSupabaseConfigured && did ? `/api/analytics?did=${encodeURIComponent(did)}` : null,
    async () => {
      // The analytics endpoint doesn't filter by DID — fetch from /api/sync
      // status instead, then we'd need a dedicated user transfers endpoint.
      // For now, query the node directly if apiClient is available.
      if (!apiClient || !did) return [];
      try {
        const all = await apiClient.getTransfers(100);
        return all.filter((t) => t.from_did === did || t.to_did === did);
      } catch {
        return [];
      }
    },
    { refreshInterval: 30000 },
  );

  if (!isConfigured) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Not Connected</h2>
            <p className="text-foreground/60 mb-4">Please configure your node connection</p>
          </div>
        </div>
        <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">Profile</h1>
            <p className="text-foreground/60 mb-6">Your DID and account information</p>
            <div className="p-4 bg-amber-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-foreground/70">
                Profile features require Supabase. You&apos;re currently in manual mode — sign in
                via the login page to access your profile.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      setSaveSuccess('Display name updated');
      mutateProfile();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const userTransfers = transfers ?? [];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border px-4 py-4 sm:px-8 sm:py-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Profile</h1>
          <p className="text-foreground/60">Your DID, display name, and activity</p>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Identity */}
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fingerprint className="w-5 h-5" />
                  Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-foreground/60 mb-1">Email</p>
                    <p className="text-sm text-foreground">{supabaseUser?.email ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/60 mb-1">Account Created</p>
                    <p className="text-sm text-foreground">
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleString()
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/60 mb-1">Your DID (immutable)</p>
                    <code className="text-xs font-mono text-primary break-all">
                      {did ?? profile?.did ?? '—'}
                    </code>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/60 mb-1">User ID (internal)</p>
                    <code className="text-xs font-mono text-foreground/40 break-all">
                      {supabaseUser?.id ?? '—'}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Display name */}
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Display Name
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-foreground/60">
                  Your display name is shown next to your comments and in any future social
                  features. Your DID stays immutable — only the display name is editable.
                </p>
                <div>
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input
                    id="display-name"
                    placeholder="e.g. Alice the Validator"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {displayName.length}/50 characters
                  </p>
                </div>
                {saveError && <p className="text-sm text-destructive">{saveError}</p>}
                {saveSuccess && <p className="text-sm text-green-700">{saveSuccess}</p>}
                <Button onClick={handleSave} disabled={saving || displayName.trim().length === 0}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Activity summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-foreground/60 text-sm">Your Transfers</span>
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-2xl font-semibold text-foreground">
                    {userTransfers.length}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-foreground/60 text-sm">Comments Posted</span>
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-2xl font-semibold text-foreground">—</p>
                  <p className="text-xs text-foreground/40 mt-1">Coming soon</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-foreground/60 text-sm">Events Submitted</span>
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-2xl font-semibold text-foreground">—</p>
                  <p className="text-xs text-foreground/40 mt-1">Coming soon</p>
                </CardContent>
              </Card>
            </div>

            {/* Transfer history */}
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="w-5 h-5" />
                  Your Transfer History ({userTransfers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userTransfers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-3 text-foreground/60 font-medium">Direction</th>
                          <th className="text-left py-3 px-3 text-foreground/60 font-medium">Counterparty</th>
                          <th className="text-right py-3 px-3 text-foreground/60 font-medium">Amount</th>
                          <th className="text-right py-3 px-3 text-foreground/60 font-medium">New Balance</th>
                          <th className="text-left py-3 px-3 text-foreground/60 font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userTransfers.map((t) => {
                          const isOutgoing = t.from_did === did;
                          return (
                            <tr
                              key={t.id}
                              className="border-b border-border/50 hover:bg-card/50 transition-colors"
                            >
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    isOutgoing
                                      ? 'bg-red-600/10 text-red-700'
                                      : 'bg-green-600/10 text-green-700'
                                  }`}
                                >
                                  {isOutgoing ? 'Sent' : 'Received'}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <code className="text-xs font-mono text-primary">
                                  {(isOutgoing ? t.to_did : t.from_did).slice(0, 24)}…
                                </code>
                              </td>
                              <td className={`py-3 px-3 text-right font-medium ${isOutgoing ? 'text-red-700' : 'text-green-700'}`}>
                                {isOutgoing ? '-' : '+'}{t.amount} UBC
                              </td>
                              <td className="py-3 px-3 text-right text-foreground/60">
                                {t.new_balance}
                              </td>
                              <td className="py-3 px-3 text-foreground/60 text-xs">
                                {new Date(t.timestamp).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-foreground/60 text-sm">
                    No transfers yet. Visit the{' '}
                    <Link href="/economics" className="text-primary underline">Economics page</Link>{' '}
                    to register your DID and make your first transfer.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick links */}
            <div className="flex gap-3">
              <Link href="/analytics">
                <Button variant="outline">
                  <Activity className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </Link>
              <Link href="/governance">
                <Button variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Browse Proposals
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}
