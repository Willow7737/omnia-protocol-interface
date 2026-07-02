'use client';

import { useConfig } from '@/lib/config-context';
import { Sidebar } from '@/components/sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { ConfigModal } from '@/components/config-modal';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  Layers,
  Send,
  Loader2,
  Info,
  Fingerprint,
  Dna,
  DollarSign,
  Cpu,
  Radio,
} from 'lucide-react';

/**
 * Shards page — universal shard operation submitter.
 *
 * The Omnia protocol has 5 domain shards plus the economics shard. Each
 * shard handles operations for a specific data domain. This page provides
 * a unified form to submit operations to any shard via
 * `POST /api/v1/shards/:shard_id/operations`.
 *
 * Currently only the `economics` shard is fully implemented on the node.
 * The other shards (identity, biological, computational, physical,
 * financial) return 501 with a "not yet implemented" message — this page
 * surfaces that error inline rather than hiding it.
 *
 * Supported economics operations:
 *   - register   (params: did)              — register a DID in the quota system
 *   - spend      (params: did, amount)      — spend UBC from a DID
 *   - mint       (params: did, amount)      — mint UBC to a DID [PRIVILEGED]
 *   - advance_epoch (no params)             — advance the economics epoch [PRIVILEGED]
 *
 * Privileged operations require the caller's JWT `sub` to be listed in
 * `OMNIA_AUTHORIZED_CALLERS` on the node.
 */

interface ShardInfo {
  id: string;
  name: string;
  description: string;
  icon: typeof Fingerprint;
  status: 'active' | 'planned';
  operations: ShardOpInfo[];
}

interface ShardOpInfo {
  name: string;
  description: string;
  privileged: boolean;
  params: { name: string; description: string; required: boolean; type: 'string' | 'number' }[];
}

const SHARDS: ShardInfo[] = [
  {
    id: 'economics',
    name: 'Economics',
    description: 'UBC token, monthly quotas, epoch advancement',
    icon: DollarSign,
    status: 'active',
    operations: [
      {
        name: 'register',
        description: 'Register a DID in the economics quota system',
        privileged: false,
        params: [{ name: 'did', description: 'DID to register', required: true, type: 'string' }],
      },
      {
        name: 'spend',
        description: 'Spend UBC from a DID (soulbound: tokens are burned)',
        privileged: false,
        params: [
          { name: 'did', description: 'Sender DID', required: true, type: 'string' },
          { name: 'amount', description: 'Amount of UBC to spend', required: true, type: 'number' },
        ],
      },
      {
        name: 'mint',
        description: 'Mint UBC to a DID (privileged — admin only)',
        privileged: true,
        params: [
          { name: 'did', description: 'Recipient DID', required: true, type: 'string' },
          { name: 'amount', description: 'Amount of UBC to mint', required: true, type: 'number' },
        ],
      },
      {
        name: 'advance_epoch',
        description: 'Advance the economics epoch (privileged — admin only)',
        privileged: true,
        params: [],
      },
    ],
  },
  {
    id: 'identity',
    name: 'Identity',
    description: 'DID creation, biometric binding, Shamir secret-sharing recovery',
    icon: Fingerprint,
    status: 'planned',
    operations: [],
  },
  {
    id: 'biological',
    name: 'Biological',
    description: 'Consent-gated genomic data with ZK proofs of access',
    icon: Dna,
    status: 'planned',
    operations: [],
  },
  {
    id: 'computational',
    name: 'Computational',
    description: 'Useful-work proofs (PoUW) for distributed computation',
    icon: Cpu,
    status: 'planned',
    operations: [],
  },
  {
    id: 'physical',
    name: 'Physical',
    description: 'IoT provenance attestation via RF fingerprinting',
    icon: Radio,
    status: 'planned',
    operations: [],
  },
  {
    id: 'financial',
    name: 'Financial',
    description: 'External financial asset anchoring (stub)',
    icon: DollarSign,
    status: 'planned',
    operations: [],
  },
];

