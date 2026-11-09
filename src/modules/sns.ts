/**
 * @module modules/sns
 * @description SNS (Solana Name Service) module on the SNS JS SDK v4
 * (`@bonfida/spl-name-service@^4.0.1`).
 *
 * Stage 1 (post slot 452,825,395): the `.sns` namespace is what SNS resolves
 * and what this module accepts — legacy `.sol` inputs are rejected because
 * `.sol` resolution is paused at the protocol level (SRS transition). Stage 2
 * (SRS-backed `.sol` resolution) arrives later via the SNS SDK.
 *
 * Historical note: the v1.0.3 surface was a fail-fast stub because the old
 * Bonfida package was not installable from npm. v4.x is published, so this
 * module is a real implementation again. Write paths (registration, primary
 * domain, record management) build **unsigned instructions** — the caller
 * assembles, signs and submits; the SDK never holds keys.
 */

import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import {
  AccountDoesNotExistError,
  DomainDoesNotExist,
  PrimaryDomainNotFoundError,
  USDC_MINT,
  createRecord,
  deleteRecord,
  getPrimaryDomain,
  getRecord,
  getRecordV1Key,
  getSnsDomainKeySync,
  getSnsDomainsForOwner,
  Record as SnsRecordV4,
  registerDomain,
  resolve,
  safeResolve,
  setPrimaryDomain,
  updateRecord,
} from "@bonfida/spl-name-service";
import {
  PublicKey,
  type Commitment,
  type Connection,
  type TransactionInstruction,
} from "@solana/web3.js";
import { deriveAgent } from "../pda/index.js";
import type {
  SnsRegistrationParams,
  SnsRegistrationResult,
  SnsResolutionResult,
} from "../types/sns.js";
import { SNS_SUFFIX, toFullSnsName } from "../utils/display-domain.js";

/** Default name-account space allocation for new registrations (bytes). */
const DEFAULT_DOMAIN_SPACE = 600;

/** Kept for source compatibility with pre-Stage-1 consumers. */
export const SNS_INTEGRATION_DEPRECATED =
  "SNS is implemented on the SNS JS SDK v4 as of this module. Legacy .sol " +
  "inputs are rejected: legacy .sol resolution is paused (slot 452,825,395). " +
  "Use .sns names.";

/** Kept for source compatibility with pre-Stage-1 consumers. */
export const SNS_DEPRECATED_MESSAGE = SNS_INTEGRATION_DEPRECATED;

/**
 * Normalizes a user-provided record label to the SNS JS SDK v4 `Record`
 * enum, matching case-insensitively on the enum key or its wire value
 * (e.g. `"Pic"`, `"pic"`, `"URL"`, `"url"`, `"TXT"`).
 */
export function parseSnsRecordType(input: string): SnsRecordV4 {
  const raw = input.trim();
  if (raw === "") {
    throw new Error("SNS record type is required");
  }
  for (const key of Object.keys(SnsRecordV4) as (keyof typeof SnsRecordV4)[]) {
    const value = String(SnsRecordV4[key]);
    if (
      key === raw ||
      key.toLowerCase() === raw.toLowerCase() ||
      value.toLowerCase() === raw.toLowerCase()
    ) {
      return SnsRecordV4[key];
    }
  }
  throw new Error(
    `unsupported SNS record type '${input}' — supported: ${Object.keys(
      SnsRecordV4,
    ).join(", ")}`,
  );
}

export interface SnsRegistrationBuildResult {
  /** Full lowercase `.sns` domain. */
  domain: string;
  /** Derived SNS name-account PDA for the domain. */
  domainPda: PublicKey;
  /** Buyer's USDC associated token account (registration fee currency). */
  buyerTokenAccount: PublicKey;
  /** Unsigned instructions: registration + optional records + primary. */
  instructions: TransactionInstruction[];
  /** Record types included in the instruction set. */
  records: string[];
}

/**
 * Real implementation of the SNS surface backed by `@bonfida/spl-name-service`
 * v4. All `.sol` inputs throw; all outputs display `.sns`.
 */
export class SnsModule {
  readonly connection: Connection;
  readonly sapProgramId: PublicKey;
  readonly defaultCommitment: Commitment;

  constructor(config: {
    connection: Connection;
    sapProgramId: string | PublicKey;
    defaultCommitment?: Commitment;
  }) {
    this.connection = config.connection;
    this.sapProgramId =
      typeof config.sapProgramId === "string"
        ? new PublicKey(config.sapProgramId)
        : config.sapProgramId;
    this.defaultCommitment = config.defaultCommitment ?? "confirmed";
  }

  // ── Resolution ──────────────────────────────────────────────────────────

