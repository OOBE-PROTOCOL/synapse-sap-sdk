/**
 * @module types/sns
 * @description SNS (Solana Name Service) integration types — Engineering-first, role-based design
 * @category Types
 * @since v0.21.0
 */

import { PublicKey, Signer, Commitment } from '@solana/web3.js';
import { Record } from '@bonfida/spl-name-service';

/**
 * SAP Agent Role — determines DNS record requirements
 * 
 * @since v0.21.0
 */
export enum SapAgentRole {
  /**
   * Merchant: Provides services/tools to other agents
   * MUST expose x402 payment endpoint for micropayments
   */
  MERCHANT = 'merchant',
  
  /**
   * Citizen: Consumer/buyer in SAP ecosystem
   * MAY expose any verification URI (portfolio, social, docs)
   */
  CITIZEN = 'citizen'
}

/**
 * Generic DNS record structure for SAP agents
 * 
 * @since v0.21.0
 */
export interface SapDnsRecord {
  /** DNS record type */
  type: Record.A | Record.AAAA | Record.CNAME | Record.TXT;
  /** Record value (UTF-8 string) */
  value: string;
  /** Optional: human-readable label for UI display */
  label?: string;
}

/**
 * DNS Record configuration based on agent role
 * 
 * @since v0.21.0
 */
export type SapDnsRecordConfig = 
  | {
      role: SapAgentRole.MERCHANT;
      /** x402 endpoint URL for payment processing */
      x402Endpoint: string;  // e.g., "https://api.merchant.com/x402"
      /** Optional: additional DNS records */
      additionalRecords?: SapDnsRecord[];
    }
  | {
      role: SapAgentRole.CITIZEN;
      /** Any URI for verification (portfolio, social, docs, etc.) */
      agentUri: string;  // e.g., "https://portfolio.example.com"
      /** Optional: additional DNS records */
      additionalRecords?: SapDnsRecord[];
    };

/**
 * Optional non-DNS records that agents may add
 * 
 * @since v0.21.0
 */
export interface SapOptionalRecord {
  /** SNS Record type (non-DNS) */
  type: Exclude<Record, Record.A | Record.AAAA | Record.CNAME | Record.TXT>;
  /** Record value (UTF-8 string) */
  value: string;
  /** Optional: human-readable label */
  label?: string;
}

/**
 * Complete SNS registration parameters for SAP agents
 * 
 * Design principle: Only SOL record is mandatory.
 * DNS record (A/AAAA/CNAME/TXT) is required based on role.
 * All other records are optional and agent-specific.
 * 
 * @since v0.21.0
 */
export interface SapSnsRegistrationParams {
  /** Agent wallet public key (will be stored in SOL record) */
  agentWallet: PublicKey;
  
  /** Domain name WITHOUT .sol suffix */
  domainName: string;
  
  /** Agent role (determines DNS record requirements) */
  role: SapAgentRole;
  
  /** DNS configuration based on role */
  dnsConfig: SapDnsRecordConfig;
  
  /** Optional: additional non-DNS records (Pic, Url, Twitter, etc.) */
  optionalRecords?: SapOptionalRecord[];
  
  /** Transaction signer (must be agent wallet owner) */
  signer: Signer;
  
  /** Optional: space allocation in bytes (default: 600) */
  space?: number;
  
  /** Optional: set as primary domain for wallet */
  setAsPrimary?: boolean;
  
  /** Optional: commitment level for transactions (default: 'confirmed') */
  commitment?: Commitment;
  
  /** Optional: explicit role declaration stored on-chain (overrides heuristic inference) */
  explicitRoleDeclaration?: boolean;
}

/**
 * Legacy SAP Agent SNS Records configuration
 * 
 * @deprecated v0.21.0 — Use SapAgentRole + SapDnsRecordConfig instead
 * 
 * These records were stored as TXT records on SNS and linked the domain
 * to the SAP Agent identity. Now replaced by role-based minimal design.
 */
export interface SapAgentSnsRecords {
  /** Agent wallet address (base58) - REQUIRED */
  agentWallet: string;
  
  /** Agent PDA (base58) - REQUIRED, links domain to SAP agent */
  agentPda: string;
  
  /** SAP Program ID (base58) - REQUIRED */
  sapProgramId: string;
  
  /** Agent capabilities (JSON string) - OPTIONAL */
  capabilities?: string;
  
  /** Metadata URI for additional agent info - OPTIONAL */
  metadataUri?: string;
  
  /** Web2 domain linked to agent (e.g., "agent.example.com") - OPTIONAL */
  web2Domain?: string;
  
  /** Agent endpoint URL for SAP registration (e.g., "https://api.agent.com/sap") - OPTIONAL */
  agentEndpoint?: string;
}

/**
 * SNS Registration parameters (legacy)
 * 
 * @deprecated v0.21.0 — Use SapSnsRegistrationParams instead
 */
