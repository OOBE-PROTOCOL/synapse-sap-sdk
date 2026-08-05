/**
 * @module modules/sns
 * @description Deprecated SNS integration surface.
 *
 * The previous implementation depended on a non-existent npm package
 * (`@bonfida/spl-name-service`) and could not be installed by clean consumers.
 * Keep this module as an explicit fail-fast surface until SNS is migrated to a
 * current Solana Name Service SDK and tested end to end.
 */

import { PublicKey, type Connection, type Commitment } from "@solana/web3.js";
import type {
  SnsRegistrationParams,
  SnsRegistrationResult,
  SnsResolutionResult,
} from "../types/sns.js";

const SNS_DEPRECATED_MESSAGE =
  "SNS integration is deprecated in @oobe-protocol-labs/synapse-sap-sdk@1.0.3. " +
  "The previous Bonfida package name is not available on npm, so this surface " +
  "is disabled until it is migrated to a current Solana Name Service SDK and " +
  "covered by release tests.";

function unavailable(): never {
  throw new Error(SNS_DEPRECATED_MESSAGE);
}

/**
 * @deprecated SNS is disabled in v1.0.3 because the previous dependency is not
 * installable from npm. Do not use this module in production paths.
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

  async checkAvailability(_domainName: string): Promise<boolean> {
    return unavailable();
  }

  async registerAgentDomain(
    _params: SnsRegistrationParams,
  ): Promise<SnsRegistrationResult> {
    return unavailable();
  }

  async resolveAgentDomain(
    _domain: string,
  ): Promise<SnsResolutionResult | null> {
    return unavailable();
  }

  async validateAgentRecords(
    _domain: string,
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    return unavailable();
  }

  async batchCheckAvailability(
    _domainNames: string[],
  ): Promise<Map<string, boolean>> {
    return unavailable();
  }
}

export const SNS_INTEGRATION_DEPRECATED = SNS_DEPRECATED_MESSAGE;
