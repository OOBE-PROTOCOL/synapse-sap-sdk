// Auto-generated from IDL v0.3.0

import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export interface AccountMigratedEvent {
  account: PublicKey;
  account_type: string;
  from_version: number;
  to_version: number;
  timestamp: BN;
}

export interface AgentAccount {
  bump: number;
  version: number;
  wallet: PublicKey;
  name: string;
  description: string;
  agent_id: string | null;
  agent_uri: string | null;
  x402_endpoint: string | null;
  is_active: boolean;
  created_at: BN;
  updated_at: BN;
  reputation_score: number;
  total_feedbacks: number;
  reputation_sum: BN;
  total_calls_served: BN;
  avg_latency_ms: number;
  uptime_percent: number;
  capabilities: Capability[];
  pricing: PricingTier[];
  protocols: string[];
  active_plugins: PluginRef[];
}

export interface AgentAttestation {
  bump: number;
  agent: PublicKey;
  attester: PublicKey;
  attestation_type: string;
  metadata_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  is_active: boolean;
  expires_at: BN;
  created_at: BN;
  updated_at: BN;
}

export interface AgentPricingMenu {
  bump: number;
  agent: PublicKey;
  tiers: PricingTier[];
  updated_at: BN;
}

export interface AgentStake {
  bump: number;
  agent: PublicKey;
  wallet: PublicKey;
  staked_amount: BN;
  slashed_amount: BN;
  last_stake_at: BN;
  unstake_requested_at: BN;
  unstake_amount: BN;
  unstake_available_at: BN;
  total_disputes_won: number;
  total_disputes_lost: number;
  created_at: BN;
}

export interface AgentStats {
  bump: number;
  agent: PublicKey;
  wallet: PublicKey;
  total_calls_served: BN;
  is_active: boolean;
  active_escrows: number;
  updated_at: BN;
}

export interface AttestationCreatedEvent {
  agent: PublicKey;
  attester: PublicKey;
  attestation_type: string;
  expires_at: BN;
  timestamp: BN;
}

export interface AttestationRevokedEvent {
  agent: PublicKey;
  attester: PublicKey;
  attestation_type: string;
  timestamp: BN;
}

export interface BatchSettledEvent {
  escrow: PublicKey;
  agent: PublicKey;
  depositor: PublicKey;
  num_settlements: number;
  total_calls: BN;
  total_amount: BN;
  service_hashes: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number][];
  calls_per_settlement: BN[];
  remaining_balance: BN;
  timestamp: BN;
}

export interface BillingInterval {
}

export interface CallsReportedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  calls_reported: BN;
  total_calls_served: BN;
  timestamp: BN;
}

export interface Capability {
  id: string;
  description: string | null;
  protocol_id: string | null;
  version: string | null;
}

export interface CapabilityIndex {
  bump: number;
  capability_id: string;
  capability_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  agents: PublicKey[];
  total_pages: number;
  last_updated: BN;
}

export interface CheckpointCreatedEvent {
  session: PublicKey;
  checkpoint: PublicKey;
  checkpoint_index: number;
  merkle_root: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  sequence_at: number;
  epoch_at: number;
  timestamp: BN;
}

export interface ClosedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  timestamp: BN;
}

export interface CoSignedSettlementEvent {
  escrow: PublicKey;
  agent: PublicKey;
  depositor: PublicKey;
  co_signer: PublicKey;
  calls_settled: BN;
  amount: BN;
  service_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  timestamp: BN;
}

export interface CounterShard {
  bump: number;
  shard_index: number;
  total_agents: BN;
  active_agents: BN;
  total_feedbacks: BN;
  total_tools: number;
  total_vaults: number;
  total_attestations: number;
  total_settlements: BN;
  total_disputes: number;
  total_subscriptions: number;
  last_updated: BN;
}

export interface DeactivatedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  timestamp: BN;
}

export interface DelegateAddedEvent {
  vault: PublicKey;
  delegate: PublicKey;
  permissions: number;
  expires_at: BN;
  timestamp: BN;
}

export interface DelegateRevokedEvent {
  vault: PublicKey;
  delegate: PublicKey;
  timestamp: BN;
}

export interface DisputeAutoResolvedEvent {
  dispute: PublicKey;
  pending_settlement: PublicKey;
  escrow: PublicKey;
  outcome: number;
  proven_calls: number;
  claimed_calls: number;
  agent_amount: BN;
  depositor_amount: BN;
  slash_amount: BN;
  timestamp: BN;
}

