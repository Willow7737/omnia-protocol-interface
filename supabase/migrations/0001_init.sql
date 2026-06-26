-- ────────────────────────────────────────────────────────────────────────────
-- Omnia Protocol — Supabase schema
-- ────────────────────────────────────────────────────────────────────────────
-- This schema turns Supabase into a read replica + off-chain metadata store
-- for the Omnia dashboard. The node remains canonical for consensus, balances,
-- and validator state. Supabase holds:
--   1. User accounts (via Supabase Auth, linked to Omnia DIDs)
--   2. Mirrored transfer history (append-only, synced from the node)
--   3. Mirrored event log (append-only, synced from the node)
--   4. Proposal comments (off-chain governance discussion)
--   5. User profiles (display name, avatar, bio)
--
-- Design rules:
--   - Every mirrored table has a `node_id` column so multi-node deployments
--     can distinguish which node recorded the data.
--   - Every mirrored table has a `synced_at` timestamp for debugging.
--   - The `id` column on mirrored tables is the node's own ID (BLAKE3 hash
--     for transfers, hex event ID for events) — NOT a Supabase-generated UUID.
--     This makes upsert idempotent.
--   - Off-chain tables (comments, profiles) use Supabase-generated UUIDs /
--     bigserial as appropriate since they don't have a node-side counterpart.
-- ────────────────────────────────────────────────────────────────────────────

