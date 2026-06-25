'use client';

import { useConfig } from '@/lib/config-context';
import { Sidebar } from '@/components/sidebar';
import { ConfigModal } from '@/components/config-modal';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { NodeStatus, Peer } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock, Users, Blocks, Zap } from 'lucide-react';

export default function MonitorPage() {
  const { isConfigured, apiClient } = useConfig();
  const [configOpen, setConfigOpen] = useState(false);

  const { data: nodeStatus, error: nodeError } = useSWR<NodeStatus>(
    isConfigured ? 'node-status' : null,
    async () => apiClient!.getNodeStatus(),
    { refreshInterval: 5000, revalidateOnFocus: false }
  );

  const { data: peers, error: peersError } = useSWR<Peer[]>(
    isConfigured ? 'node-peers' : null,
    async () => apiClient!.getPeers(),
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

  const isLoading = !nodeStatus && !nodeError;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground">Node Monitor</h1>
          <p className="text-foreground/60">Real-time node status and peer information</p>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {nodeError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{String(nodeError)}</p>
            </div>
          )}

          {/* Node Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Status</span>
                  {nodeStatus?.status === 'running' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                <p className="text-xl font-semibold text-foreground capitalize">{nodeStatus?.status || 'Loading...'}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Uptime</span>
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xl font-semibold text-foreground">{nodeStatus?.uptime ? formatUptime(nodeStatus.uptime) : 'Loading...'}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Peers</span>
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xl font-semibold text-foreground">{nodeStatus?.peer_count ?? 'Loading...'}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-foreground/60 text-sm">Latest Block</span>
                  <Blocks className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xl font-semibold text-foreground">{nodeStatus?.latest_block ?? 'Loading...'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Node Details */}
          <Card className="bg-card/50 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Node Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-foreground/60 mb-1">Node ID</p>
                    <p className="font-mono text-sm text-foreground break-all">{nodeStatus?.node_id || 'Loading...'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60 mb-1">Version</p>
                    <p className="text-sm text-foreground">{nodeStatus?.version || 'Loading...'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60 mb-1">Latest Block Hash</p>
                    <p className="font-mono text-sm text-foreground break-all">{nodeStatus?.latest_block_hash || 'Loading...'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60 mb-1">Latest Block Time</p>
                    <p className="text-sm text-foreground">{nodeStatus?.latest_block_time ? new Date(nodeStatus.latest_block_time).toLocaleString() : 'Loading...'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Peers List */}
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Connected Peers ({peers?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {peers && peers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-foreground/60 font-medium">Peer ID</th>
                        <th className="text-left py-2 px-3 text-foreground/60 font-medium">Address</th>
                        <th className="text-left py-2 px-3 text-foreground/60 font-medium">Version</th>
                        <th className="text-left py-2 px-3 text-foreground/60 font-medium">Latency</th>
                        <th className="text-left py-2 px-3 text-foreground/60 font-medium">Last Seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {peers.map((peer) => (
                        <tr key={peer.peer_id} className="border-b border-border/50 hover:bg-card transition-colors">
                          <td className="py-3 px-3">
                            <code className="text-xs font-mono text-primary">{peer.peer_id.slice(0, 12)}...</code>
                          </td>
                          <td className="py-3 px-3 text-foreground text-xs">{peer.address}</td>
                          <td className="py-3 px-3 text-foreground/60 text-xs">{peer.version}</td>
                          <td className="py-3 px-3 text-foreground/60 text-xs">{peer.latency}ms</td>
                          <td className="py-3 px-3 text-foreground/60 text-xs">
                            {new Date(peer.last_seen).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-foreground/60 text-sm">No peers connected</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
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
