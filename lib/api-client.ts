import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────────────
// API Response Types — matched to the actual Omnia node handlers in
// node/src/api/{node,economics,events,governance,ceremony}.rs
//
// Every path is under `/api/v1/...`. Public reads (node/info, node/peers,
// ceremony/state, ceremony/transcript, errors) do not require a JWT.
// All writes (events, shards, governance, economics, ceremony write ops)
// require `Authorization: Bearer <token>`.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Response from `GET /api/v1/node/info`.
 *
 * Fields mirror the JSON returned by `node::node_info` in
 * node/src/api/node.rs.
 */
export const NodeInfoSchema = z.object({
  /** Hex-encoded first 4 bytes of the node ID (truncated for display). */
  node_id: z.string(),
  /** Numeric node ID from config (1, 2, 3, ...). */
  node_id_num: z.number(),
  /** Crate version (e.g. "0.1.75"). */
  version: z.string(),
  /** Protocol version (e.g. "4.0.0"). */
  protocol_version: z.string(),
  /** Node uptime in seconds. */
  uptime_seconds: z.number(),
  /** Current peer count. */
  peers: z.number(),
  /** Number of finalized events in the local event store. */
  finalized_height: z.number(),
  /** Number of registered shards (typically 6). */
  shard_count: z.number(),
  /** P2P listen multiaddr (e.g. "/ip4/0.0.0.0/udp/4001/quic-v1"). */
  listen_addr: z.string(),
  /** On-disk data directory path. */
  data_dir: z.string(),
});

export const PeerSchema = z.object({
  peer_id: z.string(),
  address: z.string(),
  /** Unix timestamp (seconds) when the peer connected. */
  connected_at: z.number(),
});

export const PeerListSchema = z.object({
  peers: z.array(PeerSchema),
  count: z.number(),
});

/**
 * Response from `GET /api/v1/economics/balance/:did`.
 *
 * Returns 404 with `{error, did}` if the DID is not registered.
 */
export const BalanceSchema = z.object({
  did: z.string(),
  balance: z.number(),
  monthly_quota: z.number(),
  current_epoch: z.number(),
  is_registered: z.boolean(),
});

/**
 * Response from `POST /api/v1/economics/transfer`.
 *
 * Note: UBC is soulbound — the "transfer" actually spends (burns) the
 * tokens from the sender's balance rather than moving them to a recipient.
 */
export const TransferResultSchema = z.object({
  status: z.string(),
  from_did: z.string(),
  to_did: z.string(),
  amount: z.number(),
  new_balance: z.number(),
  note: z.string().optional(),
});

/**
 * Response from `POST /api/v1/events`.
 */
export const SubmitEventResultSchema = z.object({
  event_id: z.string(),
  status: z.string(),
});

/**
 * Response from `GET /api/v1/events/:id` AND items in `GET /api/v1/events`.
 */
export const StoredEventSchema = z.object({
  id: z.string(),
  creator: z.string(),
  sequence: z.number(),
  /** Unix-millisecond timestamp. */
  timestamp: z.number(),
  /** Hex-encoded payload (may be empty). */
  payload: z.string(),
  event_type: z.string(),
  status: z.string(),
});

/** Envelope returned by `GET /api/v1/events?limit=N`. */
export const EventListSchema = z.object({
  events: z.array(StoredEventSchema),
  count: z.number(),
  total_in_store: z.number(),
});

/**
 * Response from `POST /api/v1/governance/proposals`.
 */
export const CreateProposalResultSchema = z.object({
  id: z.string(),
  status: z.string(),
  created_at_epoch: z.number(),
  expires_at_epoch: z.number(),
});

/**
 * Response from `POST /api/v1/governance/vote`.
 */
export const CastVoteResultSchema = z.object({
  status: z.string(),
  proposal_id: z.string(),
  did: z.string(),
  choice: z.string(),
  effective_weight: z.number(),
  epoch: z.number(),
});

