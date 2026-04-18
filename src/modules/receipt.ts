/**
 * @module receipt
 * @description Receipt-based trustless dispute resolution (v0.7).
 *
 * Agents inscribe merkle roots of call receipt batches on-chain.
 * During disputes, agents submit merkle inclusion proofs to prove delivery.
 * After the proof deadline, anyone can trigger automatic proportional resolution.
 *
 * @category Modules
 * @since v0.7.0
 * @packageDocumentation
 */

import {
  SystemProgram,
  type PublicKey,
  type TransactionSignature,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { BaseModule } from "./base";
import {
  deriveAgent,
  deriveAgentStats,
  deriveEscrowV2,
  derivePendingSettlement as derivePendingPda,
  deriveDispute as deriveDisputePda,
  deriveReceiptBatch as deriveReceiptPda,
} from "../pda";
import type { ReceiptBatchData } from "../types";

/**
 * @name ReceiptModule
 * @description Manages receipt batch inscriptions, merkle proof submissions,
 * and automatic dispute resolution for the v0.7 trustless settlement layer.
 *
 * @category Modules
 * @since v0.7.0
 * @extends BaseModule
 */
export class ReceiptModule extends BaseModule {
  // ── Helpers ──────────────────────────────────────────

  private toNum(v: BN | number | bigint): number {
    return BN.isBN(v) ? v.toNumber() : Number(v);
  }

  // ── PDA helpers ──────────────────────────────────────

  deriveReceiptBatch(
    escrowV2Pda: PublicKey,
    batchIndex: number,
  ): readonly [PublicKey, number] {
    return deriveReceiptPda(escrowV2Pda, batchIndex);
  }

  // ── Instructions ─────────────────────────────────────

  /**
   * Inscribe a receipt batch merkle root on-chain.
   *
   * Called by the **agent** to commit a cryptographic proof of calls delivered.
   * The `merkleRoot` is the root of a merkle tree whose leaves are individual
   * call receipt hashes.
   *
   * @param depositorWallet - The depositor's wallet (needed for escrow PDA derivation).
   * @param nonce           - Escrow nonce.
   * @param batchIndex      - Zero-based batch index (must equal escrow.receipt_batch_count).
   * @param merkleRoot      - 32-byte merkle root of the receipt batch.
   * @param callCount       - Number of calls in the batch.
   * @param periodStart     - Unix timestamp for the start of the covered period.
   * @param periodEnd       - Unix timestamp for the end of the covered period.
   */
  async inscribeReceiptBatch(
    depositorWallet: PublicKey,
    nonce: BN | number | bigint,
    batchIndex: number,
    merkleRoot: number[],
    callCount: BN | number | bigint,
    periodStart: BN | number | bigint,
    periodEnd: BN | number | bigint,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [escrowPda] = deriveEscrowV2(agentPda, depositorWallet, this.toNum(nonce));
    const [receiptPda] = this.deriveReceiptBatch(escrowPda, batchIndex);

    return this.methods
      .inscribeReceiptBatch(
        batchIndex,
        merkleRoot,
        this.bn(callCount),
        this.bn(periodStart),
        this.bn(periodEnd),
      )
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        escrow: escrowPda,
        receiptBatch: receiptPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * Submit a merkle inclusion proof during a dispute.
   *
   * Called by the **agent** to prove delivery of specific calls.
   * Each proof verifies that a set of receipt hashes are included
   * in the previously inscribed merkle root.
   *
   * @param depositorWallet - The depositor's wallet.
   * @param nonce           - Escrow nonce.
   * @param settlementIndex - Index of the disputed pending settlement.
   * @param batchIndex      - Receipt batch index containing the proof.
   * @param provenCount     - Number of calls proven in this proof submission.
   * @param proof           - Array of 32-byte merkle proof hashes.
   * @param leaf            - The 32-byte leaf hash being proven.
   */
  async submitReceiptProof(
    depositorWallet: PublicKey,
    nonce: BN | number | bigint,
    settlementIndex: BN | number | bigint,
    batchIndex: number,
    provenCount: BN | number | bigint,
    proof: number[][],
    leaf: number[],
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [escrowPda] = deriveEscrowV2(agentPda, depositorWallet, this.toNum(nonce));
    const [pendingPda] = derivePendingPda(escrowPda, this.toNum(settlementIndex));
    const [disputePda] = deriveDisputePda(pendingPda);
    const [receiptPda] = this.deriveReceiptBatch(escrowPda, batchIndex);

    return this.methods
      .submitReceiptProof(
        batchIndex,
        this.bn(provenCount),
        proof,
        leaf,
      )
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        escrow: escrowPda,
        pendingSettlement: pendingPda,
        dispute: disputePda,
        receiptBatch: receiptPda,
      })
      .rpc();
  }

  /**
   * Trigger automatic dispute resolution after the proof deadline.
   *
   * Permissionless crank — anyone can call this once the deadline has passed.
   * Resolution is proportional: if the agent proved N of M claimed calls,
   * N/M of the settlement amount goes to the agent, the rest is refunded.
   *
   * @param agentWallet     - The agent's wallet.
   * @param depositorWallet - The depositor's wallet.
   * @param nonce           - Escrow nonce.
   * @param settlementIndex - Index of the disputed pending settlement.
   */
  async autoResolveDispute(
    agentWallet: PublicKey,
    depositorWallet: PublicKey,
    nonce: BN | number | bigint,
    settlementIndex: BN | number | bigint,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = deriveEscrowV2(agentPda, depositorWallet, this.toNum(nonce));
    const [pendingPda] = derivePendingPda(escrowPda, this.toNum(settlementIndex));
    const [disputePda] = deriveDisputePda(pendingPda);
    const [statsPda] = deriveAgentStats(agentPda);

    return this.methods
      .autoResolveDispute()
      .accounts({
        payer: this.walletPubkey,
        depositor: depositorWallet,
        agentWallet,
        escrow: escrowPda,
        pendingSettlement: pendingPda,
        dispute: disputePda,
        agentStats: statsPda,
      })
      .rpc();
  }

  // ── Fetchers ─────────────────────────────────────────

  async fetchReceiptBatch(
    escrowV2Pda: PublicKey,
    batchIndex: number,
  ): Promise<ReceiptBatchData> {
    const [pda] = this.deriveReceiptBatch(escrowV2Pda, batchIndex);
    return this.fetchAccount<ReceiptBatchData>("receiptBatch", pda);
  }

  async fetchReceiptBatchNullable(
    escrowV2Pda: PublicKey,
    batchIndex: number,
  ): Promise<ReceiptBatchData | null> {
    const [pda] = this.deriveReceiptBatch(escrowV2Pda, batchIndex);
    return this.fetchAccountNullable<ReceiptBatchData>("receiptBatch", pda);
  }
}
