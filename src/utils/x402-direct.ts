/**
 * @module utils/x402-direct
 * @description Recognize x402 direct SPL token payments on an agent's ATA
 * by scanning transaction history and filtering for x402 patterns.
 *
 * @category Utils
 * @since v0.6.4
 */

import {
  type Connection,
  PublicKey,
  type ParsedTransactionWithMeta,
  type ConfirmedSignatureInfo,
} from "@solana/web3.js";
import { sha256 } from "../utils";

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface SettlementPayload
 * @description Settlement metadata from the merchant's PAYMENT-RESPONSE.
 * @category Utils
 * @since v0.6.4
 */
export interface SettlementPayload {
  /** SHA-256 service hash. */
  readonly serviceHash: string;
  /** Resource identifier. */
  readonly resource: string;
  /** Agent wallet (base58). */
  readonly agentWallet: string;
  /** Depositor wallet (base58). */
  readonly depositorWallet: string;
  /** Amount in smallest unit. */
  readonly amount: string;
  /** Service timestamp. */
  readonly timestamp: number;
}

/**
 * @interface X402DirectPayment
 * @description A recognized x402 direct SPL transfer on an agent's ATA.
 * @category Utils
 * @since v0.6.4
 */
export interface X402DirectPayment {
  /** Transaction signature. */
  readonly signature: string;
  /** Transfer amount (in smallest token unit). */
  readonly amount: bigint;
  /** Source ATA (payer). */
  readonly payerAta: PublicKey;
  /** Destination ATA (payTo / agent). */
  readonly payeeAta: PublicKey;
  /** Token mint used for transfer. */
  readonly mint: PublicKey;
  /** Memo data (if a Memo instruction was included). */
  readonly memo: string | null;
  /** Matched settlement payload (if server-side verification is available). */
  readonly settlement: SettlementPayload | null;
  /** Block time (unix seconds). */
  readonly blockTime: number | null;
  /** Slot number. */
  readonly slot: number;
}

/**
 * @interface GetX402DirectOptions
 * @description Options for {@link getX402DirectPayments}.
 * @category Utils
 * @since v0.6.4
 */
