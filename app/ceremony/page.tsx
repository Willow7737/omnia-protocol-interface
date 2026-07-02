'use client';

import { useConfig } from '@/lib/config-context';
import { Sidebar } from '@/components/sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { ConfigModal } from '@/components/config-modal';
import { useState } from 'react';
import useSWR from 'swr';
import { CeremonyState, CeremonyTranscript, ApiError } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  Shield,
  Loader2,
  Play,
  FileText,
  CheckCircle2,
  Lock,
  Info,
} from 'lucide-react';

/**
 * Ceremony page — ZK trusted setup coordination UI.
 *
 * The Omnia node runs a multi-party trusted setup ceremony for the
 * Groth16 proving system (Powers of Tau + Phase 2 circuit-specific).
 * This page lets an operator:
 *   - View the current ceremony phase and contribution count
 *   - View the contribution transcript (auditable list of who contributed when)
 *   - Submit a contribution (advanced — requires a serialized Contribution JSON)
 *   - Finalize the ceremony once enough contributions have been received
 *
 * The contribute endpoint requires the node to be built with `--features zk`
 * and the ceremony server to be initialized. If neither is true, the node
 * returns 501 / 503 and this page shows the appropriate error inline.
 */
export default function CeremonyPage() {
  const { isConfigured, apiClient } = useConfig();
  const [configOpen, setConfigOpen] = useState(false);
  const [contributionJson, setContributionJson] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const { data: state, error: stateError, mutate: mutateState } = useSWR<CeremonyState>(
    isConfigured ? 'ceremony-state' : null,
    async () => apiClient!.getCeremonyState(),
    { refreshInterval: 10000, revalidateOnFocus: false },
  );

  const { data: transcript, error: transcriptError, mutate: mutateTranscript } = useSWR<CeremonyTranscript>(
    isConfigured ? 'ceremony-transcript' : null,
    async () => apiClient!.getCeremonyTranscript(),
    { refreshInterval: 15000, revalidateOnFocus: false },
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

  const stateErr = stateError as ApiError | undefined;
  const notImplemented = stateErr && stateErr.kind === 'not_implemented';
  const ceremonyUnavailable = stateErr && stateErr.status === 503;

  const handleContribute = async () => {
    setActionError('');
    setActionSuccess('');
    if (!contributionJson.trim()) {
      setActionError('Contribution JSON is required');
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(contributionJson);
    } catch (e) {
      setActionError(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiClient!.contributeToCeremony(parsed);
      setActionSuccess(
        `Contribution #${result.contribution_index} accepted. New transcript hash: ${result.transcript_hash}`,
      );
      setContributionJson('');
      mutateState();
      mutateTranscript();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    setActionError('');
    setActionSuccess('');
    setFinalizing(true);
    try {
      const result = await apiClient!.finalizeCeremony();
      setActionSuccess(
        result.message
          ? `Ceremony finalized: ${result.message}`
          : 'Ceremony finalized successfully.',
      );
      mutateState();
      mutateTranscript();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setFinalizing(false);
    }
  };

  const phaseLabel = state?.phase ?? '—';
  const isFinalized = phaseLabel === 'finalized';
  const contributionCount = state?.contribution_count ?? 0;
  const minParticipants = state?.min_participants ?? 3;
  const canFinalize = !isFinalized && contributionCount >= minParticipants;

  return (
    <AuthGuard>
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border px-4 py-4 sm:px-8 sm:py-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Ceremony</h1>
          <p className="text-foreground/60">
            Multi-party trusted setup for Groth16 ZK proofs (Powers of Tau + Phase 2)
          </p>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          {notImplemented && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground/70">
                <strong className="text-foreground">ZK feature not enabled.</strong> The node was
                built without <code>--features zk</code>. Ceremony endpoints return 501. Rebuild
                the node with ZK enabled to use this page.
              </div>
            </div>
          )}
          {ceremonyUnavailable && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground/70">
                <strong className="text-foreground">Ceremony server not initialized.</strong> The
                node is running with ZK support but the ceremony server was not started. Check the
                node&apos;s startup logs.
              </div>
            </div>
          )}

          {/* Phase cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Phase</span>
                  {isFinalized ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Shield className="w-4 h-4 text-primary" />
                  )}
                </div>
                <p className="text-xl font-semibold text-foreground capitalize">{phaseLabel}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Contributions</span>
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {contributionCount}
                  <span className="text-sm text-foreground/60 ml-1">
                    / {minParticipants} min
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Max Participants</span>
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {state?.max_participants ?? '—'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Transcript Hash</span>
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm font-mono text-foreground break-all">
                  {state?.transcript_hash ?? '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contribute + Finalize */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  Submit Contribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="contribution">Contribution JSON</Label>
                  <textarea
                    id="contribution"
                    className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
                    placeholder='{"powers_of_tau": "...", "proof_of_knowledge": "..."}'
                    value={contributionJson}
                    onChange={(e) => setContributionJson(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The contribution format is defined by{' '}
                    <code>omnia_adapters::setup::Contribution</code>. In production this would be
                    generated by the ceremony client CLI (<code>omnia-node ceremony contribute</code>).
                  </p>
                </div>
                <Button onClick={handleContribute} disabled={submitting || isFinalized || notImplemented}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Contribution'
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Finalize Ceremony
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-foreground/70">
                  Once at least <strong>{minParticipants}</strong> contributions have been
                  received, the ceremony can be finalized. Finalization locks the SRS transcript
                  and produces the verifying key used by all subsequent ZK proof verifications.
                </p>
                <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-foreground/70">
                    <strong>Status:</strong>{' '}
                    {isFinalized
                      ? 'Ceremony is finalized. No further contributions accepted.'
                      : canFinalize
                        ? `Ready to finalize (${contributionCount} contributions received).`
                        : `Need ${minParticipants - contributionCount} more contribution(s) before finalization.`}
                  </p>
                </div>
                <Button
                  onClick={handleFinalize}
                  disabled={finalizing || isFinalized || !canFinalize || notImplemented}
                  variant="default"
                >
                  {finalizing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Finalizing...
                    </>
                  ) : (
                    'Finalize Ceremony'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Action feedback */}
          {actionError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm break-all">{actionError}</p>
            </div>
          )}
          {actionSuccess && (
            <div className="mb-6 p-4 bg-green-600/10 border border-green-500/20 rounded-lg">
              <p className="text-green-700 text-sm break-all">{actionSuccess}</p>
            </div>
          )}

          {/* Transcript */}
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Contribution Transcript ({transcript?.contributions.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transcriptError && (
                <p className="text-sm text-destructive mb-2">Couldn’t load the transcript. {transcriptError instanceof Error ? transcriptError.message : String(transcriptError)}</p>
              )}
              {!transcript && !transcriptError ? (
                <CardListSkeleton count={2} />
              ) : transcript && transcript.contributions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-3 text-foreground/60 font-medium">#</th>
                        <th className="text-left py-3 px-3 text-foreground/60 font-medium">Contributor Hash</th>
                        <th className="text-left py-3 px-3 text-foreground/60 font-medium">Transcript Hash</th>
                        <th className="text-left py-3 px-3 text-foreground/60 font-medium">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transcript.contributions.map((c) => (
                        <tr
                          key={c.index}
                          className="border-b border-border/50 hover:bg-card/50 transition-colors"
                        >
                          <td className="py-3 px-3 text-foreground">{c.index}</td>
                          <td className="py-3 px-3">
                            <code className="text-xs font-mono text-primary">
                              {c.contributor_hash?.slice(0, 24) ?? '—'}…
                            </code>
                          </td>
                          <td className="py-3 px-3">
                            <code className="text-xs font-mono text-primary">
                              {c.transcript_hash?.slice(0, 24) ?? '—'}…
                            </code>
                          </td>
                          <td className="py-3 px-3 text-foreground/60 text-xs">
                            {c.timestamp ? new Date(c.timestamp * 1000).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-foreground/60 text-sm">
                  No contributions yet. Submit one above once the ceremony server is initialized.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
    </AuthGuard>
  );
}
