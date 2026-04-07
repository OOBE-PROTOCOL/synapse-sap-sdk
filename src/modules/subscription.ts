/**
 * @module subscription
 * @description Agent subscription lifecycle — create, fund, cancel,
 * close, and fetch subscription accounts.
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
import { deriveAgent, deriveSubscription } from "../pda";
import type { SubscriptionData, CreateSubscriptionArgs } from "../types";

/**
 * @name SubscriptionModule
 * @description Manages recurring subscriptions between subscribers and agents.
 *
 * @category Modules
 * @since v0.7.0
 * @extends BaseModule
 */
export class SubscriptionModule extends BaseModule {
  // ── PDA helpers ──────────────────────────────────────

  private toNum(v: BN | number | bigint): number {
    return BN.isBN(v) ? v.toNumber() : Number(v);
  }

  deriveSubscription(
    agentPda: PublicKey,
    subscriber?: PublicKey,
    subId: BN | number | bigint = 0,
  ): readonly [PublicKey, number] {
    return deriveSubscription(
      agentPda,
      subscriber ?? this.walletPubkey,
      this.toNum(subId),
    );
  }

  // ── Instructions ─────────────────────────────────────

  async create(
    agentWallet: PublicKey,
    args: CreateSubscriptionArgs,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [subPda] = this.deriveSubscription(agentPda, undefined, args.subId);

    return this.methods
      .createSubscription(
        this.bn(args.subId),
        this.bn(args.pricePerInterval),
        args.billingInterval,
        this.bn(args.initialFund),
      )
      .accounts({
        subscriber: this.walletPubkey,
        agent: agentPda,
        subscription: subPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async fund(
    agentWallet: PublicKey,
    subId: BN | number | bigint,
    amount: BN | number | bigint,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [subPda] = this.deriveSubscription(agentPda, undefined, subId);

    return this.methods
      .fundSubscription(this.bn(amount))
      .accounts({
        subscriber: this.walletPubkey,
        subscription: subPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async cancel(
    agentWallet: PublicKey,
    subId: BN | number | bigint = 0,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [subPda] = this.deriveSubscription(agentPda, undefined, subId);

    return this.methods
      .cancelSubscription()
      .accounts({
        subscriber: this.walletPubkey,
        agentWallet,
        subscription: subPda,
      })
      .rpc();
  }

  async close(
    agentWallet: PublicKey,
    subId: BN | number | bigint = 0,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(agentWallet);
    const [subPda] = this.deriveSubscription(agentPda, undefined, subId);

    return this.methods
      .closeSubscription()
      .accounts({
        subscriber: this.walletPubkey,
        subscription: subPda,
      })
      .rpc();
  }

  // ── Fetchers ─────────────────────────────────────────

  async fetch(
    agentPda: PublicKey,
    subscriber?: PublicKey,
    subId: BN | number | bigint = 0,
  ): Promise<SubscriptionData> {
    const [pda] = this.deriveSubscription(agentPda, subscriber, subId);
    return this.fetchAccount<SubscriptionData>("subscriptionAccount", pda);
  }

  async fetchNullable(
    agentPda: PublicKey,
    subscriber?: PublicKey,
    subId: BN | number | bigint = 0,
  ): Promise<SubscriptionData | null> {
    const [pda] = this.deriveSubscription(agentPda, subscriber, subId);
    return this.fetchAccountNullable<SubscriptionData>("subscriptionAccount", pda);
  }

  async fetchByPda(subPda: PublicKey): Promise<SubscriptionData> {
    return this.fetchAccount<SubscriptionData>("subscriptionAccount", subPda);
  }
}
