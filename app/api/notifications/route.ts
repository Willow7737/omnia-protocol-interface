/**
 * Notifications API — read + mark-as-read for the current user.
 *
 * GET  /api/notifications                — list user's notifications (newest first)
 * POST /api/notifications/mark-read      — mark all as read
 *
 * Notifications are inserted by the /api/sync worker when it detects
 * state changes on the node (slash events, ceremony milestones, etc.).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromCookies } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface NotificationRow {
  id: string;
  user_id: string | null;
  did: string | null;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '50', 10);
  const unreadOnly = req.nextUrl.searchParams.get('unread') === 'true';

  try {
    const supabase = await createServerClientFromCookies();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let query = supabase
      .from('notifications')
      .select('id, user_id, did, kind, title, body, link, read_at, created_at')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 200));

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    return NextResponse.json({
      notifications: (data as NotificationRow[]) ?? [],
      unread_count: (data as NotificationRow[])?.filter((n) => !n.read_at).length ?? 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 },
    );
  }
}

/** POST /api/notifications — mark all as read */
export async function POST() {
  try {
    const supabase = await createServerClientFromCookies();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ status: 'ok' });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 },
    );
  }
}
