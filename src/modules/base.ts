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
import {
  decodeAnchorError,
  SapPreflightError,
  throwPredicted,
  SAP_ERROR_BY_NAME,
} from "../utils/anchor-errors";

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

  // ── v0.13.0 preflight helpers ─────────────────────────

  /**
   * @name requireAccountExists
   * @description Fetch a required account; throw a {@link SapPreflightError}
   *   with an actionable message if it does not exist.
   * @typeParam T - Expected account type.
   * @param accountName - Anchor account discriminator name.
   * @param address - PDA to fetch.
   * @param onMissing - `{ predicted, hint }` describing the on-chain rejection
   *   that would otherwise occur.
   * @protected
   * @since v0.13.0
   */
  protected async requireAccountExists<T>(
    accountName: string,
    address: PublicKey,
    onMissing: { predicted: keyof typeof SAP_ERROR_BY_NAME; hint?: string },
  ): Promise<T> {
    const acc = await this.fetchAccountNullable<T>(accountName, address);
    if (acc == null) {
      throwPredicted(onMissing.predicted, onMissing.hint ?? `${accountName} ${address.toBase58()} not found`);
    }
    return acc as T;
  }

  /**
   * @name requireAccountAbsent
   * @description Verify a PDA does not yet exist on-chain. Used before any
   *   `init` instruction to catch `account already in use` early.
   * @protected
   * @since v0.13.0
   */
  protected async requireAccountAbsent(
    accountName: string,
    address: PublicKey,
    hint: string,
  ): Promise<void> {
    const acc = await this.provider.connection.getAccountInfo(address);
    if (acc !== null) {
      throw new SapPreflightError(
        `${accountName} ${address.toBase58()} already exists. ${hint}`,
        0,
        "AccountAlreadyInUse",
        hint,
      );
    }
  }

  /**
   * @name simulateOrThrow
   * @description Run `simulate()` on a method builder. If the simulation
   *   reports a SAP program error, throw it as a {@link SapPreflightError}
   *   with the decoded name + friendly hint *before* the user pays fees.
   *   Returns the simulation logs on success for inspection.
   * @protected
   * @since v0.13.0
   */
  protected async simulateOrThrow(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    builder: any,
    label: string,
  ): Promise<readonly string[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const sim = await builder.simulate();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const logs = (sim?.raw ?? sim?.logs ?? []) as readonly string[];
      return logs;
    } catch (err) {
      const decoded = decodeAnchorError(err);
      if (decoded) {
        throw new SapPreflightError(
          `[${label}] simulation failed: ${decoded.friendly}`,
          decoded.code,
          decoded.name,
          decoded.logs?.slice(0, 6).join(" | "),
        );
      }
      throw err;
    }
  }
}
