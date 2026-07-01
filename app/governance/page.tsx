'use client';

import { useConfig } from '@/lib/config-context';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/sidebar';
import { ConfigModal } from '@/components/config-modal';
import { ErrorBanner } from '@/components/error-banner';
import { Comments } from '@/components/comments';
import { useState } from 'react';
import useSWR from 'swr';
import { Proposal } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Vote, TrendingUp } from 'lucide-react';

export default function GovernancePage() {
  const { isConfigured, apiClient } = useConfig();
  const { supabaseUser } = useAuth();
  const [configOpen, setConfigOpen] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);

  // New proposal form state
  const [newProposalId, setNewProposalId] = useState('');
  const [newProposalDesc, setNewProposalDesc] = useState('');
  const [newProposalExpiry, setNewProposalExpiry] = useState('100');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const { data: proposals, error: proposalsError, mutate } = useSWR<Proposal[]>(
    isConfigured ? 'governance-proposals' : null,
    async () => apiClient!.getProposals(),
    { refreshInterval: 10000, revalidateOnFocus: false },
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

  const handleCreate = async () => {
    setFormError('');
    if (!newProposalId.trim() || !newProposalDesc.trim()) {
      setFormError('Proposal ID and description are required');
      return;
    }
    const expiry = parseInt(newProposalExpiry, 10);
    if (isNaN(expiry) || expiry <= 0) {
      setFormError('Expiry epoch must be a positive integer');
      return;
    }

    setCreating(true);
    try {
      await apiClient!.createProposal(newProposalId, newProposalDesc, expiry);
      setNewProposalId('');
      setNewProposalDesc('');
      setNewProposalExpiry('100');
      mutate();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  const handleVote = async (proposalId: string, choice: 'for' | 'against' | 'abstain') => {
    setVoting(proposalId);
    try {
      await apiClient!.voteOnProposal(proposalId, choice);
      mutate();
    } catch (error) {
      console.error('Vote failed:', error);
    } finally {
      setVoting(null);
    }
  };

  const activeProposals =
    proposals?.filter((p) => p.status === 'voting' || p.status === 'pending') || [];
  const completedProposals =
    proposals?.filter((p) => p.status === 'passed' || p.status === 'failed' || p.status === 'expired') || [];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border px-4 py-4 sm:px-8 sm:py-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Governance</h1>
          <p className="text-foreground/60">Create proposals and cast votes</p>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          {proposalsError && (
            <ErrorBanner error={proposalsError} title="Couldn't load proposals" />
          )}

          {/* Create proposal */}
          <Card className="bg-card/50 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Vote className="w-5 h-5" />
                Create Proposal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="proposal-id">Proposal ID</Label>
                <Input
                  id="proposal-id"
                  placeholder="e.g. proposal-1"
                  value={newProposalId}
                  onChange={(e) => setNewProposalId(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="proposal-desc">Description</Label>
                <Input
                  id="proposal-desc"
                  placeholder="Short description of the proposal"
                  value={newProposalDesc}
                  onChange={(e) => setNewProposalDesc(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="proposal-expiry">Expires at Epoch</Label>
                <Input
                  id="proposal-expiry"
                  type="number"
                  placeholder="100"
                  value={newProposalExpiry}
                  onChange={(e) => setNewProposalExpiry(e.target.value)}
                  className="mt-1"
                />
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Proposal'}
              </Button>
            </CardContent>
          </Card>

          {/* Active Proposals */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Active Proposals ({activeProposals.length})
            </h2>
            <div className="space-y-4">
              {activeProposals.length > 0 ? (
                activeProposals.map((p) => (
                  <ProposalCard
                    key={p.id}
                    proposal={p}
                    onVote={handleVote}
                    voting={voting}
                    canComment={!!supabaseUser}
                  />
                ))
              ) : (
                <Card className="bg-card/50">
                  <CardContent className="pt-6">
                    <p className="text-foreground/60 text-sm">No active proposals</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Completed Proposals */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">
              Completed Proposals ({completedProposals.length})
            </h2>
            <div className="space-y-4">
              {completedProposals.length > 0 ? (
                completedProposals.map((p) => (
                  <ProposalCard key={p.id} proposal={p} completed onVote={handleVote} voting={voting} canComment={!!supabaseUser} />
                ))
              ) : (
                <Card className="bg-card/50">
                  <CardContent className="pt-6">
                    <p className="text-foreground/60 text-sm">No completed proposals</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}

function ProposalCard({
  proposal,
  completed,
  onVote,
  voting,
  canComment,
}: {
  proposal: Proposal;
  completed?: boolean;
  onVote: (id: string, vote: 'for' | 'against' | 'abstain') => void;
  voting: string | null;
  canComment: boolean;
}) {
  // Use the server-provided total_participation, falling back to the
  // sum of vote fields if absent (defensive — schema requires it).
  const total = proposal.total_participation
    ?? (proposal.votes_for + proposal.votes_against + proposal.votes_abstain);
  const yesPercent = total > 0 ? (proposal.votes_for / total) * 100 : 0;
  const noPercent = total > 0 ? (proposal.votes_against / total) * 100 : 0;
  const abstainPercent = total > 0 ? (proposal.votes_abstain / total) * 100 : 0;

  return (
    <Card className="bg-card/50 hover:bg-card/70 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{proposal.id}</CardTitle>
            <p className="text-sm text-foreground/60 mb-2">{proposal.description}</p>
            <div className="flex items-center gap-4 text-xs text-foreground/50">
              <span>Created epoch {proposal.created_at_epoch}</span>
              <span>Expires epoch {proposal.expires_at_epoch}</span>
            </div>
          </div>
          <div className={`px-3 py-1 rounded text-sm font-medium whitespace-nowrap ${getStatusColor(proposal.status)}`}>
            {proposal.status}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vote Results */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground/60 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Total Participation: {total}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-green-700">For</span>
              <span className="text-sm text-foreground/60">
                {proposal.votes_for} ({yesPercent.toFixed(1)}%)
              </span>
            </div>
            <Progress value={yesPercent} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-red-700">Against</span>
              <span className="text-sm text-foreground/60">
                {proposal.votes_against} ({noPercent.toFixed(1)}%)
              </span>
            </div>
            <Progress value={noPercent} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-amber-700">Abstain</span>
              <span className="text-sm text-foreground/60">
                {proposal.votes_abstain} ({abstainPercent.toFixed(1)}%)
              </span>
            </div>
            <Progress value={abstainPercent} className="h-2" />
          </div>
        </div>

        {/* Vote buttons */}
        {!completed && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                disabled={voting === proposal.id}
                onClick={() => onVote(proposal.id, 'for')}
              >
                {voting === proposal.id ? 'Voting...' : 'Vote For'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={voting === proposal.id}
                onClick={() => onVote(proposal.id, 'against')}
              >
                {voting === proposal.id ? 'Voting...' : 'Vote Against'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={voting === proposal.id}
                onClick={() => onVote(proposal.id, 'abstain')}
              >
                {voting === proposal.id ? 'Voting...' : 'Abstain'}
              </Button>
            </div>
          </div>
        )}

        {/* Off-chain discussion (Supabase) */}
        <Comments proposalId={proposal.id} canComment={canComment} />
      </CardContent>
    </Card>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'voting':
      return 'bg-blue-600/10 text-blue-700';
    case 'pending':
      return 'bg-amber-500/10 text-amber-700';
    case 'passed':
      return 'bg-green-600/10 text-green-700';
    case 'expired':
      return 'bg-gray-500/10 text-gray-600';
    case 'failed':
      return 'bg-red-600/10 text-red-700';
    default:
      return 'bg-gray-500/10 text-gray-600';
  }
}
