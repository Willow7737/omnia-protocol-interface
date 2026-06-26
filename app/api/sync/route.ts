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
 * Triggered via:
 *   - Vercel Cron (vercel.json schedules every minute)
 *   - Manual: curl -X POST https://your-app.vercel.app/api/sync
 *
 * If CRON_SECRET is set, the request must include `Authorization: Bearer
 * <secret>` — this prevents randoms from triggering sync runs. Vercel
 * Cron automatically sends this header when CRON_SECRET is set as an env
 * var.
 *
 * Response: { transfers: {new, total}, events: {new, total} }
 */
import { NextRequest, NextResponse } from 'next/server';
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

/** Verify the CRON_SECRET if it's set. Returns true if authorized. */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // No secret configured — allow all requests (development mode).
    return true;
  }
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  return token === secret;
}

export async function POST(req: NextRequest) {
  // Auth check (Vercel Cron sends Authorization: Bearer <CRON_SECRET>)
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Skip if Supabase isn't configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Supabase not configured — skipping sync' },
      { status: 503 },
    );
  }

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
          transferNew = rows.length;
        }
      }
    }

    // ── Sync events ──────────────────────────────────────────────────
    const eventRes = await fetch(`${NODE_URL}/api/v1/events?limit=${SYNC_LIMIT}`);
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

    // ── Sync validators + emit slash notifications ───────────────────
    const notificationsInserted = await syncValidatorsAndNotify(supabase);

    return NextResponse.json({
      transfers: { new: transferNew, total: transferTotal },
      events: { new: eventNew, total: eventTotal },
      notifications: notificationsInserted,
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

/**
 * Fetch the validator set from the node and detect slash point increases
 * since the last sync. Insert notifications for any DIDs whose slash points
 * increased. Returns the number of notifications inserted.
 *
 * State is tracked in a `sync_state` table (key-value). If that table
 * doesn't exist yet, the function returns 0 silently.
 */
async function syncValidatorsAndNotify(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<number> {
  try {
    const validatorRes = await fetch(`${NODE_URL}/api/v1/validators`);
    if (!validatorRes.ok) return 0;

    const { validators } = await validatorRes.json() as {
      validators: Array<{
        node_id: string;
        stake: number;
        slash_points: number;
        is_jailed: boolean;
        status: string;
      }>;
    };

    // Load previous slash state from sync_state
    const { data: stateRow } = await supabase
      .from('sync_state')
      .select('value')
      .eq('key', 'validator_slash_points')
      .single();

    const prevState: Record<string, number> = stateRow?.value ?? {};
    const newState: Record<string, number> = {};
    const notifications: Array<{
      user_id: null;
      did: string;
      kind: string;
      title: string;
      body: string;
      link: string;
      read_at: null;
    }> = [];

    for (const v of validators) {
      newState[v.node_id] = v.slash_points;
      const prev = prevState[v.node_id] ?? 0;
      if (v.slash_points > prev) {
        const delta = v.slash_points - prev;
        notifications.push({
          user_id: null,
          did: v.node_id,
          kind: v.is_jailed ? 'slash' : 'info',
          title: v.is_jailed
            ? `Validator jailed: ${v.node_id.slice(0, 16)}…`
            : `Slash points increased: ${v.node_id.slice(0, 16)}…`,
          body: `Slash points went from ${prev} to ${v.slash_points} (+${delta}). Status: ${v.status}.`,
          link: '/validators',
          read_at: null,
        });
      }
    }

    // Persist new state
    if (Object.keys(newState).length > 0) {
      await supabase.from('sync_state').upsert(
        { key: 'validator_slash_points', value: newState },
        { onConflict: 'key' },
      );
    }

    // Insert notifications (broadcasts — user_id = null)
    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    return notifications.length;
  } catch (e) {
    console.error('Validator sync error:', e);
    return 0;
  }
}

/** GET handler — returns sync status without triggering a sync. */
export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }
    const supabase = createServiceRoleClient();

    const [transfers, events, users, notifications] = await Promise.all([
      supabase.from('transfer_log').select('id', { count: 'exact', head: true }),
      supabase.from('event_log').select('id', { count: 'exact', head: true }),
      supabase.from('user_dids').select('user_id', { count: 'exact', head: true }),
      supabase.from('notifications').select('id', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({
      transfers: transfers.count ?? 0,
      events: events.count ?? 0,
      users: users.count ?? 0,
      notifications: notifications.count ?? 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 },
    );
  }
}
