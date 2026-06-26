'use client';

import { useConfig } from '@/lib/config-context';
import { Sidebar } from '@/components/sidebar';
import { ConfigModal } from '@/components/config-modal';
import { useState } from 'react';
import useSWR from 'swr';
import { NodeInfo } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Info, Zap } from 'lucide-react';

/**
 * Validators page.
 *
 * The node does not yet expose a list-validators endpoint, so this page
 * shows the node's own identity (derived from /api/v1/node/info) and a
 * notice that the validator list endpoint is pending. When the node
 * exposes `GET /api/v1/validators`, swap the SWR key + schema.
 */
export default function ValidatorsPage() {
  const { isConfigured, apiClient } = useConfig();
  const [configOpen, setConfigOpen] = useState(false);

  const { data: nodeInfo, error: nodeError } = useSWR<NodeInfo>(
    isConfigured ? 'validators-node-info' : null,
    async () => apiClient!.getNodeInfo(),
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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground">Validators</h1>
          <p className="text-foreground/60">Monitor validator performance and status</p>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {nodeError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{String(nodeError)}</p>
            </div>
          )}

          {/* Info banner */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground/70">
              The node does not yet expose a list-validators endpoint. Showing the local node&apos;s
              identity below. When <code className="text-xs">GET /api/v1/validators</code> is added,
              this page will list every validator in the network with moniker, voting power,
              commission, and slashing events.
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">This Node</span>
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {nodeInfo?.node_id ?? '...'}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Node Number</span>
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {nodeInfo?.node_id_num ?? '...'}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Protocol Version</span>
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {nodeInfo?.protocol_version ?? '...'}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Connected Peers</span>
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {nodeInfo?.peers ?? '...'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* This node */}
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle>This Node</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-foreground/60 mb-1">Node ID (hex)</p>
                  <p className="font-mono text-foreground break-all">{nodeInfo?.node_id ?? '...'}</p>
                </div>
                <div>
                  <p className="text-foreground/60 mb-1">Listen Address</p>
                  <p className="font-mono text-foreground break-all">
                    {nodeInfo?.listen_addr ?? '...'}
                  </p>
                </div>
                <div>
                  <p className="text-foreground/60 mb-1">Shard Count</p>
                  <p className="text-foreground">{nodeInfo?.shard_count ?? '...'}</p>
                </div>
                <div>
                  <p className="text-foreground/60 mb-1">Uptime</p>
                  <p className="text-foreground">
                    {nodeInfo ? `${nodeInfo.uptime_seconds}s` : '...'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}
