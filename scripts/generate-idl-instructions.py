#!/usr/bin/env python3
"""
generate-sdk.py — Scaffold synapse-sap-sdk v0.25.0 from IDL (v0.2.0, 83 instructions)
Generates modular instruction wrappers with correct categorization,
removing orphaned v1 escrow methods and legacy-gated instructions.
"""
import json, re
from pathlib import Path
from typing import Any

# ── Config ──
IDL_PATH = Path("/Users/keepeeto/Desktop/synapse-agent-sap/synapse-sap-sdk/src/idl/synapse_agent_sap.json")
OUT_ROOT = Path("/Users/keepeeto/Desktop/synapse-sap-sdk/src/gen")

# Legacy instructions to SKIP (not compiled into default build)
LEGACY_INSTRUCTIONS = frozenset({
    "register_plugin", "close_plugin",
    "store_memory", "append_memory_chunk", "close_memory_entry", "close_memory_chunk",
    "create_buffer", "append_buffer", "close_buffer",
    "init_digest", "post_digest", "inscribe_to_digest", "update_digest_storage",
    "close_digest",
    "create_escrow", "deposit_escrow", "settle_calls", "withdraw_escrow", "close_escrow",
    "settle_batch",  # batch_settle alias
})

# ── Type mapping ──
BUILTIN_TYPES = {
    "string": "string", "bool": "boolean",
    "u8": "number", "u16": "number", "u32": "number",
    "u64": "BN", "u128": "BN", "u256": "BN",
    "i64": "BN", "i128": "BN",
    "bytes": "Uint8Array", "pubkey": "PublicKey",
}

def anchor_type_to_ts(t: Any) -> str:
    if isinstance(t, str):
        return BUILTIN_TYPES.get(t, "any")
    if isinstance(t, dict):
        if "vec" in t:
            inner = anchor_type_to_ts(t["vec"])
            return f"{inner}[]"
        if "option" in t:
            inner = anchor_type_to_ts(t["option"])
            return f"({inner} | null)"
        if "array" in t:
            inner = anchor_type_to_ts(t["array"][0])
            return f"{inner}[]"
        if "defined" in t:
            if isinstance(t["defined"], dict):
                return t["defined"].get("name", "any")
            return str(t["defined"])
    return "any"

def to_camel(snake: str) -> str:
    parts = snake.split("_")
    return parts[0] + "".join(p.title() for p in parts[1:])

def categorize(name: str) -> str:
    n = name.lower()
    # Agent lifecycle
    if any(n.startswith(p) for p in ("register_agent", "update_agent", "deactivate_agent", "reactivate_agent", "close_agent")):
        return "agent"
    # Escrow v2 + v1 (v1 will be flagged separately)
    if any(n.startswith(p) for p in ("create_escrow_v2", "deposit_escrow_v2", "withdraw_escrow_v2", "settle_calls_v2", "finalize_settlement", "close_escrow_v2")):
        return "escrow"
    # Dispute
    if any(n.startswith(p) for p in ("file_dispute", "submit_agent_evidence", "submit_receipt_proof", "auto_resolve_dispute", "close_dispute", "create_pending_settlement", "close_pending_settlement")):
        return "dispute"
    # Subscription
    if any(n.startswith(p) for p in ("create_subscription", "fund_subscription", "cancel_subscription", "claim_interval", "close_subscription")):
        return "subscription"
    # Staking / Ledger
    if any(n.startswith(p) for p in ("init_stake", "deposit_stake", "request_unstake", "complete_unstake", "close_ledger", "write_ledger", "seal_ledger", "init_ledger")):
        return "staking"
    # Vault / Memory / Delegate
    if any(n.startswith(p) for p in ("init_vault", "add_vault_delegate", "revoke_vault_delegate", "rotate_vault_nonce", "inscribe_memory", "inscribe_memory_delegated")):
        return "vault"
    # Session / Checkpoint
    if any(n.startswith(p) for p in ("open_session", "close_session", "close_session_pda", "create_session_checkpoint", "close_checkpoint")):
        return "session"
    # Tools
    if any(n.startswith(p) for p in ("publish_tool", "update_tool", "deactivate_tool", "reactivate_tool", "close_tool", "inscribe_tool")):
        return "tools"
    # Indexing / Catalog
    if any(n.startswith(p) for p in ("add_to_capability", "remove_from_capability", "init_capability_index", "close_capability_index",
                                     "add_to_protocol", "remove_from_protocol", "init_protocol_index", "close_protocol_index",
                                     "add_to_tool_category", "remove_from_tool_category", "init_tool_category_index", "close_tool_category_index",
                                     "add_to_index_page", "remove_from_index_page", "init_index_page", "close_index_page",)):
        return "indexing"
    # Digest / Shard
    if any(n.startswith(p) for p in ("compact_inscribe", "close_digest", "init_digest", "post_digest", "inscribe_to_digest", "update_digest_storage", "create_buffer", "append_buffer", "close_buffer", "init_shard")):
        return "digest"
    # Attestation / Feedback
    if any(n.startswith(p) for p in ("create_attestation", "revoke_attestation", "close_attestation", "give_feedback", "update_feedback", "revoke_feedback", "close_feedback")):
        return "attestation"
    # Global
    if n == "initialize_global":
        return "global"
    return "misc"

