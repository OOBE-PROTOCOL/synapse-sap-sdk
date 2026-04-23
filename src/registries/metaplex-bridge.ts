/**
 * @module registries/metaplex-bridge
 * @description Bridge between Synapse Agent Protocol (SAP) and Metaplex
 * Core's `AgentIdentity` external plugin adapter (mpl-core ≥ 1.9.0).
 *
 * ## Why this design (verified against mpl-core PR #258, v1.9.0)
 *
 * The MPL Core `AgentIdentity` plugin has exactly one field:
 *
 * ```ts
 * type AgentIdentity = { uri: string };
 * ```
 *
 * The URI must point to an **EIP-8004** agent registration JSON. There is
 * no on-chain executive list, no `addExecutive` / `delegateExecutionV1`
 * instruction. Capabilities, services, executives, and reputation live
 * off-chain in that JSON. The plugin only hooks the `Execute` lifecycle
 * event, allowing the URI's authority to gate execution.
 *
 * The most efficient SAP × MPL integration therefore is:
 *
 *   1. SAP serves a **live EIP-8004 JSON** at a deterministic URL derived
 *      from the SAP `AgentAccount` PDA (e.g.
 *      `https://explorer.oobeprotocol.ai/agents/<sapAgentPda>/eip-8004.json`).
 *   2. The MPL Core asset attaches an `AgentIdentity` adapter whose `uri`
 *      points to that URL.
 *   3. Every SAP write (capability change, vault delegate add/revoke, x402
 *      tier update) is reflected in the JSON automatically — **no second
 *      transaction required, on either chain or for any wallet.**
 *
 * One SAP transaction = both protocols updated. That is the efficiency
 * win that motivated the Phase 1 redesign on 2026-04-22.
 *
 * @category Registries
 * @since v0.9.0
 * @see https://github.com/metaplex-foundation/mpl-core/pull/258
 * @see https://eips.ethereum.org/EIPS/eip-8004
 */

import {
  PublicKey,
  type TransactionInstruction,
} from "@solana/web3.js";
import type {
  AssetV1,
  HookableLifecycleEvent as HookableLifecycleEventEnum,
} from "@metaplex-foundation/mpl-core";
import type {
  Instruction as UmiInstruction,
  PublicKey as UmiPublicKey,
  Signer as UmiSigner,
  TransactionBuilder,
  Umi,
} from "@metaplex-foundation/umi";
import type { SapProgram } from "../modules/base";
import { deriveAgent, deriveAgentStats, deriveVault } from "../pda";
import type {
  AgentAccountData,
  AgentStatsData,
  Capability,
  VaultDelegateData,
} from "../types";

// ═══════════════════════════════════════════════════════════════════
//  Typed peer-dep handles (lazy-loaded)
// ═══════════════════════════════════════════════════════════════════

type MplCoreModule = typeof import("@metaplex-foundation/mpl-core");
type UmiBundleModule = typeof import("@metaplex-foundation/umi-bundle-defaults");
type UmiModule = typeof import("@metaplex-foundation/umi");

interface MplCoreRuntime {
  readonly mplCore: MplCoreModule;
  readonly umiBundle: UmiBundleModule;
  readonly umiCore: UmiModule;
}

// ═══════════════════════════════════════════════════════════════════
//  Public Types
// ═══════════════════════════════════════════════════════════════════

/**
 * @interface Eip8004Service
 * @description One service entry in an EIP-8004 registration document.
 * @category Registries
 * @since v0.9.0
 */
export interface Eip8004Service {
  readonly id: string;
  readonly type: string;
  readonly url: string;
  readonly priceLamports?: string;
}

/**
 * @interface Eip8004Registration
 * @description Subset of an EIP-8004 registration document used by the
 * bridge. Hosts may include additional fields; they are passed through
 * via `extra`.
 * @category Registries
 * @since v0.9.0
 */
export interface Eip8004Registration {
  readonly version: string;
  readonly name: string;
  readonly description?: string;
  readonly synapseAgent: string;
  readonly authority: string;
  readonly capabilities: readonly string[];
  readonly services: readonly Eip8004Service[];
  readonly executives: readonly { wallet: string; expiresAt: string | null }[];
  readonly updatedAt: string;
  readonly extra?: Record<string, unknown>;
}

/**
 * @interface AttachAgentIdentityOpts
 * @description Parameters for {@link MetaplexBridge.buildAttachAgentIdentityIx}.
 * @category Registries
 * @since v0.9.0
 */
