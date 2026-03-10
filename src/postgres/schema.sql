-- ═══════════════════════════════════════════════════════════════════
--  SAP v2 — PostgreSQL Schema
--  Mirrors all 22 on-chain account types as relational tables.
--
--  Program ID: SAPTU7aUXk2AaAdktexae1iuxXpokxzNDBAYYhaVyQL
--  Generated from: synapse_agent_sap IDL (72 instructions, 22 accounts)
--
--  Usage:
--    psql -d your_database -f schema.sql
--
--  Every table includes:
--    - pda (TEXT PRIMARY KEY)     — base58-encoded PDA address
--    - slot (BIGINT)              — Solana slot at which the record was synced
--    - synced_at (TIMESTAMPTZ)    — wall-clock time of sync
--    - raw_data (JSONB)           — full deserialized account data (escape hatch)
-- ═══════════════════════════════════════════════════════════════════

-- ── Enum Types ──────────────────────────────────────

CREATE TYPE sap_token_type AS ENUM ('sol', 'usdc', 'spl');
CREATE TYPE sap_settlement_mode AS ENUM ('instant', 'escrow', 'batched', 'x402');
CREATE TYPE sap_tool_http_method AS ENUM ('get', 'post', 'put', 'delete', 'compound');
CREATE TYPE sap_tool_category AS ENUM (
  'swap', 'lend', 'stake', 'nft', 'payment',
  'data', 'governance', 'bridge', 'analytics', 'custom'
);
CREATE TYPE sap_plugin_type AS ENUM (
  'memory', 'validation', 'delegation',
  'analytics', 'governance', 'custom'
);

