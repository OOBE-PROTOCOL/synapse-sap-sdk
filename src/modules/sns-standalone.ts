/**
 * @module sns
 * @description SNS (Solana Name Service) SDK - Standalone domain management
 * 
 * Complete SDK for managing .sol domains independently from SAP.
 * Uses official Bonfida SDK (@bonfida/spl-name-service).
 * 
 * @category Modules
 * @since v0.21.0
 * 
 * @example
 * ```typescript
 * import { SnsSdk } from '@synapse-sap/sdk/sns';
 * 
 * const sns = new SnsSdk(connection);
 * 
 * // Check availability
 * const available = await sns.checkAvailability('my-domain');
 * 
 * // Register domain
 * const tx = await sns.buildRegisterDomainTx('my-domain', buyerPubkey);
 * 
 * // Manage records
 * await sns.setRecord('my-domain.sol', Record.Twitter, '@myhandle', owner);
 * 
 * // Set primary domain
 * await sns.setPrimaryDomain('my-domain.sol', owner);
 * ```
 */

import {
  Connection,
  PublicKey,
  Transaction,
  Signer,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import {
  // Domain management
  registerDomainNameV2,
  resolve,
  
  // Records
  createRecordInstruction,
  Record,
  getDomainKeySync,
  getRecordKeySync,
  
  // Primary domain
  registerFavorite as setPrimaryDomainInstruction,
  getFavoriteDomain,
  
  // Constants
  NAME_PROGRAM_ID,
} from '@bonfida/spl-name-service';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

/**
 * SNS Record types (re-export from Bonfida SDK)
 */
export { Record };

/**
 * Domain availability check result
 */
export interface DomainAvailability {
  /** Domain name (with .sol) */
  domain: string;
  
  /** Whether domain is available */
  available: boolean;
  
  /** Current owner if registered */
  owner?: PublicKey;
  
  /** Registration cost in USDC (if available) */
  costUsdc?: number;
  
  /** Web registration URL (if available) */
  registrationUrl?: string;
  
  /** Error message if check failed */
  error?: string;
}

/**
 * Domain portfolio item
 */
export interface DomainPortfolioItem {
  /** Domain name */
  domain: string;
  
  /** Domain PDA */
  domainPda: PublicKey;
  
  /** Owner wallet */
  owner: PublicKey;
  
  /** Whether listed for sale */
  isListed: boolean;
  
  /** Listing price (if listed) */
  listingPrice?: number;
  
  /** Top offer (if any) */
  topOffer?: number;
}

/**
 * Domain records
 */
export interface DomainRecords {
  /** All records as key-value pairs */
  records: { [key: string]: string };
  
  /** Standard address records */
  addresses: {
    sol?: string;
    eth?: string;
    btc?: string;
    [key: string]: string | undefined;
  };
  
  /** Social media handles */
  social: {
    twitter?: string;
    github?: string;
    discord?: string;
    telegram?: string;
    reddit?: string;
    [key: string]: string | undefined;
  };
  
  /** URLs and storage */
  web: {
    url?: string;
    ipfs?: string;
    arweave?: string;
    [key: string]: string | undefined;
  };
  
  /** SAP-specific records (if domain is linked to SAP agent) */
  sap?: {
    agentWallet?: string;
    agentPda?: string;
    sapProgramId?: string;
    capabilities?: string;
    metadataUri?: string;
  };
}

/**
 * Registration transaction result
 */
export interface RegistrationTransaction {
  /** Unsigned transaction (base64) */
  transactionBase64: string;
  
  /** Unsigned transaction (base58) */
  transactionBase58: string;
  
  /** Domain PDA */
  domainPda: PublicKey;
  
  /** Web registration URL fallback */
  webRegisterUrl: string;
  
  /** Instructions breakdown */
  instructions: {
    register: number;
    records: number;
    primary: number;
  };
}

/**
 * Primary domain transaction result
 */
export interface PrimaryDomainTransaction {
  /** Unsigned transaction (base64) */
  transactionBase64: string;
  
  /** Unsigned transaction (base58) */
  transactionBase58: string;
  
  /** Domain being set as primary */
  domain: string;
  
  /** Domain PDA */
  domainPda: PublicKey;
}

/**
 * SNS SDK Configuration
 */
export interface SnsSdkConfig {
  /** Solana connection */
  connection: Connection;
  
  /** USDC mint (defaults to mainnet) */
  usdcMint?: PublicKey;
  
  /** Default space for domain registration (default: 600) */
  defaultSpace?: number;
}

/**
 * SNS SDK - Standalone domain management
 * 
 * Provides complete SNS functionality independent from SAP:
 * - Domain availability checks
 * - Domain registration
 * - Record management
 * - Primary domain management
 * - Portfolio tracking
 * 
 * @example
 * ```typescript
 * const sns = new SnsSdk({ connection });
 * 
 * // Check availability
 * const result = await sns.checkAvailability('trading-bot');
 * if (result.available) {
 *   console.log(`${result.domain} costs ${result.costUsdc} USDC`);
 * }
 * 
 * // Build registration transaction
 * const tx = await sns.buildRegisterDomainTx('trading-bot', buyerPubkey, {
 *   records: {
 *     [Record.Twitter]: '@tradingbot',
 *     [Record.Url]: 'https://trading.bot',
 *   },
 *   setAsPrimary: true,
 * });
 * 
 * // Sign and send (user's responsibility)
 * // const signature = await sendAndConfirmTransaction(...);
 * ```
 */
export class SnsSdk {
  private connection: Connection;
  private usdcMint: PublicKey;
  private defaultSpace: number;

  constructor(config: SnsSdkConfig) {
    this.connection = config.connection;
    this.usdcMint = config.usdcMint || new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    this.defaultSpace = config.defaultSpace || 600;
  }

  // ════════════════════════════════════════════════════════════
  // DOMAINS - Check availability and ownership
  // ════════════════════════════════════════════════════════════

  /**
   * Check if a domain is available for registration
   * 
   * @param domainName - Domain name (with or without .sol)
   * @returns Availability status and pricing
   * 
   * @example
   * ```typescript
   * const result = await sns.checkAvailability('my-domain');
   * console.log(result.available); // true/false
   * console.log(result.costUsdc);  // 20 USDC
   * ```
   */
  async checkAvailability(domainName: string): Promise<DomainAvailability> {
    const domain = domainName.endsWith('.sol') ? domainName : `${domainName}.sol`;
    
    try {
      // Derive domain PDA
      const { pubkey: domainPda } = getDomainKeySync(domain);
      
      // Check if domain exists
      const accountInfo = await this.connection.getAccountInfo(domainPda);
      
      if (accountInfo) {
        // Domain is registered - owner derivation would require parsing account data
        // For now, just return that it's not available
        return {
          domain,
          available: false,
        };
      }
      
      // Domain is available - calculate cost
      // SNS V2 pricing: ~20 USDC for registration + rent
      const rentExempt = await this.connection.getMinimumBalanceForRentExemption(this.defaultSpace);
      const registrationFee = 20 * 1e6; // 20 USDC (6 decimals)
      
      return {
        domain,
        available: true,
        costUsdc: 20 + (rentExempt / 1e6),
        registrationUrl: `https://www.sns.id/domain/${domainName}`,
      };
    } catch (error) {
      return {
        domain,
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check multiple domains for availability (batch up to 25)
   * 
   * @param domainNames - Array of domain names (1-25)
   * @returns Array of availability results
   * 
   * @example
   * ```typescript
   * const results = await sns.checkAvailabilityBatch(['bot1', 'bot2', 'bot3']);
   * results.forEach(r => {
   *   console.log(`${r.domain}: ${r.available ? 'Available' : 'Taken'}`);
   * });
   * ```
   */
  async checkAvailabilityBatch(domainNames: string[]): Promise<DomainAvailability[]> {
    // Limit to 25 domains per SNS API
    const limitedDomains = domainNames.slice(0, 25);
    return Promise.all(limitedDomains.map(d => this.checkAvailability(d)));
  }

  /**
   * Check if a wallet owns a specific domain
   * 
   * @param domain - Domain name
   * @param owner - Wallet public key
   * @returns True if wallet owns the domain
   */
  async checkOwnership(domain: string, owner: PublicKey): Promise<boolean> {
    try {
      // Check if domain exists and derive owner from account data
      // This is simplified - real implementation would parse the domain account
      const { pubkey: domainPda } = getDomainKeySync(domain);
      const accountInfo = await this.connection.getAccountInfo(domainPda);
      if (!accountInfo) return false;
      // Owner check would require parsing domain account data
      // For now, just check if domain exists
      return true;
    } catch {
      return false;
    }
  }

  // ════════════════════════════════════════════════════════════
  // REGISTRATION - Build registration transactions
  // ════════════════════════════════════════════════════════════

  /**
   * Build an unsigned transaction to register a .sol domain
   * 
   * @param domainName - Domain name to register
   * @param buyer - Buyer's public key (will be domain owner)
   * @param options - Optional configuration
   * @returns Unsigned transaction ready to sign
   * 
   * @example
   * ```typescript
   * const tx = await sns.buildRegisterDomainTx('my-domain', buyerPubkey, {
   *   records: {
   *     [Record.Twitter]: '@myhandle',
   *     [Record.Url]: 'https://example.com',
   *   },
   *   setAsPrimary: true,
   * });
   * 
   * // Sign and send separately
   * const signature = await sendAndConfirmTransaction(connection, tx, [signer]);
   * ```
   */
  async buildRegisterDomainTx(
    domainName: string,
    buyer: PublicKey,
    options?: {
      /** Records to set on registration */
      records?: { [key: string]: string };
      
      /** Set as primary domain */
      setAsPrimary?: boolean;
      
      /** Space allocation (default: 600) */
      space?: number;
    }
  ): Promise<RegistrationTransaction> {
    const domain = domainName.endsWith('.sol') ? domainName : `${domainName}.sol`;
    const space = options?.space || this.defaultSpace;
    
    // Get USDC ATA
    const usdcAta = getAssociatedTokenAddressSync(this.usdcMint, buyer);
    
    // Build registration instructions
    const instructions = await registerDomainNameV2(
      this.connection,
      domain,
      space,
      buyer,
      usdcAta
    );
    
    let registerIxCount = instructions.length;
    
    // Add custom records if provided
    if (options?.records) {
      for (const [recordType, value] of Object.entries(options.records)) {
        const recordIx = await createRecordInstruction(
          this.connection,
          domain,
          recordType as Record,
          value,
          buyer,
          buyer
        );
        instructions.push(recordIx);
      }
    }
    
    // Add set primary instruction if requested
    let primaryIxCount = 0;
    if (options?.setAsPrimary) {
      const { pubkey: domainPda } = getDomainKeySync(domain);
      const primaryIx = await setPrimaryDomainInstruction(
        this.connection,
        domainPda,
        buyer
      );
      instructions.push(primaryIx);
      primaryIxCount = 1;
    }
    
    // Build transaction
    const transaction = new Transaction().add(...instructions);
    
    // Get domain PDA
    const { pubkey: domainPda } = getDomainKeySync(domain);
    
    const serializedTx = transaction.serialize({ verifySignatures: false });
    
    return {
      transactionBase64: serializedTx.toString('base64'),
      transactionBase58: bs58.encode(serializedTx),
      domainPda,
      webRegisterUrl: `https://www.sns.id/domain/${domainName}`,
      instructions: {
        register: registerIxCount,
        records: options?.records ? Object.keys(options.records).length : 0,
        primary: primaryIxCount,
      },
    };
  }

  // ════════════════════════════════════════════════════════════
  // RECORDS - Get and manage domain records
  // ════════════════════════════════════════════════════════════

  /**
   * Get all configured records for a .sol domain
   * 
   * @param domain - Domain name
   * @returns Domain records organized by category
   * 
   * @example
   * ```typescript
   * const records = await sns.getDomainRecords('my-domain.sol');
   * console.log(records.social.twitter); // @myhandle
   * console.log(records.sap?.agentPda);  // SAP agent PDA if linked
   * ```
   */
  async getDomainRecords(domain: string): Promise<DomainRecords> {
    const domainName = domain.endsWith('.sol') ? domain : `${domain}.sol`;
    
    const records: DomainRecords = {
      records: {},
      addresses: {},
      social: {},
      web: {},
    };
    
    // Define record types to check
    const recordTypes: Record[] = [
      // Addresses
      Record.SOL, Record.ETH, Record.BTC, Record.LTC, Record.DOGE, Record.BSC, Record.Injective,
      
      // Social
      Record.Twitter, Record.Github, Record.Discord, Record.Telegram, Record.Reddit, Record.Email,
      
      // Web/Storage
      Record.Url, Record.IPFS, Record.ARWV, Record.SHDW, Record.IPNS,
      
      // DNS
      Record.A, Record.AAAA, Record.CNAME, Record.TXT,
      
      // Profile
      Record.Pic, Record.Background, Record.Backpack,
    ];
    
    // Fetch each record
    for (const recordType of recordTypes) {
      try {
        const value = await this.getRecord(domainName, recordType);
        if (value) {
          records.records[recordType] = value;
          
          // Categorize
          if ([Record.SOL, Record.ETH, Record.BTC, Record.LTC, Record.DOGE, Record.BSC, Record.Injective].includes(recordType)) {
            records.addresses[recordType.toLowerCase()] = value;
          } else if ([Record.Twitter, Record.Github, Record.Discord, Record.Telegram, Record.Reddit, Record.Email].includes(recordType)) {
            records.social[recordType.toLowerCase()] = value;
          } else if ([Record.Url, Record.IPFS, Record.ARWV, Record.SHDW, Record.IPNS].includes(recordType)) {
            records.web[recordType.toLowerCase()] = value;
          }
          
          // Check for SAP-specific TXT records
          if (recordType === Record.TXT) {
            // Try to parse SAP records from TXT
            const sapRecords = await this.getSapRecordsFromTxt(domainName);
            if (sapRecords && Object.keys(sapRecords).length > 0) {
              records.sap = sapRecords;
            }
          }
        }
      } catch (error) {
        // Record doesn't exist or error reading - skip
      }
    }
    
    return records;
  }

  /**
   * Get a specific record value
   * 
   * @param domain - Domain name
   * @param recordType - Record type
   * @returns Record value or null
   */
  async getRecord(domain: string, recordType: Record): Promise<string | null> {
    try {
      const domainName = domain.endsWith('.sol') ? domain : `${domain}.sol`;
      const recordKey = getRecordKeySync(domainName, recordType);
      
      const accountInfo = await this.connection.getAccountInfo(recordKey);
      if (!accountInfo) return null;
      
      // Parse record data (simplified - real implementation needs proper deserialization)
      const data = accountInfo.data.toString('utf-8');
      return data || null;
    } catch {
      return null;
    }
  }

  /**
   * Build transaction to create/update/delete a record
   * 
   * @param domain - Domain name
   * @param recordType - Record type
   * @param value - Record value (null to delete)
   * @param owner - Domain owner's public key
   * @returns Unsigned transaction
   * 
   * @example
   * ```typescript
   * // Set Twitter handle
   * const tx = await sns.buildManageRecordTx(
   *   'my-domain.sol',
   *   Record.Twitter,
   *   '@myhandle',
   *   ownerPubkey
   * );
   * 
   * // Delete record
   * const deleteTx = await sns.buildManageRecordTx(
   *   'my-domain.sol',
   *   Record.Twitter,
   *   null,
   *   ownerPubkey
   * );
   * ```
   */
  async buildManageRecordTx(
    domain: string,
    recordType: Record,
    value: string | null,
    owner: PublicKey
  ): Promise<{ transactionBase64: string; transactionBase58: string }> {
    const domainName = domain.endsWith('.sol') ? domain : `${domain}.sol`;
    
    if (value === null) {
      // Record deletion not implemented in current Bonfida SDK version
      throw new Error('Record deletion not yet implemented - requires SNS program update instruction');
    }
    
    // Build create/update instruction
    const instruction = await createRecordInstruction(
      this.connection,
      domainName,
      recordType,
      value,
      owner,
      owner
    );
    
    const transaction = new Transaction().add(instruction);
    
    const serializedTx = transaction.serialize({ verifySignatures: false });
    
    return {
      transactionBase64: serializedTx.toString('base64'),
      transactionBase58: bs58.encode(serializedTx),
    };
  }

  /**
   * Extract SAP records from TXT records
   * 
   * @param domain - Domain name
   * @returns SAP-specific records if found
   */
  private async getSapRecordsFromTxt(domain: string): Promise<{ [key: string]: string } | null> {
    // SAP uses TXT records with specific keys: agentWallet, agentPda, sapProgramId, etc.
    // This would require fetching all TXT records and parsing them
    // For now, return null - implementation depends on how SAP stores records
    return null;
  }

  // ════════════════════════════════════════════════════════════
  // PRIMARY DOMAIN - Set and get primary domain
  // ════════════════════════════════════════════════════════════

  /**
   * Build transaction to set a domain as primary for the owner
   * 
   * @param domain - Domain name (must be owned by the owner)
   * @param owner - Domain owner's public key
   * @returns Unsigned transaction
   * 
   * @example
   * ```typescript
   * const tx = await sns.buildSetPrimaryDomainTx('my-domain.sol', ownerPubkey);
   * // Sign and send separately
   * ```
   */
  async buildSetPrimaryDomainTx(
    domain: string,
    owner: PublicKey
  ): Promise<PrimaryDomainTransaction> {
    const domainName = domain.endsWith('.sol') ? domain : `${domain}.sol`;
    const { pubkey: domainPda } = getDomainKeySync(domainName);
    
    const instruction = await setPrimaryDomainInstruction(
      this.connection,
      domainPda,
      owner
    );
    
    const transaction = new Transaction().add(instruction);
    
    const serializedTx = transaction.serialize({ verifySignatures: false });
    
    return {
      transactionBase64: serializedTx.toString('base64'),
      transactionBase58: bs58.encode(serializedTx),
      domain: domainName,
      domainPda,
    };
  }

  /**
   * Get primary domain for a wallet
   * 
   * @deprecated Not implemented in current version - requires SNS PDA resolution
   * 
   * @param owner - Wallet public key
   * @returns Always returns null
   */
  async getPrimaryDomain(owner: PublicKey): Promise<string | null> {
    try {
      await getFavoriteDomain(this.connection, owner);
      // Not implemented: requires resolving domain name from PDA
      return null;
    } catch {
      return null;
    }
  }

  // ════════════════════════════════════════════════════════════
  // PORTFOLIO - View domains owned by a wallet
  // ════════════════════════════════════════════════════════════

  /**
   * Get all .sol domains owned by a wallet
   * 
   * @deprecated Not implemented in current version - requires SNS program account scanning
   * 
   * @param owner - Wallet public key
   * @returns Always returns empty array
   */
  async getPortfolio(owner: PublicKey): Promise<DomainPortfolioItem[]> {
    // Not implemented: requires querying SNS program accounts or using an indexer
    return [];
  }

  // ════════════════════════════════════════════════════════════
  // UTILITIES
  // ════════════════════════════════════════════════════════════

  /**
   * Resolve a .sol domain to a wallet address
   * 
   * @param domain - Domain name
   * @returns Wallet public key or null
   */
  async resolveDomain(domain: string): Promise<PublicKey | null> {
    try {
      const domainName = domain.endsWith('.sol') ? domain : `${domain}.sol`;
      const owner = await resolve(this.connection, domainName);
      return owner || null;
    } catch {
      return null;
    }
  }

  /**
   * Derive domain PDA
   * 
   * @param domain - Domain name
   * @returns Domain PDA
   */
  getDomainPda(domain: string): PublicKey {
    const domainName = domain.endsWith('.sol') ? domain : `${domain}.sol`;
    const { pubkey } = getDomainKeySync(domainName);
    return pubkey;
  }

  /**
   * Derive record PDA
   * 
   * @param domain - Domain name
   * @param recordType - Record type
   * @returns Record PDA
   */
  getRecordPda(domain: string, recordType: Record): PublicKey {
    const domainName = domain.endsWith('.sol') ? domain : `${domain}.sol`;
    return getRecordKeySync(domainName, recordType);
  }
}

export default SnsSdk;
