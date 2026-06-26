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
 * Response from `GET /api/v1/events/:id`.
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
export type CreateProposalResult = z.infer<typeof CreateProposalResultSchema>;
export type CastVoteResult = z.infer<typeof CastVoteResultSchema>;

// ────────────────────────────────────────────────────────────────────────────
// API Client
// ────────────────────────────────────────────────────────────────────────────

/**
 * Thin REST client for the Omnia node HTTP API.
 *
 * All paths are prefixed with `/api/v1`. The `token` is sent as a
 * `Authorization: Bearer <token>` header on every request — public
 * endpoints tolerate (and ignore) the header, so it's safe to always
 * include it.
 *
 * Endpoints that the node does not yet expose (list validators, list
 * transfers, list proposals, list events) return an empty array with a
 * console warning so the UI can render the "no data" state without
 * throwing. They are marked `TODO(node)` in the source.
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
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });

    if (!response.ok) {
      // Try to extract a structured error message from the node's JSON body.
      let detail = '';
      try {
        const body = await response.json();
        detail = body?.error ? `: ${body.error}` : '';
      } catch {
        /* response had no JSON body — fall through to status text */
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}${detail}`);
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
   * TODO(node): list-events endpoint is not yet exposed by the node.
   * The node only exposes `POST /api/v1/events` and `GET /api/v1/events/:id`.
   * Until the list endpoint is added, this returns an empty array so the
   * Events page renders the "no events found" empty state instead of 404ing.
   */
  async getEvents(_limit: number = 100): Promise<StoredEvent[]> {
    console.warn(
      '[omnia] APIClient.getEvents: node does not yet expose a list endpoint — returning []',
    );
    return [];
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
   * TODO(node): list-transfers endpoint is not yet exposed by the node.
   * Returns [] so the Economics page renders its empty state.
   */
  async getTransfers(_limit: number = 50): Promise<TransferResult[]> {
    console.warn(
      '[omnia] APIClient.getTransfers: node does not yet expose a list endpoint — returning []',
    );
    return [];
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

  /**
   * TODO(node): list-proposals endpoint is not yet exposed by the node.
   * Returns [] so the Governance page renders its empty state.
   */
  async getProposals(): Promise<CreateProposalResult[]> {
    console.warn(
      '[omnia] APIClient.getProposals: node does not yet expose a list endpoint — returning []',
    );
    return [];
  }

  // ──────────────────────────────────────────────────────────────────────
  // Validators
  // ──────────────────────────────────────────────────────────────────────

  /**
   * TODO(node): list-validators endpoint is not yet exposed by the node.
   * Returns [] so the Validators page renders its empty state.
   */
  async getValidators(): Promise<unknown[]> {
    console.warn(
      '[omnia] APIClient.getValidators: node does not yet expose a validators endpoint — returning []',
    );
    return [];
  }
}