export interface AttachAgentIdentityOpts {
  readonly asset: PublicKey;
  readonly authority: PublicKey;
  readonly payer?: PublicKey;
  readonly sapAgentOwner: PublicKey;
  readonly registrationBaseUrl: string;
  readonly rpcUrl: string;
}

/**
 * @interface UpdateAgentIdentityUriOpts
 * @description Parameters for {@link MetaplexBridge.buildUpdateAgentIdentityUriIx}.
 * @category Registries
 * @since v0.9.0
 */
export interface UpdateAgentIdentityUriOpts {
  readonly asset: PublicKey;
  readonly authority: PublicKey;
  readonly payer?: PublicKey;
  readonly newUri: string;
  readonly rpcUrl: string;
}

/**
 * @interface MplAgentSnapshot
 * @description Subset of an MPL Core Asset relevant to the bridge.
 * @category Registries
 * @since v0.9.0
 */
export interface MplAgentSnapshot {
  readonly asset: PublicKey;
  readonly owner: PublicKey;
  readonly name: string | null;
  readonly agentIdentityUri: string | null;
  readonly registration: Eip8004Registration | null;
}

/**
 * @interface UnifiedProfile
 * @description Merged read-only profile combining SAP identity and an
 * (optional) MPL Core asset side. The `linked` flag is `true` when the
 * MPL asset's `AgentIdentity.uri` references the SAP agent PDA both in
 * the URL path and in the `synapseAgent` JSON field.
 * @category Registries
 * @since v0.9.0
 */
