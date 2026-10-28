"""Resolve final pre-start state and isolation propagation review findings."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, value) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    state_path = ROOT / "contracts" / "run-state-transition-table.json"
    state = load(state_path)
    pre_start = [
        {"from": "queued", "event": "policy_denied", "to": "denied", "guard": "record non-enumerating denial without retrieval or side effect"},
        {"from": "queued", "event": "context_invalid_or_ambiguous", "to": "blocked", "guard": "record required correction without tenant enumeration"},
        {"from": "queued", "event": "feature_or_version_unavailable", "to": "unavailable", "guard": "record feature/version reason and approved alternative when one exists"},
        {"from": "queued", "event": "dependency_unavailable", "to": "unavailable", "guard": "no retrieval or side effect occurred"},
        {"from": "queued", "event": "cancel", "to": "cancelled", "guard": "caller or policy authorized cancellation"},
    ]
    existing = {(item["from"], item["event"]) for item in state["transitions"]}
    state["transitions"] = state["transitions"][:1] + [item for item in pre_start if (item["from"], item["event"]) not in existing] + state["transitions"][1:]
    dump(state_path, state)

    policy_path = ROOT / "contracts" / "retrieved-content-isolation.json"
    policy = load(policy_path)
    policy["result_schema"] = "contracts/retrieved-content-isolation-result.schema.json"
    policy["propagation_targets"] = {
        "skill_output": "required property security",
        "agent_output": "required property security",
        "handoff": "required property security",
        "evidence_record": "required injection_suspected plus security_event_ref when suspected",
        "run_checkpoint": "security result fingerprint stored in step_output_fingerprints and evidence_fingerprints",
    }
    dump(policy_path, policy)
    print(json.dumps({"status": "last-mile-hardening-applied", "queued_transitions_added": 5, "isolation_targets": 5}))


if __name__ == "__main__":
    main()
