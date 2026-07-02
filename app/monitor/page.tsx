'use client';

import { useConfig } from '@/lib/config-context';
import { Sidebar } from '@/components/sidebar';
import { AuthGuard } from '@/components/auth-guard';
import { Button } from '@/components/ui/button';
import { ConfigModal } from '@/components/config-modal';
import { ErrorBanner } from '@/components/error-banner';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { NodeInfo, Peer } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Layers,
  Zap,
  Network as NetworkIcon,
} from 'lucide-react';

export default function MonitorPage() {
  const { isConfigured, apiClient } = useConfig();
  const [configOpen, setConfigOpen] = useState(false);

  const { data: nodeInfo, error: nodeError } = useSWR<NodeInfo>(
    isConfigured ? 'node-info' : null,
    async () => apiClient!.getNodeInfo(),
    { refreshInterval: 5000, revalidateOnFocus: false },
  );

  const { data: peers, error: peersError } = useSWR<Peer[]>(
    isConfigured ? 'node-peers' : null,
    async () => apiClient!.getPeers(),
    { refreshInterval: 10000, revalidateOnFocus: false },
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

  return (
    <AuthGuard>
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border px-4 py-4 sm:px-8 sm:py-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Node Monitor</h1>
          <p className="text-foreground/60">Real-time node status and peer information</p>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          {nodeError && (
            <ErrorBanner error={nodeError} title="Couldn't reach the node" />
          )}

          {/* Status cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Status</span>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {nodeInfo ? 'Running' : <Skeleton className="h-6 w-20" />}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Uptime</span>
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {nodeInfo ? formatUptime(nodeInfo.uptime_seconds) : <Skeleton className="h-6 w-24" />}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Peers</span>
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {nodeInfo ? nodeInfo.peers : <Skeleton className="h-6 w-10" />}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Finalized Height</span>
                  <Layers className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {nodeInfo ? nodeInfo.finalized_height : <Skeleton className="h-6 w-16" />}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Node details */}
          <Card className="bg-card/50 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Node Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-foreground/60 mb-1">Node ID (hex)</p>
                  <p className="font-mono text-sm text-foreground break-all">
                    {nodeInfo ? nodeInfo.node_id : <Skeleton className="h-4 w-56 max-w-full" />}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-foreground/60 mb-1">Node ID (numeric)</p>
                  <p className="text-sm text-foreground">{nodeInfo?.node_id_num ?? '...'}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground/60 mb-1">Version</p>
                  <p className="text-sm text-foreground">{nodeInfo ? nodeInfo.version : <Skeleton className="h-4 w-16" />}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground/60 mb-1">Protocol Version</p>
                  <p className="text-sm text-foreground">
                    {nodeInfo ? nodeInfo.protocol_version : <Skeleton className="h-4 w-12" />}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-foreground/60 mb-1">Shard Count</p>
                  <p className="text-sm text-foreground">{nodeInfo?.shard_count ?? '...'}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground/60 mb-1">Listen Address</p>
                  <p className="font-mono text-xs text-foreground break-all">
                    {nodeInfo ? nodeInfo.listen_addr : <Skeleton className="h-4 w-40 max-w-full" />}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-foreground/60 mb-1">Data Directory</p>
                  <p className="font-mono text-xs text-foreground break-all">
                    {nodeInfo ? nodeInfo.data_dir : <Skeleton className="h-4 w-32 max-w-full" />}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Peers list */}
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <NetworkIcon className="w-5 h-5" />
                Connected Peers ({peers?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {peers && peers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-foreground/60 font-medium">
                          Peer ID
                        </th>
                        <th className="text-left py-2 px-3 text-foreground/60 font-medium">
                          Address
                        </th>
                        <th className="text-left py-2 px-3 text-foreground/60 font-medium">
                          Connected At
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {peers.map((peer) => (
                        <tr
                          key={peer.peer_id}
                          className="border-b border-border/50 hover:bg-card transition-colors"
                        >
                          <td className="py-3 px-3">
                            <code className="text-xs font-mono text-primary">
                              {peer.peer_id.slice(0, 16)}...
                            </code>
                          </td>
                          <td className="py-3 px-3 text-foreground text-xs font-mono">
                            {peer.address}
                          </td>
                          <td className="py-3 px-3 text-foreground/60 text-xs">
                            {new Date(peer.connected_at * 1000).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !peers && !peersError ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-foreground/60 text-sm">No peers connected</p>
              )}
              {peersError && (
                <p className="text-destructive text-xs mt-2">Couldn’t load peers: {peersError instanceof Error ? peersError.message : String(peersError)}</p>
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

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}
