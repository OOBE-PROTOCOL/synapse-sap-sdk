/**
 * @module base
 * @description Abstract base class for all SDK modules.
 *
 * Provides shared access to the Anchor program, provider,
 * and typed `fetch` / `fetchNullable` helpers.
 */

import { type AnchorProvider, type Program, BN } from "@coral-xyz/anchor";
import type { PublicKey, TransactionSignature } from "@solana/web3.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SapProgram = Program<any>;

/** Instruction builder return type — a ready-to-send transaction. */
export interface SapTransactionResult {
  readonly signature: TransactionSignature;
}

/**
 * Base module inherited by every domain module.
 * Encapsulates the program reference and common helpers.
 */
export abstract class BaseModule {
  constructor(protected readonly program: SapProgram) {}

  /**
   * Instruction method namespace — bypasses `noUncheckedIndexedAccess`
   * on `Program<any>` where every property is `T | undefined`.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected get methods(): any {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.program.methods;
  }

  /** The AnchorProvider from the program. */
  protected get provider(): AnchorProvider {
    return this.program.provider as AnchorProvider;
  }

  /** Convenience: signer wallet pubkey. */
  protected get walletPubkey(): PublicKey {
    return this.provider.wallet.publicKey;
  }

  /**
   * Generic account fetch — deserializes the account or throws
   * if not found.
   */
  protected async fetchAccount<T>(
    accountName: string,
    address: PublicKey,
  ): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    return (this.program.account as any)[accountName].fetch(address) as Promise<T>;
  }

  /**
   * Generic nullable account fetch — returns `null` if the account
   * does not exist.
   */
  protected async fetchAccountNullable<T>(
    accountName: string,
    address: PublicKey,
  ): Promise<T | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    return (this.program.account as any)[accountName].fetchNullable(address) as Promise<T | null>;
  }

  /**
   * Create a BN from a number or bigint.
   */
  protected bn(value: number | bigint | BN): BN {
    if (BN.isBN(value)) return value;
    return new BN(value.toString());
  }
}