/**
 * A governance proposal (item in the list returned by
 * `GET /api/v1/governance/proposals`).
 *
 * The server enriches each proposal with a derived `status` field
 * ("voting" / "expired" / "passed") and a precomputed
 * `total_participation` for client convenience.
 */
export const ProposalSchema = z.object({
  id: z.string(),
  description: z.string(),
  created_at_epoch: z.number(),
  expires_at_epoch: z.number(),
  votes_for: z.number(),
  votes_against: z.number(),
  votes_abstain: z.number(),
  execution_time: z.number().nullable(),
  status: z.string(),
  total_participation: z.number(),
});

/** Envelope returned by `GET /api/v1/governance/proposals`. */
export const ProposalListSchema = z.object({
  proposals: z.array(ProposalSchema),
  count: z.number(),
});

/** A UBC spend record (item in the transfers history list). */
export const TransferRecordSchema = z.object({
  id: z.string(),
  from_did: z.string(),
  to_did: z.string(),
  amount: z.number(),
  /** Unix-millisecond timestamp. */
  timestamp: z.number(),
  status: z.string(),
  new_balance: z.number(),
});

/** Envelope returned by `GET /api/v1/economics/transfers?limit=N`. */
export const TransferListSchema = z.object({
  transfers: z.array(TransferRecordSchema),
  count: z.number(),
  total_in_history: z.number(),
});

/** A validator (item in the validators list). */
export const ValidatorSchema = z.object({
  /** Hex-encoded NodeId (32 bytes / 64 hex chars). */
  node_id: z.string(),
  stake: z.number(),
  slash_points: z.number(),
  is_jailed: z.boolean(),
  /** Derived: "active" / "slashed" / "jailed". */
  status: z.string(),
  current_round: z.number(),
});

/** Envelope returned by `GET /api/v1/validators`. */
export const ValidatorListSchema = z.object({
  validators: z.array(ValidatorSchema),
  count: z.number(),
  active_count: z.number(),
  jailed_count: z.number(),
  total_stake: z.number(),
  current_round: z.number(),
});

// ────────────────────────────────────────────────────────────────────────────
// Ceremony (ZK trusted setup)
// ────────────────────────────────────────────────────────────────────────────

/** Response from `GET /api/v1/ceremony/state`. */
export const CeremonyStateSchema = z.object({
  /** Current ceremony phase: "waiting", "collecting", "finalized", etc. */
  phase: z.string(),
  /** Number of contributions received so far. */
  contribution_count: z.number(),
  /** Minimum participants required to finalize. */
  min_participants: z.number(),
  /** Maximum participants allowed. */
  max_participants: z.number(),
  /** Hex-encoded SRS transcript hash (first 8 bytes). */
  transcript_hash: z.string(),
});

/** A single contribution entry in the ceremony transcript. */
export const CeremonyContributionSchema = z.object({
  index: z.number(),
  /** Hex-encoded hash of the contributor's public key or contribution. */
  contributor_hash: z.string().optional(),
  /** Hex-encoded hash of the SRS state after this contribution. */
  transcript_hash: z.string().optional(),
  /** Unix timestamp (seconds) when the contribution was received. */
  timestamp: z.number().optional(),
});

/** Response from `GET /api/v1/ceremony/transcript`. */
export const CeremonyTranscriptSchema = z.object({
  contributions: z.array(CeremonyContributionSchema),
  count: z.number(),
  finalized: z.boolean().optional(),
});

/** Response from `POST /api/v1/ceremony/contribute`. */
export const ContributeResultSchema = z.object({
  contribution_index: z.number(),
  transcript_hash: z.string(),
  message: z.string(),
});

/** Response from `POST /api/v1/ceremony/finalize`. */
export const FinalizeResultSchema = z.object({
  status: z.string().optional(),
  message: z.string().optional(),
  final_hash: z.string().optional(),
}).catchall(z.unknown());