export interface SnsRegistrationParams {
  /** Agent wallet public key */
  agentWallet: PublicKey;
  
  /** Desired domain name (without .sol suffix) */
  domainName: string;
  
  /** Registration duration in years (1-10) - Note: currently fixed to 1 year */
  durationYears?: number;
  
  /** Agent capabilities - OPTIONAL */
  capabilities?: string[];
  
  /** Metadata URI for additional agent info - OPTIONAL */
  metadataUri?: string;
  
  /** Web2 domain to link - OPTIONAL */
  web2Domain?: string;
  
  /** Agent endpoint URL for SAP registration - OPTIONAL */
  agentEndpoint?: string;
  
  /** Transaction signer */
  signer: any; // Signer from @solana/web3.js
  
  /** Set this domain as primary for the wallet - OPTIONAL, default false */
  setAsPrimary?: boolean;
}

/**
 * SNS Registration result
 * 
 * @since v0.21.0
 */
export interface SnsRegistrationResult {
  /** Full domain name (with .sol) */
  domain: string;
  
  /** Domain PDA */
  domainPda: PublicKey;
  
  /** Agent PDA */
  agentPda: PublicKey;
  
  /** Transaction signature */
  transactionSignature: string;
  
  /** SNS record PDAs */
  recordPdas: { [key: string]: PublicKey };
  
  /** Whether domain was set as primary */
  setAsPrimary: boolean;
  
  /** Agent role */
  role: SapAgentRole;
  
  /** Records that were created */
  records: string[];
}

/**
 * SNS Domain information
 * 
 * @since v0.21.0
 */
export interface SnsDomainInfo {
  /** Domain name */
  domain: string;
  
  /** Domain PDA */
  domainPda: PublicKey;
  
  /** Owner wallet */
  owner: PublicKey;
  
  /** Registration timestamp */
  registeredAt: Date;
  
  /** Expiration timestamp */
  expiresAt: Date;
  
  /** Whether domain is linked to SAP agent */
  isSapAgent: boolean;
  
  /** Agent role (if linked to SAP) */
  agentRole?: SapAgentRole;
  
  /** SAP agent PDA (if linked) */
  agentPda?: PublicKey;
  
  /** x402 endpoint (if merchant) */
  x402Endpoint?: string;
  
  /** Agent URI (if citizen) */
  agentUri?: string;
  
  /** Whether this is the primary domain for the owner */
  isPrimary: boolean;
}

/**
 * SNS Resolution result
 * 
 * @since v0.21.0
 */
export interface SnsResolutionResult {
  /** Domain name */
  domain: string;
  
  /** Agent PDA */
  agentPda: PublicKey;
  
  /** Wallet address */
  wallet: PublicKey;
  
  /** Agent role */
  role: SapAgentRole | null;
  
  /** Agent metadata */
  metadata: {
    x402Endpoint?: string;
    agentUri?: string;
    capabilities?: string[];
    metadataUri?: string;
    web2Domain?: string;
    agentEndpoint?: string;
  };
  
  /** All SNS records */
  records: { [key: string]: string };
}

/**
 * SNS Module configuration
 * 
 * @since v0.21.0
 */
export interface SnsModuleConfig {
  /** Solana connection */
  connection: any; // Connection from @solana/web3.js
  
  /** SAP Program ID */
  sapProgramId: string;
  
  /** Optional: default commitment level for transactions (default: 'confirmed') */
  defaultCommitment?: Commitment;
}

/**
 * Domain availability check result
 * 
 * @since v0.21.0
 */
export interface DomainAvailability {
  /** Domain name */
  domain: string;
  
  /** Whether domain is available */
  available: boolean;
  
  /** Error message if check failed */
  error?: string;
}

/**
 * Record validation result
 * 
 * @since v0.21.0
 */
export interface RecordValidationResult {
  /** Whether records are valid */
  valid: boolean;
  /** Error messages */
  errors: string[];
  /** Warning messages */
  warnings: string[];
}

export default {
  SapAgentRole: undefined as unknown as typeof SapAgentRole,
  SapDnsRecord: undefined as unknown as SapDnsRecord,
  SapDnsRecordConfig: undefined as unknown as SapDnsRecordConfig,
  SapOptionalRecord: undefined as unknown as SapOptionalRecord,
  SapSnsRegistrationParams: undefined as unknown as SapSnsRegistrationParams,
  SapAgentSnsRecords: undefined as unknown as SapAgentSnsRecords,
  SnsRegistrationParams: undefined as unknown as SnsRegistrationParams,
  SnsRegistrationResult: undefined as unknown as SnsRegistrationResult,
  SnsDomainInfo: undefined as unknown as SnsDomainInfo,
  SnsResolutionResult: undefined as unknown as SnsResolutionResult,
  SnsModuleConfig: undefined as unknown as SnsModuleConfig,
  DomainAvailability: undefined as unknown as DomainAvailability,
  RecordValidationResult: undefined as unknown as RecordValidationResult,
};
