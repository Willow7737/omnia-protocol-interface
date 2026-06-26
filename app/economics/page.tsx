'use client';

import { useConfig } from '@/lib/config-context';
import { Sidebar } from '@/components/sidebar';
import { ConfigModal } from '@/components/config-modal';
import { useState } from 'react';
import useSWR from 'swr';
import { Balance } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, DollarSign, Info, ArrowRight } from 'lucide-react';

export default function EconomicsPage() {
  const { isConfigured, apiClient } = useConfig();
  const [configOpen, setConfigOpen] = useState(false);
  const [did, setDid] = useState('did:omnia:0xExample');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('1');
  const [transferring, setTransferring] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const { data: balance, error: balanceError } = useSWR<Balance>(
    isConfigured && did ? `balance-${did}` : null,
    async () => apiClient!.getBalance(did),
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

  const handleTransfer = async () => {
    setActionError('');
    setActionSuccess('');
    if (!did || !transferTo) {
      setActionError('Both sender DID and recipient DID are required');
      return;
    }
    const amount = parseInt(transferAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setActionError('Amount must be a positive integer');
      return;
    }

    setTransferring(true);
    try {
      const result = await apiClient!.transferUbic(did, transferTo, amount);
      setActionSuccess(
        `Spent ${result.amount} UBC from ${result.from_did}. New balance: ${result.new_balance}`,
      );
      // Trigger SWR revalidation
      setDid((d) => d);
    } catch (e) {
      setActionError(String(e));
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground">Economics</h1>
          <p className="text-foreground/60">UBC balances and spend operations</p>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {/* Info banner */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground/70">
              UBC tokens are <strong>soulbound</strong>: the &quot;transfer&quot; endpoint actually
              spends (burns) tokens from the sender&apos;s balance. The recipient does not receive
              them. The node does not yet expose a list-transfers endpoint, so there is no
              transaction history view here yet.
            </div>
          </div>

          {/* Balance lookup */}
          <Card className="bg-card/50 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Balance Lookup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="did">DID</Label>
                <Input
                  id="did"
                  placeholder="did:omnia:0x..."
                  value={did}
                  onChange={(e) => setDid(e.target.value)}
                  className="mt-1"
                />
              </div>
              {balanceError && (
                <p className="text-sm text-destructive">{String(balanceError)}</p>
              )}
              {balance && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-foreground/60 mb-1">Balance</p>
                    <p className="text-lg font-semibold text-foreground">{balance.balance}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/60 mb-1">Monthly Quota</p>
                    <p className="text-lg font-semibold text-foreground">
                      {balance.monthly_quota}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/60 mb-1">Current Epoch</p>
                    <p className="text-lg font-semibold text-foreground">
                      {balance.current_epoch}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/60 mb-1">Registered</p>
                    <p className="text-lg font-semibold text-foreground">
                      {balance.is_registered ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Spend / transfer */}
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5" />
                Spend UBC
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="from-did">Sender DID (you)</Label>
                <Input
                  id="from-did"
                  value={did}
                  onChange={(e) => setDid(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="to-did">Recipient DID (informational — UBC is soulbound)</Label>
                <Input
                  id="to-did"
                  placeholder="did:omnia:0x..."
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              {actionError && <p className="text-sm text-destructive">{actionError}</p>}
              {actionSuccess && <p className="text-sm text-green-400">{actionSuccess}</p>}
              <Button onClick={handleTransfer} disabled={transferring}>
                {transferring ? 'Spending...' : 'Spend UBC'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}
