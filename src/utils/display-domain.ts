/**
 * Canonical display & normalization rules for SNS domain names (Stage 1).
 *
 * SNS Stage 1 (post slot 452,825,395): the `.sns` namespace is the one SNS
 * resolves; display surfaces must show `.sns`. Legacy `.sol` resolution is
 * paused at the protocol level — the SDK never accepts `.sol` inputs.
 */

const LEGACY_SOL_SUFFIX = ".sol";
export const SNS_SUFFIX = ".sns";

/**
 * True when the input already ends with the `.sns` suffix.
 */
export function isSnsDomain(name: string): boolean {
  return name.trim().toLowerCase().endsWith(SNS_SUFFIX);
}

/**
 * Normalizes any accepted input to a full, lowercase `.sns` domain.
 *
 * Accepted: `"example"`, `"EXAMPLE"`, `"example.sns"`, `" Example.sns "`.
 * Rejected: `"example.sol"` and any other non-`.sns` suffix — legacy `.sol`
 * resolution is paused (slot 452,825,395); use `.sns` explicitly.
 */
export function toFullSnsName(name: string): string {
  const trimmed = name.trim().toLowerCase();
  if (trimmed.endsWith(LEGACY_SOL_SUFFIX)) {
    throw new Error(
      "legacy .sol resolution is paused (slot 452,825,395): use .sns (e.g. 'example.sns')",
    );
  }
  if (trimmed.endsWith(SNS_SUFFIX)) {
    return trimmed;
  }
  if (trimmed === "") {
    throw new Error("domain name is required");
  }
  return `${trimmed}${SNS_SUFFIX}`;
}

/**
 * Display form for end users: TLD-less names get the `.sns` suffix attached;
 * names already ending in `.sns` are returned unchanged; `.sol` is rejected.
 */
export function displayDomain(name: string): string {
  return toFullSnsName(name);
}
