/**
 * POST /api/sync
 *
 * Mirrors node data (transfers + events) into Supabase for persistent
 * storage, charts, and audit. The node's in-memory log is capped at
 * 10k records and wiped on restart — Supabase is the long-term record.
 *
 * This route uses the service role key (bypasses RLS) to bulk-upsert
 * records. It's idempotent: re-running with the same data is a no-op
 * because the node's IDs are used as primary keys.
 *
 * Trigger via:
 *   - Manual: curl -X POST http://localhost:3000/api/sync
 *   - Cron: set up a Vercel cron job or run via a timer
 *
 * Response: { transfers: {new, total}, events: {new, total} }
 */
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NODE_URL = process.env.OMNIA_NODE_URL || 'http://localhost:9090';
const SYNC_LIMIT = 200; // records per sync run

interface NodeTransfer {
  id: string;
  from_did: string;
  to_did: string;
  amount: number;
  new_balance: number;
  status: string;
  timestamp: number; // ms since epoch
}

interface NodeEvent {
  id: string;
  creator: string;
  sequence: number;
  timestamp: number; // ms since epoch
  payload: string;
  event_type: string;
  status: string;
}

export async function POST() {
  try {
    const supabase = createServiceRoleClient();

    // ── Sync transfers ────────────────────────────────────────────────
    const transferRes = await fetch(
      `${NODE_URL}/api/v1/economics/transfers?limit=${SYNC_LIMIT}`,
    );
    let transferNew = 0;
    let transferTotal = 0;

    if (transferRes.ok) {
      const { transfers } = await transferRes.json() as { transfers: NodeTransfer[] };
      transferTotal = transfers.length;

      if (transfers.length > 0) {
        const rows = transfers.map((t) => ({
          id: t.id,
          from_did: t.from_did,
          to_did: t.to_did,
          amount: t.amount,
          new_balance: t.new_balance,
          status: t.status,
          node_timestamp: t.timestamp,
        }));

        const { error } = await supabase
          .from('transfer_log')
          .upsert(rows, { onConflict: 'id', ignoreDuplicates: false });

        if (error) {
          console.error('Transfer sync error:', error);
        } else {
          // Count how many were actually new (upsert returns all, so we
          // can't distinguish new from updated without a separate query.
          // For reporting, use the total as an upper bound.)
          transferNew = rows.length;
        }
      }
    }

    // ── Sync events ──────────────────────────────────────────────────
    const eventRes = await fetch(
      `${NODE_URL}/api/v1/events?limit=${SYNC_LIMIT}`,
    );
    let eventNew = 0;
    let eventTotal = 0;

    if (eventRes.ok) {
      const { events } = await eventRes.json() as { events: NodeEvent[] };
      eventTotal = events.length;

      if (events.length > 0) {
        const rows = events.map((e) => ({
          id: e.id,
          creator: e.creator,
          sequence: e.sequence,
          node_timestamp: e.timestamp,
          payload: e.payload,
          event_type: e.event_type,
          status: e.status,
        }));

        const { error } = await supabase
          .from('event_log')
          .upsert(rows, { onConflict: 'id', ignoreDuplicates: false });

        if (error) {
          console.error('Event sync error:', error);
        } else {
          eventNew = rows.length;
        }
      }
    }

    return NextResponse.json({
      transfers: { new: transferNew, total: transferTotal },
      events: { new: eventNew, total: eventTotal },
      synced_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Sync error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 },
    );
  }
}

/** GET handler — returns sync status without triggering a sync. */
export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const [transfers, events, users] = await Promise.all([
      supabase.from('transfer_log').select('id', { count: 'exact', head: true }),
      supabase.from('event_log').select('id', { count: 'exact', head: true }),
      supabase.from('user_dids').select('user_id', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({
      transfers: transfers.count ?? 0,
      events: events.count ?? 0,
      users: users.count ?? 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 },
    );
  }
}
