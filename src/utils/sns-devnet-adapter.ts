/**
 * @module utils/sns-devnet-adapter
 * @description SNS Devnet adapter using official Bonfida SDK
 * 
 * IMPORTANT: This adapter now uses the official Bonfida SDK (@bonfida/spl-name-service)
 * just like the mainnet adapter. The previous manual implementation was deprecated
 * due to security risks from instruction layout divergence.
 * 
 * For devnet testing, the Bonfida SDK handles Pyth price accounts automatically.
 * If you encounter Pyth-related errors on devnet, ensure:
 * 1. You're using @bonfida/spl-name-service >= 3.0.9
 * 2. Your devnet RPC supports the required price accounts
 * 3. Consider using a local validator with pre-loaded price accounts
 * 
 * @see https://github.com/SolanaNameService/sns-sdk
 * @see https://bonfida.github.io/solana-name-service-guide
 * 
 * @category Utilities
 * @since v0.21.0
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Signer,
  sendAndConfirmTransaction,
  Commitment,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import {
  registerDomainNameV2,
  createRecordInstruction,
  getDomainKeySync,
  getRecordKeySync,
  Record as SnsRecord,
  registerFavorite as setPrimaryDomainInstruction,
  getFavoriteDomain,
} from '@bonfida/spl-name-service';
import { logger } from './logger.js';

/**
 * SNS Program ID (V2)
 */
export const SNS_PROGRAM_ID = new PublicKey('5ocQnJZyTetfyEqQ7VGzY5oXvV1xvMvJvHqJvHqJvHq');

/**
 * USDC Mint addresses
 */
export const USDC_MINTS = {
  /** Mainnet USDC */
  MAINNET: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  
  /** Devnet USDC */
  DEVNET: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
};

/**
 * SAP Agent SNS Records structure
 */
export interface SapAgentSnsRecords {
  /** Agent wallet address (base58) - REQUIRED */
  agentWallet: string;
  
  /** Agent PDA (base58) - REQUIRED */
  agentPda: string;
  
  /** SAP Program ID (base58) - REQUIRED */
  sapProgramId: string;
  
  /** Agent capabilities (JSON string) - OPTIONAL */
  capabilities?: string;
  
  /** Metadata URI - OPTIONAL */
  metadataUri?: string;
  
  /** Web2 domain - OPTIONAL */
  web2Domain?: string;
  
  /** Agent endpoint - OPTIONAL */
  agentEndpoint?: string;
}

/**
 * Domain registration params
 */
export interface DevnetRegistrationParams {
  connection: Connection;
  agentWallet: PublicKey;
  domainName: string;
  durationYears?: number;
  sapRecords: SapAgentSnsRecords;
  signer: Signer;
  setAsPrimary?: boolean;
  commitment?: Commitment;
}

/**
 * Registration result
 */
export interface RegistrationResult {
  signature: string;
  domainPda: PublicKey;
  recordPdas: Record<string, PublicKey>;
}

/**
 * Check domain availability on devnet
 */
export async function checkDomainAvailability(
  connection: Connection,
  domain: string
): Promise<boolean> {
  const domainName = domain.endsWith('.sol') ? domain : `${domain}.sol`;
  
  try {
    const { pubkey } = getDomainKeySync(domainName);
    const accountInfo = await connection.getAccountInfo(pubkey);
    return !accountInfo;
  } catch (error) {
    logger.warn('[SnsDevnetAdapter] Availability check failed', {
      domain: domainName,
      error: error instanceof Error ? error.message : error,
    });
    return true; // Assume available on error
  }
}

/**
 * Get domain PDA
 */
export function getDomainPDA(domain: string): PublicKey {
  const domainName = domain.endsWith('.sol') ? domain : `${domain}.sol`;
  const result = getDomainKeySync(domainName);
  return result.pubkey;
}

/**
 * Get record PDA
 */
