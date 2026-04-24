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

/**
 * @interface AgentIdentifierResolution
 * @description Resolution result for an agent identifier that may be either
 * an SAP owner wallet or an MPL Core asset address.
 *
 * - `kind = "wallet"`: input is treated as owner wallet.
 * - `kind = "core-asset"`: input is an MPL Core asset; `wallet` is asset owner.
 * - `kind = "unknown"`: input is invalid or cannot be resolved.
 *
 * @category Registries
 * @since v0.9.2
 */
export interface AgentIdentifierResolution {
  readonly input: string;
  readonly kind: "wallet" | "core-asset" | "unknown";
  readonly wallet: PublicKey | null;
  readonly sapAgentPda: PublicKey | null;
  readonly asset: PublicKey | null;
  readonly hasSapAgent: boolean;
  readonly error: string | null;
}

/**
 * @interface RegisterAgentInput
 * @description Minimal input set the bridge needs to construct a SAP
 * `registerAgent` instruction. Exposed independently so the bridge does not
 * import `RegisterAgentArgs` from another module (keeping the public surface flat).
 *
 * @category Registries
 * @since v0.9.3
 */
export interface RegisterAgentInput {
  readonly name: string;
  readonly description: string;
  readonly capabilities: readonly Capability[];
  readonly pricing: unknown;
  readonly protocols: readonly number[];
  readonly agentId?: string | null;
  readonly agentUri?: string | null;
  readonly x402Endpoint?: string | null;
}

/**
 * @interface MintAttachOpts
 * @description Inputs for {@link MetaplexBridge.buildMintAndAttachIxs}.
 * Builds: MPL Core `create` (mint a fresh asset) + `addExternalPluginAdapterV1`
 * (attach AgentIdentity → SAP EIP-8004 URL) — produced as two web3.js
 * instructions in deterministic order.
 *
 * The caller MUST sign with the returned `assetSigner` in addition to the
 * wallet authority, since Core mint requires the asset keypair as a signer.
 *
 * @category Registries
 * @since v0.9.3
 */
export interface MintAttachOpts {
  readonly sapAgentOwner: PublicKey;
  readonly authority: PublicKey;
  readonly payer?: PublicKey;
  readonly owner?: PublicKey;
  readonly name: string;
  readonly metadataUri: string;
  readonly registrationBaseUrl: string;
  readonly rpcUrl: string;
  readonly collection?: PublicKey;
}

/**
 * @interface MintAttachResult
 * @description Return shape of {@link MetaplexBridge.buildMintAndAttachIxs}
 * and the mint half of {@link MetaplexBridge.buildRegisterBothIxs}.
 *
 * `assetSecretKey` is the freshly generated asset keypair's secret. The
 * caller is responsible for safe handling: server-side flows should
 * partial-sign the assembled transaction with it and then discard.
 *
 * @category Registries
 * @since v0.9.3
 */
export interface MintAttachResult {
  readonly assetAddress: PublicKey;
  readonly assetSecretKey: Uint8Array;
  readonly registrationUrl: string;
  readonly instructions: readonly TransactionInstruction[];
}

/**
 * @interface SapForMplOpts
 * @description Inputs for {@link MetaplexBridge.buildRegisterSapForMplOwnerIx}.
 * Resolves the owner of `asset`, derives that owner's SAP PDA, and (if no
 * agent exists yet) returns the `registerAgent` instruction the owner must sign.
 *
 * @category Registries
 * @since v0.9.3
 */
export interface SapForMplOpts {
  readonly asset: PublicKey;
  readonly registerArgs: RegisterAgentInput;
  readonly rpcUrl: string;
}

/**
 * @interface SapForMplResult
 * @description Result of {@link MetaplexBridge.buildRegisterSapForMplOwnerIx}.
 * `instruction` is `null` when the asset owner already has a SAP agent
 * (idempotent: nothing to do).
 *
 * @category Registries
 * @since v0.9.3
 */
export interface SapForMplResult {
  readonly assetOwner: PublicKey;
  readonly sapAgentPda: PublicKey;
  readonly alreadyRegistered: boolean;
  readonly currentAgentIdentityUri: string | null;
  readonly instruction: TransactionInstruction | null;
}