export interface DisputeFiledEvent {
  dispute: PublicKey;
  pending_settlement: PublicKey;
  escrow: PublicKey;
  depositor: PublicKey;
  agent: PublicKey;
  evidence_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  dispute_type: number;
  dispute_bond: BN;
  proof_deadline: BN;
  timestamp: BN;
}

export interface DisputeOutcome {
}

export interface DisputeRecord {
  bump: number;
  pending_settlement: PublicKey;
  escrow: PublicKey;
  depositor: PublicKey;
  agent: PublicKey;
  dispute_type: DisputeType;
  evidence_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  agent_evidence_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  outcome: DisputeOutcome;
  resolution_layer: ResolutionLayer;
  created_at: BN;
  resolved_at: BN;
  resolution_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  slash_amount: BN;
  dispute_bond: BN;
  proven_calls: number;
  claimed_calls: number;
  proof_deadline: BN;
}

export interface DisputeResolvedEvent {
  dispute: PublicKey;
  pending_settlement: PublicKey;
  escrow: PublicKey;
  outcome: number;
  slash_amount: BN;
  resolution_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  timestamp: BN;
}

export interface DisputeType {
}

export interface EpochOpenedEvent {
  session: PublicKey;
  epoch_page: PublicKey;
  epoch_index: number;
  start_sequence: number;
  timestamp: BN;
}

export interface EpochPage {
  bump: number;
  session: PublicKey;
  epoch_index: number;
  start_sequence: number;
  inscription_count: number;
  total_bytes: number;
  first_ts: BN;
  last_ts: BN;
}

export interface EpochPageClosedEvent {
  session: PublicKey;
  epoch_page: PublicKey;
  epoch_index: number;
  timestamp: BN;
}

export interface EscrowAccountV2 {
  bump: number;
  version: number;
  agent: PublicKey;
  depositor: PublicKey;
  agent_wallet: PublicKey;
  escrow_nonce: BN;
  balance: BN;
  total_deposited: BN;
  total_settled: BN;
  total_calls_settled: BN;
  price_per_call: BN;
  max_calls: BN;
  created_at: BN;
  last_settled_at: BN;
  expires_at: BN;
  volume_curve: VolumeCurveBreakpoint[];
  token_mint: PublicKey | null;
  token_decimals: number;
  settlement_security: SettlementSecurity;
  dispute_window_slots: BN;
  settlement_index: BN;
  co_signer: PublicKey | null;
  arbiter: PublicKey | null;
  pending_amount: BN;
  pending_calls: BN;
  receipt_batch_count: number;
  dispute_bond_total: BN;
  max_obligation: BN;
  pending_settlement_count: number;
}

export interface EscrowClosedEvent {
  escrow: PublicKey;
  agent: PublicKey;
  depositor: PublicKey;
  total_settled: BN;
  total_calls_settled: BN;
  timestamp: BN;
}

export interface EscrowCreatedEvent {
  escrow: PublicKey;
  agent: PublicKey;
  depositor: PublicKey;
  price_per_call: BN;
  max_calls: BN;
  initial_deposit: BN;
  expires_at: BN;
  timestamp: BN;
}

export interface EscrowDepositedEvent {
  escrow: PublicKey;
  depositor: PublicKey;
  amount: BN;
  new_balance: BN;
  timestamp: BN;
}

export interface EscrowV2CreatedEvent {
  escrow: PublicKey;
  agent: PublicKey;
  depositor: PublicKey;
  escrow_nonce: BN;
  price_per_call: BN;
  max_calls: BN;
  initial_deposit: BN;
  settlement_security: number;
  dispute_window_slots: BN;
  co_signer: PublicKey | null;
  arbiter: PublicKey | null;
  timestamp: BN;
}

export interface EscrowWithdrawnEvent {
  escrow: PublicKey;
  depositor: PublicKey;
  amount: BN;
  remaining_balance: BN;
  timestamp: BN;
}

export interface FeedbackAccount {
  bump: number;
  agent: PublicKey;
  reviewer: PublicKey;
  score: number;
  tag: string;
  comment_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number] | null;
  created_at: BN;
  updated_at: BN;
  is_revoked: boolean;
}

export interface FeedbackEvent {
  agent: PublicKey;
  reviewer: PublicKey;
  score: number;
  tag: string;
  timestamp: BN;
}

export interface FeedbackRevokedEvent {
  agent: PublicKey;
  reviewer: PublicKey;
  timestamp: BN;
}

