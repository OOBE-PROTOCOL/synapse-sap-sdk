#!/usr/bin/env python3
"""
Regenerates synapse-sap-sdk/src/idlTypes.ts from the checked-in IDL,
converting snake_case field names to camelCase to match the coder that
@coral-xyz/anchor builds internally (Program calls convertIdlToCamelCase
before constructing BorshCoder — @coral-xyz/anchor program/index.js:103-112).

Upstream bug fixed (Krexa field report, 2026-08-29):
  idlTypes.ts used raw IDL snake_case names. Passing snake_case objects
  into Program.methods.* encoded unknown fields silently as nothing
  (e.g. Capability.protocol_id was dropped => capability metadata went
  on-chain empty while the UI showed success). This generator makes the
  type source identical to the coder source, closing the drift for good.

Transformation rules (mirror @coral-xyz/anchor 0.30 convertIdlToCamelCase):
  - struct field names: snake_case -> camelCase
  - type names / enum variant names: kept as-is (already PascalCase)
  - accounts / events: emitted as data interfaces with camelized fields
"""
import json
import re
import sys
from pathlib import Path

SDK_ROOT = Path(__file__).resolve().parent.parent
IDL_PATH = SDK_ROOT / "src" / "idl" / "synapse_agent_sap.json"
OUT_PATH = SDK_ROOT / "src" / "idlTypes.ts"

BUILTINS = {
    "bool": "boolean",
    "u8": "number", "u16": "number", "u32": "number",
    "i8": "number", "i16": "number", "i32": "number",
    "f32": "number", "f64": "number",
    "u64": "BN", "u128": "BN", "u256": "BN",
    "i64": "BN", "i128": "BN", "i256": "BN",
    "string": "string", "pubkey": "PublicKey", "bytes": "number[]",
}


def to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(p[:1].upper() + p[1:] for p in parts[1:] if p)


class Ctx:
    def __init__(self, idl: dict):
        types = idl.get("types", [])
        self.enums = {t["name"] for t in types if t.get("type", {}).get("kind") == "enum"}
        self.structs = {t["name"] for t in types if t.get("type", {}).get("kind") == "struct"}


def ts_type(t, ctx: Ctx) -> str:
    if isinstance(t, str):
        return BUILTINS.get(t, "any")
    if isinstance(t, dict):
        if "vec" in t:
            return f"{ts_type(t['vec'], ctx)}[]"
        if "option" in t:
            inner = ts_type(t["option"], ctx)
            if inner.endswith("[]"):
                return f"{inner} | null"
            return f"({inner} | null)"
        if "array" in t:
            return f"{ts_type(t['array'][0], ctx)}[]"
        if "defined" in t:
            name = t["defined"]["name"] if isinstance(t["defined"], dict) else str(t["defined"])
            return name
    return "any"


def render_struct(name: str, fields: list, ctx: Ctx) -> str:
    out = [f"export interface {name} {{"]
    for f in fields:
        if isinstance(f, dict):
            out.append(f"  {to_camel(f['name'])}: {ts_type(f['type'], ctx)};")
        else:  # positional
            out.append(f"  [{len(out) - 1}]: {ts_type(f, ctx)};")
    out.append("}")
    return "\n".join(out)


def render_type(t: dict, ctx: Ctx) -> str:
    name, ty = t["name"], t["type"]
    kind = ty.get("kind")
    if kind == "enum":
        variants = ty.get("variants", [])
        if not any(v.get("fields") for v in variants):
            # Unit enum — runtime form used by anchor 0.30 borsh-js coder is a
            # case-sensitive camelized variant-tag OBJECT: { sol: null } or
            # { sol: {} } both encode; the bare string "sol" does NOT
            # ("unable to infer src variant" — measured 2026-08-29).
            # We type each variant as { name: null }, widening via the canonical
            # SDK constants (src/types/enums.ts) where needed — those declare
            # { variant: {} } so we accept BOTH tag payloads: null and object.
            return "\n".join(
                [f"export type {name} ="]
                + ["  | { " + v_camel + ": null | Record<string, never> }"
                   for v_camel in (to_camel(v["name"]) for v in variants)]
                + [";"]
            )
        # enum with data — object form
        return "\n".join([f"export type {name} ="] + [
            "  | { " + to_camel(v["name"]) + ": " + (
                "{ " + "; ".join(
                    (f"{to_camel(f['name'])}: {ts_type(f['type'], ctx)}" if isinstance(f, dict)
                     else f"positional: {ts_type(f, ctx)}")
                    for f in (v.get("fields") or [])
                ) + " }"
                if any(isinstance(f, dict) for f in (v.get("fields") or []))
                else "[" + ", ".join(ts_type(f, ctx) for f in (v.get("fields") or [])) + "]"
            ) + " }"
            for v in variants
        ] + [";"])
    if kind == "struct":
        return render_struct(name, ty.get("fields") or [], ctx)
    return f"export type {name} = any;  // unsupported kind: {kind}"


def main() -> int:
    idl = json.loads(IDL_PATH.read_text())
    ctx = Ctx(idl)
    version = idl.get("metadata", {}).get("version", "?")

    out: list[str] = [
        "// Auto-generated from IDL v" + version + " — regen: `python3 scripts/regen-idl-types.py`",
        "// DO NOT EDIT BY HAND: fields are camelCase to match the BorshCoder that",
        "// @coral-xyz/anchor builds via convertIdlToCamelCase (Program ctor).",
        '// Keep in sync anchor: src/types/common.ts mirrors these shapes with JSDoc.',
        "",
        'import { PublicKey } from "@solana/web3.js";',
        'import BN from "bn.js";',
        "",
    ]

    for t in idl.get("types", []):
        out.append(render_type(t, ctx))
        out.append("")

    if idl.get("events"):
        out.append("// ── Events (event parser DTOs) ──")
        out.append("")
        for e in idl["events"]:
            out.append(render_type({"name": e["name"], "type": {"kind": "struct", "fields": e.get("fields", [])}}, ctx))
            out.append("")

    # Program-level account / error name maps for the parser layer
    if idl.get("errors"):
        out.append("// ── Program error names (by numeric code) ──")
        out.append("export const SAP_ERROR_NAMES: Record<number, string> = {")
        for e in idl["errors"]:
            out.append(f'  {e["code"]}: "{e["name"]}",')
        out.append("};")
        out.append("")

    OUT_PATH.write_text("\n".join(out) + "\n")
    print(f"written {OUT_PATH} ({OUT_PATH.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())