// ────────────────────────────────────────────────────────────────────────────
// Shard operations (universal)
// ────────────────────────────────────────────────────────────────────────────

/** Request body for `POST /api/v1/shards/:shard_id/operations`. */
export const ShardOperationRequestSchema = z.object({
  operation: z.string(),
  params: z.record(z.string(), z.unknown()),
});

/** Response from `POST /api/v1/shards/:shard_id/operations`. */
export const ShardOperationResultSchema = z.object({
  status: z.string(),
  shard_id: z.string().optional(),
  operation: z.string().optional(),
  note: z.string().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
}).catchall(z.unknown());

// ────────────────────────────────────────────────────────────────────────────
// Public health endpoints
// ────────────────────────────────────────────────────────────────────────────

export const HealthSchema = z.object({
  node_id: z.number().optional(),
  status: z.string().optional(),
  uptime_seconds: z.number().optional(),
});

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type NodeInfo = z.infer<typeof NodeInfoSchema>;
export type Peer = z.infer<typeof PeerSchema>;
export type Balance = z.infer<typeof BalanceSchema>;
export type TransferResult = z.infer<typeof TransferResultSchema>;
export type SubmitEventResult = z.infer<typeof SubmitEventResultSchema>;
export type StoredEvent = z.infer<typeof StoredEventSchema>;
export type Proposal = z.infer<typeof ProposalSchema>;
export type TransferRecord = z.infer<typeof TransferRecordSchema>;
export type Validator = z.infer<typeof ValidatorSchema>;
export type CreateProposalResult = z.infer<typeof CreateProposalResultSchema>;
export type CastVoteResult = z.infer<typeof CastVoteResultSchema>;
export type CeremonyState = z.infer<typeof CeremonyStateSchema>;
export type CeremonyContribution = z.infer<typeof CeremonyContributionSchema>;
export type CeremonyTranscript = z.infer<typeof CeremonyTranscriptSchema>;
export type ContributeResult = z.infer<typeof ContributeResultSchema>;
export type FinalizeResult = z.infer<typeof FinalizeResultSchema>;
export type ShardOperationResult = z.infer<typeof ShardOperationResultSchema>;

// ────────────────────────────────────────────────────────────────────────────
// API Client
// ────────────────────────────────────────────────────────────────────────────

/**
 * Structured API error with HTTP status, code category, and the server's
 * error message (if any). Thrown by `APIClient.request()` instead of a
 * plain `Error` so callers can branch on `err.kind` to render appropriate
 * inline UI (e.g. "DID not registered → click Register" for NOT_FOUND).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly kind: 'network' | 'auth' | 'forbidden' | 'not_found' | 'not_implemented' | 'server' | 'unknown';
  readonly serverMessage: string | undefined;

  constructor(status: number, statusText: string, serverMessage?: string) {
    const detail = serverMessage ? `: ${serverMessage}` : '';
    super(`API Error: ${status} ${statusText}${detail}`);
    this.name = 'ApiError';
    this.status = status;
    this.serverMessage = serverMessage;
    this.kind =
      status === 0 ? 'network' :
      status === 401 ? 'auth' :
      status === 403 ? 'forbidden' :
      status === 404 ? 'not_found' :
      status === 405 || status === 501 ? 'not_implemented' :
      status >= 500 ? 'server' :
      'unknown';
  }
}

/**
 * Convenience predicate — true if the error is a 404 from the node.
 * Useful for showing "not registered, click here to register" UI.
 */
export function isNotFound(err: unknown): boolean {
  return err instanceof ApiError && err.kind === 'not_found';
}

/**
 * Convenience predicate — true if the error indicates the caller is not
 * in `OMNIA_AUTHORIZED_CALLERS` (admin operations only).
 */
export function isForbidden(err: unknown): boolean {
  return err instanceof ApiError && err.kind === 'forbidden';
}