export interface FeedbackUpdatedEvent {
  agent: PublicKey;
  reviewer: PublicKey;
  old_score: number;
  new_score: number;
  timestamp: BN;
}

export interface GlobalRegistry {
  bump: number;
  total_agents: BN;
  active_agents: BN;
  total_feedbacks: BN;
  total_capabilities: number;
  total_protocols: number;
  last_registered_at: BN;
  initialized_at: BN;
  authority: PublicKey;
  total_tools: number;
  total_vaults: number;
  total_escrows: number;
  total_attestations: number;
}

export interface IndexPage {
  bump: number;
  parent_index: PublicKey;
  page_index: number;
  entries: PublicKey[];
  last_updated: BN;
}

export interface IndexPageCreatedEvent {
  parent_index: PublicKey;
  index_page: PublicKey;
  page_index: number;
  timestamp: BN;
}

export interface LedgerEntryEvent {
  session: PublicKey;
  ledger: PublicKey;
  entry_index: number;
  data: Buffer;
  content_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  data_len: number;
  merkle_root: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  timestamp: BN;
}

export interface LedgerPage {
  bump: number;
  ledger: PublicKey;
  page_index: number;
  sealed_at: BN;
  entries_in_page: number;
  data_size: number;
  merkle_root_at_seal: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  data: Buffer;
}

export interface LedgerSealedEvent {
  session: PublicKey;
  ledger: PublicKey;
  page: PublicKey;
  page_index: number;
  entries_in_page: number;
  data_size: number;
  merkle_root_at_seal: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  timestamp: BN;
}

export interface MemoryInscribedEvent {
  vault: PublicKey;
  session: PublicKey;
  sequence: number;
  epoch_index: number;
  encrypted_data: Buffer;
  nonce: [number, number, number, number, number, number, number, number, number, number, number, number];
  content_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  total_fragments: number;
  fragment_index: number;
  compression: number;
  data_len: number;
  nonce_version: number;
  timestamp: BN;
}

export interface MemoryLedger {
  bump: number;
  session: PublicKey;
  authority: PublicKey;
  num_entries: number;
  merkle_root: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  latest_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  total_data_size: BN;
  created_at: BN;
  updated_at: BN;
  num_pages: number;
  ring: Buffer;
}

export interface MemoryVault {
  bump: number;
  agent: PublicKey;
  wallet: PublicKey;
  vault_nonce: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  total_sessions: number;
  total_inscriptions: BN;
  total_bytes_inscribed: BN;
  created_at: BN;
  protocol_version: number;
  nonce_version: number;
  last_nonce_rotation: BN;
}

export interface PaymentSettledEvent {
  escrow: PublicKey;
  agent: PublicKey;
  depositor: PublicKey;
  calls_settled: BN;
  amount: BN;
  service_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  total_calls_settled: BN;
  remaining_balance: BN;
  timestamp: BN;
}

export interface PendingSettlement {
  bump: number;
  escrow: PublicKey;
  agent: PublicKey;
  agent_wallet: PublicKey;
  depositor: PublicKey;
  settlement_index: BN;
  calls_to_settle: BN;
  amount: BN;
  service_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  created_at: BN;
  release_slot: BN;
  is_finalized: boolean;
  is_disputed: boolean;
  outcome: DisputeOutcome;
}

export interface PluginRef {
  plugin_type: PluginType;
  pda: PublicKey;
}

export interface PluginType {
}

export interface PricingTier {
  tier_id: string;
  price_per_call: BN;
  min_price_per_call: BN | null;
  max_price_per_call: BN | null;
  rate_limit: number;
  max_calls_per_session: number;
  burst_limit: number | null;
  token_type: TokenType;
  token_mint: PublicKey | null;
  token_decimals: number | null;
  settlement_mode: SettlementMode | null;
  min_escrow_deposit: BN | null;
  batch_interval_sec: number | null;
  volume_curve: VolumeCurveBreakpoint[] | null;
}

export interface ProtocolIndex {
  bump: number;
  protocol_id: string;
  protocol_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  agents: PublicKey[];
  total_pages: number;
  last_updated: BN;
}

export interface ReactivatedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  timestamp: BN;
}

export interface ReceiptBatch {
  bump: number;
  escrow: PublicKey;
  batch_index: number;
  merkle_root: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  call_count: number;
  period_start: BN;
  period_end: BN;
  inscribed_at: BN;
}

