/**
 * @module feedback
 * @description Trustless reputation — give, update, revoke, close feedback.
 */

import { SystemProgram, type PublicKey, type TransactionSignature } from "@solana/web3.js";
import { BaseModule } from "./base";
import { deriveAgent, deriveFeedback, deriveGlobalRegistry } from "../pda";
import type { FeedbackAccountData, GiveFeedbackArgs, UpdateFeedbackArgs } from "../types";

export class FeedbackModule extends BaseModule {
  // ── PDA helpers ──────────────────────────────────────

  /** Derive the FeedbackAccount PDA. */
  deriveFeedback(
    agentPda: PublicKey,
    reviewer?: PublicKey,
  ): readonly [PublicKey, number] {
    return deriveFeedback(agentPda, reviewer ?? this.walletPubkey);
  }

  // ── Instructions ─────────────────────────────────────

  /**
   * Leave onchain feedback for an agent.
   * @param agentWallet — the wallet that owns the target agent.
   */
  async give(
    agentWallet: PublicKey,
    args: GiveFeedbackArgs,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [feedbackPda] = this.deriveFeedback(agentPda);
    const [globalPda] = deriveGlobalRegistry();

    return this.methods
      .giveFeedback(args.score, args.tag, args.commentHash ?? null)
      .accounts({
        reviewer: this.walletPubkey,
        agent: agentPda,
        feedback: feedbackPda,
        globalRegistry: globalPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /** Update an existing feedback entry (only original reviewer). */
  async update(
    agentWallet: PublicKey,
    args: UpdateFeedbackArgs,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [feedbackPda] = this.deriveFeedback(agentPda);

    return this.methods
      .updateFeedback(args.newScore, args.newTag ?? null, args.commentHash ?? null)
      .accounts({
        reviewer: this.walletPubkey,
        agent: agentPda,
        feedback: feedbackPda,
      })
      .rpc();
  }

  /** Revoke a feedback entry (marks as revoked, excluded from reputation). */
  async revoke(agentWallet: PublicKey): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [feedbackPda] = this.deriveFeedback(agentPda);

    return this.methods
      .revokeFeedback()
      .accounts({
        reviewer: this.walletPubkey,
        agent: agentPda,
        feedback: feedbackPda,
      })
      .rpc();
  }

  /** Close a revoked feedback PDA (rent returned to reviewer). */
  async close(agentWallet: PublicKey): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [feedbackPda] = this.deriveFeedback(agentPda);

    return this.methods
      .closeFeedback()
      .accounts({
        reviewer: this.walletPubkey,
        feedback: feedbackPda,
      })
      .rpc();
  }

  // ── Fetchers ─────────────────────────────────────────

  /** Fetch a feedback entry. */
  async fetch(agentPda: PublicKey, reviewer?: PublicKey): Promise<FeedbackAccountData> {
    const [pda] = this.deriveFeedback(agentPda, reviewer);
    return this.fetchAccount<FeedbackAccountData>("feedbackAccount", pda);
  }

  /** Fetch a feedback entry, or `null`. */
  async fetchNullable(agentPda: PublicKey, reviewer?: PublicKey): Promise<FeedbackAccountData | null> {
    const [pda] = this.deriveFeedback(agentPda, reviewer);
    return this.fetchAccountNullable<FeedbackAccountData>("feedbackAccount", pda);
  }
}