def generate_method(inst: dict) -> list[str]:
    name = inst["name"]
    method = to_camel(name)
    accounts = inst.get("accounts", [])
    args = inst.get("args", [])

    ctx_fields: list[str] = ["signer: Signer"]
    for a in accounts:
        an = a["name"]
        if an in ("system_program", "token_program", "associated_token_program", "rent", "clock", "instruction"):
            continue
        ctx_fields.append(f"{to_camel(an)}: PublicKey")
    for arg in args:
        ctx_fields.append(f"{to_camel(arg['name'])}: {anchor_type_to_ts(arg['type'])}")
    ctx_fields.append("remainingAccounts?: any[]")

    lines = [f"  /** {name} ({len(accounts)} accounts, {len(args)} args) */"]
    ctx_sig = ", ".join(ctx_fields)
    lines.append(f"  async {method}(ctx: {{ {ctx_sig} }}): Promise<TransactionInstruction> {{")

    arg_expr = ", ".join(to_camel(a["name"]) for a in args)

    if args:
        lines.append(f"    return await this.program")
        lines.append(f"      .methods.{method}({arg_expr})")
    else:
        lines.append(f"    return await this.program")
        lines.append(f"      .methods.{method}()")

    lines.append("      .accounts({")
    for a in accounts:
        an = a["name"]
        cn = to_camel(an)
        if an == "system_program":
            lines.append("        systemProgram: SystemProgram.programId,")
        elif an == "token_program":
            lines.append("        tokenProgram: TOKEN_PROGRAM_ID,")
        elif an == "associated_token_program":
            lines.append("        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,")
        elif an == "rent":
            lines.append("        rent: SYSVAR_RENT_PUBKEY,")
        elif an == "clock":
            lines.append("        clock: SYSVAR_CLOCK_PUBKEY,")
        else:
            lines.append(f"        {cn}: ctx.{cn},")
    lines.append("      })")
    lines.append("      .remainingAccounts(ctx.remainingAccounts ?? [])")
    lines.append("      .signers([ctx.signer])")
    lines.append("      .instruction() as Promise<TransactionInstruction>;")
    lines.append("  }")
    lines.append("")
    return lines

def generate_module(cat: str, insts: list[dict]) -> str:
    lines = [
        f"// {'=' * 63}",
        f"//  {cat.title()} Module — generated from IDL v0.25.0",
        f"//  {len(insts)} instruction{'s' if len(insts) > 1 else ''}",
        f"// {'=' * 63}",
        "",
        "import { PublicKey, Signer, TransactionInstruction, SystemProgram, SYSVAR_RENT_PUBKEY, SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js';",
        "import { Program, BN } from '@coral-xyz/anchor';",
        "import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';",
        "",
        f"export class {cat.title()}Module {{",
        "  constructor(private program: Program) {}",
        "",
    ]
    for inst in insts:
        lines.extend(generate_method(inst))
    lines.append("}")
    lines.append("")
    return "\n".join(lines)

def main():
    with open(IDL_PATH) as f:
        idl = json.load(f)

    # Filter out legacy
    valid_insts = [i for i in idl["instructions"] if i["name"] not in LEGACY_INSTRUCTIONS]
    skipped = [i["name"] for i in idl["instructions"] if i["name"] in LEGACY_INSTRUCTIONS]

    categories: dict[str, list[dict]] = {}
    for inst in valid_insts:
        cat = categorize(inst["name"])
        categories.setdefault(cat, []).append(inst)

    # Determine which categories have v1 orphans (escrow only)
    has_escrow_v1 = any(i["name"].startswith(("create_escrow", "deposit_escrow", "settle_calls", "withdraw_escrow", "close_escrow", "settle_batch"))
                        and not i["name"].endswith("_v2")
                        for i in valid_insts)

    OUT_ROOT.mkdir(parents=True, exist_ok=True)

    for cat, insts in sorted(categories.items()):
        out_file = OUT_ROOT / f"{cat}.ts"
        out_file.write_text(generate_module(cat, insts))
        print(f"  {out_file.name:20s}  ({len(insts)} instructions)")

    # Barrel
    barrel = ["// Barrel exports — instruction modules v0.25.0", ""]
    for cat in sorted(categories.keys()):
        barrel.append(f"export {{ {cat.title()}Module }} from './{cat}';")
    (OUT_ROOT / "index.ts").write_text("\n".join(barrel))
    print(f"\n  index.ts              ({len(categories)} modules)")

    print(f"\nGenerated {len(valid_insts)} valid instructions across {len(categories)} modules")
    if skipped:
        print(f"Skipped {len(skipped)} legacy/v1 orphan instructions: {', '.join(skipped)}")

if __name__ == "__main__":
    main()
