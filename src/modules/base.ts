/**
 * @module base
 * @description Abstract base class for all SDK modules.
 *
 * Provides shared access to the Anchor program, provider,
 * and typed `fetch` / `fetchNullable` helpers.
 *
 * @category Modules
 * @since v0.1.0
 * @packageDocumentation
 */

import { type AnchorProvider, type Program, BN } from "@coral-xyz/anchor";
import type { PublicKey, TransactionSignature } from "@solana/web3.js";

/**
 * Anchor `Program` instance typed for the Synapse Agent SAP IDL.
 *
 * @name SapProgram
 * @description Alias for `Program<any>` — the Anchor program reference
 *   used as the backbone of every module in the SDK.
 * @category Modules
 * @since v0.1.0
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SapProgram = Program<any>;

/**
 * @name SapTransactionResult
 * @description Instruction builder return type — a ready-to-send transaction.
 * Contains the finalized transaction signature after RPC submission.
 * @category Modules
 * @since v0.1.0
 */
export interface SapTransactionResult {
  /** The base-58 encoded transaction signature returned by the RPC node. */
  readonly signature: TransactionSignature;
}

/**
 * @name BaseModule
 * @description Abstract base module inherited by every domain module in the SDK.
 * Encapsulates the Anchor program reference, provider access, and common
 * helpers for account fetching and BN construction.
 *
 * @abstract
 * @category Modules
 * @since v0.1.0
 *
 * @example
 * ```ts
 * class MyModule extends BaseModule {
 *   async doSomething() {
 *     const data = await this.fetchAccount<MyData>("myAccount", pda);
 *   }
 * }
 * ```
 */
export abstract class BaseModule {
  /**
   * Create a new module instance.
   *
   * @param program - The Anchor `Program` instance for the SAP IDL.
   * @protected
   */
  constructor(protected readonly program: SapProgram) {}

  /**
   * @name methods
   * @description Instruction method namespace — bypasses `noUncheckedIndexedAccess`
   *   on `Program<any>` where every property is `T | undefined`.
   *   Used internally by subclasses to build and send instructions.
   * @returns The Anchor program `methods` object for chaining instruction builders.
   * @protected
   * @since v0.1.0
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected get methods(): any {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.program.methods;
  }

  /**
   * @name provider
   * @description The AnchorProvider from the program, giving access to
   *   the connection and wallet for signing transactions.
   * @returns {AnchorProvider} The Anchor provider instance.
   * @protected
   * @since v0.1.0
   */
  protected get provider(): AnchorProvider {
    return this.program.provider as AnchorProvider;
  }

  /**
   * @name walletPubkey
   * @description Convenience accessor for the signer wallet's public key.
   * @returns {PublicKey} The public key of the connected wallet.
   * @protected
   * @since v0.1.0
   */
  protected get walletPubkey(): PublicKey {
    return this.provider.wallet.publicKey;
  }

  /**
   * @name fetchAccount
   * @description Generic account fetch — deserializes the on-chain account
   *   data into the given type `T`, or throws if the account does not exist.
   * @typeParam T - The expected deserialized account data type.
   * @param accountName - The Anchor account discriminator name (e.g. `"agentAccount"`).
   * @param address - The public key of the account to fetch.
   * @returns {Promise<T>} The deserialized account data.
   * @throws Will throw if the account does not exist on-chain.
   * @protected
   * @since v0.1.0
   */
  protected async fetchAccount<T>(
    accountName: string,
    address: PublicKey,
  ): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    return (this.program.account as any)[accountName].fetch(address) as Promise<T>;
  }

  /**
   * @name fetchAccountNullable
   * @description Generic nullable account fetch — deserializes the on-chain
   *   account data into type `T`, or returns `null` if the account does not exist.
   * @typeParam T - The expected deserialized account data type.
   * @param accountName - The Anchor account discriminator name (e.g. `"agentAccount"`).
   * @param address - The public key of the account to fetch.
   * @returns {Promise<T | null>} The deserialized account data, or `null`.
   * @protected
   * @since v0.1.0
   */
  protected async fetchAccountNullable<T>(
    accountName: string,
    address: PublicKey,
  ): Promise<T | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    return (this.program.account as any)[accountName].fetchNullable(address) as Promise<T | null>;
  }

  /**
   * @name bn
   * @description Create an Anchor `BN` from a number, bigint, or existing BN.
   *   Passes through values that are already `BN` instances.
   * @param value - The numeric value to convert.
   * @returns {BN} An Anchor-compatible big number.
   * @protected
   * @since v0.1.0
   */
  protected bn(value: number | bigint | BN): BN {
    if (BN.isBN(value)) return value;
    return new BN(value.toString());
  }
}