  /** Resolves a full `.sns` domain to its owner; `null` when absent. */
  async resolve(domain: string): Promise<PublicKey | null> {
    const full = toFullSnsName(domain);
    try {
      return await resolve(this.connection, full);
    } catch (error) {
      if (error instanceof DomainDoesNotExist) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Same as {@link SnsModule.resolve} with the SNS safety routing
   * (`safeResolve`): a SRS-backed mirror resolves only when the legacy and
   * SNS namespaces agree. This is the forward-looking resolution entry point
   * for Stage 2.
   */
  async resolveWithSafetyCheck(domain: string): Promise<PublicKey | null> {
    const full = toFullSnsName(domain);
    try {
      return await safeResolve(this.connection, full);
    } catch (error) {
      if (error instanceof DomainDoesNotExist) {
        return null;
      }
      throw error;
    }
  }

  /**
   * The wallet's primary `.sns` domain, ready for display; `null` when unset
   * or stale (wallet no longer owns it).
   */
  async resolveWalletPrimaryDomain(wallet: PublicKey): Promise<string | null> {
    try {
      const primary = await getPrimaryDomain(this.connection, wallet);
      if (primary.stale) {
        return null;
      }
      return toFullSnsName(primary.reverse);
    } catch (error) {
      if (
        error instanceof PrimaryDomainNotFoundError ||
        error instanceof AccountDoesNotExistError
      ) {
        return null;
      }
      throw error;
    }
  }

  /** All registry-owned (non-tokenized) `.sns` domains of a wallet. */
  async getSnsDomainsForWallet(wallet: PublicKey): Promise<string[]> {
    const domains = await getSnsDomainsForOwner(this.connection, wallet);
    return domains.map((entry) => entry.domain);
  }

  // ── Reads ────────────────────────────────────────────────────────────────

  /** Reads a single record value; `null` when the record does not exist. */
  async getRecordValue(
    domain: string,
    recordType: string,
  ): Promise<string | null> {
    const full = toFullSnsName(domain);
    const record = parseSnsRecordType(recordType);
    try {
      const result = await getRecord(this.connection, full, record, {
        deserialize: true,
      });
      return result.deserializedContent ?? null;
    } catch (error) {
      if (error instanceof AccountDoesNotExistError) {
        return null;
      }
      throw error;
    }
  }

  // ── Availability ─────────────────────────────────────────────────────────

  /**
   * Availability check: derives the SNS name-account PDA locally and verifies
   * the on-chain account is absent. Deterministic, no side effects.
   */
  async checkAvailability(domainName: string): Promise<boolean> {
    const bare = toFullSnsName(domainName).slice(0, -SNS_SUFFIX.length);
    const { pubkey } = getSnsDomainKeySync(bare);
    return (await this.connection.getAccountInfo(pubkey)) === null;
  }

  /** Availability for a list of domains (bounded work per call is 25). */
  async batchCheckAvailability(
    domainNames: string[],
  ): Promise<Map<string, boolean>> {
    if (domainNames.length > 25) {
      throw new Error("batchCheckAvailability accepts at most 25 domains");
    }
    const entries = await Promise.all(
      domainNames.map(async (domainName) => {
        const full = toFullSnsName(domainName);
        return [full, await this.checkAvailability(full)] as const;
      }),
    );
    return new Map(entries);
  }

  // ── Writes (unsigned builders) ───────────────────────────────────────────

  /** Derives a record's V1 PDA deterministically. */
  getRecordPda(domain: string, recordType: string): PublicKey {
    const full = toFullSnsName(domain);
    const record = parseSnsRecordType(recordType);
    return getRecordV1Key(full, record);
  }

  /** Derives the SNS name-account PDA for a `.sns` domain. */
  getDomainPda(domain: string): PublicKey {
    const full = toFullSnsName(domain);
    const bare = full.slice(0, -SNS_SUFFIX.length);
    return getSnsDomainKeySync(bare).pubkey;
  }

  /**
   * Builds unsigned instructions to register a `.sns` domain: registration
   * (USDC fee path), optional record creation from the params map, and
   * optional primary-domain assignment. The `SOL` record is on-chain derived,
   * so it is always skipped when present in the map.
   */
  async buildRegistrationInstructions(
    params: SnsRegistrationParams,
  ): Promise<SnsRegistrationBuildResult> {
    const buyer = params.signer.publicKey;
    const buyerTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, buyer);
    const full = toFullSnsName(params.domainName);
    const recordTypes: string[] = [];

    const instructions: TransactionInstruction[] = [
      ...(await registerDomain(
        full,
        params.space ?? DEFAULT_DOMAIN_SPACE,
        buyer,
        buyerTokenAccount,
      )),
    ];

    for (const [label, content] of Object.entries(params.records ?? {})) {
      if (label.toUpperCase() === "SOL") {
        continue;
      }
      const record = parseSnsRecordType(label);
      instructions.push(createRecord(full, record, content, buyer, buyer));
      recordTypes.push(record);
    }

    const bare = full.slice(0, -SNS_SUFFIX.length);
    const { pubkey: domainPda } = getSnsDomainKeySync(bare);
    if (params.setAsPrimary) {
      instructions.push(
        await setPrimaryDomain(this.connection, domainPda, buyer),
      );
    }

    return {
      domain: full,
      domainPda,
      buyerTokenAccount,
      instructions,
      records: recordTypes,
    };
  }

  /** Historical surface: registration + display metadata. */
  async registerAgentDomain(
    params: SnsRegistrationParams,
  ): Promise<SnsRegistrationResult> {
    const built = await this.buildRegistrationInstructions(params);
    const [agentPda] = deriveAgent(params.agentWallet, this.sapProgramId);
    return {
      domain: built.domain,
      domainPda: built.domainPda,
      agentPda: agentPda as PublicKey,
      instructions: built.instructions,
      buyerTokenAccount: built.buyerTokenAccount,
      setAsPrimary: params.setAsPrimary ?? false,
      records: built.records,
    };
  }

  /** Unsigned instructions to set a `.sns` domain as the wallet primary. */
  async buildSetPrimaryDomainInstructions(
    owner: PublicKey,
    domain: string,
  ): Promise<TransactionInstruction[]> {
    const full = toFullSnsName(domain);
    const bare = full.slice(0, -SNS_SUFFIX.length);
    const { pubkey } = getSnsDomainKeySync(bare);
    return [await setPrimaryDomain(this.connection, pubkey, owner)];
  }

  /**
   * Unsigned instruction(s) to manage a record: create when absent, update
   * when present, delete when `content` is `null`.
   */
  async buildManageRecordInstructions(
    owner: PublicKey,
    domain: string,
    recordType: string,
    content: string | null,
    payer: PublicKey = owner,
  ): Promise<TransactionInstruction[]> {
    const full = toFullSnsName(domain);
    const record = parseSnsRecordType(recordType);
    if (content === null) {
      return [deleteRecord(full, record, owner, payer)];
    }
    const existing = await this.getRecordValue(full, recordType);
    return [
      existing !== null
        ? updateRecord(full, record, content, owner, payer)
        : createRecord(full, record, content, owner, payer),
    ];
  }

  // ── Historical compound read ─────────────────────────────────────────────

  /**
   * Resolves a `.sns` domain to the SAP agent identity surface: owner wallet,
   * derived SAP agent PDA and the metadata parsed from the TXT payload.
   */
  async resolveAgentDomain(
    domain: string,
  ): Promise<SnsResolutionResult | null> {
    const wallet = await this.resolve(domain);
    if (wallet === null) {
      return null;
    }
    const [agentPda] = deriveAgent(wallet, this.sapProgramId);
    const records: { [key: string]: string } = {};

    for (const recordType of ["txt", "sol", "url", "pic"]) {
      try {
        const value = await this.getRecordValue(
          toFullSnsName(domain),
          recordType,
        );
        if (value !== null) {
          records[recordType.toUpperCase()] = value;
        }
      } catch {
        // Unreadable record types should not fail the domain resolution.
      }
    }

    let metadata: SnsResolutionResult["metadata"] = {};
    const txtRaw = records["TXT"];
    if (txtRaw) {
      try {
        const parsed = JSON.parse(txtRaw) as {
          agent_endpoint?: string;
          metadata_uri?: string;
          capabilities?: string;
          web2_domain?: string;
          agent_pda?: string;
        };
        metadata = {
          agentEndpoint: parsed.agent_endpoint,
          metadataUri: parsed.metadata_uri,
          capabilities: parsed.capabilities
            ? parsed.capabilities.split(",").map((c) => c.trim())
            : undefined,
          web2Domain: parsed.web2_domain,
        };
      } catch {
        metadata = { agentUri: txtRaw };
      }
    }

    return {
      domain: toFullSnsName(domain),
      agentPda: agentPda as PublicKey,
      wallet,
      metadata,
      records,
    };
  }

  /** Validates SAP compatibility of the records exposed by a `.sns` domain. */
  async validateAgentRecords(domain: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const full = toFullSnsName(domain);

    const txt = await this.getRecordValue(full, "txt");
    if (!txt) {
      warnings.push(
        "TXT record is missing; SAP capability metadata cannot be discovered from SNS.",
      );
    } else if (!txt.trim().startsWith("{")) {
      // Structured SAP payloads are JSON; free-form TXT is accepted with a warning.
      warnings.push(
        "TXT record is present but is not a structured SAP JSON payload.",
      );
    }

    const sol = await this.getRecordValue(full, "sol");
    if (!sol) {
      warnings.push(
        "SOL record is missing; resolution falls back to the domain owner.",
      );
    } else {
      try {
        new PublicKey(sol.trim());
      } catch {
        errors.push(
          "SOL record is present but is not a valid base58 public key.",
        );
      }
    }

    const pic = await this.getRecordValue(full, "pic");
    if (!pic) {
      warnings.push(
        "Pic record is missing; agent marketplaces may not show an avatar.",
      );
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
