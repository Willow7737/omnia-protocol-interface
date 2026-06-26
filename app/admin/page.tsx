'use client';

import { useConfig } from '@/lib/config-context';
import { Sidebar } from '@/components/sidebar';
import { ConfigModal } from '@/components/config-modal';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  Shield,
  Loader2,
  UserPlus,
  Coins,
  Clock,
  CheckCircle,
  Info,
} from 'lucide-react';
import { ApiError, isForbidden } from '@/lib/api-client';

/**
 * Admin page — quick actions for privileged operations.
 *
 * All operations on this page go through the universal shards endpoint
 * (`POST /api/v1/shards/economics/operations`). The privileged ones
 * (`mint`, `advance_epoch`) require the caller's JWT `sub` to be listed
 * in the node's `OMNIA_AUTHORIZED_CALLERS` env var.
 *
 * If the caller is not authorized, the node returns HTTP 403 and this
 * page shows a specific "not authorized" hint rather than a generic error.
 */
export default function AdminPage() {
  const { isConfigured, apiClient } = useConfig();
  const [configOpen, setConfigOpen] = useState(false);

  // Register form
  const [registerDid, setRegisterDid] = useState('');
  const [registering, setRegistering] = useState(false);

  // Mint form
  const [mintDid, setMintDid] = useState('');
  const [mintAmount, setMintAmount] = useState('1000');
  const [minting, setMinting] = useState(false);

  // Advance epoch
  const [advancing, setAdvancing] = useState(false);

  // Feedback
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error' | 'warning'; msg: string } | null>(null);

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

  const showFeedback = (kind: 'success' | 'error' | 'warning', msg: string) => {
    setFeedback({ kind, msg });
  };

  const handleRegister = async () => {
    if (!registerDid) return;
    setRegistering(true);
    setFeedback(null);
    try {
      const result = await apiClient!.registerDid(registerDid);
      showFeedback('success', `DID ${registerDid} registered successfully (status: ${result.status}).`);
      setRegisterDid('');
    } catch (e) {
      if (e instanceof ApiError && isForbidden(e)) {
        showFeedback('warning', `Not authorized. The 'register' operation should be open to all callers — check that your JWT is valid and the node is running with the latest code.`);
      } else {
        showFeedback('error', String(e));
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleMint = async () => {
    if (!mintDid || !mintAmount) return;
    const amount = parseInt(mintAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      showFeedback('error', 'Amount must be a positive integer');
      return;
    }
    setMinting(true);
    setFeedback(null);
    try {
      const result = await apiClient!.mintUbc(mintDid, amount);
      showFeedback('success', `Minted ${amount} UBC to ${mintDid} (status: ${result.status}). Note: ${result.note ?? 'applied to local state only'}`);
      setMintDid('');
    } catch (e) {
      if (e instanceof ApiError && isForbidden(e)) {
        showFeedback(
          'warning',
          `Not authorized to mint. The 'mint' operation is privileged — your JWT 'sub' (${`see your token`}) must be listed in OMNIA_AUTHORIZED_CALLERS on the node. Current value: omnia-testnet-jwt-secret-CHANGE-ME has sub='admin-caller', so set OMNIA_AUTHORIZED_CALLERS=admin-caller on the node.`,
        );
      } else {
        showFeedback('error', String(e));
      }
    } finally {
      setMinting(false);
    }
  };

  const handleAdvanceEpoch = async () => {
    setAdvancing(true);
    setFeedback(null);
    try {
      const result = await apiClient!.advanceEpoch();
      showFeedback('success', `Epoch advanced (status: ${result.status}).`);
    } catch (e) {
      if (e instanceof ApiError && isForbidden(e)) {
        showFeedback('warning', `Not authorized. 'advance_epoch' is privileged — add your JWT 'sub' to OMNIA_AUTHORIZED_CALLERS on the node.`);
      } else {
        showFeedback('error', String(e));
      }
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground">Admin</h1>
          <p className="text-foreground/60">Quick actions for privileged node operations</p>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {/* Authorization banner */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground/70">
              <strong className="text-foreground">Privileged operations require authorization.</strong>{' '}
              The node checks the caller&apos;s JWT <code>sub</code> against the{' '}
              <code>OMNIA_AUTHORIZED_CALLERS</code> environment variable. To enable mint and
              advance_epoch, the node must be started with:
              <pre className="mt-2 p-2 bg-background/50 rounded text-xs font-mono">
{`export OMNIA_AUTHORIZED_CALLERS=admin-caller
# Then restart the node`}
              </pre>
              The JWT issued for this dashboard has <code>sub=admin-caller</code>, so it matches
              the configuration above.
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={`mb-6 p-4 rounded-lg border ${
                feedback.kind === 'success'
                  ? 'bg-green-500/10 border-green-500/20'
                  : feedback.kind === 'warning'
                    ? 'bg-yellow-500/10 border-yellow-500/20'
                    : 'bg-destructive/10 border-destructive/20'
              }`}
            >
              <p
                className={`text-sm break-all ${
                  feedback.kind === 'success'
                    ? 'text-green-300'
                    : feedback.kind === 'warning'
                      ? 'text-yellow-300'
                      : 'text-destructive'
                }`}
              >
                {feedback.msg}
              </p>
            </div>
          )}

          {/* Action cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Register DID */}
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Register DID
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-foreground/60">
                  Enroll a DID in the economics quota system. After registration, the DID
                  receives a monthly UBC quota and balance lookups return 200.
                </p>
                <div>
                  <Label htmlFor="register-did">DID</Label>
                  <Input
                    id="register-did"
                    placeholder="did:omnia:0x..."
                    value={registerDid}
                    onChange={(e) => setRegisterDid(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleRegister} disabled={registering || !registerDid} className="w-full">
                  {registering ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Register
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Mint UBC */}
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5" />
                  Mint UBC
                  <span className="ml-auto text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                    Privileged
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-foreground/60">
                  Mint UBC tokens to a registered DID. The recipient must already be registered
                  in the economics quota system.
                </p>
                <div>
                  <Label htmlFor="mint-did">Recipient DID</Label>
                  <Input
                    id="mint-did"
                    placeholder="did:omnia:0x..."
                    value={mintDid}
                    onChange={(e) => setMintDid(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="mint-amount">Amount</Label>
                  <Input
                    id="mint-amount"
                    type="number"
                    min="1"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleMint} disabled={minting || !mintDid} className="w-full">
                  {minting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Minting...
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4 mr-2" />
                      Mint UBC
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Advance Epoch */}
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Advance Epoch
                  <span className="ml-auto text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                    Privileged
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-foreground/60">
                  Advance the economics epoch. This resets monthly UBC quotas for all registered
                  DIDs and triggers epoch-bound governance logic (vote weight recalculation,
                  inactivity decay).
                </p>
                <div className="p-3 bg-background/50 rounded-lg">
                  <p className="text-xs text-foreground/60 mb-1">What happens on epoch advance:</p>
                  <ul className="text-xs text-foreground/70 space-y-1 list-disc list-inside">
                    <li>All DIDs receive their monthly UBC quota</li>
                    <li>Governance vote weights decay for inactive DIDs</li>
                    <li>Expired proposals are marked as expired</li>
                    <li>Epoch counter increments by 1</li>
                  </ul>
                </div>
                <Button onClick={handleAdvanceEpoch} disabled={advancing} className="w-full">
                  {advancing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Advancing...
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 mr-2" />
                      Advance Epoch
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Status checklist */}
          <Card className="bg-card/50 mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Setup Checklist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Node running with OMNIA_JWT_SECRET set?</strong> Required for all
                    authenticated endpoints. If unset, the node returns 503 on every authenticated
                    request.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>OMNIA_AUTHORIZED_CALLERS includes your JWT sub?</strong> Required for
                    privileged operations (mint, advance_epoch). For this dashboard, set it to{' '}
                    <code>admin-caller</code> (the sub claim in the JWT).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>DID registered before minting?</strong> The recipient of a mint must
                    already be in the economics quota system — use the Register DID action first.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Operations applied locally only?</strong> Per the node&apos;s audit
                    notes, economics operations through the shards endpoint are applied to local
                    state only — they are not yet propagated to peer nodes via consensus. Restart
                    any node and its local economics state resets.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}
