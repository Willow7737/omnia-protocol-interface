/**
 * Comments API — off-chain proposal discussion stored in Supabase.
 *
 * GET  /api/comments?proposalId=X     — list comments for a proposal
 * POST /api/comments                   — create a new comment
 *
 * Comments are public-readable (anyone can see them) but only the
 * author can edit/delete (enforced by RLS in Supabase).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromCookies } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CommentRow {
  id: string;
  proposal_id: string;
  user_id: string;
  did: string;
  body: string;
  created_at: string;
}

/** GET /api/comments?proposalId=X — list comments for a proposal. */
export async function GET(req: NextRequest) {
  const proposalId = req.nextUrl.searchParams.get('proposalId');
  if (!proposalId) {
    return NextResponse.json({ error: 'Missing proposalId' }, { status: 400 });
  }

  try {
    const supabase = await createServerClientFromCookies();
    const { data, error } = await supabase
      .from('proposal_comments')
      .select('id, proposal_id, user_id, did, body, created_at')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comments: (data as CommentRow[]) ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 },
    );
  }
}

/** POST /api/comments — create a new comment. */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClientFromCookies();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json() as { proposalId?: string; body?: string };
    if (!body.proposalId || !body.body?.trim()) {
      return NextResponse.json(
        { error: 'proposalId and body are required' },
        { status: 400 },
      );
    }

    if (body.body.length > 2000) {
      return NextResponse.json(
        { error: 'Comment body must be 2000 characters or fewer' },
        { status: 400 },
      );
    }

    // Look up the user's DID for denormalized storage
    const { data: didRow } = await supabase
      .from('user_dids')
      .select('did')
      .eq('user_id', user.id)
      .single();

    if (!didRow?.did) {
      return NextResponse.json(
        { error: 'No DID linked to your account' },
        { status: 400 },
      );
    }

    const { data: comment, error: insertError } = await supabase
      .from('proposal_comments')
      .insert({
        proposal_id: body.proposalId,
        user_id: user.id,
        did: didRow.did,
        body: body.body.trim(),
      })
      .select('id, proposal_id, user_id, did, body, created_at')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ comment: comment as CommentRow });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 },
    );
  }
}
