/**
 * GET  /api/profile         — read current user's profile (DID, display_name)
 * POST /api/profile         — update display_name
 *
 * The DID itself is immutable (auto-created at signup). Only display_name
 * is editable.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClientFromCookies } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerClientFromCookies();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_dids')
      .select('did, display_name, created_at')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      user_id: user.id,
      email: user.email,
      did: profile?.did ?? null,
      display_name: profile?.display_name ?? null,
      created_at: profile?.created_at ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClientFromCookies();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json() as { display_name?: string };
    if (typeof body.display_name !== 'string') {
      return NextResponse.json(
        { error: 'display_name is required' },
        { status: 400 },
      );
    }

    // Validate: 1-50 chars, no control characters
    const trimmed = body.display_name.trim();
    if (trimmed.length === 0 || trimmed.length > 50) {
      return NextResponse.json(
        { error: 'Display name must be 1–50 characters' },
        { status: 400 },
      );
    }

    const { data, error: updateError } = await supabase
      .from('user_dids')
      .update({ display_name: trimmed })
      .eq('user_id', user.id)
      .select('did, display_name, created_at')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 },
    );
  }
}
