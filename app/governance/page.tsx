'use client';

import { useConfig } from '@/lib/config-context';
import { Sidebar } from '@/components/sidebar';
import { ConfigModal } from '@/components/config-modal';
import { useState } from 'react';
import useSWR from 'swr';
import { Proposal } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Vote, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function GovernancePage() {
  const { isConfigured, apiClient } = useConfig();
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);
  const [voting, setVoting] = useState<string | null>(null);

  const { data: proposals, error: proposalsError, mutate } = useSWR<Proposal[]>(
    isConfigured ? 'governance-proposals' : null,
    async () => apiClient!.getProposals(),
    { refreshInterval: 10000, revalidateOnFocus: false }
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

  const handleVote = async (proposalId: string, vote: 'yes' | 'no' | 'abstain') => {
    setVoting(proposalId);
    try {
      await apiClient!.voteOnProposal(proposalId, vote);
      mutate();
    } catch (error) {
      console.error('Vote failed:', error);
    } finally {
      setVoting(null);
    }
  };

  const activeProposals = proposals?.filter((p) => p.status === 'voting' || p.status === 'pending') || [];
  const completedProposals = proposals?.filter((p) => p.status === 'passed' || p.status === 'failed' || p.status === 'executed') || [];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground">Governance</h1>
          <p className="text-foreground/60">Active proposals and voting</p>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {proposalsError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{String(proposalsError)}</p>
            </div>
          )}

          {/* Active Proposals */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Active Proposals ({activeProposals.length})</h2>
            <div className="space-y-4">
              {activeProposals.length > 0 ? (
                activeProposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} onVote={handleVote} voting={voting} />)
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
            <h2 className="text-xl font-bold text-foreground mb-4">Completed Proposals ({completedProposals.length})</h2>
            <div className="space-y-4">
              {completedProposals.length > 0 ? (
                completedProposals.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} completed onVote={handleVote} voting={voting} />)
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
}: {
  proposal: Proposal;
  completed?: boolean;
  onVote: (id: string, vote: 'yes' | 'no' | 'abstain') => void;
  voting: string | null;
}) {
  const total = proposal.yes_votes + proposal.no_votes + proposal.abstain_votes;
  const yesPercent = total > 0 ? (proposal.yes_votes / total) * 100 : 0;
  const noPercent = total > 0 ? (proposal.no_votes / total) * 100 : 0;
  const abstainPercent = total > 0 ? (proposal.abstain_votes / total) * 100 : 0;

  return (
    <Card className="bg-card/50 hover:bg-card/70 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{proposal.title}</CardTitle>
            <p className="text-sm text-foreground/60 mb-2">{proposal.description}</p>
            <div className="flex items-center gap-4 text-xs text-foreground/50">
              <span>By {proposal.proposer.slice(0, 10)}...</span>
              <span>{new Date(proposal.created_at).toLocaleDateString()}</span>
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
            <span className="text-foreground/60">Total Votes: {total}</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-green-400">Yes</span>
              <span className="text-sm text-foreground/60">{proposal.yes_votes} ({yesPercent.toFixed(1)}%)</span>
            </div>
            <Progress value={yesPercent} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-red-400">No</span>
              <span className="text-sm text-foreground/60">{proposal.no_votes} ({noPercent.toFixed(1)}%)</span>
            </div>
            <Progress value={noPercent} className="h-2" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-yellow-400">Abstain</span>
              <span className="text-sm text-foreground/60">{proposal.abstain_votes} ({abstainPercent.toFixed(1)}%)</span>
            </div>
            <Progress value={abstainPercent} className="h-2" />
          </div>
        </div>

        {/* Voting deadline */}
        {!completed && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-foreground/60 mb-3">
              Deadline: {new Date(proposal.deadline).toLocaleString()}
            </p>

            {/* Vote buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                disabled={voting === proposal.id}
                onClick={() => onVote(proposal.id, 'yes')}
              >
                {voting === proposal.id ? 'Voting...' : 'Vote Yes'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                disabled={voting === proposal.id}
                onClick={() => onVote(proposal.id, 'no')}
              >
                {voting === proposal.id ? 'Voting...' : 'Vote No'}
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
      </CardContent>
    </Card>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'voting':
      return 'bg-blue-500/20 text-blue-300';
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-300';
    case 'passed':
      return 'bg-green-500/20 text-green-300';
    case 'executed':
      return 'bg-green-500/20 text-green-300';
    case 'failed':
      return 'bg-red-500/20 text-red-300';
    default:
      return 'bg-gray-500/20 text-gray-300';
  }
}
