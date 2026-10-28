"""Install the validated Stoquify Copilot source suite into CODEX_HOME.

The installer is fail-closed: it preflights every destination and refuses to
overwrite a different agent, skill, contract, or backbone artifact.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import tomllib
from datetime import datetime, timezone
from pathlib import Path

SOURCE_ROOT = Path(__file__).resolve().parents[1]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def tree_hashes(root: Path) -> dict[str, str]:
    return {
        path.relative_to(root).as_posix(): sha256(path)
        for path in sorted(root.rglob("*"))
        if path.is_file() and "__pycache__" not in path.parts
    }


def same_tree(left: Path, right: Path) -> bool:
    return right.is_dir() and tree_hashes(left) == tree_hashes(right)


def bind_agent_contract_path(source: Path, destination: Path, contract_root: Path) -> None:
    data = tomllib.loads(source.read_text(encoding="utf-8"))
    binding = (
        "\n\n## Installed contract root\n\n"
        f"Resolve every `contracts/...` reference in this definition from `{contract_root.as_posix()}`. "
        "Do not substitute a workspace-local file with the same name.\n"
    )
    data["developer_instructions"] = data["developer_instructions"].rstrip() + binding
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        "\n".join(f"{key} = {json.dumps(value)}" for key, value in data.items()) + "\n",
        encoding="utf-8",
    )


def installed_agent_matches(source: Path, destination: Path, contract_root: Path) -> bool:
    if not destination.is_file():
        return False
    temporary = destination.with_suffix(".expected.tmp")
    try:
        bind_agent_contract_path(source, temporary, contract_root)
        return temporary.read_bytes() == destination.read_bytes()
    finally:
        temporary.unlink(missing_ok=True)


def parse_args() -> argparse.Namespace:
    default_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    parser = argparse.ArgumentParser()
    parser.add_argument("--codex-home", type=Path, default=default_home)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    codex_home = args.codex_home.resolve()
    agent_target = codex_home / "agents"
    skill_target = codex_home / "skills"
    contract_target = codex_home / "contracts"
    backbone_target = codex_home / "stoquify-copilot"

    source_agents = sorted((SOURCE_ROOT / "agents").glob("*.toml"))
    source_skills = sorted(path for path in (SOURCE_ROOT / "skills").iterdir() if path.is_dir())
    source_contracts = sorted((SOURCE_ROOT / "contracts").iterdir())
    if len(source_agents) != 9 or len(source_skills) != 28:
        raise SystemExit("Source suite count mismatch; refusing installation")

    collisions: list[str] = []
    for source in source_agents:
        destination = agent_target / source.name
        if destination.exists() and not installed_agent_matches(source, destination, contract_target):
            collisions.append(str(destination))
    for source in source_skills:
        destination = skill_target / source.name
        if destination.exists() and not same_tree(source, destination):
            collisions.append(str(destination))
    for source in source_contracts:
        destination = contract_target / source.name
        if destination.exists():
            if source.is_file() and (not destination.is_file() or sha256(source) != sha256(destination)):
                collisions.append(str(destination))
            elif source.is_dir() and not same_tree(source, destination):
                collisions.append(str(destination))
    if backbone_target.exists():
        collisions.append(str(backbone_target))
    if collisions:
        print(json.dumps({"status": "BLOCKED", "collisions": collisions}, indent=2))
        return 2

    agent_target.mkdir(parents=True, exist_ok=True)
    skill_target.mkdir(parents=True, exist_ok=True)
    contract_target.mkdir(parents=True, exist_ok=True)

    installed: list[dict[str, object]] = []
    for source in source_agents:
        destination = agent_target / source.name
        if not destination.exists():
            bind_agent_contract_path(source, destination, contract_target)
            action = "installed"
        else:
            action = "already_current"
        installed.append({"type": "agent", "name": source.stem, "source": str(source), "destination": str(destination), "action": action, "source_sha256": sha256(source), "installed_sha256": sha256(destination), "transform": "absolute_contract_root_binding"})

    for source in source_skills:
        destination = skill_target / source.name
        if not destination.exists():
            shutil.copytree(source, destination)
            action = "installed"
        else:
            action = "already_current"
        installed.append({"type": "skill", "name": source.name, "source": str(source), "destination": str(destination), "action": action, "source_tree_sha256": tree_hashes(source), "installed_tree_sha256": tree_hashes(destination), "transform": None})

    for source in source_contracts:
        destination = contract_target / source.name
        if destination.exists():
            action = "already_current"
        elif source.is_dir():
            shutil.copytree(source, destination)
            action = "installed"
        else:
            shutil.copy2(source, destination)
            action = "installed"
        installed.append({"type": "contract", "name": source.name, "source": str(source), "destination": str(destination), "action": action, "source_sha256": sha256(source) if source.is_file() else None, "installed_sha256": sha256(destination) if destination.is_file() else None, "transform": None})

    backbone_target.mkdir(parents=True)
    for name in ["registry", "evaluations"]:
        shutil.copytree(SOURCE_ROOT / name, backbone_target / name)
    shutil.copytree(SOURCE_ROOT / "reports", backbone_target / "reports")
    shutil.copy2(SOURCE_ROOT / "manifest.md", backbone_target / "manifest.md")

    manifest = {
        "schema_version": "1.0.0",
        "installed_at": datetime.now(timezone.utc).isoformat(),
        "source_root": str(SOURCE_ROOT),
        "codex_home": str(codex_home),
        "targets": {"agents": str(agent_target), "skills": str(skill_target), "contracts": str(contract_target), "backbone": str(backbone_target)},
        "counts": {"agents": len(source_agents), "skills": len(source_skills), "contracts": len(source_contracts)},
        "items": installed,
        "activation": "Reload Codex or start a new task so discovery indexes the newly installed definitions.",
    }
    report_path = SOURCE_ROOT / "reports" / "installation-manifest.json"
    report_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    shutil.copy2(report_path, backbone_target / "reports" / report_path.name)
    print(json.dumps({"status": "INSTALLED", "agents": len(source_agents), "skills": len(source_skills), "contracts": len(source_contracts), "codex_home": str(codex_home)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
