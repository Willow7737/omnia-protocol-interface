'use client';

import { useConfig } from '@/lib/config-context';
import { Sidebar } from '@/components/sidebar';
import { ConfigModal } from '@/components/config-modal';
import { useState } from 'react';
import useSWR from 'swr';
import { Validator } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ValidatorsPage() {
  const { isConfigured, apiClient } = useConfig();
  const [configOpen, setConfigOpen] = useState(false);

  const { data: validators, error: validatorsError } = useSWR<Validator[]>(
    isConfigured ? 'validators-list' : null,
    async () => apiClient!.getValidators(),
    { refreshInterval: 15000, revalidateOnFocus: false }
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

  const activeValidators = validators?.filter((v) => v.status === 'active') || [];
  const inactiveValidators = validators?.filter((v) => v.status === 'inactive') || [];
  const slashedValidators = validators?.filter((v) => v.status === 'slashed') || [];

  const totalVotingPower = activeValidators.reduce((sum, v) => sum + parseFloat(v.voting_power), 0);

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
                  <span className="text-foreground/60 text-sm">Inactive</span>
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-2xl font-semibold text-foreground">{inactiveValidators.length}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Slashed</span>
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-2xl font-semibold text-foreground">{slashedValidators.length}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Total Voting Power</span>
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xl font-semibold text-foreground">{totalVotingPower.toFixed(0)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Active Validators */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">Active Validators ({activeValidators.length})</h2>
            {activeValidators.length > 0 ? (
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-foreground/60 font-medium">Moniker</th>
                      <th className="text-left py-3 px-4 text-foreground/60 font-medium">Address</th>
                      <th className="text-right py-3 px-4 text-foreground/60 font-medium">Voting Power</th>
                      <th className="text-right py-3 px-4 text-foreground/60 font-medium">Commission</th>
                      <th className="text-right py-3 px-4 text-foreground/60 font-medium">Slashing Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeValidators.map((validator) => (
                      <tr key={validator.address} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-medium text-foreground">{validator.moniker}</span>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-xs font-mono text-primary">{validator.address.slice(0, 16)}...</code>
                        </td>
                        <td className="py-3 px-4 text-right text-foreground">{parseFloat(validator.voting_power).toFixed(0)}</td>
                        <td className="py-3 px-4 text-right text-foreground">{(parseFloat(validator.commission) * 100).toFixed(2)}%</td>
                        <td className="py-3 px-4 text-right">
                          {validator.slashing_events > 0 ? (
                            <span className="text-yellow-400">{validator.slashing_events}</span>
                          ) : (
                            <span className="text-green-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Card className="bg-card/50">
                <CardContent className="pt-6">
                  <p className="text-foreground/60 text-sm">No active validators</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Inactive Validators */}
          {inactiveValidators.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">Inactive Validators ({inactiveValidators.length})</h2>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-foreground/60 font-medium">Moniker</th>
                      <th className="text-left py-3 px-4 text-foreground/60 font-medium">Address</th>
                      <th className="text-right py-3 px-4 text-foreground/60 font-medium">Voting Power</th>
                      <th className="text-right py-3 px-4 text-foreground/60 font-medium">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveValidators.map((validator) => (
                      <tr key={validator.address} className="border-b border-border/50 hover:bg-card/50 transition-colors opacity-60">
                        <td className="py-3 px-4">
                          <span className="font-medium text-foreground">{validator.moniker}</span>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-xs font-mono text-primary">{validator.address.slice(0, 16)}...</code>
                        </td>
                        <td className="py-3 px-4 text-right text-foreground">{parseFloat(validator.voting_power).toFixed(0)}</td>
                        <td className="py-3 px-4 text-right text-foreground">{(parseFloat(validator.commission) * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Slashed Validators */}
          {slashedValidators.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">Slashed Validators ({slashedValidators.length})</h2>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-foreground/60 font-medium">Moniker</th>
                      <th className="text-left py-3 px-4 text-foreground/60 font-medium">Address</th>
                      <th className="text-right py-3 px-4 text-foreground/60 font-medium">Slashing Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slashedValidators.map((validator) => (
                      <tr key={validator.address} className="border-b border-border/50 hover:bg-card/50 transition-colors bg-red-500/10">
                        <td className="py-3 px-4">
                          <span className="font-medium text-foreground">{validator.moniker}</span>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-xs font-mono text-primary">{validator.address.slice(0, 16)}...</code>
                        </td>
                        <td className="py-3 px-4 text-right text-red-400">{validator.slashing_events}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}
