"""Validate the installed Stoquify Copilot suite against its source manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import tomllib
from pathlib import Path

SOURCE_ROOT = Path(__file__).resolve().parents[1]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def tree_hashes(root: Path) -> dict[str, str]:
    return {path.relative_to(root).as_posix(): sha256(path) for path in sorted(root.rglob("*")) if path.is_file() and "__pycache__" not in path.parts}


def parse_args() -> argparse.Namespace:
    default_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    parser = argparse.ArgumentParser()
    parser.add_argument("--codex-home", type=Path, default=default_home)
    return parser.parse_args()


def main() -> int:
    codex_home = parse_args().codex_home.resolve()
    manifest_path = SOURCE_ROOT / "reports" / "installation-manifest.json"
    errors: list[str] = []
    if not manifest_path.is_file():
        errors.append("installation manifest missing")
        manifest: dict = {}
    else:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    expected_agents = sorted(path.name for path in (SOURCE_ROOT / "agents").glob("*.toml"))
    expected_skills = sorted(path.name for path in (SOURCE_ROOT / "skills").iterdir() if path.is_dir())
    installed_agents = [codex_home / "agents" / name for name in expected_agents]
    installed_skills = [codex_home / "skills" / name for name in expected_skills]
    contract_root = codex_home / "contracts"
    backbone_root = codex_home / "stoquify-copilot"

    for path in installed_agents:
        if not path.is_file():
            errors.append(f"agent missing: {path}")
            continue
        try:
            data = tomllib.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"agent TOML invalid: {path}: {exc}")
            continue
        if set(data) != {"name", "description", "developer_instructions"}:
            errors.append(f"agent fields invalid: {path}")
        if contract_root.as_posix() not in data.get("developer_instructions", ""):
            errors.append(f"agent contract root not bound: {path}")

    for source_name, path in zip(expected_skills, installed_skills):
        source = SOURCE_ROOT / "skills" / source_name
        if not path.is_dir():
            errors.append(f"skill missing: {path}")
            continue
        if tree_hashes(source) != tree_hashes(path):
            errors.append(f"skill drift: {source_name}")
        required = ["SKILL.md", "agents/openai.yaml", "references/capability-contract.json", "references/evidence-map.md", "references/verification.md", "schemas/input.schema.json", "schemas/output.schema.json"]
        for relative in required:
            if not (path / relative).is_file():
                errors.append(f"skill file missing: {source_name}/{relative}")
        skill_text = (path / "SKILL.md").read_text(encoding="utf-8")
        for relative_ref in re.findall(r"`(\.\./\.\./contracts/[^`]+)`", skill_text):
            if not (path / relative_ref).resolve().is_file():
                errors.append(f"unresolved contract reference: {source_name}: {relative_ref}")

    for source in (SOURCE_ROOT / "contracts").iterdir():
        destination = contract_root / source.name
        if not destination.exists():
            errors.append(f"contract missing: {destination}")
        elif source.is_file() and sha256(source) != sha256(destination):
            errors.append(f"contract drift: {source.name}")

    for relative in ["manifest.md", "registry/capability-registry.json", "registry/agent-skill-matrix.json", "registry/dependency-dag.json", "evaluations/evaluation-catalog.json", "reports/installation-manifest.json"]:
        if not (backbone_root / relative).is_file():
            errors.append(f"backbone artifact missing: {relative}")

    registry = json.loads((backbone_root / "registry" / "capability-registry.json").read_text(encoding="utf-8")) if (backbone_root / "registry" / "capability-registry.json").is_file() else {"capabilities": []}
    if len(registry.get("capabilities", [])) != 37:
        errors.append("installed registry does not contain 37 capabilities")

    report = {
        "schema_version": "1.0.0",
        "status": "PASS" if not errors else "FAIL",
        "codex_home": str(codex_home),
        "counts": {"agents": len(installed_agents), "skills": len(installed_skills), "registry_capabilities": len(registry.get("capabilities", []))},
        "checks": {"agent_toml": "PASS" if not any("agent" in error for error in errors) else "FAIL", "skill_drift_and_references": "PASS" if not any("skill" in error or "contract reference" in error for error in errors) else "FAIL", "backbone": "PASS" if not any("backbone" in error or "registry" in error for error in errors) else "FAIL"},
        "errors": errors,
        "activation": manifest.get("activation", "Reload Codex or start a new task."),
    }
    report_path = SOURCE_ROOT / "reports" / "installation-validation-report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if backbone_root.is_dir():
        (backbone_root / "reports").mkdir(parents=True, exist_ok=True)
        (backbone_root / "reports" / report_path.name).write_text(report_path.read_text(encoding="utf-8"), encoding="utf-8")
    print(json.dumps({"status": report["status"], "errors": len(errors), **report["counts"]}))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
