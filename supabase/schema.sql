-- ════════════════════════════════════════════════════════════════════════
-- Omnia Protocol — Supabase Schema
-- ════════════════════════════════════════════════════════════════════════
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New Query).
-- It creates all tables, indexes, RLS policies, and triggers needed by
-- the omnia-protocol-interface.
--
-- The node stays canonical for consensus + balances. Supabase holds:
--   - User → DID mappings (links Supabase Auth to omnia DIDs)
--   - Transfer log (mirror of node /api/v1/economics/transfers, for charts)
--   - Event log (mirror of node /api/v1/events, for audit)
--   - Proposal comments (off-chain discussion, fully Supabase-owned)
--
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ════════════════════════════════════════════════════════════════════════
-- Tables
-- ════════════════════════════════════════════════════════════════════════

-- Maps a Supabase auth user to their Omnia DID.
-- One DID per user (enforced by primary key on user_id and unique on did).
create table if not exists public.user_dids (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  did          text unique not null,
  display_name text,                          -- user-chosen name shown in UI (nullable)
  created_at   timestamptz not null default now()
);

-- Backfill display_name column for existing installs (no-op on fresh installs).
alter table public.user_dids add column if not exists display_name text;

-- Mirror of the node's transfer history (for charts + persistent audit).
-- The node's in-memory log is capped at 10k and wiped on restart; this
-- table is the long-term record. Written by the sync worker (service role).
create table if not exists public.transfer_log (
  id             text primary key,           -- BLAKE3-derived ID from the node
  from_did       text not null,
  to_did         text not null,
  amount         bigint not null,
  new_balance    bigint not null,
  status         text not null default 'completed',
  node_timestamp bigint not null,            -- ms since epoch (from the node)
  synced_at      timestamptz not null default now()
);
create index if not exists transfer_log_from_did_idx     on transfer_log (from_did);
create index if not exists transfer_log_to_did_idx       on transfer_log (to_did);
create index if not exists transfer_log_node_timestamp_idx on transfer_log (node_timestamp desc);

-- Mirror of the node's event store (for audit + event-type charts).
create table if not exists public.event_log (
  id             text primary key,           -- hex event ID from the node
  creator        text not null,
  sequence       bigint not null,
  node_timestamp bigint not null,            -- ms since epoch
  payload        text,
  event_type     text not null,
  status         text not null,
  synced_at      timestamptz not null default now()
);
create index if not exists event_log_node_timestamp_idx on event_log (node_timestamp desc);
create index if not exists event_log_event_type_idx     on event_log (event_type);

-- Off-chain proposal discussion. Fully Supabase-owned — the node has no
-- concept of comments. RLS allows anyone to read, users to write only
-- their own.
create table if not exists public.proposal_comments (
  id          uuid primary key default gen_random_uuid(),
  proposal_id text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  did         text not null,                 -- denormalized for display
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index if not exists proposal_comments_proposal_id_idx on proposal_comments (proposal_id, created_at);

-- ════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════════════

alter table public.user_dids          enable row level security;
alter table public.transfer_log       enable row level security;
alter table public.event_log          enable row level security;
alter table public.proposal_comments  enable row level security;

-- user_dids: users can read/write only their own mapping.
drop policy if exists "Users can read own DID"  on public.user_dids;
drop policy if exists "Users can insert own DID" on public.user_dids;
drop policy if exists "Users can update own DID" on public.user_dids;
create policy "Users can read own DID"   on public.user_dids for select using (auth.uid() = user_id);
create policy "Users can insert own DID" on public.user_dids for insert with check (auth.uid() = user_id);
create policy "Users can update own DID" on public.user_dids for update using (auth.uid() = user_id);

-- transfer_log: public read (it's public chain data), service-role-only write.
-- (The sync worker uses the service role key which bypasses RLS.)
drop policy if exists "Anyone can read transfers" on public.transfer_log;
create policy "Anyone can read transfers" on public.transfer_log for select using (true);

-- event_log: same pattern.
drop policy if exists "Anyone can read events" on public.event_log;
create policy "Anyone can read events" on public.event_log for select using (true);

-- proposal_comments: public read, users can write/update/delete only their own.
drop policy if exists "Anyone can read comments"        on public.proposal_comments;
drop policy if exists "Users can post comments"         on public.proposal_comments;
drop policy if exists "Users can update own comments"   on public.proposal_comments;
drop policy if exists "Users can delete own comments"   on public.proposal_comments;
create policy "Anyone can read comments"      on public.proposal_comments for select using (true);
create policy "Users can post comments"       on public.proposal_comments for insert with check (auth.uid() = user_id);
create policy "Users can update own comments" on public.proposal_comments for update using (auth.uid() = user_id);
create policy "Users can delete own comments" on public.proposal_comments for delete using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════
-- Auto-create a DID for new auth users
-- ════════════════════════════════════════════════════════════════════════
-- When a user signs up via Supabase Auth, automatically create a DID
-- for them. The DID format is did:omnia:<short-uuid> (8 chars, URL-safe).
-- Users can later change their DID via the profile page (future feature).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_dids (user_id, did)
  values (
    new.id,
    'did:omnia:' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════════
-- Notifications
-- ════════════════════════════════════════════════════════════════════════
-- In-app notifications for slash events, proposal status changes, ceremony
-- milestones, and other network events. Inserted by the sync worker (service
-- role) when it detects a state change on the node, or by triggers on
-- proposal_comments (e.g. "@mentions"). Read by the user via the
-- notification bell in the sidebar.

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade, -- null = broadcast
  did         text,                          -- DID affected by the notification (nullable)
  kind        text not null,                 -- 'slash' | 'proposal' | 'ceremony' | 'transfer' | 'info'
  title       text not null,
  body        text,
  link        text,                          -- relative URL to navigate to (e.g. '/governance')
  read_at     timestamptz,                   -- null = unread
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_kind_idx               on public.notifications (kind);
create index if not exists notifications_unread_idx              on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

-- Users can read only their own notifications (or broadcasts where user_id is null).
drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications for select
  using (user_id is null or auth.uid() = user_id);

-- Users can mark their own notifications as read.
drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Service role (sync worker) can insert — bypasses RLS.

-- ════════════════════════════════════════════════════════════════════════
-- Sync state (worker scratch space)
-- ════════════════════════════════════════════════════════════════════════
-- Key-value store the sync worker uses to track state between runs
-- (e.g. previous slash point counts, so it can detect increases and
-- emit notifications). Written by the service role only — no RLS needed
-- because the table is never queried from the browser.

create table if not exists public.sync_state (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════
-- Realtime publication for notifications + comments
-- ════════════════════════════════════════════════════════════════════════
-- Enable Realtime on the tables we want to subscribe to from the browser.

alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.proposal_comments;

-- ════════════════════════════════════════════════════════════════════════
-- Done. Verify with:
--   select * from public.user_dids;
--   select * from public.transfer_log;
--   select * from public.event_log;
--   select * from public.proposal_comments;
--   select * from public.notifications;
-- ════════════════════════════════════════════════════════════════════════
