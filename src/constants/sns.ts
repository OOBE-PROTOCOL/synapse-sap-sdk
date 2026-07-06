/**
 * @module constants/sns
 * @description SNS (Solana Name Service) protocol constants
 * @category Constants
 * @since v1.0.0
 */

import { PublicKey } from '@solana/web3.js';

/**
 * SNS Program IDs
 */
export const SNS_PROGRAM_ID = new PublicKey(
  '5ocQnJZyTetfyEqQ7VGzY5oXvV1xvMvJvHqJvHqJvHq'
);

/**
 * SNS V1 Program ID (legacy)
 */
export const SNS_V1_PROGRAM_ID = new PublicKey(
  'jCebWw5vKxPsF1qwRQsp9mGqFFCqQVrBVtKdU8dFKoM'
);

/**
 * USDC Mint addresses
 */
export const USDC_MINT = {
  /** Mainnet USDC */
  MAINNET: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  
  /** Devnet USDC */
  DEVNET: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
};

/**
 * Default registration parameters
 */
export const SNS_DEFAULTS = {
  /** Default space allocation (bytes) */
  SPACE: 600,
  
  /** Maximum space (bytes) */
  MAX_SPACE: 10000,
  
  /** Default registration duration (years) */
  DURATION_YEARS: 1,
  
  /** Maximum duration (years) */
  MAX_DURATION_YEARS: 10,
  
  /** Default record types to set for SAP agents */
  RECORD_TYPES: ['wallet', 'avatar', 'email', 'description', 'url'],
};

/**
 * SNS record type identifiers
 */
export const SNS_RECORD_TYPES = {
  WALLET: 'wallet',
  AVATAR: 'avatar',
  NAME: 'name',
  DESCRIPTION: 'description',
  EMAIL: 'email',
  URL: 'url',
  TWITTER: 'twitter',
  GITHUB: 'github',
  DISCORD: 'discord',
  TELEGRAM: 'telegram',
  CUSTOM: 'custom',
} as const;

export default {
  SNS_PROGRAM_ID,
  SNS_V1_PROGRAM_ID,
  USDC_MINT,
  SNS_DEFAULTS,
  SNS_RECORD_TYPES,
};
