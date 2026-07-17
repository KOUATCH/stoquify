"""Bind normative schemas to the generated agent and skill definitions."""

from __future__ import annotations

import json
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def append_agent(slug: str, text: str) -> None:
    path = ROOT / "agents" / f"{slug}.toml"
    data = tomllib.loads(path.read_text(encoding="utf-8"))
    data["developer_instructions"] = data["developer_instructions"].rstrip() + "\n\n" + text.strip() + "\n"
    path.write_text("\n".join(f"{key} = {json.dumps(value)}" for key, value in data.items()) + "\n", encoding="utf-8")


def append_skill(slug: str, text: str) -> None:
    path = ROOT / "skills" / slug / "SKILL.md"
    path.write_text(path.read_text(encoding="utf-8") + "\n\n" + text.strip() + "\n", encoding="utf-8")


def main() -> None:
    append_agent("stoquify-exception-action-orchestrator", "Use the normative schemas by these exact paths: `contracts/run-state-transition-table.json`, `contracts/run-checkpoint.schema.json`, `contracts/controlled-write-request.schema.json`, `contracts/controlled-write-protocol.json`, `contracts/approval-request.schema.json`, and `contracts/retrieved-content-isolation-result.schema.json`. A run is not conforming if it substitutes a different version.")
    append_skill("stoquify-idempotent-tool-executor", "## Normative schema binding\n\nUse `../../contracts/controlled-write-request.schema.json` and `../../contracts/run-checkpoint.schema.json` as the normative request and checkpoint contracts; reject any unregistered or schema-incompatible operation.")
    append_skill("stoquify-agent-run-state-machine", "## Normative state binding\n\nUse `../../contracts/run-state-transition-table.json` and `../../contracts/run-checkpoint.schema.json` as the normative state and checkpoint contracts; field names, state enum, and required nullable fields must match exactly.")
    print(json.dumps({"status": "normative-bindings-applied", "agents": 1, "skills": 2}))


if __name__ == "__main__":
    main()
