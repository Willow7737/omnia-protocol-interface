'use client';

import { useConfig } from '@/lib/config-context';
import { Sidebar } from '@/components/sidebar';
import { ConfigModal } from '@/components/config-modal';
import { useState } from 'react';
import useSWR from 'swr';
import { Transfer } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function EconomicsPage() {
  const { isConfigured, apiClient } = useConfig();
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');

  const { data: transfers, error: transfersError } = useSWR<Transfer[]>(
    isConfigured ? 'economics-transfers' : null,
    async () => apiClient!.getTransfers(100),
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

  const outgoingTransfers = transfers?.filter((t) => t.status === 'confirmed' && t.from === selectedAddress) || [];
  const incomingTransfers = transfers?.filter((t) => t.status === 'confirmed' && t.to === selectedAddress) || [];
  const allTransfers = transfers?.filter((t) => t.status === 'confirmed') || [];

  const outgoingAmount = outgoingTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const incomingAmount = incomingTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground">Economics</h1>
          <p className="text-foreground/60">Token transfers and network economics</p>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {transfersError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{String(transfersError)}</p>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Total Transfers</span>
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-semibold text-foreground">{allTransfers.length}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Total Volume</span>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-2xl font-semibold text-foreground">
                  {(outgoingAmount + incomingAmount).toFixed(2)} UBC
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Outgoing</span>
                  <ArrowUpRight className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-2xl font-semibold text-red-400">{outgoingAmount.toFixed(2)} UBC</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Incoming</span>
                  <ArrowDownLeft className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-2xl font-semibold text-green-400">{incomingAmount.toFixed(2)} UBC</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transfers */}
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Recent Transfers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allTransfers && allTransfers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-3 text-foreground/60 font-medium">From</th>
                        <th className="text-left py-3 px-3 text-foreground/60 font-medium">To</th>
                        <th className="text-right py-3 px-3 text-foreground/60 font-medium">Amount</th>
                        <th className="text-left py-3 px-3 text-foreground/60 font-medium">Status</th>
                        <th className="text-left py-3 px-3 text-foreground/60 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTransfers.map((transfer) => (
                        <tr key={transfer.id} className="border-b border-border/50 hover:bg-card transition-colors">
                          <td className="py-3 px-3">
                            <code className="text-xs font-mono text-primary cursor-pointer hover:text-primary/80" onClick={() => setSelectedAddress(transfer.from)}>
                              {transfer.from.slice(0, 12)}...
                            </code>
                          </td>
                          <td className="py-3 px-3">
                            <code className="text-xs font-mono text-primary cursor-pointer hover:text-primary/80" onClick={() => setSelectedAddress(transfer.to)}>
                              {transfer.to.slice(0, 12)}...
                            </code>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-foreground">
                            {parseFloat(transfer.amount).toFixed(2)} UBC
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-300">
                              {transfer.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-foreground/60 text-xs">
                            {new Date(transfer.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-foreground/60 text-sm">No transfers found</p>
              )}
            </CardContent>
          </Card>

          {/* Transfer Statistics by Status */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-sm">Confirmed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-400">
                  {transfers?.filter((t) => t.status === 'confirmed').length ?? 0}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-sm">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-yellow-400">
                  {transfers?.filter((t) => t.status === 'pending').length ?? 0}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-sm">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-400">
                  {transfers?.filter((t) => t.status === 'failed').length ?? 0}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}