export interface ReceiptBatchInscribedEvent {
  escrow: PublicKey;
  agent: PublicKey;
  batch_index: number;
  merkle_root: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  call_count: number;
  period_start: BN;
  period_end: BN;
  timestamp: BN;
}

export interface ReceiptProofSubmittedEvent {
  dispute: PublicKey;
  escrow: PublicKey;
  agent: PublicKey;
  receipts_submitted: number;
  receipts_verified: number;
  total_proven: number;
  timestamp: BN;
}

export interface RegisteredEvent {
  agent: PublicKey;
  wallet: PublicKey;
  name: string;
  capabilities: string[];
  timestamp: BN;
}

export interface ReputationUpdatedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  avg_latency_ms: number;
  uptime_percent: number;
  timestamp: BN;
}

export interface ResolutionLayer {
}

export interface SessionCheckpoint {
  bump: number;
  session: PublicKey;
  checkpoint_index: number;
  merkle_root: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  sequence_at: number;
  epoch_at: number;
  total_bytes_at: BN;
  inscriptions_at: BN;
  created_at: BN;
}

export interface SessionClosedEvent {
  vault: PublicKey;
  session: PublicKey;
  total_inscriptions: number;
  total_bytes: BN;
  total_epochs: number;
  timestamp: BN;
}

export interface SessionLedger {
  bump: number;
  vault: PublicKey;
  session_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  sequence_counter: number;
  total_bytes: BN;
  current_epoch: number;
  total_epochs: number;
  created_at: BN;
  last_inscribed_at: BN;
  is_closed: boolean;
  merkle_root: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  total_checkpoints: number;
  tip_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
}

export interface SessionOpenedEvent {
  vault: PublicKey;
  session: PublicKey;
  session_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  timestamp: BN;
}

export interface SessionPdaClosedEvent {
  vault: PublicKey;
  session: PublicKey;
  total_inscriptions: number;
  total_bytes: BN;
  timestamp: BN;
}

export interface SettlementFinalizedEvent {
  pending_settlement: PublicKey;
  escrow: PublicKey;
  agent: PublicKey;
  amount: BN;
  calls_settled: BN;
  timestamp: BN;
}

export interface SettlementMode {
}

export interface SettlementPendingEvent {
  pending_settlement: PublicKey;
  escrow: PublicKey;
  agent: PublicKey;
  depositor: PublicKey;
  settlement_index: BN;
  calls_to_settle: BN;
  amount: BN;
  service_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  release_slot: BN;
  timestamp: BN;
}

export interface SettlementReceipt {
  bump: number;
  escrow: PublicKey;
  service_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  calls_settled: BN;
  amount: BN;
  settled_at: BN;
}

export interface SettlementSecurity {
}

export interface ShardInitializedEvent {
  shard: PublicKey;
  shard_index: number;
  timestamp: BN;
}

export interface StakeClosedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  returned_lamports: BN;
  timestamp: BN;
}

export interface StakeDepositedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  amount: BN;
  total_staked: BN;
  timestamp: BN;
}

export interface StakeSlashedEvent {
  agent: PublicKey;
  dispute: PublicKey;
  slash_amount: BN;
  remaining_staked: BN;
  compensated_to: PublicKey;
  timestamp: BN;
}

export interface Subscription {
  bump: number;
  agent: PublicKey;
  subscriber: PublicKey;
  agent_wallet: PublicKey;
  sub_id: BN;
  price_per_interval: BN;
  billing_interval: BillingInterval;
  token_mint: PublicKey | null;
  token_decimals: number;
  balance: BN;
  total_paid: BN;
  intervals_paid: number;
  started_at: BN;
  last_claimed_at: BN;
  cancelled_at: BN;
  next_due_at: BN;
  created_at: BN;
}

export interface SubscriptionCancelledEvent {
  subscription: PublicKey;
  agent: PublicKey;
  subscriber: PublicKey;
  refund_amount: BN;
  intervals_used: number;
  timestamp: BN;
}

export interface SubscriptionClaimedEvent {
  subscription: PublicKey;
  agent: PublicKey;
  subscriber: PublicKey;
  amount: BN;
  intervals_paid: number;
  remaining_balance: BN;
  timestamp: BN;
}

export interface SubscriptionCreatedEvent {
  subscription: PublicKey;
  agent: PublicKey;
  subscriber: PublicKey;
  sub_id: BN;
  price_per_interval: BN;
  billing_interval: number;
  initial_deposit: BN;
  timestamp: BN;
}

