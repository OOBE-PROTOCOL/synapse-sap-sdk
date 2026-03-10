/**
 * @module idl
 * @description Embedded IDL for the SAP v2 program.
 *
 * The JSON artifact is bundled with the SDK so it works as a
 * standalone package without needing the program workspace.
 *
 * ### Updating the IDL
 *
 * After rebuilding the Anchor program, run:
 * ```sh
 * yarn sync-idl            # copies from ../target/idl/
 * ```
 * or manually copy the file into `src/idl/synapse_agent_sap.json`.
 *
 * @example
 * ```ts
 * import { SAP_IDL, type SynapseAgentSapIDL } from "@synapse-sap/sdk/idl";
 * ```
 *
 * @category IDL
 * @since v0.1.0
 */

import idlJson from "./synapse_agent_sap.json";

// ── Anchor IDL shape ────────────────────────────────
// We use `typeof idlJson` so the type stays in sync with
// the JSON artifact automatically — no manual maintenance.
/**
 * TypeScript type representing the Anchor IDL for the `synapse_agent_sap` program.
 *
 * @name SynapseAgentSapIDL
 * @description Anchor IDL type derived from the bundled JSON artifact.
 *   Automatically stays in sync with the program — no manual maintenance needed.
 * @category IDL
 * @since v0.1.0
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SynapseAgentSapIDL = any;

/**
 * The complete Anchor IDL object for the `synapse_agent_sap` program.
 *
 * @name SAP_IDL
 * @description Pre-loaded IDL JSON artifact bundled with the SDK.
 *   Can be passed directly to `new anchor.Program()` or used for
 *   instruction introspection.
 * @category IDL
 * @since v0.1.0
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SAP_IDL = idlJson as any;

/**
 * Program address embedded in the IDL metadata.
 *
 * @name IDL_PROGRAM_ADDRESS
 * @description The deployed program address as declared in the Anchor IDL.
 * @category IDL
 * @since v0.1.0
 */
export const IDL_PROGRAM_ADDRESS: string = idlJson.address;

/**
 * IDL metadata block (name, version, spec, description).
 *
 * @name IDL_METADATA
 * @description Anchor IDL metadata containing program name, version string,
 *   spec version, and human-readable description.
 * @category IDL
 * @since v0.1.0
 */
export const IDL_METADATA = idlJson.metadata;

export default SAP_IDL;