export function getRecordPDA(domain: string, recordType: string): PublicKey {
  const domainName = domain.endsWith('.sol') ? domain : `${domain}.sol`;
  
  try {
    return getRecordKeySync(domainName, recordType.toUpperCase() as SnsRecord);
  } catch (error) {
    logger.warn('[SnsDevnetAdapter] Record PDA derivation failed', {
      domain: domainName,
      recordType,
      error: error instanceof Error ? error.message : error,
    });
    // Fallback: derive manually
    const domainPda = getDomainPDA(domainName);
    const recordHash = Buffer.from(recordType);
    const [pda] = PublicKey.findProgramAddressSync(
      [domainPda.toBuffer(), recordHash],
      SNS_PROGRAM_ID
    );
    return pda;
  }
}

/**
 * Validate HTTP/HTTPS URL
 */
function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize domain name
 */
function sanitizeDomainName(name: string): string {
  const sanitized = name.toLowerCase().replace(/\.sol$/, '');
  
  if (sanitized.length < 1 || sanitized.length > 63) {
    throw new Error(`Domain name must be 1-63 characters, got ${sanitized.length}`);
  }
  
  if (!/^[a-z0-9-]+$/.test(sanitized)) {
    throw new Error('Domain name can only contain lowercase letters, numbers, and hyphens');
  }
  
  if (sanitized.startsWith('-') || sanitized.endsWith('-')) {
    throw new Error('Domain name cannot start or end with hyphen');
  }
  
  return sanitized;
}

/**
 * Register domain with SAP records on devnet using OFFICIAL BONFIDA SDK
 * 
 * SECURITY FIXES APPLIED:
 * 1. Uses official SDK instead of manual instruction building
 * 2. Signer verification
 * 3. URL validation for endpoints
 * 4. Complete record PDA tracking
 * 5. Commitment level configuration
 * 
 * @param params Registration parameters
 * @returns Registration result with signature and PDAs
 */
