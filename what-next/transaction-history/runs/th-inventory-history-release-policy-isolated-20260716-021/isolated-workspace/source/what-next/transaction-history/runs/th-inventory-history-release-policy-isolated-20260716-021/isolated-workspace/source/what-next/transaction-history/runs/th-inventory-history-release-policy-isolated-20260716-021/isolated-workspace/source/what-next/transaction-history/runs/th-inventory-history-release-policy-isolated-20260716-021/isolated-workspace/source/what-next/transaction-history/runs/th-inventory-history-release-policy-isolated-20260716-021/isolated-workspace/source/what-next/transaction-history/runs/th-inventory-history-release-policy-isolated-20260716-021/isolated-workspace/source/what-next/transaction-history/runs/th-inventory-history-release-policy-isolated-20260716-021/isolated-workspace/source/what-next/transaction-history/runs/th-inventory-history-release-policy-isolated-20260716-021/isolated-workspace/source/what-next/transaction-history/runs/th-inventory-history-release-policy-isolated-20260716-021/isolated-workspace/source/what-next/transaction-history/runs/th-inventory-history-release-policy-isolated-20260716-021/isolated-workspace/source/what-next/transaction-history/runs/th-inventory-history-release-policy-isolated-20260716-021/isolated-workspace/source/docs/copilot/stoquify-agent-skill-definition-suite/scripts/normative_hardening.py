"""Bind the named schemas and make their critical conditions enforceable."""

from __future__ import annotations

import json
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, value) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def append_agent(slug: str, text: str) -> None:
    path = ROOT / "agents" / f"{slug}.toml"
    data = tomllib.loads(path.read_text(encoding="utf-8"))
    data["developer_instructions"] = data["developer_instructions"].rstrip() + "\n\n" + text.strip() + "\n"
    path.write_text("\n".join(f"{key} = {json.dumps(value)}" for key, value in data.items()) + "\n", encoding="utf-8")


def main() -> None:
    table_path = ROOT / "contracts" / "run-state-transition-table.json"
    table = load(table_path)
    table["checkpoint_schema"] = "contracts/run-checkpoint.schema.json"
    table["checkpoint_required_fields"] = ["workflow_instance_id", "run_id", "run_version", "call_stack", "lease_owner", "lease_expires_at", "step_id", "state", "completed_steps", "step_output_fingerprints", "in_flight_step", "side_effect_class", "evidence_fingerprints", "approval_ref", "idempotency_key", "client_operation_key", "provider_operation_id", "updated_at"]
    table["workflow_identity_required"] = ["workflow_instance_id", "run_id", "run_version", "call_stack", "lease_owner", "lease_expires_at"]
    dump(table_path, table)

    checkpoint_path = ROOT / "contracts" / "run-checkpoint.schema.json"
    checkpoint = load(checkpoint_path)
    checkpoint["properties"]["state"] = {"type": "string", "enum": table["states"]}
    checkpoint["required"] = list(dict.fromkeys(checkpoint["required"] + ["in_flight_step", "approval_ref", "idempotency_key", "provider_operation_id"]))
    checkpoint["properties"].update({"active_lease_owner": {"type": ["string", "null"]}, "active_lease_expires_at": {"type": ["string", "null"], "format": "date-time"}})
    dump(checkpoint_path, checkpoint)

    protocol_path = ROOT / "contracts" / "controlled-write-protocol.json"
    protocol = load(protocol_path)
    protocol["request_schema"] = "contracts/controlled-write-request.schema.json"
    protocol["checkpoint_schema"] = "contracts/run-checkpoint.schema.json"
    protocol["approval_schema"] = "contracts/approval-request.schema.json"
    protocol["isolation_result_schema"] = "contracts/retrieved-content-isolation-result.schema.json"
    dump(protocol_path, protocol)

    approval_path = ROOT / "contracts" / "approval-request.schema.json"
    approval = load(approval_path)
    approval["properties"]["status"]["enum"] = ["pending", "approved", "consumed", "rejected", "expired", "cancelled", "revoked"]
    approval["allOf"] = [
        {"if": {"properties": {"status": {"const": "approved"}}}, "then": {"required": ["checker_id", "fresh_auth_verified_at", "fresh_auth_event_ref"], "properties": {"checker_id": {"type": "string", "minLength": 1}, "fresh_auth_required": {"const": True}, "consumed_at": {"type": ["string", "null"]}, "revoked_at": {"type": "null"}}}},
        {"if": {"properties": {"status": {"const": "consumed"}}}, "then": {"required": ["checker_id", "fresh_auth_verified_at", "fresh_auth_event_ref", "consumed_at"], "properties": {"checker_id": {"type": "string", "minLength": 1}, "fresh_auth_required": {"const": True}, "consumed_at": {"type": "string"}, "revoked_at": {"type": "null"}}}},
        {"if": {"properties": {"status": {"const": "revoked"}}}, "then": {"required": ["revoked_at"], "properties": {"revoked_at": {"type": "string"}}}},
        {"not": {"required": ["consumed_at", "revoked_at"], "properties": {"consumed_at": {"type": "string"}, "revoked_at": {"type": "string"}}}},
    ]
    dump(approval_path, approval)

    isolation_path = ROOT / "contracts" / "retrieved-content-isolation-result.schema.json"
    isolation = load(isolation_path)
    isolation["allOf"] = [
        {"if": {"properties": {"injection_suspected": {"const": True}}}, "then": {"properties": {"isolation_status": {"enum": ["isolated", "blocked"]}, "quarantine_state": {"enum": ["redacted", "quarantined"]}, "security_event_ref": {"type": "string", "minLength": 1}, "validation_evidence_refs": {"type": "array", "minItems": 1}}}},
        {"if": {"properties": {"injection_suspected": {"const": False}}}, "then": {"properties": {"isolation_status": {"enum": ["clean", "isolated"]}}}},
    ]
    dump(isolation_path, isolation)

    for slug, section in {
        "stoquify-exception-action-orchestrator": "Use the normative schemas by these exact paths: `contracts/run-state-transition-table.json`, `contracts/run-checkpoint.schema.json`, `contracts/controlled-write-request.schema.json`, `contracts/controlled-write-protocol.json`, `contracts/approval-request.schema.json`, and `contracts/retrieved-content-isolation-result.schema.json`. A run is not conforming if it substitutes a different version.",
        "stoquify-idempotent-tool-executor": "Use `../../contracts/controlled-write-request.schema.json` and `../../contracts/run-checkpoint.schema.json` as the normative request and checkpoint contracts; reject any unregistered or schema-incompatible operation.",
        "stoquify-agent-run-state-machine": "Use `../../contracts/run-state-transition-table.json` and `../../contracts/run-checkpoint.schema.json` as the normative state and checkpoint contracts; field names, state enum, and required nullable fields must match exactly.",
    }.items():
        append_agent(slug, section)
    print(json.dumps({"status": "normative-hardening-applied", "bound_schemas": 6, "conditional_controls": 2}))


if __name__ == "__main__":
    main()
