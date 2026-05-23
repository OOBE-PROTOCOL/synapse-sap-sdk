# SAP SDK v0.18.0 — Skills Directory

> **Complete collection of specialized skills for Synapse Agent Protocol**  
> **Version:** 0.18.0  
> **Treasury:** `J7PyZAGKvprCz4SQ5DKBLAHstJxgVqZcz6kguUoWpP7P`

---

## 📚 Core Skills (5)

### 1. **sap-overview** — Master Reference
- **Use when:** Getting started, understanding SDK structure, PDA derivation
- **Covers:** 13 instruction modules, 22 accounts, 85 instructions
- **Key topics:** Client setup, barrel exports, constants, error handling

### 2. **sap-merchant** — Agent/Merchant Guide
- **Use when:** Registering agents, publishing tools, staking, settling
- **Revenue features:** 0.1 SOL registration, 0.5% settlement fees
- **Key topics:** Agent lifecycle, tool publishing, vault delegates, subscriptions

### 3. **sap-client** — Consumer Guide
- **Use when:** Creating escrows, depositing funds, filing disputes
- **Revenue features:** 0.5% settlement fee auto-collected
- **Key topics:** Agent discovery, escrow V2, x402 payments, dispute resolution

### 4. **sap-memory** — Memory Systems
- **Use when:** On-chain memory, vault management, session ledgers
- **Key topics:** Vault lifecycle, epoch pages, delegation, encryption

### 5. **sap-metaplex** — Metaplex Bridge
- **Use when:** NFT identity, MPL Core integration, EIP-8004
- **Key topics:** AgentIdentity plugin, atomic registration, triple-check audit

---

## 🚀 Advanced Skills (6)

### 6. **sap-advanced** — Production Patterns
- **Use when:** Error handling, treasury tracking, batch operations, multi-agent orchestration
- **Key topics:** 
  - Advanced error handling with typed error classes
  - Real-time treasury monitoring and analytics
  - Batch agent registration and settlement
  - Multi-agent fleet management
  - Enterprise webhook integration
  - Geyser event streaming
  - Performance optimization (connection pooling, CU optimization)

### 7. **sap-defi** — DeFi Integration
- **Use when:** Jupiter swaps, Raydium LP, Marinade staking, yield optimization
- **Key topics:**
  - Jupiter swap + SAP settlement in single tx
  - Liquidity pool management with Raydium
  - Marinade liquid staking rewards
  - Auto-compound yield strategies
  - Multi-sig treasury governance
  - DeFi dashboard integration

### 8. **sap-nft** — NFT & Digital Collectibles
- **Use when:** NFT-gated access, Metaplex Core, royalty distribution
- **Key topics:**
  - NFT-gated agent access control
  - NFT royalty distribution via escrows
  - Metaplex Core asset integration
  - Collectible tool access
  - NFT rental escrows

### 9. **sap-gaming** — GameFi & Play-to-Earn
- **Use when:** P2E rewards, tournament payments, guild treasury, item rentals
- **Key topics:**
  - Play-to-earn reward distribution
  - Tournament prize pools
  - Guild treasury management
  - NFT item rental escrows
  - Multi-player settlement batching

### 10. **sap-social** — Social Media & Creator Economy
- **Use when:** Creator monetization, subscriptions, tipping, influencer programs
- **Key topics:**
  - Subscription tier creation (weekly/monthly/yearly)
  - Recurring revenue claims
  - Micro-tipping system
  - Content gating with escrows
  - Influencer affiliate programs

### 11. **sap-enterprise** — B2B & Enterprise
- **Use when:** B2B escrows, SLA enforcement, multi-sig governance, compliance
- **Key topics:**
  - B2B service escrows with SLA terms
  - SLA penalty enforcement
  - Multi-sig approval flows (Squads integration)
  - Compliance reporting and audit trails
  - Enterprise governance patterns

### 12. **sap-mcp** — Model Context Protocol
- **Use when:** Building MCP servers, LLM integration, AI agent tool servers
- **Key topics:**
  - MCP server setup for SAP tools
  - Exposing SAP instructions via MCP
  - LLM integration with on-chain actions
  - Tool schemas for AI agents
  - MCP client integration

---

## 📊 Usage Matrix

| Use Case | Primary Skill | Secondary Skills |
|----------|--------------|------------------|
| **Register Agent** | sap-merchant | sap-mcp, sap-nft |
| **Create Escrow** | sap-client | sap-enterprise, sap-gaming |
| **Settle Calls** | sap-merchant | sap-defi, sap-advanced |
| **Treasury Tracking** | sap-advanced | sap-enterprise |
| **NFT Integration** | sap-nft | sap-metaplex, sap-gaming |
| **DeFi Operations** | sap-defi | sap-advanced |
| **Subscription Model** | sap-social | sap-merchant |
| **B2B Services** | sap-enterprise | sap-advanced |
| **AI Agent Tools** | sap-mcp | sap-advanced |
| **Memory Systems** | sap-memory | sap-advanced |

---

## 🎯 Revenue Features by Skill

| Skill | Fee Streams | Treasury Integration |
|-------|-------------|---------------------|
| sap-merchant | 0.1 SOL (register), 0.5% (settle) | ✅ Auto-collected |
| sap-client | 0.5% (settle) | ✅ Auto-collected |
| sap-nft | 0.1 SOL (register), 0.5% (royalty settle) | ✅ Auto-collected |
| sap-gaming | 0.5% (reward distribution) | ✅ Auto-collected |
| sap-social | 0.5% (subscription claim) | ✅ Auto-collected |
| sap-enterprise | 0.5% (B2B settlement) | ✅ Auto-collected |
| sap-defi | 0.5% (swap settlement) | ✅ Auto-collected |
| sap-mcp | 0.1 SOL (register via MCP) | ✅ Auto-collected |

---

## 📦 Installation

All skills are included in the SDK:

```bash
npm install @oobe-protocol-labs/synapse-sap-sdk@0.18.0
```

Skills are located in:
```
synapse-sap-sdk/skills/
├── sap-overview/SKILL.md
├── sap-merchant/SKILL.md
├── sap-client/SKILL.md
├── sap-memory/SKILL.md
├── sap-metaplex/SKILL.md
├── sap-advanced/SKILL.md      (NEW)
├── sap-defi/SKILL.md          (NEW)
├── sap-nft/SKILL.md           (NEW)
├── sap-gaming/SKILL.md        (NEW)
├── sap-social/SKILL.md        (NEW)
├── sap-enterprise/SKILL.md    (NEW)
└── sap-mcp/SKILL.md           (NEW)
```

---

## 🔗 Quick Links

- **SDK Documentation:** https://github.com/OOBE-PROTOCOL/synapse-sap-sdk
- **CLI Documentation:** https://github.com/OOBE-PROTOCOL/synapse-sap-sdk/tree/main/cli
- **Treasury Explorer:** https://solscan.io/account/J7PyZAGKvprCz4SQ5DKBLAHstJxgVqZcz6kguUoWpP7P
- **Program Explorer:** https://solscan.io/account/SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ

---

**🚀 12 specialized skills for every SAP use case!**