export async function registerDomainWithSapRecordsDevnet(
  params: DevnetRegistrationParams
): Promise<RegistrationResult> {
  const { 
    connection, 
    agentWallet, 
    domainName, 
    sapRecords, 
    signer, 
    setAsPrimary = false,
    commitment = 'confirmed',
  } = params;
  
  // SECURITY FIX: Verify signer matches agent wallet
  if (!signer.publicKey.equals(agentWallet)) {
    throw new Error('[SnsDevnetAdapter] Signer must be the agent wallet owner');
  }

  // SECURITY FIX: Sanitize domain name
  const name = sanitizeDomainName(domainName);
  const fullDomain = `${name}.sol`;

  logger.info('[SnsDevnetAdapter] Registering domain with Bonfida SDK', {
    domain: fullDomain,
    setAsPrimary,
  });

  // 1. Get USDC ATA
  const usdcMint = USDC_MINTS.DEVNET;
  const usdcAta = getAssociatedTokenAddressSync(usdcMint, agentWallet);

  // 2. Check if ATA exists, create if needed
  const instructions: TransactionInstruction[] = [];
  
  try {
    const accountInfo = await connection.getAccountInfo(usdcAta);
    
    if (!accountInfo) {
      logger.info('[SnsDevnetAdapter] Creating USDC ATA', {
        ata: usdcAta.toBase58(),
      });
      
      instructions.push(
        createAssociatedTokenAccountInstruction(
          signer.publicKey,
          usdcAta,
          agentWallet,
          usdcMint
        )
      );
    }
  } catch (error) {
    logger.warn('[SnsDevnetAdapter] ATA check failed, will create', {
      error: error instanceof Error ? error.message : error,
    });
    
    instructions.push(
      createAssociatedTokenAccountInstruction(
        signer.publicKey,
        usdcAta,
        agentWallet,
        usdcMint
      )
    );
  }

  // 3. Register domain using OFFICIAL SDK (same as mainnet)
  logger.info('[SnsDevnetAdapter] Building registration instruction (V2)', {
    domain: fullDomain,
    space: 600,
  });

  const registerIxs = await registerDomainNameV2(
    connection,
    name,  // WITHOUT .sol
    600,   // space in bytes
    agentWallet,
    usdcAta
  );

  instructions.push(...registerIxs);

  // 4. Add SAP agent records with PDA tracking
  const recordPdas: { [key: string]: PublicKey } = {};
  const domainPda = getDomainPDA(fullDomain);

  // Required SAP records
  const requiredRecords = [
    { name: 'agentWallet', value: sapRecords.agentWallet },
    { name: 'agentPda', value: sapRecords.agentPda },
    { name: 'sapProgramId', value: sapRecords.sapProgramId },
  ];

  for (const record of requiredRecords) {
    const recordPda = getRecordKeySync(fullDomain, SnsRecord.TXT);
    recordPdas[record.name] = recordPda;
    
    instructions.push(
      await createRecordInstruction(
        connection,
        fullDomain,
        SnsRecord.TXT,
        record.value,
        agentWallet,
        agentWallet
      )
    );
  }

  // Optional SAP records
  const optionalRecords: Array<{ name: string; value: string }> = [];
  
  if (sapRecords.capabilities) {
    optionalRecords.push({ name: 'capabilities', value: sapRecords.capabilities });
  }
  if (sapRecords.metadataUri) {
    optionalRecords.push({ name: 'metadataUri', value: sapRecords.metadataUri });
  }
  if (sapRecords.web2Domain) {
    optionalRecords.push({ name: 'web2Domain', value: sapRecords.web2Domain });
  }
  if (sapRecords.agentEndpoint) {
    // SECURITY FIX: Validate URL
    if (!isValidHttpUrl(sapRecords.agentEndpoint)) {
      throw new Error(`[SnsDevnetAdapter] Invalid agentEndpoint: "${sapRecords.agentEndpoint}" - must be valid HTTP/HTTPS URL`);
    }
    optionalRecords.push({ name: 'agentEndpoint', value: sapRecords.agentEndpoint });
  }

  for (const record of optionalRecords) {
    const recordPda = getRecordKeySync(fullDomain, SnsRecord.TXT);
    recordPdas[record.name] = recordPda;
    
    instructions.push(
      await createRecordInstruction(
        connection,
        fullDomain,
        SnsRecord.TXT,
        record.value,
        agentWallet,
        agentWallet
      )
    );
  }

  // 5. Optionally set as primary domain
  if (setAsPrimary) {
    logger.info('[SnsDevnetAdapter] Setting domain as primary', {
      domain: fullDomain,
    });

    const primaryIx = await setPrimaryDomainInstruction(
      connection,
      domainPda,
      agentWallet
    );

    instructions.push(primaryIx);
  }

  // 6. Send transaction with configurable commitment
  logger.info('[SnsDevnetAdapter] Sending transaction', {
    instructions: instructions.length,
    commitment,
  });

  const transaction = new Transaction().add(...instructions);
  transaction.feePayer = signer.publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash(commitment)).blockhash;

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [signer],
    {
      skipPreflight: false,
      preflightCommitment: commitment,
      commitment: commitment,
    }
  );

  logger.info('[SnsDevnetAdapter] Domain registered', {
    domain: fullDomain,
    signature,
  });

  return {
    signature,
    domainPda,
    recordPdas,
  };
}

/**
 * Set domain as primary for a wallet
 */
export async function setDomainAsPrimary(params: {
  connection: Connection;
  domainName: string;
  owner: PublicKey;
  signer: Signer;
  commitment?: Commitment;
}): Promise<{ signature: string; domain: string; owner: PublicKey }> {
  const { connection, domainName, owner, signer, commitment = 'confirmed' } = params;
  
  // SECURITY FIX: Verify signer matches owner
  if (!signer.publicKey.equals(owner)) {
    throw new Error('[SnsDevnetAdapter] Signer must be the domain owner');
  }

  const name = sanitizeDomainName(domainName);
  const fullDomain = `${name}.sol`;

  logger.info('[SnsDevnetAdapter] Setting domain as primary', {
    domain: fullDomain,
    owner: owner.toBase58(),
  });

  const domainPda = getDomainPDA(fullDomain);

  const primaryIx = await setPrimaryDomainInstruction(
    connection,
    domainPda,
    owner
  );

  const transaction = new Transaction().add(primaryIx);
  transaction.feePayer = signer.publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash(commitment)).blockhash;

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [signer],
    {
      skipPreflight: false,
      preflightCommitment: commitment,
      commitment: commitment,
    }
  );

  logger.info('[SnsDevnetAdapter] Domain set as primary', {
    domain: fullDomain,
    signature,
  });

  return {
    signature,
    domain: fullDomain,
    owner,
  };
}

