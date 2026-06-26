/**
 * GET /api/analytics
 *
 * Returns aggregated analytics data from Supabase:
 *   - UBC volume per day (last 30 days)
 *   - Events per hour (last 24 hours)
 *   - Top senders by total volume (last 30 days)
 *   - Summary stats (total volume, total transfers, total events)
 *
 * The data is read from the transfer_log + event_log tables (populated by
 * the /api/sync worker). If sync hasn't run yet, returns empty arrays.
 */
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface VolumeByDay {
  day: string;       // ISO date (YYYY-MM-DD)
  total_amount: number;
  count: number;
}

interface EventsByHour {
  hour: string;      // ISO timestamp (truncated to hour)
  count: number;
}

interface TopSender {
  from_did: string;
  total_amount: number;
  count: number;
}

interface Summary {
  total_volume: number;
  total_transfers: number;
  total_events: number;
  unique_senders: number;
  unique_recipients: number;
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Run all queries in parallel
    const [volumeRes, eventsRes, topSendersRes, summaryRes] = await Promise.all([
      // UBC volume per day (last 30 days)
      supabase.rpc('get_volume_by_day' as never).select('*').limit(30),

      // We can't use RPC without defining it — use direct queries instead.
      // (The RPCs above will fail silently; we fall back to range queries below.)
      Promise.resolve(null),

      Promise.resolve(null),

      Promise.resolve(null),
    ]);

    // ── Direct queries (no RPC required) ──────────────────────────────
    // Volume by day — fetch last 200 transfers and bucket client-side.
    // (Supabase's JS client doesn't support GROUP BY directly, so we
    // fetch raw rows and aggregate in JS. For larger datasets, switch
    // to a Supabase RPC function defined in SQL.)
    const { data: transfers } = await supabase
      .from('transfer_log')
      .select('from_did, to_did, amount, node_timestamp')
      .order('node_timestamp', { ascending: false })
      .limit(1000);

    const { data: events } = await supabase
      .from('event_log')
      .select('event_type, node_timestamp')
      .order('node_timestamp', { ascending: false })
      .limit(1000);

    // ── Aggregate client-side ─────────────────────────────────────────
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    // Volume by day (last 30 days)
    const volumeMap = new Map<string, { total_amount: number; count: number }>();
    for (const t of transfers ?? []) {
      if (t.node_timestamp < thirtyDaysAgo) continue;
      const day = new Date(t.node_timestamp).toISOString().slice(0, 10);
      const existing = volumeMap.get(day) ?? { total_amount: 0, count: 0 };
      existing.total_amount += t.amount;
      existing.count += 1;
      volumeMap.set(day, existing);
    }
    const volumeByDay: VolumeByDay[] = Array.from(volumeMap.entries())
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => a.day.localeCompare(b.day));

    // Events per hour (last 24 hours)
    const eventsMap = new Map<string, number>();
    for (const e of events ?? []) {
      if (e.node_timestamp < twentyFourHoursAgo) continue;
      const hour = new Date(e.node_timestamp).toISOString().slice(0, 13) + ':00:00';
      eventsMap.set(hour, (eventsMap.get(hour) ?? 0) + 1);
    }
    const eventsByHour: EventsByHour[] = Array.from(eventsMap.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    // Top senders by total volume (last 30 days)
    const sendersMap = new Map<string, { total_amount: number; count: number }>();
    for (const t of transfers ?? []) {
      if (t.node_timestamp < thirtyDaysAgo) continue;
      const existing = sendersMap.get(t.from_did) ?? { total_amount: 0, count: 0 };
      existing.total_amount += t.amount;
      existing.count += 1;
      sendersMap.set(t.from_did, existing);
    }
    const topSenders: TopSender[] = Array.from(sendersMap.entries())
      .map(([from_did, v]) => ({ from_did, ...v }))
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 10);

    // Summary stats
    const uniqueSenders = new Set((transfers ?? []).map((t) => t.from_did)).size;
    const uniqueRecipients = new Set((transfers ?? []).map((t) => t.to_did)).size;
    const totalVolume = (transfers ?? []).reduce((sum, t) => sum + t.amount, 0);
    const summary: Summary = {
      total_volume: totalVolume,
      total_transfers: transfers?.length ?? 0,
      total_events: events?.length ?? 0,
      unique_senders: uniqueSenders,
      unique_recipients: uniqueRecipients,
    };

    // Event type distribution (bonus chart)
    const eventTypeMap = new Map<string, number>();
    for (const e of events ?? []) {
      eventTypeMap.set(e.event_type, (eventTypeMap.get(e.event_type) ?? 0) + 1);
    }
    const eventsByType = Array.from(eventTypeMap.entries())
      .map(([event_type, count]) => ({ event_type, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      volumeByDay,
      eventsByHour,
      eventsByType,
      topSenders,
      summary,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Analytics error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 },
    );
  }
}