/**
 * @interface RegisterBothOpts
 * @description Inputs for {@link MetaplexBridge.buildRegisterBothIxs}.
 * Builds the atomic SAP `registerAgent` + MPL Core `create` + `AgentIdentity`
 * attach sequence for a wallet that owns neither side yet.
 *
 * @category Registries
 * @since v0.9.3
 */
export interface RegisterBothOpts {
  readonly wallet: PublicKey;
  readonly payer?: PublicKey;
  readonly registerArgs: RegisterAgentInput;
  readonly mintName: string;
  readonly mintMetadataUri: string;
  readonly registrationBaseUrl: string;
  readonly rpcUrl: string;
  readonly collection?: PublicKey;
}

/**
 * @interface RegisterBothResult
 * @description Result of {@link MetaplexBridge.buildRegisterBothIxs}.
 * Instructions are ordered: `[0]` SAP `registerAgent`, `[1]` MPL Core mint,
 * `[2]` MPL `AgentIdentity` attach. All three execute atomically inside one
 * transaction signed by the wallet + `assetSecretKey`.
 *
 * @category Registries
 * @since v0.9.3
 */
export interface RegisterBothResult {
  readonly sapAgentPda: PublicKey;
  readonly assetAddress: PublicKey;
  readonly assetSecretKey: Uint8Array;
  readonly registrationUrl: string;
  readonly instructions: readonly TransactionInstruction[];
}

/**
 * @interface TripleCheckResult
 * @description Result of {@link MetaplexBridge.tripleCheckLink} — the explicit
 * 3-layer verification used by explorer/host badges.
 *
 *  - `mplOnChain`: MPL Core asset fetched on-chain via mpl-core (gRPC/RPC).
 *  - `eip8004Json`: registration JSON fetched from `agentIdentityUri` and
 *    its `synapseAgent` matches the SAP PDA.
 *  - `sapOnChain`: a SAP `AgentAccount` exists on-chain at that PDA.
 *
 * `linked = true` only when **all three** layers pass.
 *
 * @category Registries
 * @since v0.9.3
 */
export interface TripleCheckResult {
  readonly asset: PublicKey;
  readonly sapAgentPda: PublicKey;
  readonly mplOnChain: boolean;
  readonly eip8004Json: boolean;
  readonly sapOnChain: boolean;
  readonly linked: boolean;
  readonly agentIdentityUri: string | null;
  readonly registration: Eip8004Registration | null;
  readonly identity: AgentAccountData | null;
  readonly error: string | null;
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
  //  Write side — combined SAP × MPL register flows (v0.9.3)
  // ─────────────────────────────────────────────────────

  /**
   * @name buildMintAndAttachIxs
   * @description Build the two MPL Core instructions needed to mint a new
   * asset for an existing SAP agent and immediately bind it via the
   * `AgentIdentity` plugin (URI = canonical EIP-8004 URL).
   *
   * Flow:
   *   1. Generate a fresh asset keypair (returned as `assetSecretKey`).
   *   2. Build `mpl_core::create` with the new asset as signer.
   *   3. Build `addExternalPluginAdapterV1` for the AgentIdentity URI.
   *
   * The returned `instructions` are deterministic order. The caller
   * partial-signs the assembled transaction with `assetSecretKey` and the
   * authority/payer wallet.
   *
   * @since v0.9.3
   */
  async buildMintAndAttachIxs(opts: MintAttachOpts): Promise<MintAttachResult> {
    const { mplCore, umiBundle, umiCore } = await loadMplCore();
    const umi: Umi = umiBundle.createUmi(opts.rpcUrl).use(mplCore.mplCore());

    const [sapPda] = deriveAgent(opts.sapAgentOwner);
    const registrationUrl = this.deriveRegistrationUrl(
      sapPda,
      opts.registrationBaseUrl,
    );

    const assetUmiSigner = umiCore.generateSigner(umi);
    const assetAddress = new PublicKey(assetUmiSigner.publicKey.toString());
    const assetSecretKey = assetUmiSigner.secretKey;

    const authority: UmiSigner = umiCore.createNoopSigner(
      umiCore.publicKey(opts.authority.toBase58()),
    );
    const payer: UmiSigner = umiCore.createNoopSigner(
      umiCore.publicKey((opts.payer ?? opts.authority).toBase58()),
    );
    const ownerUmi = opts.owner
      ? umiCore.publicKey(opts.owner.toBase58())
      : umiCore.publicKey(opts.authority.toBase58());

    const createBuilder: TransactionBuilder = mplCore.create(umi, {
      asset: assetUmiSigner,
      collection: opts.collection
        ? ({ publicKey: umiCore.publicKey(opts.collection.toBase58()) } as never)
        : undefined,
      authority,
      payer,
      owner: ownerUmi,
      name: opts.name,
      uri: opts.metadataUri,
    });
    const mintIx = await this.firstWeb3Ix(createBuilder, "mpl_core::create");

    const attachIx = await this.buildAddExternalPluginIx({
      asset: assetAddress,
      authority: opts.authority,
      payer: opts.payer ?? opts.authority,
      uri: registrationUrl,
      rpcUrl: opts.rpcUrl,
    });

    return {
      assetAddress,
      assetSecretKey,
      registrationUrl,
      instructions: [mintIx, attachIx],
    };
  }