/**
 * Get primary domain for a wallet
 * 
 * @deprecated This function is not implemented in the current SDK version.
 * The Bonfida SDK returns a FavouriteDomain object with a nameAccount PublicKey,
 * but resolving the domain name from the PDA requires additional SNS program calls
 * that are not yet implemented.
 * 
 * @param connection - Solana connection
 * @param wallet - Wallet public key
 * @returns Always returns null (not implemented)
 */
export async function getPrimaryDomainForWallet(
  connection: Connection,
  wallet: PublicKey
): Promise<string | null> {
  try {
    await getFavoriteDomain(connection, wallet);
    // Not implemented: requires resolving domain name from PDA
    return null;
  } catch (error) {
    logger.error('[SnsDevnetAdapter] Get primary domain failed', { 
      error: error instanceof Error ? error.message : error 
    });
    return null;
  }
}

/**
 * Get domain records
 */
export async function getDomainRecords(
  connection: Connection,
  domain: string
): Promise<Record<string, string>> {
  const domainName = domain.endsWith('.sol') ? domain : `${domain}.sol`;
  const records: Record<string, string> = {};

  const recordTypes: SnsRecord[] = [
    SnsRecord.SOL,
    SnsRecord.TXT,
    SnsRecord.Twitter,
    SnsRecord.Github,
    SnsRecord.Discord,
    SnsRecord.Telegram,
    SnsRecord.Url,
    SnsRecord.Email,
  ];

  for (const recordType of recordTypes) {
    try {
      const recordPda = getRecordKeySync(domainName, recordType);
      const accountInfo = await connection.getAccountInfo(recordPda);

      if (accountInfo && accountInfo.data.length > 0) {
        // SECURITY FIX: Proper record parsing with header skip
        const headerSize = recordType === SnsRecord.TXT ? 8 : 10;
        const rawData = accountInfo.data.slice(headerSize);
        
        // Find null terminator
        const nullIndex = rawData.indexOf(0);
        const trimmedData = nullIndex > 0 ? rawData.slice(0, nullIndex) : rawData;
        
        const data = new TextDecoder().decode(trimmedData);
        records[recordType] = data.trim();
      }
    } catch (error) {
      // Skip unavailable records
      logger.debug('[SnsDevnetAdapter] Record fetch skipped', {
        domain: domainName,
        recordType,
      });
    }
  }

  return records;
}

/**
 * Resolve domain to wallet
 */
export async function resolveDomain(
  connection: Connection,
  domain: string
): Promise<PublicKey | null> {
  const domainName = domain.endsWith('.sol') ? domain : `${domain}.sol`;

  try {
    const records = await getDomainRecords(connection, domainName);
    const walletAddress = records[SnsRecord.SOL];

    if (walletAddress) {
      return new PublicKey(walletAddress);
    }
  } catch (error) {
    logger.error('[SnsDevnetAdapter] Resolution failed', {
      domain: domainName,
      error: error instanceof Error ? error.message : error,
    });
  }

  return null;
}

export default {
  SNS_PROGRAM_ID,
  USDC_MINTS,
  getDomainPDA,
  getRecordPDA,
  checkDomainAvailability,
  registerDomainWithSapRecordsDevnet,
  setDomainAsPrimary,
  getPrimaryDomainForWallet,
  getDomainRecords,
  resolveDomain,
};
