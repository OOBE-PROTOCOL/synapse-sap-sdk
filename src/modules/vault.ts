/**
 * @module vault
 * @description Encrypted memory vault — init, session management, inscribe,
 * delegate access, nonce rotation, and close operations.
 *
 * Vaults provide encrypted, session-scoped memory storage for agents,
 * with support for epoch-based pagination and hot-wallet delegation.
 *
 * @category Modules
 * @since v0.1.0
 * @packageDocumentation
 */

import { SystemProgram, type PublicKey, type TransactionSignature } from "@solana/web3.js";
import { BaseModule } from "./base";
import {
  deriveAgent,
  deriveVault,
  deriveSession,
  deriveEpochPage,
  deriveVaultDelegate,
  deriveGlobalRegistry,
} from "../pda";
import type {
  MemoryVaultData,
  SessionLedgerData,
  EpochPageData,
  VaultDelegateData,
  InscribeMemoryArgs,
  CompactInscribeArgs,
} from "../types";

/**
 * @name VaultModule
 * @description Manages encrypted memory vaults for the Solana Agent Protocol.
 *   Provides methods to initialise vaults, open/close sessions, inscribe
 *   encrypted data, manage delegates (hot wallets), rotate nonces, and
 *   fetch all related account types.
 *
 * @category Modules
 * @since v0.1.0
 * @extends BaseModule
 *
 * @example
 * ```ts
 * const sap = new SapClient(provider);
 * // Initialize a vault
 * await sap.vault.initVault([...nonce]);
 * // Open a session and inscribe data
 * await sap.vault.openSession([...sessionHash]);
 * ```
 */
export class VaultModule extends BaseModule {
  // ── PDA helpers ──────────────────────────────────────

  /**
   * @name deriveVault
   * @description Derive the `MemoryVault` PDA for a given agent.
   * @param agentPda - The agent account PDA.
   * @returns A tuple of `[PublicKey, bump]` for the vault PDA.
   * @see {@link deriveVault} from `pda/` module for the underlying derivation.
   * @since v0.1.0
   */
  deriveVault(agentPda: PublicKey): readonly [PublicKey, number] {
    return deriveVault(agentPda);
  }

  /**
   * @name deriveSession
   * @description Derive the `SessionLedger` PDA for a given vault and session hash.
   * @param vaultPda - The memory vault PDA.
   * @param sessionHash - A unique session identifier (32 bytes).
   * @returns A tuple of `[PublicKey, bump]` for the session PDA.
   * @see {@link deriveSession} from `pda/` module for the underlying derivation.
   * @since v0.1.0
   */
  deriveSession(
    vaultPda: PublicKey,
    sessionHash: Uint8Array,
  ): readonly [PublicKey, number] {
    return deriveSession(vaultPda, sessionHash);
  }

  // ── Vault Lifecycle ──────────────────────────────────

