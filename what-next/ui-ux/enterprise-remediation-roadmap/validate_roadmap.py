#!/usr/bin/env python3
"""Validate structural integrity of the Stoquify UI/UX remediation roadmap.

This checks planning artifacts only. It does not certify the application or replace
the implementation-time verification and human validation defined by the roadmap.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
ROADMAP_DIR = Path(__file__).resolve().parent
MASTER = ROOT / "docs/system-audit/STOQUIFY_ENTERPRISE_UI_UX_REMEDIATION_ROADMAP_2026-08-06.md"

REQUIRED_FILES = [
    "00_EXECUTIVE_ROADMAP.md",
    "01_AUDIT_TRACEABILITY_REGISTER.md",
    "01_AUDIT_TRACEABILITY_REGISTER.json",
    "02_DEPENDENCY_AND_CRITICAL_PATH.md",
    "03_WORK_BREAKDOWN_STRUCTURE.md",
    "03_WORK_BREAKDOWN_STRUCTURE_PHASE_C_D.md",
    "04_VERIFICATION_VALIDATION_MATRIX.md",
    "05_ROUTE_ROLE_CAPABILITY_CERTIFICATION_MANIFEST.json",
    "schemas/uiux-certification-manifest.schema.json",
    "06_PHASE_GATES_AND_RELEASE_CRITERIA.md",
    "07_ROLLOUT_AND_ROLLBACK_RUNBOOK.md",
    "08_RISK_ASSUMPTION_DECISION_LOG.md",
    "09_CHANGE_MANAGEMENT_SUPPORT_AND_TRAINING.md",
    "10_FINAL_READINESS_REPORT_TEMPLATE.md",
]

EXPECTED_WORK_PACKAGES = {
    "G0-01", "G0-02", "G0-03",
    "A-01", "A-02", "A-03", "A-04", "A-05", "A-06", "A-07", "A-08", "A-09",
    "B-01", "B-02", "B-03", "B-04", "B-05", "B-06", "B-07",
    "C-00", "C-01", "C-02", "C-03", "C-04", "C-05", "C-06", "C-07",
    "D-01", "D-02", "D-03", "D-04", "D-05",
}

EXPECTED_FINDINGS = {
    "P0-01", "P0-02", "P0-03", "P0-04", "P0-05",
    "P1-01", "P1-02", "P1-03", "P1-04", "P1-05", "P1-06", "P1-07", "P1-08",
    "P2-01", "P2-02", "P2-03", "P2-04", "P2-05", "P2-06",
}

EXPECTED_CONTRACTS = {f"CT-{number:02d}" for number in range(1, 11)}

TRACE_REQUIRED_FIELDS = {
    "id", "category", "priority", "title", "currentEvidence", "revalidationStatus",
    "roles", "domains", "boundary", "outcome", "workPackages", "dependencies",
    "verification", "validation", "reviewer", "rolloutGate", "rollback",
    "residualRisk", "disposition",
}


def load_json(path: Path, failures: list[str]) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # report the artifact and exact parser failure
        failures.append(f"Invalid JSON {path.relative_to(ROOT)}: {exc}")
        return {}


def validate_dag(work_packages: list[dict], failures: list[str]) -> None:
    graph = {item["id"]: item.get("dependsOn", []) for item in work_packages if "id" in item}
    temporary: set[str] = set()
    permanent: set[str] = set()

    def visit(node: str, trail: list[str]) -> None:
        if node in permanent:
            return
        if node in temporary:
            failures.append(f"Work-package dependency cycle: {' -> '.join(trail + [node])}")
            return
        temporary.add(node)
        for dependency in graph.get(node, []):
            visit(dependency, trail + [node])
        temporary.remove(node)
        permanent.add(node)

    for package_id in graph:
        visit(package_id, [])


def main() -> int:
    failures: list[str] = []

    if not MASTER.is_file():
        failures.append(f"Missing master roadmap: {MASTER.relative_to(ROOT)}")

    for relative in REQUIRED_FILES:
        path = ROADMAP_DIR / relative
        if not path.is_file() or path.stat().st_size == 0:
            failures.append(f"Missing or empty artifact: {path.relative_to(ROOT)}")

    register = load_json(ROADMAP_DIR / "01_AUDIT_TRACEABILITY_REGISTER.json", failures)
    manifest = load_json(ROADMAP_DIR / "05_ROUTE_ROLE_CAPABILITY_CERTIFICATION_MANIFEST.json", failures)
    load_json(ROADMAP_DIR / "schemas/uiux-certification-manifest.schema.json", failures)

    work_packages = register.get("workPackages", [])
    package_ids = [item.get("id") for item in work_packages]
    if len(package_ids) != len(set(package_ids)):
        failures.append("Duplicate work-package ID in traceability register")
    missing_packages = EXPECTED_WORK_PACKAGES - set(package_ids)
    unexpected_packages = set(package_ids) - EXPECTED_WORK_PACKAGES
    if missing_packages:
        failures.append(f"Missing work packages: {sorted(missing_packages)}")
    if unexpected_packages:
        failures.append(f"Unexpected work packages: {sorted(unexpected_packages)}")

    for item in work_packages:
        missing_fields = {"id", "phase", "priority", "title", "dependsOn", "estimateIdealDays", "accountable"} - set(item)
        if missing_fields:
            failures.append(f"Work package {item.get('id', '<unknown>')} missing: {sorted(missing_fields)}")
        unknown_dependencies = set(item.get("dependsOn", [])) - EXPECTED_WORK_PACKAGES
        if unknown_dependencies:
            failures.append(f"Work package {item.get('id')} has unknown dependencies: {sorted(unknown_dependencies)}")
        if item.get("id") in item.get("dependsOn", []):
            failures.append(f"Work package {item.get('id')} depends on itself")
    validate_dag(work_packages, failures)

    trace_items = register.get("traceItems", [])
    trace_ids = [item.get("id") for item in trace_items]
    if len(trace_ids) != len(set(trace_ids)):
        failures.append("Duplicate trace-item ID")
    finding_ids = {item.get("id") for item in trace_items if item.get("category") == "audit-finding"}
    contract_ids = {item.get("id") for item in trace_items if item.get("category") == "contract"}
    if finding_ids != EXPECTED_FINDINGS:
        failures.append(f"Finding coverage mismatch; missing={sorted(EXPECTED_FINDINGS - finding_ids)}, unexpected={sorted(finding_ids - EXPECTED_FINDINGS)}")
    if contract_ids != EXPECTED_CONTRACTS:
        failures.append(f"Contract coverage mismatch; missing={sorted(EXPECTED_CONTRACTS - contract_ids)}, unexpected={sorted(contract_ids - EXPECTED_CONTRACTS)}")

    for item in trace_items:
        item_id = item.get("id", "<unknown>")
        missing_fields = TRACE_REQUIRED_FIELDS - set(item)
        if missing_fields:
            failures.append(f"Trace item {item_id} missing: {sorted(missing_fields)}")
        if not item.get("workPackages"):
            failures.append(f"Trace item {item_id} has no work-package mapping")
        unknown_mappings = set(item.get("workPackages", [])) - EXPECTED_WORK_PACKAGES
        if unknown_mappings:
            failures.append(f"Trace item {item_id} maps unknown work packages: {sorted(unknown_mappings)}")
        unknown_contracts = set(item.get("dependencies", [])) - EXPECTED_CONTRACTS
        if unknown_contracts:
            failures.append(f"Trace item {item_id} has unknown contract dependencies: {sorted(unknown_contracts)}")
        for nonempty_field in ("verification", "validation", "reviewer", "rolloutGate", "rollback", "residualRisk"):
            if not item.get(nonempty_field):
                failures.append(f"Trace item {item_id} has empty {nonempty_field}")

    wbs_text = "\n".join(
        (ROADMAP_DIR / filename).read_text(encoding="utf-8")
        for filename in ("03_WORK_BREAKDOWN_STRUCTURE.md", "03_WORK_BREAKDOWN_STRUCTURE_PHASE_C_D.md")
        if (ROADMAP_DIR / filename).is_file()
    )
    for package_id in EXPECTED_WORK_PACKAGES:
        if package_id not in wbs_text:
            failures.append(f"Work package {package_id} missing from detailed WBS documents")

    if manifest.get("status") != "planned-not-certified":
        failures.append("Certification manifest must remain planned-not-certified until execution evidence exists")
    completion = manifest.get("completion", {})
    if completion.get("certified") is not False:
        failures.append("Certification manifest incorrectly claims certification")

    dimensions = manifest.get("dimensions", {})
    required_dimensions = {"locales", "currencies", "timeZones", "themes", "browsers", "viewports", "connectionStates", "dataStates", "roles", "packages"}
    missing_dimensions = required_dimensions - set(dimensions)
    if missing_dimensions:
        failures.append(f"Certification manifest missing dimensions: {sorted(missing_dimensions)}")

    route_families = manifest.get("routeFamilies", [])
    route_ids = [item.get("id") for item in route_families]
    if len(route_families) < 10:
        failures.append("Certification manifest must define at least ten route families")
    if len(route_ids) != len(set(route_ids)):
        failures.append("Duplicate certification route-family ID")
    required_route_fields = {"id", "tier", "patterns", "owner", "requiredRoles", "requiredPackages", "requiredStates", "requiredEvidence", "status"}
    for route in route_families:
        missing_fields = required_route_fields - set(route)
        if missing_fields:
            failures.append(f"Route family {route.get('id', '<unknown>')} missing: {sorted(missing_fields)}")
        if route.get("status") != "planned":
            failures.append(f"Route family {route.get('id')} must remain planned until evidence exists")

    fixture_ids = [item.get("id") for item in manifest.get("fixtureProfiles", [])]
    if len(fixture_ids) < 10 or len(fixture_ids) != len(set(fixture_ids)):
        failures.append("Fixture catalog must contain at least ten unique profiles")

    master_text = MASTER.read_text(encoding="utf-8") if MASTER.is_file() else ""
    for relative in REQUIRED_FILES:
        if relative.startswith("schemas/"):
            continue
        if Path(relative).name not in master_text:
            failures.append(f"Master roadmap does not reference {Path(relative).name}")

    if failures:
        print("ROADMAP VALIDATION: FAILED")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("ROADMAP VALIDATION: PASSED")
    print(f"- required artifacts: {len(REQUIRED_FILES) + 1} (including master)")
    print(f"- work packages: {len(package_ids)}")
    print(f"- audit findings: {len(finding_ids)}")
    print(f"- contracts: {len(contract_ids)}")
    print(f"- fixture profiles: {len(fixture_ids)}")
    print(f"- route families: {len(route_families)}")
    print("- dependency graph: acyclic")
    print("- certification status: planned-not-certified")
    return 0


if __name__ == "__main__":
    sys.exit(main())
