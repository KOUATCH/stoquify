#!/usr/bin/env python3
"""Validate the self-contained Stoquify UI/UX remediation publication package."""

from __future__ import annotations

import json
import sys
from pathlib import Path


HERE = Path(__file__).resolve().parent
MASTER = "STOQUIFY_ENTERPRISE_UI_UX_REMEDIATION_ROADMAP_2026-08-06.md"
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
REQUIRED_JSON = {
    "01_AUDIT_TRACEABILITY_REGISTER.json",
    "05_ROUTE_ROLE_CAPABILITY_CERTIFICATION_MANIFEST.json",
    "uiux-certification-manifest.schema.json",
}


def read_json(name: str, failures: list[str]) -> dict:
    try:
        return json.loads((HERE / name).read_text(encoding="utf-8"))
    except Exception as exc:
        failures.append(f"Invalid JSON {name}: {exc}")
        return {}


def validate_dag(packages: list[dict], failures: list[str]) -> None:
    graph = {item.get("id"): item.get("dependsOn", []) for item in packages}
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(node: str, trail: list[str]) -> None:
        if node in visited:
            return
        if node in visiting:
            failures.append(f"Dependency cycle: {' -> '.join(trail + [node])}")
            return
        visiting.add(node)
        for dependency in graph.get(node, []):
            visit(dependency, trail + [node])
        visiting.remove(node)
        visited.add(node)

    for node in graph:
        visit(node, [])


def main() -> int:
    failures: list[str] = []
    markdown = {path.stem: path for path in HERE.glob("*.md")}
    pdf = {path.stem: path for path in HERE.glob("*.pdf")}

    if MASTER.removesuffix(".md") not in markdown:
        failures.append(f"Missing authoritative roadmap: {MASTER}")
    if markdown.keys() != pdf.keys():
        failures.append(f"Markdown/PDF mismatch; missing PDFs={sorted(markdown.keys() - pdf.keys())}, orphan PDFs={sorted(pdf.keys() - markdown.keys())}")

    for stem, path in pdf.items():
        data = path.read_bytes()
        if len(data) < 1024 or not data.startswith(b"%PDF-") or b"%%EOF" not in data[-2048:]:
            failures.append(f"Unreadable or truncated PDF envelope: {path.name}")

    for name in REQUIRED_JSON:
        if not (HERE / name).is_file():
            failures.append(f"Missing machine-readable artifact: {name}")

    register = read_json("01_AUDIT_TRACEABILITY_REGISTER.json", failures)
    manifest = read_json("05_ROUTE_ROLE_CAPABILITY_CERTIFICATION_MANIFEST.json", failures)
    read_json("uiux-certification-manifest.schema.json", failures)

    packages = register.get("workPackages", [])
    package_ids = {item.get("id") for item in packages}
    if package_ids != EXPECTED_WORK_PACKAGES:
        failures.append(f"Work-package mismatch; missing={sorted(EXPECTED_WORK_PACKAGES - package_ids)}, unexpected={sorted(package_ids - EXPECTED_WORK_PACKAGES)}")
    for item in packages:
        unknown = set(item.get("dependsOn", [])) - EXPECTED_WORK_PACKAGES
        if unknown:
            failures.append(f"{item.get('id')} has unknown dependencies: {sorted(unknown)}")
    validate_dag(packages, failures)

    trace = register.get("traceItems", [])
    findings = {item.get("id") for item in trace if item.get("category") == "audit-finding"}
    contracts = {item.get("id") for item in trace if item.get("category") == "contract"}
    if findings != EXPECTED_FINDINGS:
        failures.append(f"Finding coverage mismatch; missing={sorted(EXPECTED_FINDINGS - findings)}")
    if contracts != EXPECTED_CONTRACTS:
        failures.append(f"Contract coverage mismatch; missing={sorted(EXPECTED_CONTRACTS - contracts)}")
    for item in trace:
        if not item.get("workPackages") or set(item.get("workPackages", [])) - EXPECTED_WORK_PACKAGES:
            failures.append(f"Invalid work-package mapping on {item.get('id')}")

    families = manifest.get("routeFamilies", [])
    fixtures = manifest.get("fixtureProfiles", [])
    if manifest.get("status") != "planned-not-certified" or manifest.get("completion", {}).get("certified") is not False:
        failures.append("Manifest must remain planned-not-certified until execution evidence exists")
    if len(families) < 10 or len(fixtures) < 10:
        failures.append("Certification manifest lacks required route families or fixtures")

    if failures:
        print("PUBLICATION VALIDATION: FAILED")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("PUBLICATION VALIDATION: PASSED")
    print(f"- Markdown/PDF report pairs: {len(markdown)}")
    print(f"- Machine-readable JSON artifacts: {len(REQUIRED_JSON)}")
    print(f"- Work packages: {len(package_ids)}")
    print(f"- Audit findings: {len(findings)}")
    print(f"- Contracts: {len(contracts)}")
    print(f"- Fixture profiles: {len(fixtures)}")
    print(f"- Route families: {len(families)}")
    print("- Dependency graph: acyclic")
    return 0


if __name__ == "__main__":
    sys.exit(main())