export interface TokenType {
}

export interface ToolCategory {
}

export interface ToolCategoryIndex {
  bump: number;
  category: number;
  tools: PublicKey[];
  total_pages: number;
  last_updated: BN;
}

export interface ToolClosedEvent {
  agent: PublicKey;
  tool: PublicKey;
  tool_name: string;
  total_invocations: BN;
  timestamp: BN;
}

export interface ToolDeactivatedEvent {
  agent: PublicKey;
  tool: PublicKey;
  tool_name: string;
  timestamp: BN;
}

export interface ToolDescriptor {
  bump: number;
  agent: PublicKey;
  tool_name_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  tool_name: string;
  protocol_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  version: number;
  description_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  input_schema_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  output_schema_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  http_method: ToolHttpMethod;
  category: ToolCategory;
  params_count: number;
  required_params: number;
  is_compound: boolean;
  is_active: boolean;
  total_invocations: BN;
  created_at: BN;
  updated_at: BN;
  previous_version: PublicKey;
}

export interface ToolHttpMethod {
}

export interface ToolInvocationReportedEvent {
  agent: PublicKey;
  tool: PublicKey;
  invocations_reported: BN;
  total_invocations: BN;
  timestamp: BN;
}

export interface ToolPublishedEvent {
  agent: PublicKey;
  tool: PublicKey;
  tool_name: string;
  protocol_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  version: number;
  http_method: number;
  category: number;
  params_count: number;
  required_params: number;
  is_compound: boolean;
  timestamp: BN;
}

export interface ToolReactivatedEvent {
  agent: PublicKey;
  tool: PublicKey;
  tool_name: string;
  timestamp: BN;
}

export interface ToolSchemaInscribedEvent {
  agent: PublicKey;
  tool: PublicKey;
  tool_name: string;
  schema_type: number;
  schema_data: Buffer;
  schema_hash: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  compression: number;
  version: number;
  timestamp: BN;
}

export interface ToolUpdatedEvent {
  agent: PublicKey;
  tool: PublicKey;
  tool_name: string;
  old_version: number;
  new_version: number;
  timestamp: BN;
}

export interface UnstakeCancelledEvent {
  agent: PublicKey;
  wallet: PublicKey;
  cancelled_amount: BN;
  timestamp: BN;
}

export interface UnstakeCompletedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  amount: BN;
  remaining_staked: BN;
  timestamp: BN;
}

export interface UnstakeRequestedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  amount: BN;
  available_at: BN;
  timestamp: BN;
}

export interface UpdatedEvent {
  agent: PublicKey;
  wallet: PublicKey;
  updated_fields: string[];
  timestamp: BN;
}

export interface VaultClosedEvent {
  vault: PublicKey;
  agent: PublicKey;
  wallet: PublicKey;
  total_sessions: number;
  total_inscriptions: BN;
  timestamp: BN;
}

export interface VaultDelegate {
  bump: number;
  vault: PublicKey;
  delegate: PublicKey;
  permissions: number;
  expires_at: BN;
  created_at: BN;
}

export interface VaultInitializedEvent {
  agent: PublicKey;
  vault: PublicKey;
  wallet: PublicKey;
  timestamp: BN;
}

export interface VaultNonceRotatedEvent {
  vault: PublicKey;
  wallet: PublicKey;
  old_nonce: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  new_nonce: [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
  nonce_version: number;
  timestamp: BN;
}

export interface VolumeCurveBreakpoint {
  after_calls: number;
  price_per_call: BN;
}

export interface AgentAccount {
}

export interface AgentAttestation {
}

export interface AgentPricingMenu {
}

export interface AgentStake {
}

export interface AgentStats {
}

export interface CapabilityIndex {
}

export interface CounterShard {
}

export interface DisputeRecord {
}

export interface EpochPage {
}

export interface EscrowAccountV2 {
}

export interface FeedbackAccount {
}

export interface GlobalRegistry {
}

export interface IndexPage {
}

export interface LedgerPage {
}

export interface MemoryLedger {
}

export interface MemoryVault {
}

export interface PendingSettlement {
}

export interface ProtocolIndex {
}

export interface ReceiptBatch {
}

export interface SessionCheckpoint {
}

export interface SessionLedger {
}

export interface SettlementReceipt {
}

export interface Subscription {
}

export interface ToolCategoryIndex {
}

export interface ToolDescriptor {
}

export interface VaultDelegate {
}