export interface GetX402DirectOptions {
  /** Max signatures to scan (default: 100). */
  readonly limit?: number;
  /** Only return transfers from this specific payer. */
  readonly filterPayer?: PublicKey;
  /** Known settlements from server-side PAYMENT-RESPONSE logs.
   *  Used for deterministic hash matching. */
  readonly knownSettlements?: SettlementPayload[];
  /** Only include payments that match x402 memo prefix. Default: false. */
  readonly requireMemo?: boolean;
  /** Scan before this TX signature (pagination). */
  readonly before?: string;
  /** Scan after this TX signature (pagination). */
  readonly until?: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Core
// ═══════════════════════════════════════════════════════════════════

/** Recognized x402 memo prefixes. */
const X402_MEMO_PREFIXES = ["x402:", "SAP-x402:", "x402-direct:"];

/**
 * @name extractSplTransfer
 * @description Extract SPL Token transfer details from a parsed transaction.
 *
 * Looks for `transfer` or `transferChecked` inner instructions on the
 * Token Program and returns source/dest/amount/mint.
 *
 * @internal
 */
function extractSplTransfer(
  tx: ParsedTransactionWithMeta,
  payToAta: PublicKey,
): {
  amount: bigint;
  source: PublicKey;
  destination: PublicKey;
  mint: PublicKey;
} | null {
  if (!tx.meta?.innerInstructions && !tx.transaction.message.instructions) {
    return null;
  }

  // Check all instructions (outer + inner)
  const allIxs = [
    ...tx.transaction.message.instructions,
    ...(tx.meta?.innerInstructions?.flatMap((g) => g.instructions) ?? []),
  ];

  for (const ix of allIxs) {
    // Only process parsed instructions with known program
    if (!("parsed" in ix) || !("program" in ix)) continue;
    const parsed = ix as { parsed: Record<string, unknown>; program: string };

    if (parsed.program !== "spl-token") continue;

    const info = parsed.parsed as {
      type?: string;
      info?: {
        source?: string;
        destination?: string;
        amount?: string;
        tokenAmount?: { amount?: string };
        mint?: string;
        authority?: string;
      };
    };

    if (
      info.type !== "transfer" &&
      info.type !== "transferChecked"
    ) {
      continue;
    }

    const transferInfo = info.info;
    if (!transferInfo?.source || !transferInfo?.destination) continue;

    // Check destination matches our payTo ATA
    const destPk = new PublicKey(transferInfo.destination);
    if (!destPk.equals(payToAta)) continue;

    const amountStr =
      transferInfo.amount ?? transferInfo.tokenAmount?.amount ?? "0";

    return {
      amount: BigInt(amountStr),
      source: new PublicKey(transferInfo.source),
      destination: destPk,
      mint: transferInfo.mint ? new PublicKey(transferInfo.mint) : destPk, // fallback
    };
  }

  return null;
}

/**
 * @name extractMemo
 * @description Extract memo data from a parsed transaction.
 * @internal
 */
function extractMemo(tx: ParsedTransactionWithMeta): string | null {
  const allIxs = [
    ...tx.transaction.message.instructions,
    ...(tx.meta?.innerInstructions?.flatMap((g) => g.instructions) ?? []),
  ];

  for (const ix of allIxs) {
    if (!("parsed" in ix) || !("program" in ix)) continue;
    const parsed = ix as { parsed: unknown; program: string };
    if (parsed.program === "spl-memo" && typeof parsed.parsed === "string") {
      return parsed.parsed;
    }
  }

  // Also check log messages for memo
  if (tx.meta?.logMessages) {
    for (const log of tx.meta.logMessages) {
      if (log.startsWith("Program log: Memo")) {
        const memoMatch = log.match(/Memo \(len \d+\): "(.*?)"/);
        if (memoMatch?.[1]) return memoMatch[1];
      }
    }
  }

  return null;
}

/**
 * @name matchesX402Pattern
 * @description Check if a transfer matches an x402 payment pattern.
 *
 * Matches if:
 * - A memo with recognized x402 prefix is present, OR
 * - The transfer matches a known settlement payload (deterministic hash), OR
 * - `requireMemo` is false (any SPL transfer to the ATA is included)
 *
 * @internal
 */
function matchesX402Pattern(
  transfer: { amount: bigint; source: PublicKey },
  memo: string | null,
  knownSettlements: SettlementPayload[],
  requireMemo: boolean,
): SettlementPayload | true | false {
  // 1. Check memo prefix
  if (memo) {
    for (const prefix of X402_MEMO_PREFIXES) {
      if (memo.startsWith(prefix)) return true;
    }
    // Try base64 JSON parse for embedded x402 payload
    try {
      const decoded = Buffer.from(memo, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      if (parsed.protocol === "x402" || parsed.protocol === "SAP-x402") {
        return true;
      }
    } catch {
      // Not base64 JSON — ignore
    }
  }

  // 2. Match against known settlements (deterministic hash)
  for (const settlement of knownSettlements) {
    const expected = BigInt(settlement.amount);
    if (transfer.amount !== expected) continue;

    // Deterministic hash: sha256(agentWallet + depositor + amount + timestamp)
    const hashInput =
      settlement.agentWallet +
      settlement.depositorWallet +
      settlement.amount +
      settlement.timestamp.toString();
    const expectedHash = Buffer.from(sha256(hashInput)).toString("hex");
    const serviceHash = settlement.serviceHash;

    if (expectedHash === serviceHash) return settlement;
  }

  // 3. If requireMemo is false, accept any SPL transfer to the ATA
  if (!requireMemo) return true;

  return false;
}

/**
 * @name getX402DirectPayments
 * @description Scan an agent's ATA for x402 direct payments.
 *
 * Fetches recent transaction signatures for the given `payTo` ATA,
 * inspects each transaction for SPL token transfers, and filters
 * for x402 payment patterns (memo prefix, settlement hash match, etc.).
 *
 * @param connection - Solana RPC connection.
 * @param payToAta   - The agent's receiving ATA (e.g. USDC ATA of Syra).
 * @param opts       - Filter and pagination options.
 * @returns Array of recognized x402 direct payments, newest first.
 *
 * @category Utils
 * @since v0.6.4
 *
 * @example
 * ```ts
 * import { getX402DirectPayments, findATA } from "@oobe-protocol-labs/synapse-sap-sdk";
 *
 * const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
 * const payToAta = findATA(agentWallet, USDC_MINT);
 *
 * const payments = await getX402DirectPayments(connection, payToAta, {
 *   limit: 50,
 *   knownSettlements: savedSettlements, // from your API PAYMENT-RESPONSE logs
 * });
 *
 * for (const p of payments) {
 *   console.log(`${p.signature}: ${p.amount} from ${p.payerAta.toBase58()}`);
 *   if (p.settlement) {
 *     console.log(`  Matched settlement: ${p.settlement.serviceHash}`);
 *   }
 * }
 * ```
 */
export async function getX402DirectPayments(
  connection: Connection,
  payToAta: PublicKey,
  opts?: GetX402DirectOptions,
): Promise<X402DirectPayment[]> {
  const limit = opts?.limit ?? 100;
  const knownSettlements = opts?.knownSettlements ?? [];
  const requireMemo = opts?.requireMemo ?? false;

  // 1. Fetch signatures
  const sigOpts: {
    limit: number;
    before?: string;
    until?: string;
  } = { limit };
  if (opts?.before) sigOpts.before = opts.before;
  if (opts?.until) sigOpts.until = opts.until;

  const sigs: ConfirmedSignatureInfo[] =
    await connection.getSignaturesForAddress(payToAta, sigOpts);

  if (sigs.length === 0) return [];

  // 2. Fetch transactions (batch with getParsedTransactions if available)
  const txs = await connection.getParsedTransactions(
    sigs.map((s) => s.signature),
    { maxSupportedTransactionVersion: 0 },
  );

  // 3. Extract and filter
  const results: X402DirectPayment[] = [];

  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    if (!tx) continue;

    // Extract SPL transfer to our ATA
    const transfer = extractSplTransfer(tx, payToAta);
    if (!transfer) continue;

    // Filter by payer if specified
    if (opts?.filterPayer && !transfer.source.equals(opts.filterPayer)) {
      continue;
    }

    // Extract memo
    const memo = extractMemo(tx);

    // Match x402 pattern
    const match = matchesX402Pattern(
      transfer,
      memo,
      knownSettlements,
      requireMemo,
    );
    if (match === false) continue;

    results.push({
      signature: sigs[i]!.signature,
      amount: transfer.amount,
      payerAta: transfer.source,
      payeeAta: transfer.destination,
      mint: transfer.mint,
      memo,
      settlement: typeof match === "object" ? match : null,
      blockTime: tx.blockTime ?? null,
      slot: tx.slot,
    });
  }

  return results;
}
