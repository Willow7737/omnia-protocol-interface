'use client';

import { useConfig } from '@/lib/config-context';
import { Sidebar } from '@/components/sidebar';
import { ConfigModal } from '@/components/config-modal';
import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingUp, Activity, Users, DollarSign, BarChart3 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface VolumeByDay { day: string; total_amount: number; count: number; }
interface EventsByHour { hour: string; count: number; }
interface EventsByType { event_type: string; count: number; }
interface TopSender { from_did: string; total_amount: number; count: number; }
interface Summary {
  total_volume: number;
  total_transfers: number;
  total_events: number;
  unique_senders: number;
  unique_recipients: number;
}

interface AnalyticsData {
  volumeByDay: VolumeByDay[];
  eventsByHour: EventsByHour[];
  eventsByType: EventsByType[];
  topSenders: TopSender[];
  summary: Summary;
  generated_at: string;
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const fetcher = async (url: string): Promise<AnalyticsData> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
};

export default function AnalyticsPage() {
  const { isConfigured } = useConfig();
  const [configOpen, setConfigOpen] = useState(false);

  const { data, error } = useSWR<AnalyticsData>(
    isConfigured ? '/api/analytics' : null,
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: false },
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
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-foreground/60">
            UBC volume, event activity, and top participants (from Supabase mirror)
          </p>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{String(error)}</p>
            </div>
          )}

          {!data && !error && (
            <p className="text-foreground/60 text-sm">Loading analytics…</p>
          )}

          {data && (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <SummaryCard
                  label="Total Volume"
                  value={`${data.summary.total_volume} UBC`}
                  icon={DollarSign}
                  color="text-green-400"
                />
                <SummaryCard
                  label="Total Transfers"
                  value={data.summary.total_transfers.toString()}
                  icon={TrendingUp}
                  color="text-blue-400"
                />
                <SummaryCard
                  label="Total Events"
                  value={data.summary.total_events.toString()}
                  icon={Activity}
                  color="text-purple-400"
                />
                <SummaryCard
                  label="Unique Senders"
                  value={data.summary.unique_senders.toString()}
                  icon={Users}
                  color="text-yellow-400"
                />
                <SummaryCard
                  label="Unique Recipients"
                  value={data.summary.unique_recipients.toString()}
                  icon={Users}
                  color="text-cyan-400"
                />
              </div>

              {/* Volume chart */}
              <Card className="bg-card/50 mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    UBC Volume (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.volumeByDay.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={data.volumeByDay}>
                        <defs>
                          <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                          dataKey="day"
                          stroke="#9ca3af"
                          fontSize={12}
                          tickFormatter={(d) => d.slice(5)}
                        />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            borderRadius: '6px',
                          }}
                          formatter={(v) => [`${v} UBC`, 'Volume']}
                        />
                        <Area
                          type="monotone"
                          dataKey="total_amount"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill="url(#volumeGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChart message="No transfer data yet. Run the sync worker to populate." />
                  )}
                </CardContent>
              </Card>

              {/* Events per hour + event types */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card className="bg-card/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Events per Hour (Last 24h)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.eventsByHour.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={data.eventsByHour}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis
                            dataKey="hour"
                            stroke="#9ca3af"
                            fontSize={10}
                            tickFormatter={(h) => h.slice(11, 16)}
                          />
                          <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1f2937',
                              border: '1px solid #374151',
                              borderRadius: '6px',
                            }}
                          />
                          <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart message="No events in the last 24 hours." />
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-card/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Event Type Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.eventsByType.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={data.eventsByType}
                            dataKey="count"
                            nameKey="event_type"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label={(entry: { name?: string; value?: number }) =>
                              `${entry.name ?? ''}: ${entry.value ?? 0}`
                            }
                          >
                            {data.eventsByType.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1f2937',
                              border: '1px solid #374151',
                              borderRadius: '6px',
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart message="No events recorded." />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top senders */}
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Top Senders (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.topSenders.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-3 text-foreground/60 font-medium">#</th>
                            <th className="text-left py-3 px-3 text-foreground/60 font-medium">DID</th>
                            <th className="text-right py-3 px-3 text-foreground/60 font-medium">Total Volume</th>
                            <th className="text-right py-3 px-3 text-foreground/60 font-medium">Transactions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.topSenders.map((s, i) => (
                            <tr
                              key={s.from_did}
                              className="border-b border-border/50 hover:bg-card/50 transition-colors"
                            >
                              <td className="py-3 px-3 text-foreground/40">{i + 1}</td>
                              <td className="py-3 px-3">
                                <code className="text-xs font-mono text-primary">
                                  {s.from_did.slice(0, 24)}…
                                </code>
                              </td>
                              <td className="py-3 px-3 text-right font-medium text-green-400">
                                {s.total_amount} UBC
                              </td>
                              <td className="py-3 px-3 text-right text-foreground/60">
                                {s.count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyChart message="No sender data yet." />
                  )}
                </CardContent>
              </Card>

              <p className="text-xs text-foreground/40 mt-6">
                Data source: Supabase mirror of node&apos;s transfer_log + event_log.
                Last updated: {data.generated_at ? new Date(data.generated_at).toLocaleString() : '—'}.
                Refreshes every 60 seconds.
              </p>
            </>
          )}
        </div>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: typeof DollarSign;
  color: string;
}) {
  return (
    <Card className="bg-card/50">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-foreground/60 text-sm">{label}</span>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <p className={`text-xl font-semibold ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-[200px] flex items-center justify-center">
      <p className="text-foreground/40 text-sm italic">{message}</p>
    </div>
  );
}
