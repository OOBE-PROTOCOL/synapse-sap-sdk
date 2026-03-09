/**
 * @module attestation
 * @description Web of trust — create, revoke, close attestations.
 */

import { SystemProgram, type PublicKey, type TransactionSignature } from "@solana/web3.js";
import { BaseModule } from "./base";
import { deriveAgent, deriveAttestation, deriveGlobalRegistry } from "../pda";
import type { AgentAttestationData, CreateAttestationArgs } from "../types";

export class AttestationModule extends BaseModule {
  // ── PDA helpers ──────────────────────────────────────

  /** Derive the AgentAttestation PDA. */
  deriveAttestation(
    agentPda: PublicKey,
    attester?: PublicKey,
  ): readonly [PublicKey, number] {
    return deriveAttestation(agentPda, attester ?? this.walletPubkey);
  }

  // ── Instructions ─────────────────────────────────────

  /** Create an attestation vouching for an agent. */
  async create(
    agentWallet: PublicKey,
    args: CreateAttestationArgs,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [attestPda] = this.deriveAttestation(agentPda);
    const [globalPda] = deriveGlobalRegistry();

    return this.methods
      .createAttestation(args.attestationType, args.metadataHash, args.expiresAt)
      .accounts({
        attester: this.walletPubkey,
        agent: agentPda,
        attestation: attestPda,
        globalRegistry: globalPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /** Revoke a previously issued attestation (only original attester). */
  async revoke(agentWallet: PublicKey): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [attestPda] = this.deriveAttestation(agentPda);

    return this.methods
      .revokeAttestation()
      .accounts({
        attester: this.walletPubkey,
        attestation: attestPda,
      })
      .rpc();
  }

  /** Close a revoked attestation PDA (rent returned to attester). */
  async close(agentWallet: PublicKey): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [attestPda] = this.deriveAttestation(agentPda);
    const [globalPda] = deriveGlobalRegistry();

    return this.methods
      .closeAttestation()
      .accounts({
        attester: this.walletPubkey,
        attestation: attestPda,
        globalRegistry: globalPda,
      })
      .rpc();
  }

  // ── Fetchers ─────────────────────────────────────────

  /** Fetch an attestation. */
  async fetch(
    agentPda: PublicKey,
    attester?: PublicKey,
  ): Promise<AgentAttestationData> {
    const [pda] = this.deriveAttestation(agentPda, attester);
    return this.fetchAccount<AgentAttestationData>("agentAttestation", pda);
  }

  /** Fetch an attestation, or `null`. */
  async fetchNullable(
    agentPda: PublicKey,
    attester?: PublicKey,
  ): Promise<AgentAttestationData | null> {
    const [pda] = this.deriveAttestation(agentPda, attester);
    return this.fetchAccountNullable<AgentAttestationData>("agentAttestation", pda);
  }
}
