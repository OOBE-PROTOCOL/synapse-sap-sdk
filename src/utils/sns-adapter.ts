/**
 * @module utils/sns-adapter
 * @description SNS adapter on the SNS JS SDK v4 (`@bonfida/spl-name-service`
 * v4, Stage 1 — `.sns` namespace only).
 *
 * Preserves the historical surface that consumers deep-imported via
 * `@oobe-protocol-labs/synapse-sap-sdk/utils` while delegating the actual work
 * to {@link SnsModule} (modules/sns.ts). Write paths return unsigned
 * instructions — the caller signs and submits; nothing here holds or submits
 * signatures.
 */

import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  createRecord,
  getRecordV1Key,
  getSnsDomainKeySync,
  registerDomain,
} from "@bonfida/spl-name-service";
import {
  PublicKey,
  type Connection,
  type Signer,
  type TransactionInstruction,
} from "@solana/web3.js";
import { SnsModule, parseSnsRecordType } from "../modules/sns.js";
import { SNS_SUFFIX, toFullSnsName } from "./display-domain.js";

/** Kept for source compatibility with pre-Stage-1 consumers. */
export const SNS_DEPRECATED_MESSAGE =
  "SNS adapter is implemented on the SNS JS SDK v4 as of this module. Legacy " +
  ".sol inputs are rejected: legacy .sol resolution is paused (slot 452,825,395). " +
  "Use .sns names.";

export const USDC_MINTS = {
  MAINNET: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  DEVNET: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
};

export const NAME_PROGRAM_ID = new PublicKey(
  "namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX",
);

export interface SapAgentSnsRecords {
  agentWallet: string;
  agentPda: string;
  sapProgramId: string;
  capabilities?: string;
  metadataUri?: string;
  web2Domain?: string;
  agentEndpoint?: string;
}

/**
 * Stage-1 registration result — unsigned instruction set plus derived keys.
 * (The pre-Stage-1 surface returned a tx signature; nothing is submitted on
 * the caller's behalf anymore.)
 */
export interface RegisterDomainResult {
  /** Full lowercase `.sns` domain. */
  domain: string;
  domainPda: PublicKey;
  /** Created record type -> V1 record PDA. */
  recordPdas: { [key: string]: PublicKey };
  /** Buyer's USDC token account used for the registration fee. */
  buyerTokenAccount: PublicKey;
  /** Unsigned instructions to sign & submit. */
  instructions: TransactionInstruction[];
  /** Was a set-as-primary instruction appended? */
  setAsPrimary: boolean;
}

export interface SetPrimaryDomainResult {
  domain: string;
  /** Unsigned set-primary instruction. */
  instructions: TransactionInstruction[];
}

/** Canonical record type the adapter writes SAP identity payloads to. */
export const SAP_IDENTITY_TXT_RECORD = parseSnsRecordType("txt");

function toModule(
  connection: Connection,
  sapProgramId: string | PublicKey,
): SnsModule {
  return new SnsModule({ connection, sapProgramId });
}

export function getDomainKeySync(domain: string): { pubkey: PublicKey } {
  const full = toFullSnsName(domain);
  const bare = full.slice(0, -SNS_SUFFIX.length);
  const { pubkey } = getSnsDomainKeySync(bare);
  return { pubkey };
}

export function getRecordKeySync(
  domain: string,
  record: string,
): { pubkey: PublicKey } {
  const full = toFullSnsName(domain);
  const parsed = parseSnsRecordType(record);
  return { pubkey: getRecordV1Key(full, parsed) };
}

export async function registerDomainWithSapRecords(params: {
  connection: Connection;
  payer: Signer;
  agentWallet: PublicKey;
  domainName: string;
  records: SapAgentSnsRecords;
  space?: number;
  setAsPrimary?: boolean;
}): Promise<RegisterDomainResult> {
  const domain = toFullSnsName(params.domainName);
  const bare = domain.slice(0, -SNS_SUFFIX.length);
  const buyer = params.payer.publicKey;
  const buyerTokenAccount = getAssociatedTokenAddressSync(
    USDC_MINTS.MAINNET,
    buyer,
  );

  const instructions: TransactionInstruction[] = [
    ...(await registerDomain(
      domain,
      params.space ?? 600,
      buyer,
      buyerTokenAccount,
    )),
  ];
  const recordPdas: { [key: string]: PublicKey } = {};

  // The SAP identity payload is written as JSON in the TXT record.
  const txt = parseSnsRecordType("txt");
  const txtContent = JSON.stringify({
    agent_wallet: params.records.agentWallet,
    agent_pda: params.records.agentPda,
    sap_program_id: params.records.sapProgramId,
    capabilities: params.records.capabilities,
    metadata_uri: params.records.metadataUri,
    web2_domain: params.records.web2Domain,
    agent_endpoint: params.records.agentEndpoint,
  });
  instructions.push(createRecord(domain, txt, txtContent, buyer, buyer));
  recordPdas[txt] = getRecordV1Key(domain, txt);

  const urlContent = params.records.agentEndpoint ?? params.records.metadataUri;
  if (urlContent) {
    const url = parseSnsRecordType("url");
    instructions.push(createRecord(domain, url, urlContent, buyer, buyer));
    recordPdas[url] = getRecordV1Key(domain, url);
  }

  const { pubkey: domainPda } = getSnsDomainKeySync(bare);

  let setAsPrimary = false;
  if (params.setAsPrimary) {
    const [primary] = await toModule(
      params.connection,
      params.records.sapProgramId,
    ).buildSetPrimaryDomainInstructions(params.agentWallet, domain);
    instructions.push(primary);
    setAsPrimary = true;
  }

  return {
    domain,
    domainPda,
    recordPdas,
    buyerTokenAccount,
    instructions,
    setAsPrimary,
  };
}

export async function setDomainAsPrimary(params: {
  connection: Connection;
  owner: Signer;
  domainName: string;
}): Promise<SetPrimaryDomainResult> {
  const domain = toFullSnsName(params.domainName);
  const instructions = await toModule(
    params.connection,
    NAME_PROGRAM_ID,
  ).buildSetPrimaryDomainInstructions(params.owner.publicKey, domain);
  return { domain, instructions };
}

export async function getPrimaryDomainForWallet(
  connection: Connection,
  wallet: PublicKey,
): Promise<string | null> {
  return toModule(connection, NAME_PROGRAM_ID).resolveWalletPrimaryDomain(
    wallet,
  );
}

export async function checkDomainAvailability(
  connection: Connection,
  domainName: string,
): Promise<boolean> {
  return toModule(connection, NAME_PROGRAM_ID).checkAvailability(domainName);
}

export async function resolveSnsDomain(
  connection: Connection,
  domainName: string,
): Promise<PublicKey | null> {
  return toModule(connection, NAME_PROGRAM_ID).resolve(domainName);
}

export async function getSnsRecord(
  connection: Connection,
  domainName: string,
  record: string,
): Promise<string | null> {
  return toModule(connection, NAME_PROGRAM_ID).getRecordValue(
    domainName,
    record,
  );
}
