/**
 * POST /api/auth/session
 *
 * Called by the browser after a Supabase login. Verifies the Supabase
 * session, looks up (or creates) the user's DID, and mints a node JWT
 * signed with OMNIA_JWT_SECRET.
 *
 * Request:  Authorization: Bearer <supabase-access-token>
 * Response: { did: string, nodeJwt: string }
 *
 * The node JWT is returned to the browser and stored in memory. It's
 * used as the `Authorization: Bearer` header for all subsequent node
 * API calls. The JWT expires after 24 hours — the browser should
 * re-call this endpoint when it expires.
 */
import { NextResponse } from 'next/server';
import { createServerClientFromCookies, createServiceRoleClient } from '@/lib/supabase-server';
import { mintNodeJwt } from '@/lib/jwt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Verify the Supabase session from cookies
    const supabase = await createServerClientFromCookies();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Look up the user's DID
    const serviceClient = createServiceRoleClient();
    const { data: didRow } = await serviceClient
      .from('user_dids')
      .select('did')
      .eq('user_id', user.id)
      .single();

    let did: string;

    if (didRow?.did) {
      // Existing DID
      did = didRow.did;
    } else {
      // The trigger should have created one, but if it didn't (e.g. the
      // user existed before the trigger was added), create one now.
      did = 'did:omnia:' + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
      const { error: insertError } = await serviceClient
        .from('user_dids')
        .insert({ user_id: user.id, did });

      if (insertError) {
        // Maybe a race — try to read again
        const { data: retry } = await serviceClient
          .from('user_dids')
          .select('did')
          .eq('user_id', user.id)
          .single();
        if (retry?.did) {
          did = retry.did;
        } else {
          return NextResponse.json(
            { error: 'Failed to create DID mapping' },
            { status: 500 },
          );
        }
      }
    }

    // Mint the node JWT
    const nodeJwt = await mintNodeJwt(did, 86400); // 24h TTL

    return NextResponse.json({ did, nodeJwt });
  } catch (e) {
    console.error('Session route error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 },
    );
  }
}
