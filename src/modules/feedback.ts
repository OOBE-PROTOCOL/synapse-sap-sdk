/**
 * @module feedback
 * @description Trustless reputation system — give, update, revoke, and close
 *   on-chain feedback entries for agents.
 *
 * Feedback entries are PDA-based reviews tied to an agent and a reviewer wallet,
 * enabling permissionless, verifiable reputation on Solana.
 *
 * @category Modules
 * @since v0.1.0
 * @packageDocumentation
 */

import { SystemProgram, type PublicKey, type TransactionSignature } from "@solana/web3.js";
import { BaseModule } from "./base";
import { deriveAgent, deriveFeedback, deriveGlobalRegistry } from "../pda";
import type { FeedbackAccountData, GiveFeedbackArgs, UpdateFeedbackArgs } from "../types";

/**
 * @name FeedbackModule
 * @description Manages on-chain feedback entries for the Synapse Agent Protocol.
 *   Provides methods to give, update, revoke, close, and fetch feedback PDAs
 *   that form the trustless reputation layer.
 *
 * @category Modules
 * @since v0.1.0
 * @extends BaseModule
 *
 * @example
 * ```ts
 * const sap = new SapClient(provider);
 * const sig = await sap.feedback.give(agentWallet, {
 *   score: 5,
 *   tag: { quality: {} },
 *   commentHash: null,
 * });
 * ```
 */
export class FeedbackModule extends BaseModule {
  // ── PDA helpers ──────────────────────────────────────

  /**
   * @name deriveFeedback
   * @description Derive the `FeedbackAccount` PDA for a given agent and reviewer.
   * @param agentPda - The agent account PDA to review.
   * @param reviewer - The reviewer wallet. Defaults to the connected wallet.
   * @returns A tuple of `[PublicKey, bump]` for the feedback PDA.
   * @see {@link deriveFeedback} from `pda/` module for the underlying derivation.
   * @since v0.1.0
   */
  deriveFeedback(
    agentPda: PublicKey,
    reviewer?: PublicKey,
  ): readonly [PublicKey, number] {
    return deriveFeedback(agentPda, reviewer ?? this.walletPubkey);
  }

  // ── Instructions ─────────────────────────────────────

  /**
   * @name give
   * @description Leave on-chain feedback for an agent. Creates a new
   *   `FeedbackAccount` PDA owned by the reviewer.
   * @param agentWallet - The wallet that owns the target agent.
   * @param args - Feedback parameters (score, tag, optional comment hash).
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
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

  /**
   * @name update
   * @description Update an existing feedback entry. Only the original reviewer
   *   may update their feedback.
   * @param agentWallet - The wallet that owns the target agent.
   * @param args - Updated feedback parameters (new score, optional new tag, optional comment hash).
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name revoke
   * @description Revoke a feedback entry, marking it as revoked and excluding
   *   it from reputation calculations.
   * @param agentWallet - The wallet that owns the target agent.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name close
   * @description Close a revoked feedback PDA and reclaim rent to the reviewer.
   * @param agentWallet - The wallet that owns the target agent.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
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

  /**
   * @name fetch
   * @description Fetch a deserialized `FeedbackAccount`.
   * @param agentPda - The agent account PDA.
   * @param reviewer - The reviewer wallet. Defaults to the connected wallet.
   * @returns {Promise<FeedbackAccountData>} The feedback account data.
   * @throws Will throw if the feedback account does not exist.
   * @since v0.1.0
   */
  async fetch(agentPda: PublicKey, reviewer?: PublicKey): Promise<FeedbackAccountData> {
    const [pda] = this.deriveFeedback(agentPda, reviewer);
    return this.fetchAccount<FeedbackAccountData>("feedbackAccount", pda);
  }

  /**
   * @name fetchNullable
   * @description Fetch a deserialized `FeedbackAccount`, or `null` if it
   *   does not exist on-chain.
   * @param agentPda - The agent account PDA.
   * @param reviewer - The reviewer wallet. Defaults to the connected wallet.
   * @returns {Promise<FeedbackAccountData | null>} The feedback data or `null`.
   * @since v0.1.0
   */
  async fetchNullable(agentPda: PublicKey, reviewer?: PublicKey): Promise<FeedbackAccountData | null> {
    const [pda] = this.deriveFeedback(agentPda, reviewer);
    return this.fetchAccountNullable<FeedbackAccountData>("feedbackAccount", pda);
  }
}
