'use client';

import { useConfig } from '@/lib/config-context';
import { Sidebar } from '@/components/sidebar';
import { ConfigModal } from '@/components/config-modal';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Fingerprint, Dna, Key, UserCheck, Shield, Info } from 'lucide-react';

/**
 * Identity page — explains the identity shard's planned features.
 *
 * The Omnia identity shard will provide:
 *   - DID creation and resolution (did:omnia:method)
 *   - Biometric binding (privacy-preserving, ZK-verified)
 *   - Shamir secret-sharing recovery (k-of-n threshold)
 *   - Agent management (delegate authority to other DIDs)
 *
 * Currently the node returns 501 for identity shard operations. This
 * page surfaces what's planned and links to the relevant ADRs in the
 * omnia-protocol repo so dashboard users can track progress.
 *
 * When the node exposes identity endpoints, swap this placeholder for
 * a real UI similar to the economics page (forms for each operation).
 */
export default function IdentityPage() {
  const { isConfigured } = useConfig();
  const [configOpen, setConfigOpen] = useState(false);

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

  const features = [
    {
      icon: Fingerprint,
      title: 'DID Creation & Resolution',
      description:
        'Create decentralized identifiers (did:omnia:method) and resolve them to DID documents containing public keys, service endpoints, and capability delegations. DIDs are immutable and globally resolvable without a central registry.',
      status: 'Specified — see ADR-004 (Identity Layer)',
    },
    {
      icon: Dna,
      title: 'Biometric Binding',
      description:
        'Bind a DID to a biometric template using privacy-preserving ZK proofs. The biometric never leaves the user\'s device — only a verifiable credential proving ownership is published. Supports fingerprint, face, and palm-vein modalities.',
      status: 'Specified — see identity/biometric.rs',
    },
    {
      icon: Key,
      title: 'Shamir Secret-Sharing Recovery',
      description:
        'Split the DID\'s master key into n shares distributed to trusted guardians. Any k-of-n shares can reconstruct the key, enabling social recovery without exposing the key to a single party. Default: 5 shares, 3 threshold.',
      status: 'Specified — see identity/recovery.rs',
    },
    {
      icon: UserCheck,
      title: 'Agent Management',
      description:
        'Delegate limited authority to agent DIDs (e.g., a mobile wallet, a hardware module, or a service). Each agent has scoped capabilities (sign events, vote, transfer UBC) with optional expiry and revocation.',
      status: 'Specified — see identity/agent.rs',
    },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground">Identity</h1>
          <p className="text-foreground/60">
            Decentralized identifiers, biometric binding, and social recovery
          </p>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {/* Status banner */}
          <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground/70">
              <strong className="text-foreground">The identity shard is specified but not yet
              exposed via the REST API.</strong> Submitting identity operations to{' '}
              <code>POST /api/v1/shards/identity/operations</code> currently returns HTTP 501
              with a &quot;not yet implemented&quot; message. The implementation exists in the
              Rust crate <code>shards/src/identity/</code> — it just needs to be wired into the
              HTTP API layer. Track progress in the omnia-protocol repo.
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="bg-card/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="w-5 h-5 text-primary" />
                      {f.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-foreground/70">{f.description}</p>
                    <p className="text-xs text-foreground/50 italic">{f.status}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* What's needed to enable */}
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                What&apos;s Needed to Enable Identity Operations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-foreground/70 list-decimal list-inside">
                <li>
                  Wire <code>identity::IdentityShard</code> (already implemented in{' '}
                  <code>shards/src/identity/</code>) into the HTTP shards API in{' '}
                  <code>node/src/api/shards.rs</code> — add a{' '}
                  <code>handle_identity_op</code> function alongside{' '}
                  <code>handle_economics_op</code>.
                </li>
                <li>
                  Define the operation set: <code>create_did</code>,{' '}
                  <code>resolve_did</code>, <code>bind_biometric</code>,{' '}
                  <code>verify_biometric</code>, <code>initiate_recovery</code>,{' '}
                  <code>submit_recovery_share</code>, <code>delegate_agent</code>,{' '}
                  <code>revoke_agent</code>.
                </li>
                <li>
                  Add a <code>GET /api/v1/identity/dids/:did</code> read endpoint for DID
                  document resolution (no JWT required — public resolution like DNS).
                </li>
                <li>
                  Add persistent storage for DID documents (redb table in the substrate store).
                </li>
                <li>
                  Update this page to render real data — forms for each operation, a DID
                  resolver lookup, and an agent management table.
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}
