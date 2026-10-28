"""Align output-state and checkpoint propagation enums with the backbone contracts."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, value) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    statuses = ["completed", "blocked", "degraded", "approval_required", "denied", "partial", "unavailable", "failed", "cancelled", "retryable", "provisional", "unknown_outcome"]
    for path in list((ROOT / "skills").glob("*/schemas/output.schema.json")) + [ROOT / "contracts" / "agent-output.schema.json"]:
        doc = load(path)
        doc["properties"]["status"]["enum"] = statuses
        dump(path, doc)
    table_path = ROOT / "contracts" / "run-state-transition-table.json"
    table = load(table_path)
    if "step_output_fingerprints" not in table["checkpoint_required_fields"]:
        table["checkpoint_required_fields"].append("step_output_fingerprints")
    dump(table_path, table)
    print(json.dumps({"status": "final-normative-alignment-applied", "output_statuses": len(statuses), "checkpoint_propagation": True}))


if __name__ == "__main__":
    main()
