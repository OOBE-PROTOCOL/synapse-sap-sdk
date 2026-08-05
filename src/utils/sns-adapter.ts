/**
 * @module utils/sns-adapter
 * @description Deprecated SNS adapter surface.
 *
 * This adapter previously imported `@bonfida/spl-name-service`, which is not
 * present in the public npm registry. The functions below intentionally fail
 * fast until SNS is migrated to a current, installable SDK and covered by
 * integration tests.
 */

import { PublicKey, type Connection, type Signer } from "@solana/web3.js";

export const SNS_DEPRECATED_MESSAGE =
  "SNS adapter is deprecated in @oobe-protocol-labs/synapse-sap-sdk@1.0.3. " +
  "The previous Bonfida dependency is not installable from npm; migrate to a " +
  "current Solana Name Service SDK before using SNS flows.";

function unavailable(): never {
  throw new Error(SNS_DEPRECATED_MESSAGE);
}

export const USDC_MINTS = {
  MAINNET: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  DEVNET: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
};

export const NAME_PROGRAM_ID = new PublicKey(
  "namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX",
);

export enum Record {
  SOL = "SOL",
  TXT = "TXT",
  URL = "URL",
  Pic = "Pic",
}

export interface SapAgentSnsRecords {
  agentWallet: string;
  agentPda: string;
  sapProgramId: string;
  capabilities?: string;
  metadataUri?: string;
  web2Domain?: string;
  agentEndpoint?: string;
}

export interface RegisterDomainResult {
  signature: string;
  domainPda: PublicKey;
  recordPdas: { [key: string]: PublicKey };
}

export interface SetPrimaryDomainResult {
  signature: string;
  domain: string;
  owner: PublicKey;
}

export async function registerDomainWithSapRecords(_params: {
  connection: Connection;
  payer: Signer;
  agentWallet: PublicKey;
  domainName: string;
  records: SapAgentSnsRecords;
  space?: number;
  setAsPrimary?: boolean;
}): Promise<RegisterDomainResult> {
  return unavailable();
}

export async function setDomainAsPrimary(_params: {
  connection: Connection;
  owner: Signer;
  domainName: string;
}): Promise<SetPrimaryDomainResult> {
  return unavailable();
}

export async function getPrimaryDomainForWallet(
  _connection: Connection,
  _wallet: PublicKey,
): Promise<string | null> {
  return unavailable();
}

export async function checkDomainAvailability(
  _connection: Connection,
  _domainName: string,
): Promise<boolean> {
  return unavailable();
}

export async function resolveSnsDomain(
  _connection: Connection,
  _domainName: string,
): Promise<PublicKey | null> {
  return unavailable();
}

export async function getSnsRecord(
  _connection: Connection,
  _domainName: string,
  _record: Record,
): Promise<string | null> {
  return unavailable();
}

export function getDomainKeySync(_domain: string): { pubkey: PublicKey } {
  return unavailable();
}

export function getRecordKeySync(
  _domain: string,
  _record: Record,
): { pubkey: PublicKey } {
  return unavailable();
}