  /**
   * @name buildRegisterSapForMplOwnerIx
   * @description Given an existing MPL Core asset, resolve its on-chain
   * owner and build the SAP `registerAgent` instruction the owner must
   * sign. Idempotent: if a SAP agent already exists for that owner the
   * method returns `instruction: null` with `alreadyRegistered: true`.
   *
   * Use after a wallet has minted (or holds) an MPL Core agent NFT and
   * wants to back-fill a SAP identity at the canonical PDA so the bridge's
   * EIP-8004 URL becomes resolvable.
   *
   * @since v0.9.3
   */
  async buildRegisterSapForMplOwnerIx(
    opts: SapForMplOpts,
  ): Promise<SapForMplResult> {
    const snap = await this.fetchMplSnapshot(opts.asset, opts.rpcUrl);
    if (!snap) {
      throw new Error(
        `buildRegisterSapForMplOwnerIx: MPL Core asset ${opts.asset.toBase58()} not readable`,
      );
    }
    const [sapPda] = deriveAgent(snap.owner);
    const existing = await this.fetchAgentNullable(sapPda);
    if (existing) {
      return {
        assetOwner: snap.owner,
        sapAgentPda: sapPda,
        alreadyRegistered: true,
        currentAgentIdentityUri: snap.agentIdentityUri,
        instruction: null,
      };
    }

    const ix = await this.buildRegisterAgentIx({
      wallet: snap.owner,
      args: opts.registerArgs,
    });
    return {
      assetOwner: snap.owner,
      sapAgentPda: sapPda,
      alreadyRegistered: false,
      currentAgentIdentityUri: snap.agentIdentityUri,
      instruction: ix,
    };
  }

