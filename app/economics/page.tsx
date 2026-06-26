'use client';

import { useConfig } from '@/lib/config-context';
import { Sidebar } from '@/components/sidebar';
import { ConfigModal } from '@/components/config-modal';
import { useState } from 'react';
import useSWR from 'swr';
import { Balance, TransferRecord, ApiError, isNotFound, isForbidden } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  DollarSign,
  Info,
  ArrowRight,
  TrendingUp,
  UserPlus,
  Loader2,
} from 'lucide-react';

export default function EconomicsPage() {
  const { isConfigured, apiClient } = useConfig();
  const [configOpen, setConfigOpen] = useState(false);
  const [did, setDid] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('1');
  const [transferring, setTransferring] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const { data: balance, error: balanceError, mutate: mutateBalance } = useSWR<Balance>(
    isConfigured && did ? `balance-${did}` : null,
    async () => apiClient!.getBalance(did),
    { refreshInterval: 10000, revalidateOnFocus: false },
  );

  const { data: transfers, error: transfersError, mutate: mutateTransfers } = useSWR<TransferRecord[]>(
    isConfigured ? 'economics-transfers' : null,
    async () => apiClient!.getTransfers(100),
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

  const handleRegister = async () => {
    if (!did) return;
    setActionError('');
    setActionSuccess('');
    setRegistering(true);
    try {
      const result = await apiClient!.registerDid(did);
      setActionSuccess(
        result.status === 'processed'
          ? `DID ${did} registered successfully. Balance lookup will now return 200.`
          : `Registration response: ${result.status}`,
      );
      mutateBalance();
    } catch (e) {
      setActionError(String(e));
    } finally {
      setRegistering(false);
    }
  };

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
      mutateTransfers();
      mutateBalance();
    } catch (e) {
      setActionError(String(e));
    } finally {
      setTransferring(false);
    }
  };

  const totalVolume = transfers?.reduce((sum, t) => sum + t.amount, 0) ?? 0;
  const balanceErr = balanceError as ApiError | undefined;
  const isNotRegistered = balanceErr && isNotFound(balanceErr);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground">Economics</h1>
          <p className="text-foreground/60">UBC balances, spend operations, and transfer history</p>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {/* Info banner */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground/70">
              UBC tokens are <strong>soulbound</strong>: the &quot;transfer&quot; endpoint actually
              spends (burns) tokens from the sender&apos;s balance. The recipient does not receive
              them. Only successful spends are recorded in the history below.
              <br />
              <strong className="text-foreground">To get started:</strong> enter a DID above,
              click <em>Register DID</em>, then look up its balance.
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Total Spend Records</span>
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-semibold text-foreground">{transfers?.length ?? 0}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Total Volume Spent</span>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-2xl font-semibold text-foreground">{totalVolume} UBC</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Balance Looked Up</span>
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-semibold text-foreground">
                  {balance?.balance ?? '—'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Monthly Quota</span>
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-semibold text-foreground">
                  {balance?.monthly_quota ?? '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Balance lookup + register */}
          <Card className="bg-card/50 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Balance Lookup &amp; DID Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="did">DID</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="did"
                    placeholder="did:omnia:0x... (enter any unique DID you want to use)"
                    value={did}
                    onChange={(e) => setDid(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleRegister}
                    disabled={registering || !did}
                    variant="default"
                  >
                    {registering ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Register DID
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Registration calls <code>POST /api/v1/shards/economics/operations</code> with{' '}
                  <code>{'{operation: "register", params: {did}}'}</code>. Once registered, the
                  DID gets a monthly UBC quota and balance lookups return 200.
                </p>
              </div>

              {/* Balance result */}
              {balanceErr && !isNotRegistered && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm">
                    {balanceErr.serverMessage
                      ? `Error: ${balanceErr.serverMessage}`
                      : String(balanceErr)}
                  </p>
                </div>
              )}
              {isNotRegistered && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-300 text-sm">
                    <strong>DID not registered.</strong> Click the <em>Register DID</em> button
                    above to enroll this DID in the economics quota system.
                  </p>
                </div>
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
          <Card className="bg-card/50 mb-8">
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

          {/* Recent transfers */}
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Recent Spends ({transfers?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transfersError && (
                <p className="text-sm text-destructive mb-2">{String(transfersError)}</p>
              )}
              {transfers && transfers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-3 text-foreground/60 font-medium">From</th>
                        <th className="text-left py-3 px-3 text-foreground/60 font-medium">To</th>
                        <th className="text-right py-3 px-3 text-foreground/60 font-medium">Amount</th>
                        <th className="text-right py-3 px-3 text-foreground/60 font-medium">New Balance</th>
                        <th className="text-left py-3 px-3 text-foreground/60 font-medium">Status</th>
                        <th className="text-left py-3 px-3 text-foreground/60 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfers.map((t) => (
                        <tr
                          key={t.id}
                          className="border-b border-border/50 hover:bg-card transition-colors"
                        >
                          <td className="py-3 px-3">
                            <code className="text-xs font-mono text-primary">
                              {t.from_did.slice(0, 16)}…
                            </code>
                          </td>
                          <td className="py-3 px-3">
                            <code className="text-xs font-mono text-primary">
                              {t.to_did.slice(0, 16)}…
                            </code>
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-foreground">
                            {t.amount} UBC
                          </td>
                          <td className="py-3 px-3 text-right text-foreground/60">
                            {t.new_balance}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-300">
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-foreground/60 text-xs">
                            {new Date(t.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-foreground/60 text-sm">
                  No transfers recorded yet. Register a DID above, then spend some UBC to populate
                  the history.
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
