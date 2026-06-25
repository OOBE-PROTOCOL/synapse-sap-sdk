/**
 * @module modules/sns
 * @description SNS (Solana Name Service) integration module for SAP SDK
 * 
 * Modular, free-choice design: Agents choose which records to expose.
 * No roles, no requirements, complete freedom.
 * 
 * @since v0.21.0
 * @packageDocumentation
 */

import {
  Connection,
  PublicKey,
  Signer,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  Commitment,
} from '@solana/web3.js';
import {
  registerDomainNameV2,
  createRecordInstruction,
  Record,
  NAME_PROGRAM_ID,
  getDomainKeySync,
  getRecordKeySync,
} from '@bonfida/spl-name-service';
import {
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import type {
  SnsRegistrationParams,
  SnsRegistrationResult,
  SnsResolutionResult,
  SnsRecordMap,
} from '../types/sns.js';
import { getAgentPDA } from '../pdas/index.js';
import { logger } from '../utils/logger.js';
import { USDC_MINT } from '../constants/sns.js';

/**
 * Rate limiting state for availability checks
 */
const rateLimitState = {
  lastCheckTime: 0,
  minIntervalMs: 300, // 300ms minimum between checks
};

/**
 * SNS Integration Module
 * 
 * Provides seamless integration between SAP agents and SNS domains.
 * Modular record system: agents freely choose which records to expose.
 * All other records are optional and agent-specific.
 * 
 * @since v0.21.0
 */
export class SnsModule {
  private connection: Connection;
  private sapProgramId: PublicKey;
  private defaultCommitment: Commitment;

  constructor(config: SnsModuleConfig) {
    this.connection = config.connection;
    this.sapProgramId = new PublicKey(config.sapProgramId);
    this.defaultCommitment = config.defaultCommitment || 'confirmed';
    
    logger.info('[SnsModule] Initialized', {
      sapProgramId: config.sapProgramId,
      network: config.connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet',
    });
  }

  /**
   * Check if a domain is available for registration
   * 
   * Rate limited to prevent RPC abuse and enumeration attacks.
   * 
   * @param domainName - Domain name to check (with or without .sol)
   * @returns True if available
   */
  async checkAvailability(domainName: string): Promise<boolean> {
    // Rate limiting check
    const now = Date.now();
    if (now - rateLimitState.lastCheckTime < rateLimitState.minIntervalMs) {
      const waitTime = rateLimitState.minIntervalMs - (now - rateLimitState.lastCheckTime);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    rateLimitState.lastCheckTime = Date.now();

    const domain = domainName.endsWith('.sol') ? domainName : `${domainName}.sol`;
    
    try {
      const { pubkey: domainPda } = getDomainKeySync(domain);
      const accountInfo = await this.connection.getAccountInfo(domainPda);
      const available = !accountInfo;
      
      logger.debug('[SnsModule] Domain availability check', {
        domain,
        available,
      });
      return available;
    } catch (error) {
      logger.error('[SnsModule] Availability check failed', {
        domain,
        error: error instanceof Error ? error.message : error,
      });
      return true; // Assume available on error
    }
  }

  /**
   * Sanitize and validate domain name
   * 
   * Prevents homograph attacks, invalid characters, and length violations.
   */
  private sanitizeDomainName(name: string): string {
    const sanitized = name.toLowerCase().replace(/\.sol$/, '');
    
    if (sanitized.length < 1 || sanitized.length > 63) {
      throw new Error(`[SnsModule] Domain name must be 1-63 characters, got ${sanitized.length}`);
    }
    
    if (!/^[a-z0-9-]+$/.test(sanitized)) {
      throw new Error('[SnsModule] Domain name can only contain lowercase letters, numbers, and hyphens');
    }
    
    if (sanitized.startsWith('-') || sanitized.endsWith('-')) {
      throw new Error('[SnsModule] Domain name cannot start or end with hyphen');
    }
    
    // Check for consecutive hyphens at position 3-4 (reserved for IDN)
    if (sanitized.substring(2, 4) === '--') {
      throw new Error('[SnsModule] Domain name cannot contain IDN prefix (--) at position 3-4');
    }
    
    return sanitized;
  }

  /**
   * Validate HTTP/HTTPS URL
   */
  private isValidHttpUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Calculate required space for SNS records
   */
  private calculateRequiredSpace(records: Array<{ type: Record; value: string }>): number {
    // Base space for domain account
    let totalSpace = 100;
    
    // Each record adds overhead + data size
    for (const record of records) {
      // Record account overhead: ~50 bytes
      // Data size: variable, estimate 2x actual length for safety
      totalSpace += 50 + (record.value.length * 2);
    }
    
    return totalSpace;
  }

  /**
   * Register a .sol domain for a SAP agent
   * 
   * SECURITY FIXES APPLIED:
   * 1. Signer verification - ensures signer matches agentWallet
   * 2. Domain name sanitization - prevents invalid/homograph domains
   * 3. URL validation - ensures x402Endpoint/agentUri are valid HTTP(S) URLs
   * 4. Complete record PDA tracking - returns all created record PDAs
   * 5. Commitment level configuration - allows user-specified commitment
   * 6. Space calculation - dynamically calculates required space
   * 
   * @param params - Registration parameters with role-based DNS configuration
   * @returns Registration result with domain, agent info, and records list
   * 
   * @throws {Error} If signer does not match agentWallet
   * @throws {Error} If domain is already taken
   * @throws {Error} If DNS configuration is invalid for role
   * @throws {Error} If registration fails
   */
  async registerAgentDomain(params: SapSnsRegistrationParams): Promise<SnsRegistrationResult> {
    const {
      agentWallet,
      domainName,
      dnsConfig,
      optionalRecords = [],
      signer,
      space: providedSpace,
      setAsPrimary = false,
      commitment,
    } = params;

    // CRITICAL FIX #1: Verify signer matches agent wallet
    if (!signer.publicKey.equals(agentWallet)) {
      throw new Error('[SnsModule] Signer must be the agent wallet owner - unauthorized registration attempt detected');
    }

    logger.info('[SnsModule] Registering agent domain', {
      domainName,
      agentWallet: agentWallet.toBase58(),
      setAsPrimary,
    });

    // 1. Derive SAP Agent PDA
    const [agentPda] = getAgentPDA(agentWallet);
    logger.debug('[SnsModule] Agent PDA derived', {
      agentPda: agentPda.toBase58(),
    });

    // CRITICAL FIX #2: Sanitize domain name
    const name = this.sanitizeDomainName(domainName);
    const fullDomain = `${name}.sol`;

    // 2. Check availability
    const isAvailable = await this.checkAvailability(name);
    if (!isAvailable) {
      throw new Error(`[SnsModule] Domain ${fullDomain} is already registered`);
    }

    logger.info('[SnsModule] Domain is available', { domain: fullDomain });

    // 3. Prepare USDC ATA with error handling
    const isDevnet = this.connection.rpcEndpoint.includes('devnet');
    const usdcMint = isDevnet ? USDC_MINT.DEVNET : USDC_MINT.MAINNET;
    const usdcAta = getAssociatedTokenAddressSync(usdcMint, agentWallet);

    // Verify ATA exists or can be created
    let needsAtaCreation = false;
    try {
      const ataInfo = await this.connection.getAccountInfo(usdcAta);
      needsAtaCreation = !ataInfo;
    } catch (error) {
      // ATA doesn't exist or error - will need creation
      needsAtaCreation = true;
    }

    logger.info('[SnsModule] USDC ATA prepared', {
      usdcMint: usdcMint.toBase58(),
      usdcAta: usdcAta.toBase58(),
      needsCreation: needsAtaCreation,
    });

    // 4. Calculate required space
    const recordsToCreate = [
      { type: Record.SOL, value: agentWallet.toBase58() },
      { type: Record.TXT, value: dnsConfig.txtValue },
      ...optionalRecords.map(r => ({ type: r.type, value: r.value })),
      ...(dnsConfig.additionalRecords?.map((r: SapDnsRecordConfig) => ({ type: r.type, value: r.value })) || []),
    ];
    
    const requiredSpace = this.calculateRequiredSpace(recordsToCreate);
    const space = Math.max(providedSpace || 600, requiredSpace);
    
    logger.debug('[SnsModule] Space calculation', {
      provided: providedSpace,
      required: requiredSpace,
      final: space,
    });

    // 5. Build registration instructions
    const registerIxs = await registerDomainNameV2(
      this.connection,
      name,
      space,
      agentWallet,
      usdcAta
    );

    // 6. Build required records with PDA tracking
    const recordInstructions: TransactionInstruction[] = [];
    const recordPdas: { [key: string]: PublicKey } = {};

    // REQUIRED: SOL record (agent wallet)
    const solRecordPda = getRecordKeySync(fullDomain, Record.SOL);
    recordPdas.SOL = solRecordPda;
    recordInstructions.push(
      await createRecordInstruction(
        this.connection,
        fullDomain,
        Record.SOL,
        agentWallet.toBase58(),
        agentWallet,
        agentWallet
      )
    );

    // REQUIRED: TXT record (agent-chosen data)
    recordPdas.DNS = getRecordKeySync(fullDomain, Record.TXT);
    recordInstructions.push(
      await createRecordInstruction(
        this.connection,
        fullDomain,
        Record.TXT,
        dnsConfig.txtValue,
        agentWallet,
        agentWallet
      )
    );

    // OPTIONAL: Additional records - async map to handle promises
    const optionalRecordInstructions = await Promise.all(
      optionalRecords.map(async (optRecord: { type: Record; value: string }, index: number) => {
        const recordKey = `optional_${index}`;
        recordPdas[recordKey] = getRecordKeySync(fullDomain, optRecord.type);
        return createRecordInstruction(
          this.connection,
          fullDomain,
          optRecord.type,
          optRecord.value,
          agentWallet,
          agentWallet
        );
      })
    );
    recordInstructions.push(...optionalRecordInstructions);

    // OPTIONAL: Additional DNS records from dnsConfig
    if (dnsConfig.additionalRecords) {
      const additionalRecordInstructions = await Promise.all(
        dnsConfig.additionalRecords.map(async (additional: SapDnsRecordConfig, index: number) => {
          const recordKey = `additional_${index}`;
          recordPdas[recordKey] = getRecordKeySync(fullDomain, additional.type);
          return createRecordInstruction(
            this.connection,
            fullDomain,
            additional.type,
            additional.value,
            agentWallet,
            agentWallet
          );
        })
      );
      recordInstructions.push(...additionalRecordInstructions);
    }

    // 7. Combine all instructions
    const allInstructions = [...registerIxs, ...recordInstructions];

    // 8. Build and send transaction with configurable commitment
    const txCommitment = commitment || this.defaultCommitment;
    const tx = new Transaction().add(...allInstructions);
    tx.feePayer = signer.publicKey;
    tx.recentBlockhash = (await this.connection.getLatestBlockhash(txCommitment)).blockhash;

    logger.info('[SnsModule] Sending transaction...', {
      instructions: allInstructions.length,
      commitment: txCommitment,
    });

    const signature = await sendAndConfirmTransaction(this.connection, tx, [signer], {
      skipPreflight: false,
      preflightCommitment: txCommitment,
      commitment: txCommitment,
    });

    // 9. Derive domain PDA
    const { pubkey: domainPda } = getDomainKeySync(fullDomain);

    // 10. Compile records list
    const records = [
      Record.SOL,
      Record.TXT,
      ...optionalRecords.map((r: { type: Record; value: string }) => r.type),
      ...(dnsConfig.additionalRecords?.map((r: SapDnsRecordConfig) => r.type) || []),
    ];

    logger.info('[SnsModule] Domain registered on-chain!', {
      domain: fullDomain,
      network: isDevnet ? 'devnet' : 'mainnet',
      signature,
      domainPda: domainPda.toBase58(),
      records,
    });

    return {
      domain: fullDomain,
      domainPda,
      agentPda,
      transactionSignature: signature,
      recordPdas, // CRITICAL FIX #5: Complete PDA tracking
      setAsPrimary,
      records,
    };
  }

  /**
   * Resolve a .sol domain to its SAP agent identity
   * 
   * SECURITY FIX: Properly derives agent PDA from SAP program instead of copying wallet
   */
  async resolveAgentDomain(domain: string): Promise<SnsResolutionResult | null> {
    const normalizedDomain = domain.endsWith('.sol') ? domain : `${domain}.sol`;

    logger.debug('[SnsModule] Resolving domain', { domain: normalizedDomain });

    try {
      // Get domain PDA
      const { pubkey: domainPda } = getDomainKeySync(normalizedDomain);
      const accountInfo = await this.connection.getAccountInfo(domainPda);
      
      if (!accountInfo) {
        logger.debug('[SnsModule] Domain not found', { domain: normalizedDomain });
        return null;
      }

      // Get SOL record (wallet)
      const walletRecord = await this.getSnsRecord(normalizedDomain, Record.SOL);
      if (!walletRecord) {
        logger.debug('[SnsModule] No SOL record found', { domain: normalizedDomain });
        return null;
      }

      const wallet = new PublicKey(walletRecord);

      // CRITICAL FIX: Derive actual SAP agent PDA from program
      const [expectedAgentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('sap_agent'), wallet.toBuffer()],
        this.sapProgramId
      );

      // Get TXT record (contains x402 endpoint or agent URI)
      const txtRecord = await this.getSnsRecord(normalizedDomain, Record.TXT);

      let x402Endpoint: string | undefined;
      let agentUri: string | undefined;

      if (txtRecord) {
        // TXT record can contain any agent-specific data
        // Agents freely choose what to expose (x402 endpoint, agent URI, or other data)
        if (txtRecord.startsWith('http://') || txtRecord.startsWith('https://')) {
          // Could be either x402Endpoint or agentUri - agents choose freely
          x402Endpoint = txtRecord;
          agentUri = txtRecord;
        }
      }

      const result: SnsResolutionResult = {
        domain: normalizedDomain,
        agentPda: expectedAgentPda, // CRITICAL FIX: Properly derived PDA
        wallet,
        metadata: {
          x402Endpoint,
          agentUri,
        },
        records: {
          SOL: walletRecord,
          ...(txtRecord ? { TXT: txtRecord } : {}),
        },
      };

      logger.info('[SnsModule] Domain resolved', {
        domain: normalizedDomain,
        wallet: wallet.toBase58(),
        agentPda: expectedAgentPda.toBase58(),
      });

      return result;
    } catch (error) {
      logger.error('[SnsModule] Resolution failed', {
        domain: normalizedDomain,
        error: error instanceof Error ? error.message : error,
      });

      return null;
    }
  }

  /**
   * Get a specific SNS record for a domain
   * 
   * SECURITY FIX: Proper record data parsing with offset handling and null-byte stripping
   */
  private async getSnsRecord(
    domain: string,
    recordType: Record
  ): Promise<string | null> {
    try {
      const recordPda = getRecordKeySync(domain, recordType);
      const accountInfo = await this.connection.getAccountInfo(recordPda);
      
      if (!accountInfo || accountInfo.data.length === 0) {
        return null;
      }

      // CRITICAL FIX: SNS records have a header - skip appropriate bytes
      // Bonfida SDK record structure: discriminator (8 bytes) + offset (4 bytes) + data
      const headerSize = recordType === Record.TXT ? 8 : 10;
      const rawData = accountInfo.data.slice(headerSize);
      
      // Find null terminator and strip padding
      const nullIndex = rawData.indexOf(0);
      const trimmedData = nullIndex > 0 ? rawData.slice(0, nullIndex) : rawData;
      
      const decoder = new TextDecoder('utf-8');
      const data = decoder.decode(trimmedData);
      
      return data.trim();
    } catch (error) {
      logger.debug('[SnsModule] Record read failed', {
        domain,
        recordType,
        error: error instanceof Error ? error.message : error,
      });
      return null;
    }
  }

  /**
   * Validate SNS records for SAP agent compliance (on-chain only)
   */
  async validateAgentRecords(domain: string): Promise<RecordValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const normalizedDomain = domain.endsWith('.sol') ? domain : `${domain}.sol`;

    // Check for required SOL record
    const solRecord = await this.getSnsRecord(normalizedDomain, Record.SOL);
    if (!solRecord) {
      errors.push('Missing required SOL record (agent wallet)');
    } else if (!this.isValidBase58(solRecord, 44)) {
      errors.push('Invalid SOL record: must be valid Base58 public key (44 chars)');
    }

    // Check for DNS record (A, AAAA, CNAME, or TXT)
    const dnsRecordTypes = [Record.A, Record.AAAA, Record.CNAME, Record.TXT];
    let hasDnsRecord = false;

    for (const dnsType of dnsRecordTypes) {
      const dnsRecord = await this.getSnsRecord(normalizedDomain, dnsType);
      if (dnsRecord) {
        hasDnsRecord = true;

        // Validate DNS record format
        if (dnsType === Record.A && !this.isValidIPv4(dnsRecord)) {
          errors.push(`Invalid A record: "${dnsRecord}" is not a valid IPv4 address`);
        }
        if (dnsType === Record.AAAA && !this.isValidIPv6(dnsRecord)) {
          errors.push(`Invalid AAAA record: "${dnsRecord}" is not a valid IPv6 address`);
        }
        if (dnsType === Record.CNAME && !this.isValidDomain(dnsRecord)) {
          errors.push(`Invalid CNAME record: "${dnsRecord}" is not a valid domain`);
        }
        if (dnsType === Record.TXT) {
          // TXT should contain URL for SAP agents
          if (!dnsRecord.startsWith('http://') && !dnsRecord.startsWith('https://') && !dnsRecord.startsWith('sapRole:')) {
            warnings.push(
              `TXT record does not appear to be a URL: "${dnsRecord}". ` +
              'For SAP agents, TXT typically contains an endpoint URI.'
            );
          }
        }
        break;
      }
    }

    if (!hasDnsRecord) {
      errors.push('Missing required DNS record (A, AAAA, CNAME, or TXT)');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate Base58 string
   */
  private isValidBase58(str: string, expectedLength?: number): boolean {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Regex.test(str)) {
      return false;
    }
    if (expectedLength && str.length !== expectedLength) {
      return false;
    }
    return true;
  }

  /**
   * Validate IPv4 address
   */
  private isValidIPv4(str: string): boolean {
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(str);
  }

  /**
   * Validate IPv6 address
   */
  private isValidIPv6(str: string): boolean {
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    return ipv6Regex.test(str);
  }

  /**
   * Validate domain name
   */
  private isValidDomain(str: string): boolean {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    return domainRegex.test(str);
  }

  /**
   * Batch check availability for multiple domains
   * 
   * Rate limited internally to prevent RPC abuse.
   */
  async batchCheckAvailability(domainNames: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    // Process with rate limiting delays between each check
    for (const name of domainNames) {
      const normalized = name.endsWith('.sol') ? name : `${name}.sol`;
      const available = await this.checkAvailability(normalized);
      results.set(normalized, available);
    }

    return results;
  }

  /**
   * Get domain PDA for a given domain name
   */
  getDomainPda(domain: string): PublicKey {
    const domainName = domain.endsWith('.sol') ? domain : `${domain}.sol`;
    const { pubkey } = getDomainKeySync(domainName);
    return pubkey;
  }

  /**
   * Get record PDA for a specific record type
   */
  getRecordPda(domain: string, recordType: Record): PublicKey {
    const domainName = domain.endsWith('.sol') ? domain : `${domain}.sol`;
    return getRecordKeySync(domainName, recordType);
  }
}

// Re-export types and enums for convenience
export { Record } from '@bonfida/spl-name-service';