/**
 * Thin REST client for the Omnia node HTTP API.
 *
 * All paths are prefixed with `/api/v1`. The `token` is sent as a
 * `Authorization: Bearer <token>` header on every request — public
 * endpoints tolerate (and ignore) the header, so it's safe to always
 * include it.
 *
 * Endpoint coverage (matches omnia-node v0.1.76+):
 * - Public reads:  /healthz, /api/v1/node/info, /api/v1/node/peers,
 *                  /api/v1/validators, /api/v1/errors,
 *                  /api/v1/ceremony/state, /api/v1/ceremony/transcript
 * - Authenticated: /api/v1/events (POST/GET), /api/v1/events/:id,
 *                  /api/v1/shards/:id/operations (POST),
 *                  /api/v1/governance/proposals (POST/GET),
 *                  /api/v1/governance/vote (POST),
 *                  /api/v1/economics/balance/:did,
 *                  /api/v1/economics/transfer (POST),
 *                  /api/v1/economics/transfers (GET),
 *                  /api/v1/ceremony/contribute (POST),
 *                  /api/v1/ceremony/finalize (POST)
 */
export class APIClient {
  private endpoint: string;
  private token: string;

  constructor(endpoint: string, token: string) {
    // Strip trailing slash so `new URL(path, endpoint)` composes correctly.
    this.endpoint = endpoint.replace(/\/+$/, '');
    this.token = token;
  }