export default function ShardsPage() {
  const { isConfigured, apiClient } = useConfig();
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedShard, setSelectedShard] = useState<string>('economics');
  const [selectedOp, setSelectedOp] = useState<string>('register');
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

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

  const shard = SHARDS.find((s) => s.id === selectedShard)!;
  const op = shard.operations.find((o) => o.name === selectedOp);

  const handleSubmit = async () => {
    setError('');
    setResult('');
    setSubmitting(true);
    try {
      // Build params object with type coercion
      const params: Record<string, unknown> = {};
      if (op) {
        for (const p of op.params) {
          const raw = paramValues[p.name];
          if (p.required && (raw === undefined || raw === '')) {
            throw new Error(`Missing required parameter: ${p.name}`);
          }
          if (raw === undefined || raw === '') continue;
          if (p.type === 'number') {
            const n = Number(raw);
            if (isNaN(n)) throw new Error(`Parameter ${p.name} must be a number, got: ${raw}`);
            params[p.name] = n;
          } else {
            params[p.name] = raw;
          }
        }
      }

      const res = await apiClient!.submitShardOperation(selectedShard, selectedOp, params);
      setResult(JSON.stringify(res, null, 2));
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border px-4 py-4 sm:px-8 sm:py-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Shards</h1>
          <p className="text-foreground/60">
            Submit operations to domain shards (identity, biological, computational, physical, economics)
          </p>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          {/* Shard reference */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-foreground mb-4">Shard Reference</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SHARDS.map((s) => {
                const Icon = s.icon;
                const isSelected = s.id === selectedShard;
                return (
                  <Card
                    key={s.id}
                    className={`bg-card/50 cursor-pointer transition-all ${
                      isSelected ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/50'
                    }`}
                    onClick={() => {
                      setSelectedShard(s.id);
                      setSelectedOp(s.operations[0]?.name ?? '');
                      setParamValues({});
                      setResult('');
                      setError('');
                    }}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <Icon className="w-6 h-6 text-primary" />
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            s.status === 'active'
                              ? 'bg-green-600/10 text-green-700'
                              : 'bg-amber-500/10 text-amber-700'
                          }`}
                        >
                          {s.status === 'active' ? 'Active' : 'Planned'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">{s.name}</h3>
                      <p className="text-xs text-foreground/60 mb-2">{s.description}</p>
                      <p className="text-xs text-foreground/40 font-mono">shard_id: {s.id}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Operation form */}
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Submit Operation — {shard.name} Shard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {shard.status === 'planned' && (
                <div className="p-3 bg-amber-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-foreground/70">
                    This shard is <strong>planned but not yet implemented</strong> on the node.
                    Submitting an operation will return HTTP 501 with a &quot;not yet implemented&quot;
                    message. Track progress in the omnia-protocol repo.
                  </div>
                </div>
              )}

              {/* Operation selector */}
              {shard.operations.length > 0 ? (
                <>
                  <div>
                    <Label htmlFor="operation">Operation</Label>
                    <select
                      id="operation"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mt-1"
                      value={selectedOp}
                      onChange={(e) => {
                        setSelectedOp(e.target.value);
                        setParamValues({});
                        setResult('');
                        setError('');
                      }}
                    >
                      {shard.operations.map((o) => (
                        <option key={o.name} value={o.name}>
                          {o.name}
                          {o.privileged ? ' (privileged)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {op && (
                    <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-lg">
                      <p className="text-sm text-foreground/70">
                        <strong className="text-foreground">{op.name}</strong>: {op.description}
                      </p>
                      {op.privileged && (
                        <p className="text-xs text-amber-700 mt-1">
                          ⚠ Privileged operation — requires caller to be in OMNIA_AUTHORIZED_CALLERS.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Dynamic params */}
                  {op && op.params.length > 0 && (
                    <div className="space-y-3">
                      {op.params.map((p) => (
                        <div key={p.name}>
                          <Label htmlFor={`param-${p.name}`}>
                            {p.name}{' '}
                            {p.required && <span className="text-destructive">*</span>}
                            <span className="text-xs text-foreground/40 ml-2">({p.type})</span>
                          </Label>
                          <Input
                            id={`param-${p.name}`}
                            type={p.type === 'number' ? 'number' : 'text'}
                            placeholder={p.description}
                            value={paramValues[p.name] ?? ''}
                            onChange={(e) =>
                              setParamValues((prev) => ({ ...prev, [p.name]: e.target.value }))
                            }
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Operation
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <p className="text-foreground/60 text-sm">
                  No operations defined for this shard yet. The shard&apos;s operations will be
                  added when the node-side implementation lands.
                </p>
              )}

              {/* Result */}
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm font-mono break-all">{error}</p>
                </div>
              )}
              {result && (
                <div className="p-3 bg-green-600/10 border border-green-500/20 rounded-lg">
                  <p className="text-green-700 text-xs mb-1 font-semibold">Response:</p>
                  <pre className="text-xs font-mono text-foreground/80 overflow-x-auto whitespace-pre-wrap break-words">
                    {result}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Curl preview */}
          {op && shard.status === 'active' && (
            <Card className="bg-card/50 mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Layers className="w-4 h-4" />
                  Equivalent curl
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs font-mono text-foreground/60 overflow-x-auto whitespace-pre-wrap">
{`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9090'}/api/v1/shards/${shard.id}/operations \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ operation: selectedOp, params: op.params.reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.name]: `<${p.type}>` }), {}) }, null, 0)}'`}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
    </AuthGuard>
  );
}
