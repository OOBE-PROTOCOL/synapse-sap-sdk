/**
 * @module vault
 * @description Encrypted memory vault — init, session, inscribe,
 * delegate, nonce rotation, close.
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

export class VaultModule extends BaseModule {
  // ── PDA helpers ──────────────────────────────────────

  deriveVault(agentPda: PublicKey): readonly [PublicKey, number] {
    return deriveVault(agentPda);
  }

  deriveSession(
    vaultPda: PublicKey,
    sessionHash: Uint8Array,
  ): readonly [PublicKey, number] {
    return deriveSession(vaultPda, sessionHash);
  }

  // ── Vault Lifecycle ──────────────────────────────────

  /** Initialize an encrypted memory vault for the caller's agent. */
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

  /** Open a new session within a vault. */
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

  /** Inscribe encrypted data into the transaction log. */
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
   * Full inscribe with explicit session + epoch page PDAs.
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

  /** Simplified inscription (4 args vs 8, single fragment). */
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

  /** Close a session — no more inscriptions allowed. */
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

  /** Close the MemoryVault PDA and reclaim rent. */
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

  /** Close a SessionLedger PDA (session must be closed first). */
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

  /** Close an EpochPage PDA. */
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

  /** Rotate the vault encryption nonce. */
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

  /** Authorize a delegate (hot wallet) for vault operations. */
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

  /** Revoke a delegate's authorization. */
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

  /** Inscribe via an authorized delegate (hot wallet). */
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

  /** Fetch a MemoryVault. */
  async fetchVault(agentPda: PublicKey): Promise<MemoryVaultData> {
    const [pda] = deriveVault(agentPda);
    return this.fetchAccount<MemoryVaultData>("memoryVault", pda);
  }

  /** Fetch a MemoryVault, or `null`. */
  async fetchVaultNullable(agentPda: PublicKey): Promise<MemoryVaultData | null> {
    const [pda] = deriveVault(agentPda);
    return this.fetchAccountNullable<MemoryVaultData>("memoryVault", pda);
  }

  /** Fetch a SessionLedger. */
  async fetchSession(
    vaultPda: PublicKey,
    sessionHash: Uint8Array,
  ): Promise<SessionLedgerData> {
    const [pda] = deriveSession(vaultPda, sessionHash);
    return this.fetchAccount<SessionLedgerData>("sessionLedger", pda);
  }

  /** Fetch a SessionLedger by PDA directly. */
  async fetchSessionByPda(sessionPda: PublicKey): Promise<SessionLedgerData> {
    return this.fetchAccount<SessionLedgerData>("sessionLedger", sessionPda);
  }

  /** Fetch an EpochPage. */
  async fetchEpochPage(
    sessionPda: PublicKey,
    epochIndex: number,
  ): Promise<EpochPageData> {
    const [pda] = deriveEpochPage(sessionPda, epochIndex);
    return this.fetchAccount<EpochPageData>("epochPage", pda);
  }

  /** Fetch a VaultDelegate. */
  async fetchDelegate(
    vaultPda: PublicKey,
    delegatePubkey: PublicKey,
  ): Promise<VaultDelegateData> {
    const [pda] = deriveVaultDelegate(vaultPda, delegatePubkey);
    return this.fetchAccount<VaultDelegateData>("vaultDelegate", pda);
  }
}
