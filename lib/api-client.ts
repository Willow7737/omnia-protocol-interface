import { z } from 'zod';

// API Response Types
export const NodeStatusSchema = z.object({
  node_id: z.string(),
  version: z.string(),
  status: z.enum(['running', 'syncing', 'stopped']),
  uptime: z.number(),
  peer_count: z.number(),
  latest_block: z.number(),
  latest_block_hash: z.string(),
  latest_block_time: z.string(),
});

export const PeerSchema = z.object({
  peer_id: z.string(),
  address: z.string(),
  version: z.string(),
  latency: z.number(),
  last_seen: z.string(),
});

export const ProposalSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  proposer: z.string(),
  status: z.enum(['pending', 'voting', 'passed', 'failed', 'executed']),
  created_at: z.string(),
  deadline: z.string(),
  yes_votes: z.number(),
  no_votes: z.number(),
  abstain_votes: z.number(),
});

export const ValidatorSchema = z.object({
  address: z.string(),
  moniker: z.string(),
  voting_power: z.string(),
  commission: z.string(),
  status: z.enum(['active', 'inactive', 'slashed']),
  slashing_events: z.number(),
});

export const BalanceSchema = z.object({
  address: z.string(),
  balance: z.string(),
  delegated: z.string(),
  unbonding: z.string(),
});

export const TransferSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  amount: z.string(),
  timestamp: z.string(),
  status: z.enum(['pending', 'confirmed', 'failed']),
});

export const EventSchema = z.object({
  id: z.string(),
  event_type: z.string(),
  source: z.string(),
  timestamp: z.string(),
  data: z.record(z.unknown()),
});

export type NodeStatus = z.infer<typeof NodeStatusSchema>;
export type Peer = z.infer<typeof PeerSchema>;
export type Proposal = z.infer<typeof ProposalSchema>;
export type Validator = z.infer<typeof ValidatorSchema>;
export type Balance = z.infer<typeof BalanceSchema>;
export type Transfer = z.infer<typeof TransferSchema>;
export type Event = z.infer<typeof EventSchema>;

export class APIClient {
  private endpoint: string;
  private token: string;

  constructor(endpoint: string, token: string) {
    this.endpoint = endpoint;
    this.token = token;
  }

  private async request<T>(path: string, schema: z.ZodSchema): Promise<T> {
    const url = new URL(path, this.endpoint).toString();
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return schema.parse(data);
  }

  async getNodeStatus(): Promise<NodeStatus> {
    return this.request('/api/node/status', NodeStatusSchema);
  }

  async getPeers(): Promise<Peer[]> {
    return this.request('/api/node/peers', z.array(PeerSchema));
  }

  async getProposals(): Promise<Proposal[]> {
    return this.request('/api/governance/proposals', z.array(ProposalSchema));
  }

  async getProposal(id: string): Promise<Proposal> {
    return this.request(`/api/governance/proposals/${id}`, ProposalSchema);
  }

  async getValidators(): Promise<Validator[]> {
    return this.request('/api/economics/validators', z.array(ValidatorSchema));
  }

  async getValidator(address: string): Promise<Validator> {
    return this.request(`/api/economics/validators/${address}`, ValidatorSchema);
  }

  async getBalance(address: string): Promise<Balance> {
    return this.request(`/api/economics/balances/${address}`, BalanceSchema);
  }

  async getTransfers(limit: number = 50): Promise<Transfer[]> {
    return this.request(`/api/economics/transfers?limit=${limit}`, z.array(TransferSchema));
  }

  async getEvents(limit: number = 100): Promise<Event[]> {
    return this.request(`/api/events?limit=${limit}`, z.array(EventSchema));
  }

  async voteOnProposal(proposalId: string, vote: 'yes' | 'no' | 'abstain'): Promise<{ success: boolean; txHash: string }> {
    const url = new URL(`/api/governance/proposals/${proposalId}/vote`, this.endpoint).toString();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vote }),
    });

    if (!response.ok) {
      throw new Error(`Vote failed: ${response.status}`);
    }

    return response.json();
  }
}
