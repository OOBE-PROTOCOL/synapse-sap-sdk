// Override: re-declare bn.js with ES default export
// Fixes TS1259 with esModuleInterop enabled

declare module "bn.js" {
  class BN {
    constructor(value: string | number | BN | Buffer | Uint8Array | number[], base?: number | "le" | "be", endian?: "le" | "be");
    // Core arithmetic
    add(b: BN): BN;
    sub(b: BN): BN;
    mul(b: BN): BN;
    div(b: BN): BN;
    divmod(b: BN): { div: BN; mod: BN };
    mod(b: BN): BN;
    // Comparisons
    eq(b: BN): boolean;
    gt(b: BN): boolean;
    gte(b: BN): boolean;
    lt(b: BN): boolean;
    lte(b: BN): boolean;
    isZero(): boolean;
    isNeg(): boolean;
    // Conversion
    toString(base?: number, length?: number): string;
    toNumber(): number;
    toArray(endian?: "le" | "be", length?: number): number[];
    toArrayLike<T extends Uint8Array | Buffer>(ArrayType: { new(length: number): T }, endian?: "le" | "be", length?: number): T;
    // Utility
    clone(): BN;
    abs(): BN;
    neg(): BN;
    sqr(): BN;
    pow(b: BN): BN;
    shl(b: number): BN;
    shr(b: number): BN;
    and(b: BN): BN;
    or(b: BN): BN;
    xor(b: BN): BN;
    static min(...args: BN[]): BN;
    static max(...args: BN[]): BN;
    static isBN(b: unknown): b is BN;
  }
  export default BN;
  export { BN };
}
