'use client';

import { useConfig } from '@/lib/config-context';
import { Sidebar } from '@/components/sidebar';
import { ConfigModal } from '@/components/config-modal';
import { useState } from 'react';
import useSWR from 'swr';
import { CreateProposalResult } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Vote, Info } from 'lucide-react';

export default function GovernancePage() {
  const { isConfigured, apiClient } = useConfig();
  const [configOpen, setConfigOpen] = useState(false);
  const [voting, setVoting] = useState<string | null>(null);

  // New proposal form state
  const [newProposalId, setNewProposalId] = useState('');
  const [newProposalDesc, setNewProposalDesc] = useState('');
  const [newProposalExpiry, setNewProposalExpiry] = useState('100');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const { data: proposals, error: proposalsError, mutate } = useSWR<CreateProposalResult[]>(
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
      setFormError(String(e));
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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground">Governance</h1>
          <p className="text-foreground/60">Create proposals and cast votes</p>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {proposalsError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{String(proposalsError)}</p>
            </div>
          )}

          {/* Info banner */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground/70">
              The node currently exposes proposal <strong>creation</strong> and{' '}
              <strong>voting</strong> endpoints, but not yet a list endpoint. After creating a
              proposal, record its ID — the list below will be empty until the node exposes{' '}
              <code className="text-xs">GET /api/v1/governance/proposals</code>.
            </div>
          </div>

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

          {/* Proposals list */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">
              Proposals ({proposals?.length ?? 0})
            </h2>
            <div className="space-y-4">
              {proposals && proposals.length > 0 ? (
                proposals.map((p) => (
                  <Card key={p.id} className="bg-card/50">
                    <CardHeader>
                      <CardTitle className="text-lg">{p.id}</CardTitle>
                      <p className="text-sm text-foreground/60">
                        Status: {p.status} · Created at epoch {p.created_at_epoch} · Expires at
                        epoch {p.expires_at_epoch}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          disabled={voting === p.id}
                          onClick={() => handleVote(p.id, 'for')}
                        >
                          {voting === p.id ? 'Voting...' : 'Vote For'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={voting === p.id}
                          onClick={() => handleVote(p.id, 'against')}
                        >
                          {voting === p.id ? 'Voting...' : 'Vote Against'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={voting === p.id}
                          onClick={() => handleVote(p.id, 'abstain')}
                        >
                          {voting === p.id ? 'Voting...' : 'Abstain'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="bg-card/50">
                  <CardContent className="pt-6">
                    <p className="text-foreground/60 text-sm">
                      No proposals found. Create one above to get started.
                    </p>
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
