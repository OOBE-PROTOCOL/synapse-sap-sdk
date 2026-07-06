/**
 * @module receipt
 * @description Receipt-batch and receipt-proof helpers for DisputeWindow escrow resolution.
 */

import {
  Ed25519Program,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  type AccountMeta,
  type PublicKey,
  type TransactionInstruction,
  type TransactionSignature,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { BaseModule } from "./base";
import {
  deriveAgent,
  deriveAgentStats,
  deriveDispute,
  deriveEscrowV2,
  derivePendingSettlement,
  deriveReceiptBatch,
  deriveStake,
} from "../pda";
import { SAP_PROGRAM_ID } from "../constants";
import type { ReceiptBatchData } from "../types";

const RECEIPT_SIGNATURE_DOMAIN = Buffer.from("SAP_RECEIPT_V1", "utf8");

type Bytes32Like = Uint8Array | Buffer | number[];
type SignatureLike = Uint8Array | Buffer | number[];

export interface SubmitReceiptProofArgs {
  readonly depositor: PublicKey;
  readonly escrowNonce: BN | number | bigint;
  readonly batchIndex: number;
  readonly settlementIndex: BN | number | bigint;
  readonly receiptHashes: readonly Bytes32Like[];
  readonly merkleProofs: readonly (readonly Bytes32Like[])[];
  readonly depositorSignatures: readonly SignatureLike[];
  readonly agentSignatures: readonly SignatureLike[];
  readonly agentWallet?: PublicKey;
}

function toSeed(v: BN | number | bigint): number | bigint {
  return BN.isBN(v) ? BigInt(v.toString()) : v;
}

function bytes(input: Bytes32Like, expectedLen: number, label: string): Buffer {
  const out = Buffer.from(input);
  if (out.length !== expectedLen) {
    throw new Error(`${label} must be ${expectedLen} bytes, got ${out.length}`);
  }
  return out;
}

export function buildReceiptSignatureMessage(args: {
  readonly programId?: PublicKey;
  readonly escrow: PublicKey;
  readonly pendingSettlement: PublicKey;
  readonly dispute: PublicKey;
  readonly receiptHash: Bytes32Like;
}): Buffer {
  return Buffer.concat([
    RECEIPT_SIGNATURE_DOMAIN,
    (args.programId ?? SAP_PROGRAM_ID).toBuffer(),
    args.escrow.toBuffer(),
    args.pendingSettlement.toBuffer(),
    args.dispute.toBuffer(),
    bytes(args.receiptHash, 32, "receiptHash"),
  ]);
}

export class ReceiptModule extends BaseModule {
  deriveReceiptBatch(
    escrowV2Pda: PublicKey,
    batchIndex: number,
  ): readonly [PublicKey, number] {
    return deriveReceiptBatch(escrowV2Pda, batchIndex);
  }

  async inscribeReceiptBatch(args: {
    readonly depositor: PublicKey;
    readonly escrowNonce: BN | number | bigint;
    readonly batchIndex: number;
    readonly merkleRoot: Bytes32Like;
    readonly callCount: number;
    readonly periodStart: BN | number | bigint;
    readonly periodEnd: BN | number | bigint;
  }): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(this.walletPubkey);
    const [escrowPda] = deriveEscrowV2(agentPda, args.depositor, toSeed(args.escrowNonce));
    const [receiptBatchPda] = deriveReceiptBatch(escrowPda, args.batchIndex);

    return this.methods
      .inscribeReceiptBatch(
        args.batchIndex,
        Array.from(bytes(args.merkleRoot, 32, "merkleRoot")),
        args.callCount,
        this.bn(args.periodStart),
        this.bn(args.periodEnd),
      )
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        escrow: escrowPda,
        receiptBatch: receiptBatchPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async submitReceiptProof(args: SubmitReceiptProofArgs): Promise<TransactionSignature> {
    if (args.receiptHashes.length === 0) {
      throw new Error("submitReceiptProof: receiptHashes must be non-empty");
    }
    if (args.receiptHashes.length !== args.merkleProofs.length) {
      throw new Error("submitReceiptProof: receiptHashes and merkleProofs length mismatch");
    }
    if (args.receiptHashes.length !== args.depositorSignatures.length) {
      throw new Error("submitReceiptProof: one depositor signature is required per receipt hash");
    }
    if (args.receiptHashes.length !== args.agentSignatures.length) {
      throw new Error("submitReceiptProof: one agent signature is required per receipt hash");
    }

    const agentWallet = args.agentWallet ?? this.walletPubkey;
    const [agentPda] = deriveAgent(agentWallet);
    const [escrowPda] = deriveEscrowV2(agentPda, args.depositor, toSeed(args.escrowNonce));
    const [receiptBatchPda] = deriveReceiptBatch(escrowPda, args.batchIndex);
    const [pendingPda] = derivePendingSettlement(escrowPda, toSeed(args.settlementIndex));
    const [disputePda] = deriveDispute(pendingPda);

    const receiptHashes = args.receiptHashes.map((h, i) =>
      Array.from(bytes(h, 32, `receiptHashes[${i}]`)),
    );
    const merkleProofs = args.merkleProofs.map((proof, i) =>
      proof.map((node, j) => Array.from(bytes(node, 32, `merkleProofs[${i}][${j}]`))),
    );

    const preInstructions: TransactionInstruction[] = [];
    for (let i = 0; i < args.receiptHashes.length; i += 1) {
      const message = buildReceiptSignatureMessage({
        programId: this.program.programId,
        escrow: escrowPda,
        pendingSettlement: pendingPda,
        dispute: disputePda,
        receiptHash: args.receiptHashes[i],
      });
      preInstructions.push(
        Ed25519Program.createInstructionWithPublicKey({
          publicKey: args.depositor.toBytes(),
          message,
          signature: bytes(args.depositorSignatures[i], 64, `depositorSignatures[${i}]`),
        }),
        Ed25519Program.createInstructionWithPublicKey({
          publicKey: agentWallet.toBytes(),
          message,
          signature: bytes(args.agentSignatures[i], 64, `agentSignatures[${i}]`),
        }),
      );
    }

    return this.methods
      .submitReceiptProof(receiptHashes, merkleProofs)
      .accounts({
        wallet: this.walletPubkey,
        agent: agentPda,
        escrow: escrowPda,
        receiptBatch: receiptBatchPda,
        pendingSettlement: pendingPda,
        dispute: disputePda,
      })
      .remainingAccounts([
        {
          pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
          isSigner: false,
          isWritable: false,
        },
      ])
      .preInstructions(preInstructions)
      .rpc();
  }

  async autoResolveDispute(args: {
    readonly depositor: PublicKey;
    readonly agentWallet: PublicKey;
    readonly escrowNonce: BN | number | bigint;
    readonly settlementIndex: BN | number | bigint;
    readonly splAccounts?: AccountMeta[];
  }): Promise<TransactionSignature> {
    const [agentPda] = deriveAgent(args.agentWallet);
    const [escrowPda] = deriveEscrowV2(agentPda, args.depositor, toSeed(args.escrowNonce));
    const [pendingPda] = derivePendingSettlement(escrowPda, toSeed(args.settlementIndex));
    const [disputePda] = deriveDispute(pendingPda);
    const [agentStatsPda] = deriveAgentStats(agentPda);
    const [agentStakePda] = deriveStake(agentPda);

    return this.methods
      .autoResolveDispute()
      .accounts({
        payer: this.walletPubkey,
        depositor: args.depositor,
        agentWallet: args.agentWallet,
        escrow: escrowPda,
        pendingSettlement: pendingPda,
        dispute: disputePda,
        agentStats: agentStatsPda,
        agentStake: agentStakePda,
      })
      .remainingAccounts(args.splAccounts ?? [])
      .rpc();
  }

  async fetchReceiptBatch(
    escrowV2Pda: PublicKey,
    batchIndex: number,
  ): Promise<ReceiptBatchData> {
    const [pda] = deriveReceiptBatch(escrowV2Pda, batchIndex);
    return this.fetchAccount<ReceiptBatchData>("receiptBatch", pda);
  }

  async fetchReceiptBatchNullable(
    escrowV2Pda: PublicKey,
    batchIndex: number,
  ): Promise<ReceiptBatchData | null> {
    const [pda] = deriveReceiptBatch(escrowV2Pda, batchIndex);
    return this.fetchAccountNullable<ReceiptBatchData>("receiptBatch", pda);
  }
}
