"""Validate the Stoquify Copilot definition source suite."""

from __future__ import annotations

import hashlib
import json
import re
import sys
import tomllib
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_SKILLS = {
    f"S{i:02d}": name for i, name in enumerate(
        [
            "stoquify-trusted-context-resolver", "stoquify-permission-entitlement-guard",
            "stoquify-evidence-grounded-retrieval", "stoquify-safe-action-planner",
            "stoquify-approval-step-up-coordinator", "stoquify-idempotent-tool-executor",
            "stoquify-agent-evidence-recorder", "stoquify-redaction-disclosure-policy",
            "stoquify-freshness-trust-evaluator", "stoquify-exception-prioritizer",
            "stoquify-notification-escalation-router", "stoquify-agent-run-state-machine",
            "stoquify-model-cost-router", "stoquify-explicit-preference-memory",
            "stoquify-offline-replay-awareness", "stoquify-country-pack-provenance-resolver",
            "stoquify-daily-operating-brief", "stoquify-cross-domain-root-cause-trace",
            "stoquify-cash-exception-triage", "stoquify-reconciliation-match-suggestion",
            "stoquify-inventory-risk-replenishment", "stoquify-inventory-variance-investigation",
            "stoquify-po-receipt-invoice-variance", "stoquify-supplier-commitment-payment-risk",
            "stoquify-close-blocker-navigator", "stoquify-compliance-readiness-explanation",
            "stoquify-payroll-readiness-variance", "stoquify-adoption-onboarding-coach",
        ], start=1
    )
}
EXPECTED_AGENTS = {
    "stoquify-command-agent", "stoquify-exception-action-orchestrator",
    "stoquify-cash-reconciliation-agent", "stoquify-inventory-replenishment-agent",
    "stoquify-purchasing-accounts-payable-agent", "stoquify-close-compliance-agent",
    "stoquify-platform-assurance-agent", "stoquify-customer-success-adoption-agent",
    "stoquify-payroll-workforce-agent",
}
REQUIRED_SKILL_FILES = {
    "SKILL.md", "agents/openai.yaml", "references/evidence-map.md",
    "references/verification.md", "references/capability-contract.json",
    "schemas/input.schema.json", "schemas/output.schema.json",
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check_dag(records: list[dict], errors: list[str]) -> None:
    graph = {r["id"]: [d for d in r.get("dependencies", []) if d in EXPECTED_SKILLS] for r in records if r["type"] == "skill"}
    state: dict[str, int] = {}

    def visit(node: str) -> None:
        if state.get(node) == 1:
            errors.append(f"dependency cycle at {node}")
            return
        if state.get(node) == 2:
            return
        state[node] = 1
        for dependency in graph.get(node, []):
            if dependency not in graph:
                errors.append(f"missing dependency {dependency} referenced by {node}")
            else:
                visit(dependency)
        state[node] = 2

    for node in graph:
        visit(node)


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    agent_files = {p.stem for p in (ROOT / "agents").glob("*.toml")}
    skill_dirs = {p.name for p in (ROOT / "skills").iterdir() if p.is_dir()}
    if agent_files != EXPECTED_AGENTS:
        errors.append(f"agent set mismatch: missing={sorted(EXPECTED_AGENTS-agent_files)} extra={sorted(agent_files-EXPECTED_AGENTS)}")
    if skill_dirs != set(EXPECTED_SKILLS.values()):
        errors.append("skill directory set does not match S01-S28")

    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix.lower() in {".pdf", ".pyc"} or "scripts" in path.parts or "validation-report" in path.name or "completion-report" in path.name:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        if re.search(r"\b(TODO|TBD|FIXME|PLACEHOLDER)\b", text, re.I):
            errors.append(f"placeholder marker in {path.relative_to(ROOT)}")

    for slug in EXPECTED_AGENTS:
        path = ROOT / "agents" / f"{slug}.toml"
        try:
            data = tomllib.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"invalid TOML {path.name}: {exc}")
            continue
        if set(data) != {"name", "description", "developer_instructions"}:
            errors.append(f"unexpected TOML fields in {path.name}")
        body = data.get("developer_instructions", "")
        if len(body.split()) < 500:
            errors.append(f"developer_instructions too short in {path.name}")
        for heading in ["Identity", "Mission", "Scope and exclusions", "Inputs", "Outputs", "Skills", "Tool", "Failure", "Evaluation", "Version lifecycle"]:
            if heading.lower() not in body.lower():
                errors.append(f"{path.name} missing {heading} section")

    for sid, slug in EXPECTED_SKILLS.items():
        base = ROOT / "skills" / slug
        for rel in REQUIRED_SKILL_FILES:
            if not (base / rel).is_file():
                errors.append(f"{slug} missing {rel}")
        skill = (base / "SKILL.md").read_text(encoding="utf-8")
        match = re.match(r"^---\n(.*?)\n---\n", skill, re.S)
        if not match:
            errors.append(f"{slug} invalid frontmatter")
        else:
            keys = {line.split(":", 1)[0].strip() for line in match.group(1).splitlines() if ":" in line}
            if keys != {"name", "description"}:
                errors.append(f"{slug} frontmatter keys are {sorted(keys)}")
            if f"name: {slug}" not in match.group(1):
                errors.append(f"{slug} frontmatter name mismatch")
        if len(skill.splitlines()) >= 500:
            errors.append(f"{slug}/SKILL.md exceeds progressive-disclosure limit")
        yaml = (base / "agents" / "openai.yaml").read_text(encoding="utf-8")
        short_match = re.search(r'short_description:\s*"([^"]+)"', yaml)
        if not short_match or not 25 <= len(short_match.group(1)) <= 64:
            errors.append(f"{slug} invalid short_description")
        if f'default_prompt: "Use ${slug} ' not in yaml:
            errors.append(f"{slug} invalid default_prompt")
        for rel in ["references/capability-contract.json", "schemas/input.schema.json", "schemas/output.schema.json"]:
            try:
                document = json.loads((base / rel).read_text(encoding="utf-8"))
            except Exception as exc:
                errors.append(f"invalid JSON {slug}/{rel}: {exc}")
                continue
            if rel.startswith("schemas/"):
                required = {"$schema", "$id", "title", "type", "required", "properties", "additionalProperties"}
                missing = required - set(document)
                if missing:
                    errors.append(f"{slug}/{rel} missing {sorted(missing)}")

    for path in (ROOT / "contracts").glob("*.schema.json"):
        try:
            document = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"invalid contract JSON {path.name}: {exc}")
            continue
        missing = {"$schema", "$id", "title", "type", "required", "properties", "additionalProperties"} - set(document)
        if missing:
            errors.append(f"{path.name} missing {sorted(missing)}")

    registry_path = ROOT / "registry" / "capability-registry.json"
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    records = registry.get("capabilities", [])
    if len(records) != 37:
        errors.append(f"registry has {len(records)} records, expected 37")
    required_registry = {"id", "type", "slug", "title", "disposition", "phase", "risk", "autonomy_ceiling", "dependencies", "canonical_source", "lifecycle", "version", "domain_owner", "users", "triggers", "modes", "input_contract", "output_contract", "permissions", "data_classification", "evidence_contract", "verification", "rollback", "deprecation"}
    for record in records:
        missing = required_registry - set(record)
        if missing:
            errors.append(f"registry {record.get('id')} missing {sorted(missing)}")
        if record.get("disposition") not in {"REUSE_AS_IS", "EXTEND", "COMPOSE", "NEW", "DEPRECATE"}:
            errors.append(f"registry {record.get('id')} invalid disposition")
        source = ROOT / record.get("canonical_source", "")
        if not source.exists():
            errors.append(f"registry source missing for {record.get('id')}")
        if record.get("disposition") == "NEW" and not record.get("no_existing_owner_rationale"):
            errors.append(f"NEW registry record {record.get('id')} lacks rationale")
    check_dag(records, errors)

    catalog = json.loads((ROOT / "evaluations" / "evaluation-catalog.json").read_text(encoding="utf-8"))
    cases = catalog.get("cases", [])
    by_capability = Counter(case.get("capability_id") for case in cases)
    by_category: dict[str, Counter] = defaultdict(Counter)
    for case in cases:
        by_category[case.get("capability_id")][case.get("category")] += 1
        if case.get("execution_status") != "NOT_TESTED":
            errors.append(f"unevaluated source case {case.get('id')} has unsupported execution status")
    for capability in list(EXPECTED_SKILLS) + list(EXPECTED_AGENTS):
        if by_capability[capability] < 27:
            errors.append(f"{capability} has only {by_capability[capability]} designed evaluation cases")
        for category in ["nominal", "malformed", "access_control", "dependency_recovery", "adversarial"]:
            if by_category[capability][category] < 5:
                errors.append(f"{capability} has fewer than five {category} cases")

    required_reports = {"refined-execution-prompt.md", "first-production-slice.md", "30-60-90-roadmap.md", "installation-proposal.md", "unresolved-questions.md", "traceability-matrix.md"}
    for filename in required_reports:
        if not (ROOT / "reports" / filename).is_file():
            errors.append(f"missing report {filename}")

    hashes = {str(path.relative_to(ROOT)).replace("\\", "/"): digest(path) for path in ROOT.rglob("*") if path.is_file() and path.name not in {"validation-report.json", "validation-report.md", "completion-report.json", "completion-report.md"}}
    status = "PASS" if not errors else "FAIL"
    report = {
        "schema_version": "1.0.0", "suite": "Stoquify Copilot Agent and Skill Definition Source Suite",
        "structural_source_status": status, "production_readiness": "NOT_TESTED",
        "counts": {"agents": len(agent_files), "skills": len(skill_dirs), "registry_records": len(records), "designed_evaluation_cases": len(cases)},
        "errors": errors, "warnings": warnings + ["Behavioral runtime, integration, load, canary, suspension, and rollback drills are NOT_TESTED; no production certification is claimed."],
        "sha256": hashes,
    }
    (ROOT / "reports" / "validation-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    lines = ["# Validation Report", "", f"Structural source status: **{status}**", "", "Production readiness: **NOT_TESTED**", "", f"- Agents: {len(agent_files)}", f"- Skills: {len(skill_dirs)}", f"- Registry records: {len(records)}", f"- Designed evaluation cases: {len(cases)}", "", "## Errors", ""]
    lines += [f"- {error}" for error in errors] or ["- None"]
    lines += ["", "## Qualification", "", "The definitions are structurally validated source candidates. Runtime behavior, integrations, load, canary operation, suspension, and rollback remain NOT_TESTED and must pass before production."]
    (ROOT / "reports" / "validation-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    completion = {"schema_version": "1.0.0", "source_creation": "COMPLETE" if status == "PASS" else "INCOMPLETE", "production_readiness": "NOT_TESTED", "required_capabilities": 37, "present_capabilities": len(records), "remaining_required_source_work": errors}
    (ROOT / "reports" / "completion-report.json").write_text(json.dumps(completion, indent=2) + "\n", encoding="utf-8")
    (ROOT / "reports" / "completion-report.md").write_text(f"# Completion Report\n\nSource creation: **{completion['source_creation']}**\n\nProduction readiness: **NOT_TESTED**\n\nAll 9 agent definitions and 28 skill packages are present when source creation is COMPLETE. Runtime installation and production certification are deliberately outside this source-generation execution.\n", encoding="utf-8")
    print(json.dumps({"status": status, "errors": len(errors), "agents": len(agent_files), "skills": len(skill_dirs), "registry": len(records), "cases": len(cases)}))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
