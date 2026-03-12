/**
 * @module attestation
 * @description Web-of-trust attestations — create, revoke, and close
 *   on-chain attestations that vouch for agent trustworthiness.
 *
 * Attestations are signed endorsements from one wallet to an agent,
 * forming a composable trust graph on Solana.
 *
 * @category Modules
 * @since v0.1.0
 * @packageDocumentation
 */

import { SystemProgram, type PublicKey, type TransactionSignature } from "@solana/web3.js";
import { BaseModule } from "./base";
import { deriveAgent, deriveAttestation, deriveGlobalRegistry } from "../pda";
import type { AgentAttestationData, CreateAttestationArgs } from "../types";

/**
 * @name AttestationModule
 * @description Manages on-chain attestations for the Synapse Agent Protocol.
 *   Provides methods to create, revoke, close, and fetch attestation PDAs
 *   that form the web-of-trust layer.
 *
 * @category Modules
 * @since v0.1.0
 * @extends BaseModule
 *
 * @example
 * ```ts
 * const sap = new SapClient(provider);
 * // Create an attestation for an agent
 * const sig = await sap.attestation.create(agentWallet, {
 *   attestationType: { identity: {} },
 *   metadataHash: [...],
 *   expiresAt: null,
 * });
 * ```
 */
export class AttestationModule extends BaseModule {
  // ── PDA helpers ──────────────────────────────────────

  /**
   * @name deriveAttestation
   * @description Derive the `AgentAttestation` PDA for a given agent and attester.
   * @param agentPda - The agent account PDA to attest.
   * @param attester - The attester wallet. Defaults to the connected wallet.
   * @returns A tuple of `[PublicKey, bump]` for the attestation PDA.
   * @see {@link deriveAttestation} from `pda/` module for the underlying derivation.
   * @since v0.1.0
   */
  deriveAttestation(
    agentPda: PublicKey,
    attester?: PublicKey,
  ): readonly [PublicKey, number] {
    return deriveAttestation(agentPda, attester ?? this.walletPubkey);
  }

  // ── Instructions ─────────────────────────────────────

  /**
   * @name create
   * @description Create an on-chain attestation vouching for an agent.
   *   The connected wallet becomes the attester.
   * @param agentWallet - The wallet that owns the target agent.
   * @param args - Attestation parameters (type, metadata hash, optional expiry).
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name revoke
   * @description Revoke a previously issued attestation. Only the original
   *   attester may revoke.
   * @param agentWallet - The wallet of the attested agent.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name close
   * @description Close a revoked attestation PDA and reclaim rent to the attester.
   * @param agentWallet - The wallet of the attested agent.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name fetch
   * @description Fetch a deserialized `AgentAttestation` account.
   * @param agentPda - The agent account PDA.
   * @param attester - The attester wallet. Defaults to the connected wallet.
   * @returns {Promise<AgentAttestationData>} The attestation account data.
   * @throws Will throw if the attestation account does not exist.
   * @since v0.1.0
   */
  async fetch(
    agentPda: PublicKey,
    attester?: PublicKey,
  ): Promise<AgentAttestationData> {
    const [pda] = this.deriveAttestation(agentPda, attester);
    return this.fetchAccount<AgentAttestationData>("agentAttestation", pda);
  }

  /**
   * @name fetchNullable
   * @description Fetch a deserialized `AgentAttestation` account, or `null`
   *   if it does not exist on-chain.
   * @param agentPda - The agent account PDA.
   * @param attester - The attester wallet. Defaults to the connected wallet.
   * @returns {Promise<AgentAttestationData | null>} The attestation data or `null`.
   * @since v0.1.0
   */
  async fetchNullable(
    agentPda: PublicKey,
    attester?: PublicKey,
  ): Promise<AgentAttestationData | null> {
    const [pda] = this.deriveAttestation(agentPda, attester);
    return this.fetchAccountNullable<AgentAttestationData>("agentAttestation", pda);
  }
}
