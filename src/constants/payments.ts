/**
 * @module constants/payments
 * @description Payment-token allowlist + agent stake collateral constants
 *   mirroring the on-chain v0.10.0 hardening.
 *
 *   The on-chain program now accepts only:
 *   - **Native SOL** — signalled by `tokenMint = null` on escrow creation.
 *   - **USDC mainnet** — `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`.
 *   - **USDC devnet**  — `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`.
 *
 *   Any other SPL mint passed to `createEscrow` / `createEscrowV2` is
 *   rejected on-chain with `PaymentTokenNotAllowed` (error code 6093).
 *
 *   Additionally, the agent owner MUST have an `AgentStake` PDA with
 *   `staked_amount >= MIN_AGENT_STAKE_LAMPORTS` (0.1 SOL) BEFORE any
 *   client can create a new escrow against that agent. Use
 *   {@link StakingModule.initStake} + {@link StakingModule.deposit}
 *   to satisfy the requirement.
 *
 * @category Constants
 * @since v0.10.0
 */

import { PublicKey } from "@solana/web3.js";

/**
 * USDC mint on Solana mainnet-beta (Circle).
 *
 * @name USDC_MINT_MAINNET
 * @category Constants
 * @since v0.10.0
 */
export const USDC_MINT_MAINNET = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
);

/**
 * USDC mint on Solana devnet (Circle test mint).
 *
 * @name USDC_MINT_DEVNET
 * @category Constants
 * @since v0.10.0
 */
export const USDC_MINT_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);

/**
 * Minimum agent stake required to gate escrow creation, expressed in lamports.
 * Mirrors `AgentStake::MIN_STAKE` on-chain (`100_000_000` = 0.1 SOL).
 *
 * @name MIN_AGENT_STAKE_LAMPORTS
 * @category Constants
 * @since v0.10.0
 */
export const MIN_AGENT_STAKE_LAMPORTS = BigInt(100_000_000);

/**
 * Maximum delegate duration (seconds) accepted by `add_vault_delegate`.
 * Mirrors `VaultDelegate::MAX_DELEGATE_DURATION_SECS` on-chain
 * (`365 * 86_400` = 1 year).
 *
 * @name MAX_DELEGATE_DURATION_SECS
 * @category Constants
 * @since v0.10.0
 */
export const MAX_DELEGATE_DURATION_SECS = 365 * 86_400;

/**
 * Returns true when `mint` is an accepted USDC mint (mainnet or devnet).
 *
 * @name isAcceptedUsdcMint
 * @param mint - Candidate SPL token mint.
 * @category Constants
 * @since v0.10.0
 */
export function isAcceptedUsdcMint(mint: PublicKey): boolean {
  return mint.equals(USDC_MINT_MAINNET) || mint.equals(USDC_MINT_DEVNET);
}

/**
 * Returns true when the (optional) `tokenMint` is acceptable as escrow payment.
 * `null` represents native SOL and is always accepted.
 *
 * @name isAcceptedPaymentToken
 * @param tokenMint - The mint passed to `createEscrow*`. `null` = SOL.
 * @category Constants
 * @since v0.10.0
 */
export function isAcceptedPaymentToken(tokenMint: PublicKey | null): boolean {
  return tokenMint === null || isAcceptedUsdcMint(tokenMint);
}
