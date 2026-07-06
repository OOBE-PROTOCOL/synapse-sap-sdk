/**
 * @module types/sns
 * @description SNS (Solana Name Service) integration types — Modular, free-choice design
 * @category Types
 * @since v1.0.0
 */

import { PublicKey, Signer, Commitment } from '@solana/web3.js';

/**
 * SNS Record Map — All possible record types
 * 
 * Agents choose freely which records to expose.
 * No roles, no requirements, complete freedom.
 * 
 * @since v1.0.0
 */
export interface SnsRecordMap {
  // Core (always present)
  SOL: string;
  Pic: string;
  
  // Optional records (agent chooses)
  TXT?: string;
  Url?: string;
  Twitter?: string;
  Discord?: string;
  Telegram?: string;
  Github?: string;
  Email?: string;
  IPFS?: string;
  ARWV?: string;
  IPNS?: string;
  ETH?: string;
  BTC?: string;
  BSC?: string;
  Injective?: string;
  LTC?: string;
  DOGE?: string;
  A?: string;
  AAAA?: string;
  CNAME?: string;
  Reddit?: string;
  Background?: string;
  Backpack?: string;
  POINT?: string;
  BASE?: string;
  SHDW?: string;
}

/**
 * SAP Structured Data — Optional data in TXT record
 * 
 * Agents can expose SAP-specific data in TXT record.
 * Completely optional and extensible.
 * 
 * @since v1.0.0
 */
export interface SapStructuredData {
  /** SAP SDK version */
  version?: string;
  /** Agent capabilities (e.g., ["jupiter:swap", "kamino:lend"]) */
  capabilities?: string[];
  /** Supported protocols (e.g., ["jupiter", "kamino"]) */
  protocols?: string[];
  /** Pricing information */
  pricing?: {
    pricePerCall?: number;
    maxCallsPerSettlement?: number;
    acceptedTokens?: string[];
  };
  /** Reputation metrics */
  reputation?: {
    totalCalls?: number;
    avgLatencyMs?: number;
    uptimePercent?: number;
  };
  /** Extensible — agents can add custom fields */
  [key: string]: unknown;
}

/**
 * Social Profiles — Optional social media presence
 * 
 * @since v1.0.0
 */
export interface SocialProfiles {
  twitter?: string;
  discord?: string;
  telegram?: string;
  github?: string;
}

/**
 * Metadata URLs — Optional metadata locations
 * 
 * @since v1.0.0
 */
export interface MetadataUrls {
  endpoint?: string;
  website?: string;
  ipfs?: string;
  arweave?: string;
  ipns?: string;
}

/**
 * Contact Info — Optional contact methods
 * 
 * @since v1.0.0
 */
export interface ContactInfo {
  email?: string;
}

/**
 * Multi-Chain Addresses — Optional cross-chain identity
 * 
 * @since v1.0.0
 */
export interface MultiChainAddresses {
  eth?: string;
  btc?: string;
  bsc?: string;
  injective?: string;
  ltc?: string;
  doge?: string;
}

/**
 * DNS Records — Optional DNS configuration
 * 
 * @since v1.0.0
 */
export interface DnsRecords {
  a?: string;
  aaaa?: string;
  cname?: string;
}

/**
 * Builder Options — Modular record builder configuration
 * 
 * All options except core (wallet, agentPda) are optional.
 * Agents choose freely what to expose.
 * 
 * @since v1.0.0
 */
export interface SnsRecordBuilderOptions {
  // Core (always required)
  /** Agent wallet public key */
  wallet: PublicKey;
  /** Agent PDA (on-chain identity) */
  agentPda: PublicKey;
  
  // Optional packs (agent chooses)
  /** Include identity pack (social, contact) */
  includeIdentity?: boolean;
  /** Include decentralized pack (IPFS, ARWV) */
  includeDecentralized?: boolean;
  /** Include multi-chain pack (ETH, BTC, etc) */
  includeMultiChain?: boolean;
  /** Include DNS pack (A, AAAA, CNAME) */
  includeDns?: boolean;
  
  // Actual data (optional, agent decides)
  /** SAP structured data for TXT record */
  sapData?: SapStructuredData;
  /** Social media profiles */
  social?: SocialProfiles;
  /** Metadata URLs */
  metadata?: MetadataUrls;
  /** Contact information */
  contact?: ContactInfo;
  /** Multi-chain addresses */
  multiChain?: MultiChainAddresses;
  /** DNS records */
  dns?: DnsRecords;
  
  // Custom records
  /** Custom record overrides */
  customRecords?: Partial<SnsRecordMap>;
}

/**
 * SNS Registration Parameters
 * 
 * @since v1.0.0
 */
export interface SnsRegistrationParams {
  /** Agent wallet public key */
  agentWallet: PublicKey;
  /** Domain name WITHOUT .sol suffix */
  domainName: string;
  /** Records to register (built with buildSnsRecords) */
  records: SnsRecordMap;
  /** Transaction signer (must match agentWallet) */
  signer: Signer;
  /** Registration duration in years (default: 1) */
  durationYears?: number;
  /** Set as primary domain (default: false) */
  setAsPrimary?: boolean;
  /** Commitment level (default: 'confirmed') */
  commitment?: Commitment;
  /** Space allocation in bytes (default: 600) */
  space?: number;
}

/**
 * SNS Registration Result
 * 
 * @since v1.0.0
 */
export interface SnsRegistrationResult {
  /** Full domain with .sol suffix */
  domain: string;
  /** Domain account PDA */
  domainPda: PublicKey;
  /** SAP agent PDA */
  agentPda: PublicKey;
  /** Transaction signature */
  transactionSignature: string;
  /** All record PDAs */
  recordPdas: { [key: string]: PublicKey };
  /** Whether set as primary domain */
  setAsPrimary: boolean;
  /** List of created record types */
  records: string[];
}

/**
 * SNS Resolution Result
 * 
 * @since v1.0.0
 */
export interface SnsResolutionResult {
  /** Domain name */
  domain: string;
  /** Derived SAP agent PDA */
  agentPda: PublicKey;
  /** Owner wallet from SOL record */
  wallet: PublicKey;
  /** Metadata extracted from records */
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
 * SNS Fetch Options — Modular fetching
 * 
 * @since v1.0.0
 */
export interface SnsFetchOptions {
  /** Include core records (SOL, Pic) */
  includeCore?: boolean;
  /** Include and parse SAP data from TXT */
  includeSapData?: boolean;
  /** Include social records */
  includeSocial?: boolean;
  /** Include multi-chain records */
  includeMultiChain?: boolean;
  /** Include metadata records (IPFS, ARWV, Url) */
  includeMetadata?: boolean;
}

/**
 * Fetched SNS Records
 * 
 * @since v1.0.0
 */
export interface FetchedSnsRecords {
  /** Core identity */
  core?: {
    wallet: PublicKey;
    avatar: string;
  };
  /** SAP structured data */
  sapData?: SapStructuredData;
  /** Social profiles */
  social?: SocialProfiles;
  /** Multi-chain addresses */
  multiChain?: MultiChainAddresses;
  /** Metadata URLs */
  metadata?: MetadataUrls;
}

/**
 * Re-export Record enum from Bonfida SDK for convenience
 * 
 * @since v1.0.0
 */
export { Record } from '@bonfida/spl-name-service';