  /**
   * @name initVault
   * @description Initialize an encrypted memory vault for the caller's agent.
   *   Creates the `MemoryVault` PDA and sets the initial encryption nonce.
   * @param vaultNonce - The initial encryption nonce (byte array).
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async initVault(vaultNonce: number[]): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [vaultPda] = deriveVault(agentPda);
    const [globalPda] = deriveGlobalRegistry();

    return this.methods
      .initVault(vaultNonce)
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        vault: vaultPda,
        globalRegistry: globalPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * @name openSession
   * @description Open a new session within a vault. Creates a `SessionLedger`
   *   PDA identified by the session hash.
   * @param sessionHash - A unique session identifier (byte array).
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async openSession(
    sessionHash: number[],
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [vaultPda] = deriveVault(agentPda);
    const [sessionPda] = deriveSession(vaultPda, new Uint8Array(sessionHash));

    return this.methods
      .openSession(sessionHash)
      .accounts({
        wallet: this.walletPubkey,
        vault: vaultPda,
        session: sessionPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * @name inscribe
   * @description Inscribe encrypted data into the transaction log.
   *   Account resolution is handled by Anchor via remaining accounts.
   * @param args - Inscription parameters (sequence, encrypted data, nonce, content hash, fragments, compression, epoch).
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async inscribe(args: InscribeMemoryArgs): Promise<TransactionSignature> {
    // Session PDA is passed via remaining accounts resolution by Anchor
    // For now, we build accounts manually

    return this.methods
      .inscribeMemory(
        args.sequence,
        args.encryptedData,
        args.nonce,
        args.contentHash,
        args.totalFragments,
        args.fragmentIndex,
        args.compression,
        args.epochIndex,
      )
      .rpc();
  }

  /**
   * @name inscribeWithAccounts
   * @description Full inscribe with explicit session and epoch page PDAs.
   *   Use this when you need manual control over account resolution.
   * @param sessionPda - The session ledger PDA.
   * @param epochPagePda - The epoch page PDA for the target epoch.
   * @param vaultPda - The memory vault PDA.
   * @param args - Inscription parameters.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async inscribeWithAccounts(
    sessionPda: PublicKey,
    epochPagePda: PublicKey,
    vaultPda: PublicKey,
    args: InscribeMemoryArgs,
  ): Promise<TransactionSignature> {
    return this.methods
      .inscribeMemory(
        args.sequence,
        args.encryptedData,
        args.nonce,
        args.contentHash,
        args.totalFragments,
        args.fragmentIndex,
        args.compression,
        args.epochIndex,
      )
      .accounts({
        wallet: this.walletPubkey,
        vault: vaultPda,
        session: sessionPda,
        epochPage: epochPagePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * @name compactInscribe
   * @description Simplified inscription (4 args vs 8) for single-fragment writes.
   * @param sessionPda - The session ledger PDA.
   * @param vaultPda - The memory vault PDA.
   * @param args - Compact inscription parameters (sequence, encrypted data, nonce, content hash).
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async compactInscribe(
    sessionPda: PublicKey,
    vaultPda: PublicKey,
    args: CompactInscribeArgs,
  ): Promise<TransactionSignature> {
    return this.methods
      .compactInscribe(
        args.sequence,
        args.encryptedData,
        args.nonce,
        args.contentHash,
      )
      .accounts({
        wallet: this.walletPubkey,
        vault: vaultPda,
        session: sessionPda,
      })
      .rpc();
  }

  /**
   * @name closeSession
   * @description Close a session — no more inscriptions will be allowed.
   * @param vaultPda - The memory vault PDA.
   * @param sessionPda - The session ledger PDA to close.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async closeSession(
    vaultPda: PublicKey,
    sessionPda: PublicKey,
  ): Promise<TransactionSignature> {
    return this.methods
      .closeSession()
      .accounts({
        wallet: this.walletPubkey,
        vault: vaultPda,
        session: sessionPda,
      })
      .rpc();
  }

  /**
   * @name closeVault
   * @description Close the `MemoryVault` PDA and reclaim rent to the owner wallet.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async closeVault(): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [vaultPda] = deriveVault(agentPda);

    return this.methods
      .closeVault()
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        vault: vaultPda,
      })
      .rpc();
  }

  /**
   * @name closeSessionPda
   * @description Close a `SessionLedger` PDA (session must be closed first).
   *   Reclaims rent to the owner wallet.
   * @param vaultPda - The memory vault PDA.
   * @param sessionPda - The session ledger PDA to close.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async closeSessionPda(
    vaultPda: PublicKey,
    sessionPda: PublicKey,
  ): Promise<TransactionSignature> {
    return this.methods
      .closeSessionPda()
      .accounts({
        wallet: this.walletPubkey,
        vault: vaultPda,
        session: sessionPda,
      })
      .rpc();
  }

  /**
   * @name closeEpochPage
   * @description Close an `EpochPage` PDA and reclaim rent.
   * @param sessionPda - The session ledger PDA that owns this epoch page.
   * @param epochIndex - The zero-based epoch index.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async closeEpochPage(
    sessionPda: PublicKey,
    epochIndex: number,
  ): Promise<TransactionSignature> {
    const [epochPda] = deriveEpochPage(sessionPda, epochIndex);

    return this.methods
      .closeEpochPage(epochIndex)
      .accounts({
        wallet: this.walletPubkey,
        session: sessionPda,
        epochPage: epochPda,
      })
      .rpc();
  }

  /**
   * @name rotateNonce
   * @description Rotate the vault encryption nonce. All future inscriptions
   *   will use the new nonce.
   * @param newNonce - The replacement nonce (byte array).
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async rotateNonce(
    newNonce: number[],
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [vaultPda] = deriveVault(agentPda);

    return this.methods
      .rotateVaultNonce(newNonce)
      .accounts({
        wallet: this.walletPubkey,
        vault: vaultPda,
      })
      .rpc();
  }

  // ── Delegation ───────────────────────────────────────

  /**
   * @name addDelegate
   * @description Authorize a delegate (hot wallet) for vault operations.
   *   Creates a `VaultDelegate` PDA with the specified permissions and expiry.
   * @param delegatePubkey - The public key of the delegate wallet to authorize.
   * @param permissions - Bitmask of permitted operations.
   * @param expiresAt - Unix timestamp when delegation expires.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async addDelegate(
    delegatePubkey: PublicKey,
    permissions: number,
    expiresAt: number | bigint,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [vaultPda] = deriveVault(agentPda);
    const [delegatePda] = deriveVaultDelegate(vaultPda, delegatePubkey);

    return this.methods
      .addVaultDelegate(permissions, this.bn(expiresAt))
      .accounts({
        wallet: this.walletPubkey,
        vault: vaultPda,
        delegate: delegatePda,
        delegateWallet: delegatePubkey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * @name revokeDelegate
   * @description Revoke a delegate’s authorization, closing their `VaultDelegate` PDA.
   * @param delegatePubkey - The public key of the delegate wallet to revoke.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async revokeDelegate(
    delegatePubkey: PublicKey,
  ): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [vaultPda] = deriveVault(agentPda);
    const [delegatePda] = deriveVaultDelegate(vaultPda, delegatePubkey);

    return this.methods
      .revokeVaultDelegate()
      .accounts({
        wallet: this.walletPubkey,
        vault: vaultPda,
        delegate: delegatePda,
      })
      .rpc();
  }

  /**
   * @name inscribeDelegated
   * @description Inscribe data via an authorized delegate (hot wallet).
   *   The transaction is signed by the delegate instead of the vault owner.
   * @param delegateWallet - The delegate wallet public key.
   * @param vaultPda - The memory vault PDA.
   * @param sessionPda - The session ledger PDA.
   * @param epochPagePda - The epoch page PDA.
   * @param args - Inscription parameters.
   * @returns {Promise<TransactionSignature>} The transaction signature.
   * @since v0.1.0
   */
  async inscribeDelegated(
    delegateWallet: PublicKey,
    vaultPda: PublicKey,
    sessionPda: PublicKey,
    epochPagePda: PublicKey,
    args: InscribeMemoryArgs,
  ): Promise<TransactionSignature> {
    const [delegatePda] = deriveVaultDelegate(vaultPda, delegateWallet);

    return this.methods
      .inscribeMemoryDelegated(
        args.sequence,
        args.encryptedData,
        args.nonce,
        args.contentHash,
        args.totalFragments,
        args.fragmentIndex,
        args.compression,
        args.epochIndex,
      )
      .accounts({
        delegateWallet,
        vault: vaultPda,
        delegateAuth: delegatePda,
        session: sessionPda,
        epochPage: epochPagePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  // ── Fetchers ─────────────────────────────────────────

  /**
   * @name fetchVault
   * @description Fetch a deserialized `MemoryVault` account.
   * @param agentPda - The agent account PDA.
   * @returns {Promise<MemoryVaultData>} The vault account data.
   * @throws Will throw if the vault account does not exist.
   * @since v0.1.0
   */
  async fetchVault(agentPda: PublicKey): Promise<MemoryVaultData> {
    const [pda] = deriveVault(agentPda);
    return this.fetchAccount<MemoryVaultData>("memoryVault", pda);
  }

  /**
   * @name fetchVaultNullable
   * @description Fetch a deserialized `MemoryVault` account, or `null`
   *   if it does not exist on-chain.
   * @param agentPda - The agent account PDA.
   * @returns {Promise<MemoryVaultData | null>} The vault data or `null`.
   * @since v0.1.0
   */
  async fetchVaultNullable(agentPda: PublicKey): Promise<MemoryVaultData | null> {
    const [pda] = deriveVault(agentPda);
    return this.fetchAccountNullable<MemoryVaultData>("memoryVault", pda);
  }

  /**
   * @name fetchSession
   * @description Fetch a deserialized `SessionLedger` account by vault and session hash.
   * @param vaultPda - The memory vault PDA.
   * @param sessionHash - The session identifier used during creation.
   * @returns {Promise<SessionLedgerData>} The session ledger data.
   * @throws Will throw if the session does not exist.
   * @since v0.1.0
   */
  async fetchSession(
    vaultPda: PublicKey,
    sessionHash: Uint8Array,
  ): Promise<SessionLedgerData> {
    const [pda] = deriveSession(vaultPda, sessionHash);
    return this.fetchAccount<SessionLedgerData>("sessionLedger", pda);
  }

  /**
   * @name fetchSessionByPda
   * @description Fetch a deserialized `SessionLedger` account by its PDA directly,
   *   bypassing PDA derivation.
   * @param sessionPda - The session ledger PDA.
   * @returns {Promise<SessionLedgerData>} The session ledger data.
   * @throws Will throw if the session does not exist.
   * @since v0.1.0
   */
  async fetchSessionByPda(sessionPda: PublicKey): Promise<SessionLedgerData> {
    return this.fetchAccount<SessionLedgerData>("sessionLedger", sessionPda);
  }

  /**
   * @name fetchEpochPage
   * @description Fetch a deserialized `EpochPage` account.
   * @param sessionPda - The session ledger PDA.
   * @param epochIndex - The zero-based epoch index.
   * @returns {Promise<EpochPageData>} The epoch page data.
   * @throws Will throw if the epoch page does not exist.
   * @since v0.1.0
   */
  async fetchEpochPage(
    sessionPda: PublicKey,
    epochIndex: number,
  ): Promise<EpochPageData> {
    const [pda] = deriveEpochPage(sessionPda, epochIndex);
    return this.fetchAccount<EpochPageData>("epochPage", pda);
  }

  /**
   * @name fetchDelegate
   * @description Fetch a deserialized `VaultDelegate` account.
   * @param vaultPda - The memory vault PDA.
   * @param delegatePubkey - The delegate wallet public key.
   * @returns {Promise<VaultDelegateData>} The delegate account data.
   * @throws Will throw if the delegate does not exist.
   * @since v0.1.0
   */
  async fetchDelegate(
    vaultPda: PublicKey,
    delegatePubkey: PublicKey,
  ): Promise<VaultDelegateData> {
    const [pda] = deriveVaultDelegate(vaultPda, delegatePubkey);
    return this.fetchAccount<VaultDelegateData>("vaultDelegate", pda);
  }
}