  private async request<T>(
    path: string,
    schema: z.ZodSchema<T>,
    init?: RequestInit,
  ): Promise<T> {
    const url = `${this.endpoint}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      });
    } catch (e) {
      // Network-level failure (DNS, connection refused, CORS, etc.)
      throw new ApiError(0, 'Network error', e instanceof Error ? e.message : String(e));
    }

    if (!response.ok) {
      // Try to extract a structured error message from the node's JSON body.
      let serverMessage: string | undefined;
      try {
        const body = await response.json();
        serverMessage = body?.error ?? undefined;
      } catch {
        /* response had no JSON body — fall through to status text */
      }
      throw new ApiError(response.status, response.statusText, serverMessage);
    }

    const data = await response.json();
    return schema.parse(data);
  }

  // ──────────────────────────────────────────────────────────────────────
  // Public endpoints (no JWT required, but we send it anyway)
  // ──────────────────────────────────────────────────────────────────────

  /** `GET /healthz` — Kubernetes liveness probe. */
  async getHealth(): Promise<unknown> {
    return this.request('/healthz', HealthSchema);
  }

  /** `GET /api/v1/node/info` — node identity, version, uptime, shard count. */
  async getNodeInfo(): Promise<NodeInfo> {
    return this.request('/api/v1/node/info', NodeInfoSchema);
  }

  /** `GET /api/v1/node/peers` — connected peer multiaddresses. */
  async getPeers(): Promise<Peer[]> {
    const result = await this.request('/api/v1/node/peers', PeerListSchema);
    return result.peers;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Events
  // ──────────────────────────────────────────────────────────────────────

  /** `POST /api/v1/events` — submit a signed consensus event. */
  async submitEvent(payload: string, eventType: string = 'generic'): Promise<SubmitEventResult> {
    return this.request('/api/v1/events', SubmitEventResultSchema, {
      method: 'POST',
      body: JSON.stringify({ payload, event_type: eventType }),
    });
  }

  /** `GET /api/v1/events/:id` — fetch a stored event by hex ID. */
  async getEvent(id: string): Promise<StoredEvent> {
    return this.request(`/api/v1/events/${encodeURIComponent(id)}`, StoredEventSchema);
  }

  /**
   * `GET /api/v1/events?limit=N` — list recent events, newest first.
   *
   * The server returns events in reverse insertion order (most-recent first).
   * `limit` defaults to 100 on the server and is capped at 1000.
   */
  async getEvents(limit: number = 100): Promise<StoredEvent[]> {
    const result = await this.request(
      `/api/v1/events?limit=${Math.max(1, Math.min(1000, limit))}`,
      EventListSchema,
    );
    return result.events;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Economics
  // ──────────────────────────────────────────────────────────────────────

  /** `GET /api/v1/economics/balance/:did` — UBC balance + monthly quota. */
  async getBalance(did: string): Promise<Balance> {
    return this.request(
      `/api/v1/economics/balance/${encodeURIComponent(did)}`,
      BalanceSchema,
    );
  }

  /** `POST /api/v1/economics/transfer` — spend UBC (soulbound: tokens are burned, not moved). */
  async transferUbic(fromDid: string, toDid: string, amount: number): Promise<TransferResult> {
    return this.request('/api/v1/economics/transfer', TransferResultSchema, {
      method: 'POST',
      body: JSON.stringify({ from_did: fromDid, to_did: toDid, amount }),
    });
  }

  /**
   * `GET /api/v1/economics/transfers?limit=N` — list recent UBC spend records.
   *
   * Returns newest-first. Only successful spends are recorded server-side;
   * failed transfers are never appended to the history.
   */
  async getTransfers(limit: number = 50): Promise<TransferRecord[]> {
    const result = await this.request(
      `/api/v1/economics/transfers?limit=${Math.max(1, Math.min(1000, limit))}`,
      TransferListSchema,
    );
    return result.transfers;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Governance
  // ──────────────────────────────────────────────────────────────────────

  /** `POST /api/v1/governance/proposals` — create a new proposal. */
  async createProposal(
    id: string,
    description: string,
    expiresAtEpoch: number,
  ): Promise<CreateProposalResult> {
    return this.request('/api/v1/governance/proposals', CreateProposalResultSchema, {
      method: 'POST',
      body: JSON.stringify({ id, description, expires_at_epoch: expiresAtEpoch }),
    });
  }

  /**
   * `POST /api/v1/governance/vote` — cast a vote.
   *
   * `choice` must be one of `"for"`, `"against"`, `"abstain"` (case-insensitive).
   * The node derives the voter DID from the JWT `sub` claim, so the `did`
   * field in the request body is ignored — but we still send it for API
   * compatibility (the schema requires it).
   */
  async voteOnProposal(
    proposalId: string,
    choice: 'for' | 'against' | 'abstain',
  ): Promise<CastVoteResult> {
    return this.request('/api/v1/governance/vote', CastVoteResultSchema, {
      method: 'POST',
      body: JSON.stringify({
        did: '', // server derives from JWT — field is required by schema but ignored
        proposal_id: proposalId,
        choice,
      }),
    });
  }

  /** `GET /api/v1/governance/proposals` — list all governance proposals. */
  async getProposals(): Promise<Proposal[]> {
    const result = await this.request(
      '/api/v1/governance/proposals',
      ProposalListSchema,
    );
    return result.proposals;
  }

  // ──────────────────────────────────────────────────────────────────────
  // Validators
  // ──────────────────────────────────────────────────────────────────────

  /** `GET /api/v1/validators` — list registered validators with slash/jail status. */
  async getValidators(): Promise<Validator[]> {
    const result = await this.request('/api/v1/validators', ValidatorListSchema);
    return result.validators;
  }

  /** `GET /api/v1/validators` (full envelope) — includes aggregate counts. */
  async getValidatorsWithStats(): Promise<{
    validators: Validator[];
    activeCount: number;
    jailedCount: number;
    totalStake: number;
    currentRound: number;
  }> {
    const result = await this.request('/api/v1/validators', ValidatorListSchema);
    return {
      validators: result.validators,
      activeCount: result.active_count,
      jailedCount: result.jailed_count,
      totalStake: result.total_stake,
      currentRound: result.current_round,
    };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Ceremony (ZK trusted setup)
  // ──────────────────────────────────────────────────────────────────────

  /** `GET /api/v1/ceremony/state` — current phase, contribution count, transcript hash. */
  async getCeremonyState(): Promise<CeremonyState> {
    return this.request('/api/v1/ceremony/state', CeremonyStateSchema);
  }

  /** `GET /api/v1/ceremony/transcript` — list of contributions. */
  async getCeremonyTranscript(): Promise<CeremonyTranscript> {
    return this.request('/api/v1/ceremony/transcript', CeremonyTranscriptSchema);
  }

  /**
   * `POST /api/v1/ceremony/contribute` — submit a contribution.
   *
   * The contribution format is defined by the node's `omnia_adapters::setup::Contribution`
   * type. For non-ZK builds, the node returns 501 and this method throws
   * an `ApiError` with `kind === 'not_implemented'`.
   */
  async contributeToCeremony(contribution: unknown): Promise<ContributeResult> {
    return this.request('/api/v1/ceremony/contribute', ContributeResultSchema, {
      method: 'POST',
      body: JSON.stringify({ contribution }),
    });
  }

  /** `POST /api/v1/ceremony/finalize` — finalize the ceremony (admin). */
  async finalizeCeremony(): Promise<FinalizeResult> {
    return this.request('/api/v1/ceremony/finalize', FinalizeResultSchema, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Shard operations (universal)
  // ──────────────────────────────────────────────────────────────────────

  /**
   * `POST /api/v1/shards/:shard_id/operations` — submit an operation to any shard.
   *
   * Privileged operations (`mint`, `advance_epoch`) require the caller's JWT
   * `sub` to appear in the node's `OMNIA_AUTHORIZED_CALLERS` env var. Other
   * operations (`register`, `spend`) only require a valid JWT.
   *
   * Supported `shard_id` values: `economics`, `identity`, `biological`,
   * `computational`, `physical`, `financial`. Only `economics` is fully
   * implemented on the node — others return 501 with a "not yet implemented"
   * message.
   */
  async submitShardOperation(
    shardId: string,
    operation: string,
    params: Record<string, unknown> = {},
  ): Promise<ShardOperationResult> {
    return this.request(
      `/api/v1/shards/${encodeURIComponent(shardId)}/operations`,
      ShardOperationResultSchema,
      {
        method: 'POST',
        body: JSON.stringify({ operation, params }),
      },
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // Admin convenience wrappers (all hit the shards endpoint)
  // ──────────────────────────────────────────────────────────────────────

  /**
   * Register a DID in the economics quota system.
   *
   * Wrapper around `submitShardOperation('economics', 'register', {did})`.
   * After registration, `getBalance(did)` will return 200 instead of 404.
   */
  async registerDid(did: string): Promise<ShardOperationResult> {
    return this.submitShardOperation('economics', 'register', { did });
  }

  /**
   * Mint UBC to a DID. **Privileged** — requires the caller's JWT `sub` to
   * be listed in `OMNIA_AUTHORIZED_CALLERS` on the node.
   */
  async mintUbc(did: string, amount: number): Promise<ShardOperationResult> {
    return this.submitShardOperation('economics', 'mint', { did, amount });
  }

  /**
   * Advance the economics epoch. **Privileged** — requires the caller's
   * JWT `sub` to be listed in `OMNIA_AUTHORIZED_CALLERS` on the node.
   */
  async advanceEpoch(): Promise<ShardOperationResult> {
    return this.submitShardOperation('economics', 'advance_epoch', {});
  }

  /**
   * Spend UBC from a DID via the shards endpoint (alternative to
   * `transferUbic` which goes through `/api/v1/economics/transfer`).
   *
   * This wrapper does NOT record the spend in the transfer history log
   * (only `transferUbic` does). Prefer `transferUbic` for UI flows.
   */
  async spendUbc(did: string, amount: number): Promise<ShardOperationResult> {
    return this.submitShardOperation('economics', 'spend', { did, amount });
  }
}