-- ═══════════════════════════════════════════════════════════════════
--  1. Global Registry (singleton)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_global_registry (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  total_agents          BIGINT NOT NULL DEFAULT 0,
  active_agents         BIGINT NOT NULL DEFAULT 0,
  total_feedbacks       BIGINT NOT NULL DEFAULT 0,
  total_capabilities    INTEGER NOT NULL DEFAULT 0,
  total_protocols       INTEGER NOT NULL DEFAULT 0,
  last_registered_at    BIGINT,            -- unix timestamp
  initialized_at        BIGINT NOT NULL,
  authority             TEXT NOT NULL,      -- base58 pubkey
  total_tools           INTEGER NOT NULL DEFAULT 0,
  total_vaults          INTEGER NOT NULL DEFAULT 0,
  total_escrows         INTEGER NOT NULL DEFAULT 0,
  total_attestations    INTEGER NOT NULL DEFAULT 0,
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

-- ═══════════════════════════════════════════════════════════════════
--  2. Agent Account
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_agents (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  version               SMALLINT NOT NULL DEFAULT 1,
  wallet                TEXT NOT NULL,      -- owner wallet (base58)
  name                  VARCHAR(64) NOT NULL,
  description           VARCHAR(256) NOT NULL,
  agent_id              VARCHAR(128),
  agent_uri             VARCHAR(256),
  x402_endpoint         VARCHAR(256),
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            BIGINT NOT NULL,
  updated_at            BIGINT NOT NULL,
  reputation_score      SMALLINT NOT NULL DEFAULT 0,
  total_feedbacks       INTEGER NOT NULL DEFAULT 0,
  reputation_sum        BIGINT NOT NULL DEFAULT 0,
  total_calls_served    BIGINT NOT NULL DEFAULT 0,
  avg_latency_ms        INTEGER NOT NULL DEFAULT 0,
  uptime_percent        SMALLINT NOT NULL DEFAULT 0,
  capabilities          JSONB NOT NULL DEFAULT '[]',
  pricing               JSONB NOT NULL DEFAULT '[]',
  protocols             TEXT[] NOT NULL DEFAULT '{}',
  active_plugins        JSONB NOT NULL DEFAULT '[]',
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

CREATE INDEX IF NOT EXISTS idx_sap_agents_wallet ON sap_agents (wallet);
CREATE INDEX IF NOT EXISTS idx_sap_agents_active ON sap_agents (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sap_agents_name ON sap_agents (name);

-- ═══════════════════════════════════════════════════════════════════
--  3. Agent Stats (hot-path metrics)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_agent_stats (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  agent                 TEXT NOT NULL REFERENCES sap_agents(pda) ON DELETE CASCADE,
  wallet                TEXT NOT NULL,
  total_calls_served    BIGINT NOT NULL DEFAULT 0,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  updated_at            BIGINT NOT NULL,
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

CREATE INDEX IF NOT EXISTS idx_sap_agent_stats_agent ON sap_agent_stats (agent);

-- ═══════════════════════════════════════════════════════════════════
--  4. Feedback Account
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_feedbacks (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  agent                 TEXT NOT NULL,      -- agent PDA
  reviewer              TEXT NOT NULL,      -- reviewer wallet (base58)
  score                 SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 1000),
  tag                   VARCHAR(64) NOT NULL,
  comment_hash          BYTEA,             -- 32 bytes, nullable
  created_at            BIGINT NOT NULL,
  updated_at            BIGINT NOT NULL,
  is_revoked            BOOLEAN NOT NULL DEFAULT false,
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

CREATE INDEX IF NOT EXISTS idx_sap_feedbacks_agent ON sap_feedbacks (agent);
CREATE INDEX IF NOT EXISTS idx_sap_feedbacks_reviewer ON sap_feedbacks (reviewer);

-- ═══════════════════════════════════════════════════════════════════
--  5. Capability Index
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_capability_indexes (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  capability_id         VARCHAR(128) NOT NULL,
  capability_hash       BYTEA NOT NULL,    -- 32 bytes
  agents                TEXT[] NOT NULL DEFAULT '{}',
  total_pages           INTEGER NOT NULL DEFAULT 0,
  last_updated          BIGINT NOT NULL,
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

CREATE INDEX IF NOT EXISTS idx_sap_cap_idx_id ON sap_capability_indexes (capability_id);

-- ═══════════════════════════════════════════════════════════════════
--  6. Protocol Index
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_protocol_indexes (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  protocol_id           VARCHAR(128) NOT NULL,
  protocol_hash         BYTEA NOT NULL,    -- 32 bytes
  agents                TEXT[] NOT NULL DEFAULT '{}',
  total_pages           INTEGER NOT NULL DEFAULT 0,
  last_updated          BIGINT NOT NULL,
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

CREATE INDEX IF NOT EXISTS idx_sap_proto_idx_id ON sap_protocol_indexes (protocol_id);

-- ═══════════════════════════════════════════════════════════════════
--  7. Plugin Slot
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_plugin_slots (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  agent                 TEXT NOT NULL,
  plugin_type           sap_plugin_type NOT NULL,
  authority             TEXT NOT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            BIGINT NOT NULL,
  updated_at            BIGINT NOT NULL,
  config_hash           BYTEA,             -- 32 bytes
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

CREATE INDEX IF NOT EXISTS idx_sap_plugin_agent ON sap_plugin_slots (agent);

-- ═══════════════════════════════════════════════════════════════════
--  8. Memory Entry (legacy)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_memory_entries (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  agent                 TEXT NOT NULL,
  entry_hash            BYTEA NOT NULL,    -- 32 bytes
  content_type          VARCHAR(64),
  total_chunks          SMALLINT NOT NULL DEFAULT 0,
  total_size            BIGINT NOT NULL DEFAULT 0,
  ipfs_cid              VARCHAR(128),
  created_at            BIGINT NOT NULL,
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

-- ═══════════════════════════════════════════════════════════════════
--  9. Memory Chunk (legacy)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_memory_chunks (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  entry                 TEXT NOT NULL,      -- memory entry PDA
  chunk_index           SMALLINT NOT NULL,
  data                  BYTEA NOT NULL,
  size                  INTEGER NOT NULL,
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

-- ═══════════════════════════════════════════════════════════════════
--  10. Memory Vault
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_memory_vaults (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  agent                 TEXT NOT NULL,
  wallet                TEXT NOT NULL,
  vault_nonce           BYTEA NOT NULL,    -- 32 bytes
  total_sessions        INTEGER NOT NULL DEFAULT 0,
  total_inscriptions    BIGINT NOT NULL DEFAULT 0,
  total_bytes_inscribed BIGINT NOT NULL DEFAULT 0,
  created_at            BIGINT NOT NULL,
  protocol_version      SMALLINT NOT NULL DEFAULT 1,
  nonce_version         SMALLINT NOT NULL DEFAULT 0,
  last_nonce_rotation   BIGINT,
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

CREATE INDEX IF NOT EXISTS idx_sap_vaults_agent ON sap_memory_vaults (agent);

-- ═══════════════════════════════════════════════════════════════════
--  11. Session Ledger
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_sessions (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  vault                 TEXT NOT NULL,
  session_hash          BYTEA NOT NULL,    -- 32 bytes
  sequence_counter      INTEGER NOT NULL DEFAULT 0,
  total_bytes           BIGINT NOT NULL DEFAULT 0,
  current_epoch         INTEGER NOT NULL DEFAULT 0,
  total_epochs          INTEGER NOT NULL DEFAULT 0,
  created_at            BIGINT NOT NULL,
  last_inscribed_at     BIGINT,
  is_closed             BOOLEAN NOT NULL DEFAULT false,
  merkle_root           BYTEA NOT NULL,    -- 32 bytes
  total_checkpoints     INTEGER NOT NULL DEFAULT 0,
  tip_hash              BYTEA NOT NULL,    -- 32 bytes
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

CREATE INDEX IF NOT EXISTS idx_sap_sessions_vault ON sap_sessions (vault);

-- ═══════════════════════════════════════════════════════════════════
--  12. Epoch Page
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_epoch_pages (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  session               TEXT NOT NULL,
  epoch_index           INTEGER NOT NULL,
  start_sequence        INTEGER NOT NULL,
  inscription_count     INTEGER NOT NULL DEFAULT 0,
  total_bytes           INTEGER NOT NULL DEFAULT 0,
  first_ts              BIGINT NOT NULL,
  last_ts               BIGINT NOT NULL,
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

CREATE INDEX IF NOT EXISTS idx_sap_epoch_session ON sap_epoch_pages (session);

-- ═══════════════════════════════════════════════════════════════════
--  13. Vault Delegate
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_vault_delegates (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  vault                 TEXT NOT NULL,
  delegate              TEXT NOT NULL,      -- delegate wallet (base58)
  permissions           SMALLINT NOT NULL,  -- bitmask
  expires_at            BIGINT NOT NULL,
  created_at            BIGINT NOT NULL,
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

CREATE INDEX IF NOT EXISTS idx_sap_delegates_vault ON sap_vault_delegates (vault);

-- ═══════════════════════════════════════════════════════════════════
--  14. Tool Descriptor
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_tools (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  agent                 TEXT NOT NULL,
  tool_name_hash        BYTEA NOT NULL,    -- 32 bytes
  tool_name             VARCHAR(32) NOT NULL,
  protocol_hash         BYTEA NOT NULL,    -- 32 bytes
  version               SMALLINT NOT NULL DEFAULT 1,
  description_hash      BYTEA NOT NULL,    -- 32 bytes
  input_schema_hash     BYTEA NOT NULL,    -- 32 bytes
  output_schema_hash    BYTEA NOT NULL,    -- 32 bytes
  http_method           sap_tool_http_method NOT NULL,
  category              sap_tool_category NOT NULL,
  params_count          SMALLINT NOT NULL,
  required_params       SMALLINT NOT NULL,
  is_compound           BOOLEAN NOT NULL DEFAULT false,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  total_invocations     BIGINT NOT NULL DEFAULT 0,
  created_at            BIGINT NOT NULL,
  updated_at            BIGINT NOT NULL,
  previous_version      TEXT,              -- previous tool PDA (null if first)
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

CREATE INDEX IF NOT EXISTS idx_sap_tools_agent ON sap_tools (agent);
CREATE INDEX IF NOT EXISTS idx_sap_tools_name ON sap_tools (tool_name);
CREATE INDEX IF NOT EXISTS idx_sap_tools_category ON sap_tools (category);

-- ═══════════════════════════════════════════════════════════════════
--  15. Session Checkpoint
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_checkpoints (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  session               TEXT NOT NULL,
  checkpoint_index      INTEGER NOT NULL,
  merkle_root           BYTEA NOT NULL,    -- 32 bytes
  sequence_at           INTEGER NOT NULL,
  epoch_at              INTEGER NOT NULL,
  total_bytes_at        BIGINT NOT NULL,
  inscriptions_at       BIGINT NOT NULL,
  created_at            BIGINT NOT NULL,
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

CREATE INDEX IF NOT EXISTS idx_sap_checkpoints_session ON sap_checkpoints (session);

-- ═══════════════════════════════════════════════════════════════════
--  16. Escrow Account
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_escrows (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  agent                 TEXT NOT NULL,      -- agent PDA
  depositor             TEXT NOT NULL,      -- depositor wallet (base58)
  agent_wallet          TEXT NOT NULL,      -- agent wallet (base58)
  balance               BIGINT NOT NULL DEFAULT 0,
  total_deposited       BIGINT NOT NULL DEFAULT 0,
  total_settled         BIGINT NOT NULL DEFAULT 0,
  total_calls_settled   BIGINT NOT NULL DEFAULT 0,
  price_per_call        BIGINT NOT NULL,
  max_calls             BIGINT NOT NULL,
  created_at            BIGINT NOT NULL,
  last_settled_at       BIGINT,
  expires_at            BIGINT,
  volume_curve          JSONB NOT NULL DEFAULT '[]',
  token_mint            TEXT,              -- base58, null for SOL
  token_decimals        SMALLINT NOT NULL DEFAULT 9,
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

CREATE INDEX IF NOT EXISTS idx_sap_escrows_agent ON sap_escrows (agent);
CREATE INDEX IF NOT EXISTS idx_sap_escrows_depositor ON sap_escrows (depositor);

-- ═══════════════════════════════════════════════════════════════════
--  17. Tool Category Index
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_tool_category_indexes (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  category              sap_tool_category NOT NULL,
  tools                 TEXT[] NOT NULL DEFAULT '{}',
  total_pages           INTEGER NOT NULL DEFAULT 0,
  last_updated          BIGINT NOT NULL,
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

-- ═══════════════════════════════════════════════════════════════════
--  18. Agent Attestation
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_attestations (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  agent                 TEXT NOT NULL,      -- attested agent PDA
  attester              TEXT NOT NULL,      -- attester wallet (base58)
  attestation_type      VARCHAR(64) NOT NULL,
  metadata_hash         BYTEA NOT NULL,    -- 32 bytes
  is_active             BOOLEAN NOT NULL DEFAULT true,
  expires_at            BIGINT NOT NULL,
  created_at            BIGINT NOT NULL,
  updated_at            BIGINT NOT NULL,
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

CREATE INDEX IF NOT EXISTS idx_sap_attestations_agent ON sap_attestations (agent);
CREATE INDEX IF NOT EXISTS idx_sap_attestations_attester ON sap_attestations (attester);

-- ═══════════════════════════════════════════════════════════════════
--  19. Memory Buffer
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_memory_buffers (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  session               TEXT NOT NULL,
  page_index            INTEGER NOT NULL,
  authority             TEXT NOT NULL,
  data_len              INTEGER NOT NULL DEFAULT 0,
  created_at            BIGINT NOT NULL,
  updated_at            BIGINT NOT NULL,
  data                  BYTEA,
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

-- ═══════════════════════════════════════════════════════════════════
--  20. Memory Digest
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_memory_digests (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  session               TEXT NOT NULL,
  authority             TEXT NOT NULL,
  merkle_root           BYTEA NOT NULL,    -- 32 bytes
  total_entries         INTEGER NOT NULL DEFAULT 0,
  total_data_size       BIGINT NOT NULL DEFAULT 0,
  latest_hash           BYTEA NOT NULL,    -- 32 bytes
  storage_ref           BYTEA,             -- 32 bytes, nullable
  storage_type          SMALLINT,
  created_at            BIGINT NOT NULL,
  updated_at            BIGINT NOT NULL,
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

-- ═══════════════════════════════════════════════════════════════════
--  21. Memory Ledger (★ recommended)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_memory_ledgers (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  session               TEXT NOT NULL,
  authority             TEXT NOT NULL,
  num_entries           INTEGER NOT NULL DEFAULT 0,
  merkle_root           BYTEA NOT NULL,    -- 32 bytes
  latest_hash           BYTEA NOT NULL,    -- 32 bytes
  total_data_size       BIGINT NOT NULL DEFAULT 0,
  created_at            BIGINT NOT NULL,
  updated_at            BIGINT NOT NULL,
  num_pages             INTEGER NOT NULL DEFAULT 0,
  -- ring buffer stored as raw bytes (4096 max)
  ring                  BYTEA,
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

CREATE INDEX IF NOT EXISTS idx_sap_ledgers_session ON sap_memory_ledgers (session);

-- ═══════════════════════════════════════════════════════════════════
--  22. Ledger Page (sealed, permanent)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_ledger_pages (
  pda                   TEXT PRIMARY KEY,
  bump                  SMALLINT NOT NULL,
  ledger                TEXT NOT NULL,
  page_index            INTEGER NOT NULL,
  sealed_at             BIGINT NOT NULL,
  entries_in_page       INTEGER NOT NULL,
  data_size             INTEGER NOT NULL,
  merkle_root_at_seal   BYTEA NOT NULL,    -- 32 bytes
  data                  BYTEA,             -- archived ring buffer bytes
  -- sync metadata
  slot                  BIGINT NOT NULL DEFAULT 0,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data              JSONB
);

CREATE INDEX IF NOT EXISTS idx_sap_ledger_pages_ledger ON sap_ledger_pages (ledger);

-- ═══════════════════════════════════════════════════════════════════
--  Events Log (denormalized event store for audit trail)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_events (
  id                    BIGSERIAL PRIMARY KEY,
  event_name            VARCHAR(64) NOT NULL,
  tx_signature          TEXT NOT NULL,
  slot                  BIGINT NOT NULL,
  block_time            BIGINT,
  data                  JSONB NOT NULL,
  -- derived fields for fast queries
  agent_pda             TEXT,
  wallet                TEXT,
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sap_events_name ON sap_events (event_name);
CREATE INDEX IF NOT EXISTS idx_sap_events_agent ON sap_events (agent_pda) WHERE agent_pda IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sap_events_tx ON sap_events (tx_signature);
CREATE INDEX IF NOT EXISTS idx_sap_events_slot ON sap_events (slot);

-- ═══════════════════════════════════════════════════════════════════
--  Sync Cursor (tracks last synced slot per account type)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sap_sync_cursors (
  account_type          VARCHAR(64) PRIMARY KEY,
  last_slot             BIGINT NOT NULL DEFAULT 0,
  last_signature        TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-populate cursor entries for all account types
INSERT INTO sap_sync_cursors (account_type) VALUES
  ('global_registry'),
  ('agents'),
  ('agent_stats'),
  ('feedbacks'),
  ('capability_indexes'),
  ('protocol_indexes'),
  ('plugin_slots'),
  ('memory_entries'),
  ('memory_chunks'),
  ('memory_vaults'),
  ('sessions'),
  ('epoch_pages'),
  ('vault_delegates'),
  ('tools'),
  ('checkpoints'),
  ('escrows'),
  ('tool_category_indexes'),
  ('attestations'),
  ('memory_buffers'),
  ('memory_digests'),
  ('memory_ledgers'),
  ('ledger_pages'),
  ('events')
ON CONFLICT (account_type) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
--  Useful Views
-- ═══════════════════════════════════════════════════════════════════

-- Active agents with stats
CREATE OR REPLACE VIEW sap_active_agents AS
SELECT
  a.pda,
  a.wallet,
  a.name,
  a.description,
  a.agent_id,
  a.agent_uri,
  a.x402_endpoint,
  a.reputation_score,
  a.total_feedbacks,
  a.total_calls_served,
  a.avg_latency_ms,
  a.uptime_percent,
  a.capabilities,
  a.pricing,
  a.protocols,
  s.total_calls_served AS stats_calls,
  a.created_at,
  a.updated_at
FROM sap_agents a
LEFT JOIN sap_agent_stats s ON s.agent = a.pda
WHERE a.is_active = true;

-- Escrow balances with agent name
CREATE OR REPLACE VIEW sap_escrow_balances AS
SELECT
  e.pda,
  a.name AS agent_name,
  e.agent,
  e.depositor,
  e.balance,
  e.total_deposited,
  e.total_settled,
  e.total_calls_settled,
  e.price_per_call,
  e.max_calls,
  e.expires_at,
  e.token_mint,
  e.token_decimals,
  CASE
    WHEN e.max_calls > 0
    THEN e.max_calls - e.total_calls_settled
    ELSE -1  -- unlimited
  END AS calls_remaining
FROM sap_escrows e
LEFT JOIN sap_agents a ON a.pda = e.agent;

-- Agent tools summary
CREATE OR REPLACE VIEW sap_agent_tools AS
SELECT
  t.pda,
  a.name AS agent_name,
  t.agent,
  t.tool_name,
  t.version,
  t.http_method,
  t.category,
  t.params_count,
  t.required_params,
  t.is_compound,
  t.is_active,
  t.total_invocations,
  t.created_at
FROM sap_tools t
LEFT JOIN sap_agents a ON a.pda = t.agent
WHERE t.is_active = true;
