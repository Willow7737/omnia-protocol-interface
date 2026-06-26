# Omnia Dashboard — Supabase Setup Guide

This guide walks you through configuring Supabase for the Omnia dashboard, including OAuth providers (GitHub, Google) and email magic links.

## Prerequisites

- A Supabase account (free tier works): [supabase.com](https://supabase.com)
- A Vercel account (for deployment): [vercel.com](https://vercel.com)
- Your Omnia node running somewhere reachable (Codespace, VPS, etc.)

## Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Pick a name (e.g. `omnia-dashboard`)
3. Set a strong database password (save it somewhere safe)
4. Choose a region close to your users
5. Wait ~2 minutes for provisioning to complete

## Step 2 — Run the schema

1. In the Supabase dashboard: **SQL Editor** → **New Query**
2. Paste the entire contents of [`supabase/schema.sql`](../supabase/schema.sql)
3. Click **Run** — you should see "Success. No rows returned."
4. Verify by running: `select * from public.user_dids;` (should return 0 rows)

## Step 3 — Get your API keys

1. Go to **Settings → API**
2. Copy these three values:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret!)

## Step 4 — Configure email magic links

Supabase has email auth enabled by default. You just need to configure the redirect URL:

1. Go to **Authentication → URL Configuration**
2. Under **Site URL**, enter your deployed dashboard URL:
   - Local dev: `http://localhost:3000`
   - Vercel: `https://your-app.vercel.app`
3. Under **Redirect URLs**, add ALL of these:
   - `http://localhost:3000/auth/callback`
   - `https://your-app.vercel.app/auth/callback`
   - Any preview deployment URLs you want to test on
4. Under **Authentication → Providers → Email**:
   - Make sure **Enable Email Provider** is on
   - Optionally disable "Confirm email" for dev (faster testing)

## Step 5 — Configure GitHub OAuth (optional)

1. Go to GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
2. Fill in:
   - **Application name**: Omnia Dashboard
   - **Homepage URL**: `https://your-app.vercel.app` (or `http://localhost:3000`)
   - **Authorization callback URL**: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
     - **IMPORTANT**: This is the Supabase callback URL, not your app's
3. After creating, click **Generate a new client secret**
4. Copy the **Client ID** and **Client Secret**
5. In Supabase: **Authentication → Providers → GitHub**
   - Toggle **Enable GitHub**
   - Paste the Client ID and Client Secret
   - Save

## Step 6 — Configure Google OAuth (optional)

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Authorized JavaScript origins:
   - `https://<your-supabase-project>.supabase.co`
5. Authorized redirect URIs:
   - `https://<your-supabase-project>.supabase.co/auth/v1/callback`
6. Create → copy the **Client ID** and **Client Secret**
7. In Supabase: **Authentication → Providers → Google**
   - Toggle **Enable Google**
   - Paste the Client ID and Client Secret
   - Save

## Step 7 — Enable Realtime

Realtime is required for instant comments and notifications.

1. In Supabase: **Database → Replication**
2. Find the `supabase_realtime` publication
3. Make sure these tables are added to it:
   - `notifications`
   - `proposal_comments`
4. The schema.sql does this automatically with `alter publication supabase_realtime add table ...`, but verify it took effect.

## Step 8 — Configure env vars

### Local development
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### Vercel deployment
1. Vercel → your project → **Settings → Environment Variables**
2. Add each variable from `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OMNIA_JWT_SECRET` (must match the node's `OMNIA_JWT_SECRET`)
   - `OMNIA_NODE_URL` (must be publicly reachable from Vercel — NOT localhost)
   - `CRON_SECRET` (generate with `openssl rand -hex 32`)
3. Apply to: Production + Preview + Development
4. Redeploy

## Step 9 — Set the Supabase redirect URLs (for production)

After your Vercel app is deployed, you'll know its URL. Update Supabase:

1. Supabase → **Authentication → URL Configuration**
2. Update **Site URL** to `https://your-app.vercel.app`
3. Add `https://your-app.vercel.app/auth/callback` to **Redirect URLs**
4. Update your OAuth apps (GitHub + Google) to include the production URL if needed

## Step 10 — Test the full flow

1. Visit your deployed dashboard
2. Click **Sign In**
3. Try email magic link:
   - Enter your email
   - Click "Send Magic Link"
   - Check your inbox
   - Click the link → should redirect to `/auth/callback` → exchange code → redirect to dashboard
   - You should see your DID in the sidebar
4. Try GitHub/Google OAuth:
   - Click the button
   - Authorize on GitHub/Google
   - Should redirect back to `/auth/callback` → dashboard
5. Try the notifications:
   - Open the validators page → if any validator gets slashed, you'll see a notification
   - Or manually insert a test notification:
     ```sql
     insert into public.notifications (kind, title, body, link)
     values ('info', 'Test notification', 'This is a test', '/monitor');
     ```
   - The bell icon should show a red badge within a few seconds (Realtime)

## Troubleshooting

### "Auth session missing!" after OAuth redirect
- Check that `/auth/callback` is in your Supabase **Redirect URLs** list
- Check that your OAuth app's callback URL is `https://<project>.supabase.co/auth/v1/callback`, not your app's URL

### Email magic link opens new tab but original tab doesn't detect sign-in
- The email-await polling should pick it up within 3 seconds
- If it doesn't, check the browser console for errors
- Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set

### "Failed to mint node JWT" error
- Check that `OMNIA_JWT_SECRET` in `.env.local` (or Vercel env vars) matches the secret the node was started with
- Check that the user's DID was created in the `user_dids` table (run the schema.sql trigger check)

### Cron sync not running
- Check `vercel.json` exists at the project root
- Verify in Vercel dashboard: **Project → Settings → Cron Jobs** — you should see `/api/sync` scheduled every minute
- If `CRON_SECRET` is set, Vercel automatically sends it as `Authorization: Bearer <secret>`
- Check the function logs: Vercel → Project → Functions → `/api/sync`

### Realtime not working (comments/notifications don't update live)
- Verify the tables are in the `supabase_realtime` publication (Step 7)
- Check browser console for WebSocket connection errors
- Make sure your anon key has Realtime permissions (default)

### Sync route returns 503 "Supabase not configured"
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel env vars
- The sync route skips gracefully if Supabase isn't configured — no error, just no sync

### Analytics page shows empty charts
- Run `curl -X POST https://your-app.vercel.app/api/sync` to manually trigger a sync
- Check that the node is reachable from Vercel (the `OMNIA_NODE_URL` must be publicly accessible)
- Check Supabase → Table Editor → `transfer_log` and `event_log` for data

## Security notes

- **Never commit `.env.local`** — it's gitignored
- **Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser** — it bypasses RLS
- **Rotate keys if they leak** — Supabase → Settings → API → Reset
- **Use `CRON_SECRET`** in production to prevent randoms from hitting `/api/sync`