-- Enable the uuid-ossp extension (Supabase has this by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────────────────────
-- 1. User → DID mapping
-- ────────────────────────────────────────────────────────────────────────────
-- Links a Supabase auth user to an Omnia DID. Each user gets exactly one DID
-- (enforced by PRIMARY KEY on user_id). The DID is auto-generated on first
-- login as `did:omnia:<short-uuid>` but can be customized by the user via
-- the settings page (if the new DID is already registered on the node).

CREATE TABLE IF NOT EXISTS user_did_mappings (
  -- The Supabase auth user ID (UUID from auth.users).
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The Omnia DID this user is linked to.
  did TEXT NOT NULL UNIQUE,
  -- Whether this DID has been registered on the node via
  -- POST /api/v1/shards/economics/operations {operation: "register"}.
  registered_on_node BOOLEAN NOT NULL DEFAULT FALSE,
  -- When the mapping was created.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- When the mapping was last updated.
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_did_mappings_did ON user_did_mappings(did);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. User profiles (off-chain metadata)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  -- Which node URL this user prefers to connect to (for multi-node deployments).
  preferred_node_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create a profile row when a new auth user signs up.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO profiles (user_id) VALUES (NEW.id);

  -- Auto-generate a DID for the new user: did:omnia:<first 12 chars of UUID>
  -- This is a placeholder DID — the user can customize it later via settings.
  -- The DID is unique because user_id is unique.
  INSERT INTO user_did_mappings (user_id, did)
  VALUES (NEW.id, 'did:omnia:' || substring(NEW.id::text, 1, 12));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Mirrored transfer history (append-only from node)
-- ────────────────────────────────────────────────────────────────────────────
-- Mirrors the node's GET /api/v1/economics/transfers endpoint. The node's
-- in-memory history is bounded (10k records) and wiped on restart — this
-- table provides durable, queryable long-term storage.

CREATE TABLE IF NOT EXISTS transfer_logs (
  -- The node's BLAKE3-derived transfer ID (hex). Primary key for idempotent upsert.
  id TEXT PRIMARY KEY,
  -- Sender DID.
  from_did TEXT NOT NULL,
  -- Recipient DID (informational — UBC is soulbound).
  to_did TEXT NOT NULL,
  -- Amount of UBC spent.
  amount BIGINT NOT NULL,
  -- Unix-millisecond timestamp from the node.
  timestamp BIGINT NOT NULL,
  -- Sender's balance after the spend.
  new_balance BIGINT,
  -- Status from the node (always "completed" for recorded transfers).
  status TEXT NOT NULL DEFAULT 'completed',
  -- Which node recorded this transfer (for multi-node deployments).
  node_id INTEGER,
  -- When Supabase received this record.
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_logs_from_did ON transfer_logs(from_did);
CREATE INDEX IF NOT EXISTS idx_transfer_logs_to_did ON transfer_logs(to_did);
CREATE INDEX IF NOT EXISTS idx_transfer_logs_timestamp ON transfer_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transfer_logs_node_id ON transfer_logs(node_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Mirrored event log (append-only from node)
-- ────────────────────────────────────────────────────────────────────────────
-- Mirrors the node's GET /api/v1/events endpoint. Same rationale as
-- transfer_logs — the node's in-memory store is bounded and volatile.

CREATE TABLE IF NOT EXISTS event_logs (
  -- Hex-encoded event ID from the node. Primary key for idempotent upsert.
  id TEXT PRIMARY KEY,
  -- Hex-encoded creator node ID (first 4 bytes).
  creator TEXT,
  -- Sequence number from the creator.
  sequence BIGINT,
  -- Unix-millisecond timestamp.
  timestamp BIGINT NOT NULL,
  -- Hex-encoded payload (may be empty).
  payload TEXT,
  -- Event type hint ("generic", "transfer", "governance", etc.).
  event_type TEXT,
  -- Status from the node ("submitted", "submission_failed", etc.).
  status TEXT,
  -- Which node recorded this event.
  node_id INTEGER,
  -- When Supabase received this record.
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_timestamp ON event_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_creator ON event_logs(creator);
CREATE INDEX IF NOT EXISTS idx_event_logs_node_id ON event_logs(node_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Proposal comments (off-chain governance discussion)
-- ────────────────────────────────────────────────────────────────────────────
-- The node stores proposal state (votes, status, expiry) but has no concept
-- of discussion or debate. This table holds off-chain comments linked to
-- on-chain proposals by proposal_id.

CREATE TABLE IF NOT EXISTS proposal_comments (
  id BIGSERIAL PRIMARY KEY,
  -- The proposal ID as it exists on the node (e.g. "proposal-1").
  proposal_id TEXT NOT NULL,
  -- The DID of the commenter (from user_did_mappings).
  author_did TEXT NOT NULL,
  -- The comment body (Markdown — rendered client-side).
  body TEXT NOT NULL,
  -- Soft-delete support.
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal_id ON proposal_comments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_author_did ON proposal_comments(author_did);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_created_at ON proposal_comments(created_at DESC);

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Row Level Security (RLS)
-- ────────────────────────────────────────────────────────────────────────────
-- Public read access for mirrored tables (anyone can view transfer history,
-- event logs, and comments — the blockchain is public). Write access is
-- restricted to the service role (used by the sync API route) and, for
-- comments, to the authenticated owner of the author_did.

-- transfer_logs: public read, service-role-only write
ALTER TABLE transfer_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transfer_logs_public_read" ON transfer_logs FOR SELECT USING (true);
CREATE POLICY "transfer_logs_service_write" ON transfer_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- event_logs: public read, service-role-only write
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_logs_public_read" ON event_logs FOR SELECT USING (true);
CREATE POLICY "event_logs_service_write" ON event_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- proposal_comments: public read, authenticated users can insert their own,
-- users can update/delete their own comments.
ALTER TABLE proposal_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_public_read" ON proposal_comments FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "comments_authenticated_insert" ON proposal_comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND author_did IS NOT NULL);
CREATE POLICY "comments_author_update" ON proposal_comments FOR UPDATE
  USING (author_did IN (
    SELECT did FROM user_did_mappings WHERE user_id = auth.uid()
  ));
CREATE POLICY "comments_author_delete" ON proposal_comments FOR DELETE
  USING (author_did IN (
    SELECT did FROM user_did_mappings WHERE user_id = auth.uid()
  ));

-- profiles: users can read all profiles, but only update their own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_owner_update" ON profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- user_did_mappings: users can read their own mapping, service role can read all
ALTER TABLE user_did_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "did_mappings_owner_read" ON user_did_mappings FOR SELECT
  USING (user_id = auth.uid() OR auth.role() = 'service_role');
CREATE POLICY "did_mappings_owner_update" ON user_did_mappings FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Realtime publication
-- ────────────────────────────────────────────────────────────────────────────
-- Enable Realtime for the tables we want to push to the browser. This lets
-- the dashboard subscribe to changes via Supabase Realtime instead of
-- polling the node every 5–10 seconds.

ALTER PUBLICATION supabase_realtime ADD TABLE transfer_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE event_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE proposal_comments;

-- ────────────────────────────────────────────────────────────────────────────
-- 8. Updated_at trigger
-- ────────────────────────────────────────────────────────────────────────────
-- Auto-update updated_at on profiles and user_did_mappings when rows change.

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_did_mappings_updated_at
  BEFORE UPDATE ON user_did_mappings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_proposal_comments_updated_at
  BEFORE UPDATE ON proposal_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