  /**
   * @name buildRegisterBothIxs
   * @description Atomic 3-instruction bundle for a wallet that owns
   * neither side: `[SAP registerAgent, MPL Core create, MPL AgentIdentity attach]`.
   * Single transaction, single user signature (plus the ephemeral asset
   * keypair returned in `assetSecretKey`).
   *
   * Throws if a SAP agent already exists for `wallet` — callers should
   * fall through to {@link MetaplexBridge.buildMintAndAttachIxs} instead.
   *
   * @since v0.9.3
   */
  async buildRegisterBothIxs(
    opts: RegisterBothOpts,
  ): Promise<RegisterBothResult> {
    const [sapPda] = deriveAgent(opts.wallet);
    const existing = await this.fetchAgentNullable(sapPda);
    if (existing) {
      throw new Error(
        `buildRegisterBothIxs: SAP agent already exists at ${sapPda.toBase58()}; ` +
          `use buildMintAndAttachIxs instead`,
      );
    }

    const sapIx = await this.buildRegisterAgentIx({
      wallet: opts.wallet,
      args: opts.registerArgs,
    });

    const mint = await this.buildMintAndAttachIxs({
      sapAgentOwner: opts.wallet,
      authority: opts.wallet,
      payer: opts.payer ?? opts.wallet,
      owner: opts.wallet,
      name: opts.mintName,
      metadataUri: opts.mintMetadataUri,
      registrationBaseUrl: opts.registrationBaseUrl,
      rpcUrl: opts.rpcUrl,
      collection: opts.collection,
    });

    return {
      sapAgentPda: sapPda,
      assetAddress: mint.assetAddress,
      assetSecretKey: mint.assetSecretKey,
      registrationUrl: mint.registrationUrl,
      instructions: [sapIx, ...mint.instructions],
    };
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
    rpcHeaders?: Record<string, string>;
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
      mpl = await this.fetchMplSnapshot(input.asset, input.rpcUrl, input.rpcHeaders);
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
   * @name resolveAgentIdentifier
   * @description Resolve a generic agent identifier to canonical SAP routing
   * keys. Useful when callers may receive either owner wallets or Metaplex
   * Core asset IDs (e.g. metaplex.com/agents/<core-asset-id>). 
   *
   * Resolution order:
   *   1) Treat input as wallet and check if a SAP agent exists.
   *   2) If not found, treat input as MPL Core asset and resolve owner wallet.
   *
   * @since v0.9.2
   */
  async resolveAgentIdentifier(input: {
    identifier: string;
    rpcUrl: string;
    rpcHeaders?: Record<string, string>;
  }): Promise<AgentIdentifierResolution> {
    let asPubkey: PublicKey;
    try {
      asPubkey = new PublicKey(input.identifier);
    } catch {
      return {
        input: input.identifier,
        kind: "unknown",
        wallet: null,
        sapAgentPda: null,
        asset: null,
        hasSapAgent: false,
        error: "Invalid public key",
      };
    }

    // 1) Wallet-first resolution (SAP-native)
    const [walletSapPda] = deriveAgent(asPubkey);
    const walletIdentity = await this.fetchAgentNullable(walletSapPda);
    if (walletIdentity) {
      return {
        input: input.identifier,
        kind: "wallet",
        wallet: asPubkey,
        sapAgentPda: walletSapPda,
        asset: null,
        hasSapAgent: true,
        error: null,
      };
    }

    // 2) MPL Core asset resolution
    const mpl = await this.fetchMplSnapshot(asPubkey, input.rpcUrl, input.rpcHeaders);
    if (!mpl) {
      return {
        input: input.identifier,
        kind: "unknown",
        wallet: null,
        sapAgentPda: null,
        asset: null,
        hasSapAgent: false,
        error: "Not a SAP wallet and not a readable MPL Core asset",
      };
    }

    const [sapPdaFromOwner] = deriveAgent(mpl.owner);
    const ownerIdentity = await this.fetchAgentNullable(sapPdaFromOwner);
    return {
      input: input.identifier,
      kind: "core-asset",
      wallet: mpl.owner,
      sapAgentPda: sapPdaFromOwner,
      asset: asPubkey,
      hasSapAgent: !!ownerIdentity,
      error: ownerIdentity ? null : "Core asset owner has no SAP agent profile",
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
    rpcHeaders?: Record<string, string>;
  }): Promise<boolean> {
    const snap = await this.fetchMplSnapshot(args.asset, args.rpcUrl, args.rpcHeaders);
    if (!snap?.agentIdentityUri || !snap.registration) return false;
    const expectedSuffix = `/agents/${args.sapAgentPda.toBase58()}/eip-8004.json`;
    if (!snap.agentIdentityUri.endsWith(expectedSuffix)) return false;
    return snap.registration.synapseAgent === args.sapAgentPda.toBase58();
  }

  /**
   * @name tripleCheckLink
   * @description Explicit 3-layer verification for explorer/host badges.
   * Returns one struct enumerating each check independently so UIs can
   * present partial trust states (e.g. "MPL plugin present, JSON pending").
   *
   * Layers:
   *   1. **mplOnChain** — Asset + AgentIdentity URI fetched on-chain.
   *   2. **eip8004Json** — JSON fetched and `synapseAgent` matches PDA.
   *   3. **sapOnChain** — `AgentAccount` PDA exists on the SAP program.
   *
   * @since v0.9.3
   */
  async tripleCheckLink(args: {
    asset: PublicKey;
    expectedOwner?: PublicKey;
    rpcUrl: string;
    rpcHeaders?: Record<string, string>;
  }): Promise<TripleCheckResult> {
    const snap = await this.fetchMplSnapshot(args.asset, args.rpcUrl, args.rpcHeaders);
    if (!snap) {
      const fallbackPda = args.expectedOwner
        ? deriveAgent(args.expectedOwner)[0]
        : args.asset;
      return {
        asset: args.asset,
        sapAgentPda: fallbackPda,
        mplOnChain: false,
        eip8004Json: false,
        sapOnChain: false,
        linked: false,
        agentIdentityUri: null,
        registration: null,
        identity: null,
        error: "MPL Core asset not readable on-chain",
      };
    }

    const owner = args.expectedOwner ?? snap.owner;
    const [sapPda] = deriveAgent(owner);
    const expectedSuffix = `/agents/${sapPda.toBase58()}/eip-8004.json`;

    const mplOnChain = !!snap.agentIdentityUri;
    const eip8004Json =
      !!snap.registration &&
      !!snap.agentIdentityUri &&
      snap.agentIdentityUri.endsWith(expectedSuffix) &&
      snap.registration.synapseAgent === sapPda.toBase58();

    const identity = await this.fetchAgentNullable(sapPda);
    const sapOnChain = !!identity;

    return {
      asset: args.asset,
      sapAgentPda: sapPda,
      mplOnChain,
      eip8004Json,
      sapOnChain,
      linked: mplOnChain && eip8004Json && sapOnChain,
      agentIdentityUri: snap.agentIdentityUri,
      registration: snap.registration,
      identity,
      error: null,
    };
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

  private async buildUmi(
    rpcUrl: string,
    rpcHeaders?: Record<string, string>,
  ): Promise<Umi> {
    const { mplCore, umiBundle } = await loadMplCore();
    // umi-bundle-defaults.createUmi accepts an options object with httpHeaders
    // since umi 1.x — required for gated providers like Synapse RPC that
    // enforce `x-api-key`. Without it `getAccountInfo` returns 401 silently.
    const umi: Umi = (umiBundle.createUmi as unknown as (
      endpoint: string,
      opts?: { httpHeaders?: Record<string, string> },
    ) => Umi)(rpcUrl, rpcHeaders ? { httpHeaders: rpcHeaders } : undefined).use(
      mplCore.mplCore(),
    );
    return umi;
  }

  private async fetchMplSnapshot(
    asset: PublicKey,
    rpcUrl: string,
    rpcHeaders?: Record<string, string>,
  ): Promise<MplAgentSnapshot | null> {
    const { mplCore, umiCore } = await loadMplCore();
    const umi: Umi = await this.buildUmi(rpcUrl, rpcHeaders);
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

  // ═════════════════════════════════════════════════════
  //  Private — SAP instruction building (v0.9.3)
  // ═════════════════════════════════════════════════════

  private async buildRegisterAgentIx(args: {
    wallet: PublicKey;
    args: RegisterAgentInput;
  }): Promise<TransactionInstruction> {
    // Lazy import to avoid a hard cycle with `pda/index.ts`.
    const { deriveGlobalRegistry } = await import("../pda");
    const { SystemProgram } = await import("@solana/web3.js");
    const [agentPda] = deriveAgent(args.wallet);
    const [statsPda] = deriveAgentStats(agentPda);
    const [globalPda] = deriveGlobalRegistry();
    const a = args.args;
    // Cast to `any` to sidestep Anchor's deep generic IDL inference, which
    // otherwise blows TS recursion budget here. Same pattern as BaseModule.
    const methods = (this.program as { methods: any }).methods;
    return await methods
      .registerAgent(
        a.name,
        a.description,
        a.capabilities,
        a.pricing,
        a.protocols,
        a.agentId ?? null,
        a.agentUri ?? null,
        a.x402Endpoint ?? null,
      )
      .accounts({
        wallet: args.wallet,
        agent: agentPda,
        agentStats: statsPda,
        globalRegistry: globalPda,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
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
