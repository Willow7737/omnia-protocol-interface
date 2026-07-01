# Omnia Dashboard — Complete Supabase Setup Guide

This guide walks you through setting up Supabase for the Omnia dashboard, including OAuth providers (GitHub, Google), email magic links, Realtime, and all environment variables. Follow each step in order.

---

## Prerequisites

- A Supabase account (free tier works): [supabase.com](https://supabase.cloud)
- A Vercel account (for deployment): [vercel.com](https://vercel.com)
- Your Omnia node running somewhere reachable (Hetzner, Codespace, VPS, etc.)
- Your Vercel app URL (e.g., `https://omnia-protocol-interface.vercel.app`)

---

## Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Pick a name (e.g., `omnia-dashboard`)
3. Set a strong database password — **save it somewhere safe**
4. Choose a region close to your users
5. Wait ~2 minutes for provisioning to complete

---

## Step 2 — Run the Database Schema

1. In the Supabase dashboard: **SQL Editor** → **New Query**
2. Open the file `supabase/schema.sql` from this repo
3. Copy the entire contents into the SQL Editor
4. Click **Run** — you should see "Success. No rows returned."
5. Verify by running: `select * from public.user_dids;` (should return 0 rows)

This creates:
- `user_dids` — maps Supabase auth users to Omnia DIDs
- `transfer_log` — mirrored transfer history (for charts)
- `event_log` — mirrored event history (for audit)
- `proposal_comments` — off-chain governance discussion
- `notifications` — in-app notification system
- `sync_state` — worker scratch space for detecting state changes
- Auto-trigger: creates a DID for each new auth user
- RLS policies: users can only read/write their own data
- Realtime: enabled on `notifications` and `proposal_comments`

---

## Step 3 — Get Your API Keys

1. Go to **Settings → API**
2. Copy these three values — you'll need them later:

| Key | Example |
|-----|---------|
| **Project URL** | `https://abcdefgh.supabase.co` |
| **anon public key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` (long string) |
| **service_role key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` (different long string) |

> ⚠️ **NEVER expose the service_role key to the browser.** It bypasses RLS. Only use it in server-side API routes.

---

## Step 4 — Configure Redirect URLs

1. Go to **Authentication → URL Configuration**
2. Under **Site URL**, enter your deployed Vercel URL:
   - `https://omnia-protocol-interface.vercel.app`
3. Under **Redirect URLs**, add ALL of these:
   - `http://localhost:3000/auth/callback` (for local dev)
   - `https://omnia-protocol-interface.vercel.app/auth/callback` (production)
   - Any Vercel preview URLs you want to test on (e.g., `https://omnia-protocol-interface-git-main-xxx.vercel.app/auth/callback`)
4. Click **Save**

---

## Step 5 — Configure Email Magic Links

Supabase has email auth enabled by default. You just need to configure the redirect URL (done in Step 4).

1. Go to **Authentication → Providers → Email**
2. Make sure **Enable Email Provider** is ON
3. Optionally:
   - **Disable "Confirm email"** for faster testing (users can sign in immediately without clicking the email link)
   - **Enable "Allow new users to sign up"** — if OFF, only pre-existing users can sign in
4. Click **Save**

To test: go to your dashboard → click **Sign In** → enter your email → click **Send Magic Link** → check your inbox → click the link → you should be redirected back to the dashboard.

---

## Step 6 — Configure GitHub OAuth

### 6a. Create a GitHub OAuth App

1. Go to GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
2. Fill in:

| Field | Value |
|-------|-------|
| **Application name** | Omnia Dashboard |
| **Homepage URL** | `https://omnia-protocol-interface.vercel.app` |
| **Authorization callback URL** | `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` |

> ⚠️ The callback URL is `https://<your-supabase-project>.supabase.co/auth/v1/callback` — NOT your app's URL. Supabase handles the OAuth callback, then redirects to your app's `/auth/callback`.

3. Click **Register application**
4. On the next page, click **Generate a new client secret**
5. Copy the **Client ID** and **Client Secret** — you'll need them in a moment

### 6b. Enable GitHub in Supabase

1. In Supabase: **Authentication → Providers → GitHub**
2. Toggle **Enable GitHub** to ON
3. Paste the **Client ID** and **Client Secret** from step 6a
4. Click **Save**

---

## Step 7 — Configure Google OAuth

### 7a. Create Google OAuth Credentials

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials → OAuth client ID**
3. If prompted, configure the consent screen first (just set a name like "Omnia Dashboard")
4. Application type: **Web application**
5. Fill in:

| Field | Value |
|-------|-------|
| **Name** | Omnia Dashboard |
| **Authorized JavaScript origins** | `https://YOUR-PROJECT-REF.supabase.co` |
| **Authorized redirect URIs** | `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` |

6. Click **Create**
7. Copy the **Client ID** and **Client Secret** from the popup

### 7b. Enable Google in Supabase

1. In Supabase: **Authentication → Providers → Google**
2. Toggle **Enable Google** to ON
3. Paste the **Client ID** and **Client Secret** from step 7a
4. Click **Save**

---

## Step 8 — Enable Realtime

Realtime is required for instant comments and live notifications.

1. In Supabase: **Database → Replication**
2. Find the `supabase_realtime` publication
3. Make sure these tables are added to it:
   - `notifications`
   - `proposal_comments`
4. Verify — run this SQL:
   ```sql
   SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```
   You should see `notifications` and `proposal_comments` in the results.

> The `supabase/schema.sql` script already adds these tables to the publication, but verify it took effect.

---

## Step 9 — Configure Environment Variables

### For Local Development

Create a `.env.local` file in the project root:

```bash
# Supabase (public — safe for browser)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Supabase (server-only — NEVER expose to browser)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Omnia Node (server-only)
OMNIA_JWT_SECRET=omnia-testnet-jwt-secret-CHANGE-ME
OMNIA_NODE_URL=http://localhost:9090

# Optional: protect the cron sync endpoint
CRON_SECRET=your-random-secret
```

Generate a CRON_SECRET:
```bash
openssl rand -hex 32
```

### For Vercel Deployment

1. Go to **Vercel → Project → Settings → Environment Variables**
2. Add each variable:

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR-PROJECT-REF.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your-anon-key | All |
| `SUPABASE_SERVICE_ROLE_KEY` | your-service-role-key | All |
| `OMNIA_JWT_SECRET` | `omnia-testnet-jwt-secret-CHANGE-ME` | All |
| `OMNIA_NODE_URL` | `https://78.47.43.136.sslip.io` (your Hetzner node) | All |
| `CRON_SECRET` | your-random-secret | All |

3. Click **Save** for each
4. **Redeploy** your app (Vercel → Deployments → click the latest → "Redeploy")

---

## Step 10 — Test the Full Flow

1. Visit your deployed dashboard: `https://omnia-protocol-interface.vercel.app`
2. You should be redirected to `/login` (the middleware enforces auth)
3. Try **Continue with GitHub**:
   - Authorize on GitHub
   - Should redirect back to `/auth/callback` → `/` (dashboard)
   - You should see your email + auto-created DID in the sidebar
4. Try **Continue with Google** (sign out first, then sign in with Google)
5. Try **Email magic link**:
   - Enter your email
   - Click "Send Magic Link"
   - Check your inbox
   - Click the link → should redirect to `/auth/callback` → dashboard
6. Check that the dashboard shows node info (Node 1, 6 shards, uptime)
7. Go to **Economics** → register a DID → check balance
8. Go to **Events** → submit an event → it should appear in the list
9. Go to **Governance** → create a proposal → vote on it → add a comment
10. Go to **Notifications** → should be empty (or show test notifications)

---

## Step 11 — Set Up the Cron Sync (Vercel)

The `vercel.json` file in the project root configures a daily cron job that calls `/api/sync` to mirror node data into Supabase.

1. Verify `vercel.json` exists in the project root:
   ```json
   {
     "crons": [
       { "path": "/api/sync", "schedule": "0 0 * * *" }
     ]
   }
   ```

2. In Vercel: **Project → Settings → Cron Jobs** — you should see `/api/sync` scheduled daily

3. To trigger a manual sync:
   ```bash
   curl -X POST https://omnia-protocol-interface.vercel.app/api/sync
   ```

4. If you set `CRON_SECRET`, Vercel automatically sends it as `Authorization: Bearer <secret>`

---

## Troubleshooting

### "Auth session missing!" after OAuth redirect
- Check that `/auth/callback` is in your Supabase **Redirect URLs** list (Step 4)
- Check that your OAuth app's callback URL is `https://<project>.supabase.co/auth/v1/callback` (not your app URL)

### Email magic link opens new tab but original tab doesn't detect sign-in
- The email-await polling should pick it up within 3 seconds
- If it doesn't, check the browser console for errors
- Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel

### "Failed to mint node JWT" error
- Check that `OMNIA_JWT_SECRET` in Vercel matches the secret the node was started with
- For the Docker testnet: the secret is `omnia-testnet-jwt-secret-CHANGE-ME`
- Check that the user's DID was created (run `select * from public.user_dids;` in Supabase SQL Editor)

### Cron sync not running
- Check `vercel.json` exists at the project root
- In Vercel dashboard: **Project → Settings → Cron Jobs** — you should see `/api/sync`
- Check function logs: Vercel → Project → Functions → `/api/sync`

### Realtime not working (comments/notifications don't update live)
- Verify the tables are in the `supabase_realtime` publication (Step 8)
- Check browser console for WebSocket connection errors
- Make sure your anon key has Realtime permissions (default)

### Analytics page shows empty charts
- Run `curl -X POST https://your-app.vercel.app/api/sync` to manually trigger a sync
- Check that `OMNIA_NODE_URL` is publicly reachable from Vercel (not localhost)
- Check Supabase → Table Editor → `transfer_log` and `event_log` for data

### Sync route returns 503 "Supabase not configured"
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel
- The sync route skips gracefully if Supabase isn't configured

### "Redirect URL mismatch" from Google/Supabase
- Double-check that the redirect URI in your Google OAuth app matches exactly:
  `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
- No trailing slash, no extra path

### Can't access /analytics or other pages without signing in
- The middleware (`middleware.ts`) redirects all non-authenticated users to `/login`
- If you're in manual mode (no Supabase), you need to enter your endpoint + JWT in the config modal first — the middleware checks for the `omnia-manual-jwt` cookie

---

## Security Notes

- **Never commit `.env.local`** — it's gitignored
- **Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser** — it bypasses RLS
- **Rotate keys if they leak** — Supabase → Settings → API → Reset
- **Use `CRON_SECRET`** in production to prevent randoms from hitting `/api/sync`
- The middleware enforces authentication on ALL routes except `/login`, `/auth/callback`, and static assets