export interface UnifiedProfile {
  readonly sap: {
    readonly pda: PublicKey;
    readonly identity: AgentAccountData | null;
    readonly stats: AgentStatsData | null;
  };
  readonly mpl: MplAgentSnapshot | null;
  readonly linked: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  Lazy peer-dep loader
// ═══════════════════════════════════════════════════════════════════

const PEER_DEP_INSTALL_HINT =
  "MetaplexBridge requires @metaplex-foundation/mpl-core (>=1.9.0) and " +
  "@metaplex-foundation/umi-bundle-defaults. " +
  "Install: npm i @metaplex-foundation/mpl-core @metaplex-foundation/umi-bundle-defaults";

let cachedRuntime: MplCoreRuntime | null = null;

async function loadMplCore(): Promise<MplCoreRuntime> {
  if (cachedRuntime) return cachedRuntime;
  try {
    const [mplCore, umiBundle, umiCore] = await Promise.all([
      import("@metaplex-foundation/mpl-core"),
      import("@metaplex-foundation/umi-bundle-defaults"),
      import("@metaplex-foundation/umi"),
    ]);
    cachedRuntime = { mplCore, umiBundle, umiCore };
    return cachedRuntime;
  } catch (cause) {
    throw new Error(PEER_DEP_INSTALL_HINT, { cause: cause as Error });
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Typed SAP account namespace (Anchor IDL is generic; this struct
//  pins the only three accessors this module needs.)
// ═══════════════════════════════════════════════════════════════════

interface AnchorAccountFetcher<T> {
  fetch(address: PublicKey): Promise<T>;
}

interface AnchorAccountList<T> {
  all(
    filters?: ReadonlyArray<{
      memcmp: { offset: number; bytes: string };
    }>,
  ): Promise<{ publicKey: PublicKey; account: T }[]>;
}

interface SapAccountNamespace {
  agentAccount: AnchorAccountFetcher<AgentAccountData>;
  agentStats: AnchorAccountFetcher<AgentStatsData>;
  vaultDelegate: AnchorAccountList<VaultDelegateData>;
}

// ═══════════════════════════════════════════════════════════════════
//  MetaplexBridge
// ═══════════════════════════════════════════════════════════════════

/**
 * @name MetaplexBridge
 * @description Read-side merger and write-side instruction composer for
 * SAP × Metaplex Core `AgentIdentity` integration.
 *
 * Linking is **single-transaction**: the MPL `addExternalPluginAdapterV1`
 * instruction sets a URI that points at SAP's live registration host.
 * Subsequent SAP state changes propagate automatically — no extra MPL
 * transaction required.
 *
 * @category Registries
 * @since v0.9.0
 */
export class MetaplexBridge {
  constructor(private readonly program: SapProgram) {}

  // ─────────────────────────────────────────────────────
  //  Pure helpers
  // ─────────────────────────────────────────────────────

  /**
   * @name deriveRegistrationUrl
   * @description Compute the deterministic EIP-8004 registration URL for
   * a SAP agent. Hosts MUST serve the JSON at exactly this path so that
   * {@link MetaplexBridge.verifyLink} validates without external config.
   *
   * @since v0.9.0
   */
  deriveRegistrationUrl(sapAgentPda: PublicKey, baseUrl: string): string {
    const trimmed = baseUrl.replace(/\/+$/, "");
    return `${trimmed}/agents/${sapAgentPda.toBase58()}/eip-8004.json`;
  }

  /**
   * @name buildEip8004Registration
   * @description Build a canonical EIP-8004 JSON document for a SAP agent.
   * Designed to be called server-side by a registry host.
   *
   * @since v0.9.0
   */
  async buildEip8004Registration(args: {
    sapAgentOwner: PublicKey;
    services?: readonly Eip8004Service[];
    extra?: Record<string, unknown>;
  }): Promise<Eip8004Registration> {
    const [sapPda] = deriveAgent(args.sapAgentOwner);
    const identity = await this.fetchAgentNullable(sapPda);
    if (!identity) {
      throw new Error(
        `buildEip8004Registration: SAP agent not found for owner ${args.sapAgentOwner.toBase58()}`,
      );
    }
    const delegates = await this.fetchActiveVaultDelegates(sapPda);
    return {
      version: "0.1",
      name: this.readString(identity, "name") ?? "Synapse Agent",
      description: this.readString(identity, "description") ?? undefined,
      synapseAgent: sapPda.toBase58(),
      authority: args.sapAgentOwner.toBase58(),
      capabilities: this.readCapabilities(identity),
      services: args.services ?? [],
      executives: delegates,
      updatedAt: new Date().toISOString(),
      extra: args.extra,
    };
  }

  // ─────────────────────────────────────────────────────
  //  Write side — build MPL instructions only
  // ─────────────────────────────────────────────────────

  /**
   * @name buildAttachAgentIdentityIx
   * @description Build the MPL Core `addExternalPluginAdapterV1`
   * `TransactionInstruction` that attaches an `AgentIdentity` plugin
   * pointing at SAP's live EIP-8004 registration URL.
   *
   * @since v0.9.0
   */
  async buildAttachAgentIdentityIx(
    opts: AttachAgentIdentityOpts,
  ): Promise<TransactionInstruction> {
    const [sapPda] = deriveAgent(opts.sapAgentOwner);
    const uri = this.deriveRegistrationUrl(sapPda, opts.registrationBaseUrl);
    return this.buildAddExternalPluginIx({
      asset: opts.asset,
      authority: opts.authority,
      payer: opts.payer ?? opts.authority,
      uri,
      rpcUrl: opts.rpcUrl,
    });
  }

  /**
   * @name buildUpdateAgentIdentityUriIx
   * @description Build the MPL Core `updateExternalPluginAdapterV1`
   * instruction that re-points an existing `AgentIdentity` plugin.
   *
   * @since v0.9.0
   */
  async buildUpdateAgentIdentityUriIx(
    opts: UpdateAgentIdentityUriOpts,
  ): Promise<TransactionInstruction> {
    const { mplCore, umiBundle, umiCore } = await loadMplCore();
    const umi: Umi = umiBundle.createUmi(opts.rpcUrl).use(mplCore.mplCore());
    const authority: UmiSigner = umiCore.createNoopSigner(
      umiCore.publicKey(opts.authority.toBase58()),
    );
    const payer: UmiSigner = umiCore.createNoopSigner(
      umiCore.publicKey((opts.payer ?? opts.authority).toBase58()),
    );
    const builder: TransactionBuilder = mplCore.updateExternalPluginAdapterV1(
      umi,
      {
        asset: umiCore.publicKey(opts.asset.toBase58()),
        authority,
        payer,
        key: { __kind: "AgentIdentity" },
        updateInfo: {
          __kind: "AgentIdentity",
          fields: [
            {
              uri: opts.newUri,
              lifecycleChecks: null,
            },
          ],
        },
      },
    );
    return this.firstWeb3Ix(builder, "updateExternalPluginAdapterV1");
  }

  // ─────────────────────────────────────────────────────
  //  Read side
  // ─────────────────────────────────────────────────────

  /**
   * @name getUnifiedProfile
   * @description Fetch a merged view of an agent across SAP and Metaplex.
   * Provide `wallet` (SAP-first) or `asset` (MPL-first), or both.
   *
   * @since v0.9.0
   */
  async getUnifiedProfile(input: {
    wallet?: PublicKey;
    asset?: PublicKey;
    rpcUrl: string;
  }): Promise<UnifiedProfile> {
    if (!input.wallet && !input.asset) {
      throw new Error("getUnifiedProfile: provide `wallet` or `asset`");
    }

    let sapPda: PublicKey | null = null;
    let identity: AgentAccountData | null = null;
    let stats: AgentStatsData | null = null;

    if (input.wallet) {
      [sapPda] = deriveAgent(input.wallet);
      identity = await this.fetchAgentNullable(sapPda);
      stats = await this.fetchStatsNullable(sapPda);
    }

    let mpl: MplAgentSnapshot | null = null;
    if (input.asset) {
      mpl = await this.fetchMplSnapshot(input.asset, input.rpcUrl);
      if (!sapPda && mpl?.registration?.synapseAgent) {
        try {
          sapPda = new PublicKey(mpl.registration.synapseAgent);
          identity = await this.fetchAgentNullable(sapPda);
          stats = await this.fetchStatsNullable(sapPda);
        } catch {
          /* invalid PDA in JSON */
        }
      }
    }

    if (!sapPda) {
      throw new Error("getUnifiedProfile: failed to resolve SAP agent PDA");
    }

    return {
      sap: { pda: sapPda, identity, stats },
      mpl,
      linked: this.detectLink(sapPda, mpl),
    };
  }

  /**
   * @name verifyLink
   * @description Verify the bidirectional link between an MPL Core asset
   * and a SAP agent. Returns `true` only when both URL and JSON sides
   * reference the SAP agent PDA.
   *
   * @since v0.9.0
   */
  async verifyLink(args: {
    asset: PublicKey;
    sapAgentPda: PublicKey;
    rpcUrl: string;
  }): Promise<boolean> {
    const snap = await this.fetchMplSnapshot(args.asset, args.rpcUrl);
    if (!snap?.agentIdentityUri || !snap.registration) return false;
    const expectedSuffix = `/agents/${args.sapAgentPda.toBase58()}/eip-8004.json`;
    if (!snap.agentIdentityUri.endsWith(expectedSuffix)) return false;
    return snap.registration.synapseAgent === args.sapAgentPda.toBase58();
  }

  // ═════════════════════════════════════════════════════
  //  Private — SAP fetching
  // ═════════════════════════════════════════════════════

  private get accounts(): SapAccountNamespace {
    return this.program.account as unknown as SapAccountNamespace;
  }

  private async fetchAgentNullable(
    pda: PublicKey,
  ): Promise<AgentAccountData | null> {
    try {
      return await this.accounts.agentAccount.fetch(pda);
    } catch {
      return null;
    }
  }

  private async fetchStatsNullable(
    agentPda: PublicKey,
  ): Promise<AgentStatsData | null> {
    try {
      const [statsPda] = deriveAgentStats(agentPda);
      return await this.accounts.agentStats.fetch(statsPda);
    } catch {
      return null;
    }
  }

  private async fetchActiveVaultDelegates(
    agentPda: PublicKey,
  ): Promise<{ wallet: string; expiresAt: string | null }[]> {
    try {
      const [vaultPda] = deriveVault(agentPda);
      // VaultDelegate layout: [discriminator(8) | bump(1) | vault(32) | ...]
      const all = await this.accounts.vaultDelegate.all([
        { memcmp: { offset: 8 + 1, bytes: vaultPda.toBase58() } },
      ]);
      const now = Math.floor(Date.now() / 1000);
      return all
        .map(({ account }) => {
          const expiresRaw = account.expiresAt.toString();
          const expiresAt: string | null =
            expiresRaw === "0" ? null : expiresRaw;
          return { wallet: account.delegate.toBase58(), expiresAt };
        })
        .filter((d) => d.expiresAt === null || Number(d.expiresAt) > now);
    } catch {
      return [];
    }
  }

  // ═════════════════════════════════════════════════════
  //  Private — MPL fetching
  // ═════════════════════════════════════════════════════

  private async fetchMplSnapshot(
    asset: PublicKey,
    rpcUrl: string,
  ): Promise<MplAgentSnapshot | null> {
    const { mplCore, umiBundle, umiCore } = await loadMplCore();
    const umi: Umi = umiBundle.createUmi(rpcUrl).use(mplCore.mplCore());
    try {
      const fetched: AssetV1 = await mplCore.fetchAsset(
        umi,
        umiCore.publicKey(asset.toBase58()),
      );
      const owner = new PublicKey(fetched.owner.toString());
      const uri = this.extractAgentIdentityUri(fetched);
      const registration = uri ? await this.fetchEip8004Safe(uri) : null;
      return {
        asset,
        owner,
        name: fetched.name ?? null,
        agentIdentityUri: uri,
        registration,
      };
    } catch {
      return null;
    }
  }

  private extractAgentIdentityUri(asset: AssetV1): string | null {
    const adapters = asset.agentIdentities;
    if (!adapters || adapters.length === 0) return null;
    const first = adapters[0];
    if (!first) return null;
    return typeof first.uri === "string" ? first.uri : null;
  }

  private async fetchEip8004Safe(
    uri: string,
  ): Promise<Eip8004Registration | null> {
    try {
      const res = await fetch(uri, { method: "GET" });
      if (!res.ok) return null;
      const json = (await res.json()) as Partial<Eip8004Registration>;
      if (
        typeof json.synapseAgent !== "string" ||
        typeof json.authority !== "string"
      ) {
        return null;
      }
      return {
        version: json.version ?? "0.1",
        name: json.name ?? "",
        description: json.description,
        synapseAgent: json.synapseAgent,
        authority: json.authority,
        capabilities: Array.isArray(json.capabilities) ? json.capabilities : [],
        services: Array.isArray(json.services) ? json.services : [],
        executives: Array.isArray(json.executives) ? json.executives : [],
        updatedAt: json.updatedAt ?? "",
        extra: json.extra,
      };
    } catch {
      return null;
    }
  }

  // ═════════════════════════════════════════════════════
  //  Private — MPL instruction building
  // ═════════════════════════════════════════════════════

  private async buildAddExternalPluginIx(args: {
    asset: PublicKey;
    authority: PublicKey;
    payer: PublicKey;
    uri: string;
    rpcUrl: string;
  }): Promise<TransactionInstruction> {
    const { mplCore, umiBundle, umiCore } = await loadMplCore();
    const umi: Umi = umiBundle.createUmi(args.rpcUrl).use(mplCore.mplCore());
    const authority: UmiSigner = umiCore.createNoopSigner(
      umiCore.publicKey(args.authority.toBase58()),
    );
    const payer: UmiSigner = umiCore.createNoopSigner(
      umiCore.publicKey(args.payer.toBase58()),
    );
    // HookableLifecycleEvent.Execute = 4; ExternalCheckResult { flags: 1 } = CanApprove
    const ExecuteEvent = mplCore.HookableLifecycleEvent.Execute as HookableLifecycleEventEnum;
    const builder: TransactionBuilder = mplCore.addExternalPluginAdapterV1(umi, {
      asset: umiCore.publicKey(args.asset.toBase58()),
      authority,
      payer,
      initInfo: {
        __kind: "AgentIdentity",
        fields: [
          {
            uri: args.uri,
            initPluginAuthority: { __kind: "UpdateAuthority" },
            lifecycleChecks: [[ExecuteEvent, { flags: 1 }]],
          },
        ],
      },
    });
    return this.firstWeb3Ix(builder, "addExternalPluginAdapterV1");
  }

  private async firstWeb3Ix(
    builder: TransactionBuilder,
    name: string,
  ): Promise<TransactionInstruction> {
    const items = builder.getInstructions();
    const first = items[0];
    if (!first) {
      throw new Error(`MetaplexBridge: ${name} produced no instructions`);
    }
    return this.umiIxToWeb3(first);
  }

  private umiIxToWeb3(ix: UmiInstruction): TransactionInstruction {
    return {
      programId: new PublicKey(ix.programId.toString()),
      keys: ix.keys.map((k) => ({
        pubkey: new PublicKey((k.pubkey as UmiPublicKey).toString()),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      })),
      data: Buffer.from(ix.data),
    };
  }

  // ═════════════════════════════════════════════════════
  //  Private — link detection + duck-typed readers
  // ═════════════════════════════════════════════════════

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private detectLink(
    sapPda: PublicKey,
    mpl: MplAgentSnapshot | null,
  ): boolean {
    if (!mpl?.agentIdentityUri || !mpl.registration) return false;
    const expectedSuffix = `/agents/${sapPda.toBase58()}/eip-8004.json`;
    if (!mpl.agentIdentityUri.endsWith(expectedSuffix)) return false;
    return mpl.registration.synapseAgent === sapPda.toBase58();
  }

  private readString(identity: AgentAccountData, key: keyof AgentAccountData): string | null {
    const value = identity[key];
    return typeof value === "string" ? value : null;
  }

  private readCapabilities(identity: AgentAccountData): string[] {
    const caps: ReadonlyArray<Capability> = identity.capabilities ?? [];
    return caps.map((c) => c.id).filter((s): s is string => typeof s === "string");
  }
}
