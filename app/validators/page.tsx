'use client';

import { useConfig } from '@/lib/config-context';
import { Sidebar } from '@/components/sidebar';
import { ConfigModal } from '@/components/config-modal';
import { useState } from 'react';
import useSWR from 'swr';
import { Validator } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  Zap,
  AlertTriangle,
  CheckCircle,
  Shield,
  ShieldOff,
} from 'lucide-react';

/**
 * Validators page — consumes `GET /api/v1/validators` (public, no JWT).
 *
 * Shows each registered validator with its stake, slash points, and jail
 * status. Aggregate counts (active / jailed / total stake / current round)
 * come from the same endpoint's envelope.
 */
export default function ValidatorsPage() {
  const { isConfigured, apiClient } = useConfig();
  const [configOpen, setConfigOpen] = useState(false);

  const { data: result, error: validatorsError } = useSWR(
    isConfigured ? 'validators-list' : null,
    async () => apiClient!.getValidatorsWithStats(),
    { refreshInterval: 15000, revalidateOnFocus: false },
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

  const validators = result?.validators ?? [];
  const activeValidators = validators.filter((v) => v.status === 'active');
  const inactiveValidators = validators.filter((v) => v.status === 'inactive');
  const slashedValidators = validators.filter((v) => v.status === 'slashed');
  const jailedValidators = validators.filter((v) => v.status === 'jailed');
  const totalStake = result?.totalStake ?? 0;
  const currentRound = result?.currentRound ?? 0;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground">Validators</h1>
          <p className="text-foreground/60">Monitor validator performance and status</p>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {validatorsError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{String(validatorsError)}</p>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Active</span>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-2xl font-semibold text-foreground">{activeValidators.length}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Slashed</span>
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-2xl font-semibold text-foreground">
                  {slashedValidators.length + inactiveValidators.length}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Jailed</span>
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-2xl font-semibold text-foreground">{jailedValidators.length}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Total Stake</span>
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xl font-semibold text-foreground">{totalStake}</p>
              </CardContent>
            </Card>
          </div>

          {/* Current round indicator */}
          <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-foreground/70">
              Current consensus round: <strong className="text-foreground">{currentRound}</strong>
              {' · '}
              <strong className="text-foreground">{validators.length}</strong> validator
              {validators.length === 1 ? '' : 's'} registered
            </span>
          </div>

          {/* Validators table */}
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Validators ({validators.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {validators.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-3 text-foreground/60 font-medium">Node ID</th>
                        <th className="text-right py-3 px-3 text-foreground/60 font-medium">Stake</th>
                        <th className="text-right py-3 px-3 text-foreground/60 font-medium">Slash Points</th>
                        <th className="text-center py-3 px-3 text-foreground/60 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validators.map((v) => (
                        <tr
                          key={v.node_id}
                          className={`border-b border-border/50 hover:bg-card/50 transition-colors ${
                            v.is_jailed ? 'bg-red-500/10' : ''
                          }`}
                        >
                          <td className="py-3 px-3">
                            <code className="text-xs font-mono text-primary">
                              {v.node_id.slice(0, 24)}…
                            </code>
                          </td>
                          <td className="py-3 px-3 text-right text-foreground">{v.stake}</td>
                          <td className="py-3 px-3 text-right">
                            {v.slash_points > 0 ? (
                              <span className="text-yellow-400">{v.slash_points}</span>
                            ) : (
                              <span className="text-green-400">0</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                                v.status,
                              )}`}
                            >
                              {v.is_jailed && <ShieldOff className="w-3 h-3" />}
                              {v.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-foreground/60 text-sm">
                  No validators registered. The node registers itself as a validator candidate on
                  startup — if you see this, the node may not have completed initialization.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-500/20 text-green-300';
    case 'slashed':
      return 'bg-yellow-500/20 text-yellow-300';
    case 'jailed':
      return 'bg-red-500/20 text-red-300';
    default:
      return 'bg-gray-500/20 text-gray-300';
  }
}
