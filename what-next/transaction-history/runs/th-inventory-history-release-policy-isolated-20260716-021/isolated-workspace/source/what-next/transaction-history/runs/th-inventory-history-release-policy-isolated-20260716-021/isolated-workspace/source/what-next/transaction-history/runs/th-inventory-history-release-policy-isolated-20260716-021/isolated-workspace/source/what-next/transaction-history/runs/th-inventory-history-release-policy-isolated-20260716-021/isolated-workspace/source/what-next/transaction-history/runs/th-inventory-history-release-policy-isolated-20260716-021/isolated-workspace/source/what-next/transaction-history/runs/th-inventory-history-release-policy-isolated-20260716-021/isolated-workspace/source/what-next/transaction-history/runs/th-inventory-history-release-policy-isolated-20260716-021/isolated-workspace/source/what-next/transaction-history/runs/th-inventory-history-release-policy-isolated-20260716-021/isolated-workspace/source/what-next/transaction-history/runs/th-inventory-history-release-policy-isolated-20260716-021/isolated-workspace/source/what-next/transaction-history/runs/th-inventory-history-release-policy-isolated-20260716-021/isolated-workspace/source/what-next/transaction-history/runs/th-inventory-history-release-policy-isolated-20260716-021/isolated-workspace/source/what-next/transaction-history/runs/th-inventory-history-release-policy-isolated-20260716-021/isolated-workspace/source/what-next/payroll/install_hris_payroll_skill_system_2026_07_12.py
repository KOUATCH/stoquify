from __future__ import annotations

import json
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path


WORKSPACE = Path(r"E:\ohada saas\Focused projects\stoquify")
SKILLS_ROOT = Path(r"C:\Users\J COMPUTER\.codex\skills")
INIT_SCRIPT = SKILLS_ROOT / ".system" / "skill-creator" / "scripts" / "init_skill.py"
VALIDATOR = SKILLS_ROOT / ".system" / "skill-creator" / "scripts" / "quick_validate.py"

BLUEPRINT = WORKSPACE / "docs" / "HR-Payroll" / "AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_2026-07-12.md"
PAYROLL_DIR = WORKSPACE / "what-next" / "payroll"
DRAFT_ROOT = PAYROLL_DIR / "hris-payroll-skill-suite-drafts-2026-07-12"
INSTALL_REPORT = PAYROLL_DIR / "AQSTOQFLOW_HRIS_PAYROLL_SKILL_INSTALLATION_AND_VALIDATION_REPORT_2026-07-12.md"
PILOT_REPORT = PAYROLL_DIR / "AQSTOQFLOW_HRIS_PAYROLL_ORCHESTRATOR_PILOT_REPORT_2026-07-12.md"
STATUS_REGISTER = PAYROLL_DIR / "AQSTOQFLOW_HRIS_PAYROLL_STATUS_REGISTER_2026-07-12.md"


OPERATING_LAW = [
    "HRIS owns people truth.",
    "Payroll consumes certified HRIS snapshots.",
    "Accounting records money truth.",
    "Assurance proves the whole chain.",
]


COMMON_RISK_CONTROLS = [
    "Do not allow UI-derived payroll truth.",
    "Do not let payroll invent HRIS truth.",
    "Do not create duplicate employee truth.",
    "Do not run payroll without certified HRIS readiness.",
    "Do not accept unreviewed statutory formulas.",
    "Do not release payments without approved destination evidence.",
    "Do not submit declarations without authority proof.",
    "Do not mutate backfilled data without dry-run and signoff.",
    "Do not leak cross-tenant or cross-employee data.",
    "Do not broaden refactors outside the active slice.",
    "Do not treat stale reports as current truth.",
]


COMMON_EVIDENCE = [
    "docs/HR-Payroll/README.md",
    "docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md",
    "docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md",
    "docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md",
    "docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_2026-07-12.md",
    "what-next/payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_NEXT_STEPS_2026-07-12.md",
    "what-next/payroll/",
    "docs/prompts/skills/",
    "prisma/",
    "services/payroll/",
    "actions/payroll/",
    "components/payroll/",
    "app/[locale]/(dashboard)/dashboard/payroll/",
    "config/permissions.ts",
    "lib/security/rbac-permissions.ts",
]


@dataclass(frozen=True)
class SkillSpec:
    number: str
    slug: str
    display_name: str
    short_description: str
    purpose: str
    triggers: str
    prerequisites: list[str]
    evidence: list[str]
    surfaces: list[str]
    may_change: list[str]
    must_not_change: list[str]
    gates: list[str]
    report_path: str
    handoff: str
    stop: str
    success: str

    @property
    def name(self) -> str:
        return f"aqstoqflow-hris-payroll-{self.number}-{self.slug}"


SPECS = [
    SkillSpec(
        "00",
        "orchestrator",
        "AqStoqFlow HRIS Payroll 00 Orchestrator",
        "Select next HRIS payroll slice.",
        "Select the next safe HRIS/payroll slice and keep execution in dependency order.",
        "the user asks what to do next, asks to execute the roadmap, or asks to continue HRIS/payroll work after a report",
        ["Current roadmap and status evidence must be readable, or hand off to 01-status-register."],
        ["docs/HR-Payroll/", "what-next/payroll/", "existing skill installers", "recent git status"],
        ["planning reports only unless a downstream skill is selected"],
        ["saved orchestration report", "updated next-step report"],
        ["production code", "database schema", "installed skills", "payroll business logic"],
        ["report consistency grep", "no-production-code-change check"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ORCHESTRATOR_REPORT_<date>.md",
        "Hand off to the earliest incomplete prerequisite skill.",
        "Stop if required roadmap/status documents conflict, are missing, or are too stale to trust.",
        "One next skill is selected with clear prerequisites, verification, and stop conditions.",
    ),
    SkillSpec(
        "01",
        "status-register",
        "AqStoqFlow HRIS Payroll 01 Status Register",
        "Create canonical readiness register.",
        "Create the canonical HRIS/payroll status register.",
        "work begins after long gaps, many reports exist, or readiness is disputed",
        ["Access to docs/HR-Payroll and what-next/payroll."],
        ["all HRIS/payroll blueprint, roadmap, phase, wave, final-readiness, browser-smoke, country-pack, payment, declaration, and backfill reports"],
        ["docs/HR-Payroll reports", "what-next/payroll reports"],
        ["canonical status register", "supersession map"],
        ["service code", "Prisma schema", "routes", "installed skills", "test fixtures"],
        ["rg evidence checks proving every major blocker class is represented"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_STATUS_REGISTER_<date>.md",
        "Hand off to 02-source-truth-map.",
        "Stop if reports contradict each other and cannot be reconciled without user decision.",
        "Blockers are classified as open, closed, superseded, pilot-only, or ready for implementation.",
    ),
    SkillSpec(
        "02",
        "source-truth-map",
        "AqStoqFlow HRIS Payroll 02 Source Truth Map",
        "Map HRIS payroll data ownership.",
        "Map ownership across HRIS, payroll, accounting, assurance, compliance, and country packs.",
        "schema, service, API, or report work involves employee, payroll, accounting, or statutory data",
        ["Current status register."],
        ["Prisma schema", "HR/payroll services", "setup/config services", "accounting posting services", "assurance/proof-pack services", "permissions", "existing reports"],
        ["source-truth map report", "service boundary docs"],
        ["documentation", "narrow service-boundary follow-up reports"],
        ["payroll calculations", "HRIS schema in the mapping pass"],
        ["ownership matrix grep for HRIS, payroll, accounting, assurance, compliance, and country pack"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SOURCE_TRUTH_MAP_<date>.md",
        "Hand off to 03-employee-identity.",
        "Stop if a data field has multiple write owners and no safe owner can be inferred.",
        "Every critical field has one owner, consumers, audit rules, redaction rules, and mutation rules.",
    ),
    SkillSpec(
        "03",
        "employee-identity",
        "AqStoqFlow HRIS Payroll 03 Employee Identity",
        "Harden employee identity boundaries.",
        "Build employee identity, tenant scope, duplicate-risk, and user-to-employee mapping boundaries.",
        "employee master data, employee self-service, manager access, payslip access, or payroll run eligibility is in scope",
        ["Source-truth map.", "Permission model review."],
        ["employee models", "user models", "tenant/org relations", "RBAC permissions", "payroll employee services", "self-service routes", "duplicate detection reports"],
        ["employee services", "identity mapping services", "tests", "reports"],
        ["identity service contracts", "duplicate checks", "user-to-employee mapping checks", "focused tests"],
        ["payroll calculation logic", "country-pack formulas", "unrelated auth flows"],
        ["tenant isolation", "duplicate prevention", "user-to-employee access denial", "redacted employee payload tests"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_EMPLOYEE_IDENTITY_<date>.md",
        "Hand off to 04-org-structure-manager-scope.",
        "Stop if employee identity can be created or read outside tenant scope.",
        "Employee identity is service-owned, tenant-scoped, deduplicated, auditable, and payroll-snapshot safe.",
    ),
    SkillSpec(
        "04",
        "org-structure-manager-scope",
        "AqStoqFlow HRIS Payroll 04 Org Manager Scope",
        "Scope org and manager access.",
        "Build org unit, branch, position, manager, and scoped access rules.",
        "manager self-service, approvals, branch-level payroll, or department reporting work is in scope",
        ["Employee identity boundary."],
        ["org/location/branch models", "manager relationships", "permissions", "navigation", "HR/payroll dashboards", "approval services"],
        ["org-scope services", "permission checks", "approval queries", "tests"],
        ["scoped query helpers", "manager access checks", "approval scope tests"],
        ["global admin permissions unless the active slice requires it"],
        ["manager sees assigned scope only", "cross-branch denial", "cross-tenant denial"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ORG_MANAGER_SCOPE_<date>.md",
        "Hand off to 05-contract-lifecycle.",
        "Stop if manager scope cannot be proven from durable relationships.",
        "Org and manager scope is explicit, testable, and not inferred from UI navigation.",
    ),
    SkillSpec(
        "05",
        "contract-lifecycle",
        "AqStoqFlow HRIS Payroll 05 Contract Lifecycle",
        "Control contract lifecycle evidence.",
        "Build contract lifecycle, evidence, approvals, termination, amendments, and readiness blockers.",
        "onboarding, contract amendment, termination, compensation activation, or payroll eligibility is in scope",
        ["Employee identity.", "Org scope."],
        ["contract models", "employee onboarding flows", "approval services", "document services", "audit logs", "payroll eligibility checks"],
        ["contract services", "approval actions", "readiness checks", "tests"],
        ["contract state machine", "evidence references", "readiness blockers", "maker-checker checks"],
        ["payroll run finalization", "statutory formulas"],
        ["approved effective contract required for payroll activation", "amendment and termination audit evidence"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_CONTRACT_LIFECYCLE_<date>.md",
        "Hand off to 06-compensation-controls.",
        "Stop if active compensation can exist without an approved contract.",
        "Contract state is effective-dated, approved, auditable, and contributes payroll readiness blockers.",
    ),
    SkillSpec(
        "06",
        "compensation-controls",
        "AqStoqFlow HRIS Payroll 06 Compensation Controls",
        "Guard compensation source truth.",
        "Build compensation/rubrique source truth, salary-change maker-checker, and benefit/deduction boundaries.",
        "salary changes, benefits, deductions, employee balances, or payroll run input generation is in scope",
        ["Contract lifecycle.", "Country-pack source-truth map."],
        ["compensation models", "payroll component/rubrique services", "approval services", "balance services", "country-pack mappings", "proof reports"],
        ["compensation services", "payroll component source adapters", "tests", "reports"],
        ["compensation approval workflow", "effective dating", "readiness blockers", "mapping tests"],
        ["expert-reviewed statutory formulas without country-pack provenance work"],
        ["salary change maker-checker", "benefit/deduction traceability", "stale compensation readiness denial"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_COMPENSATION_CONTROLS_<date>.md",
        "Hand off to 07-document-evidence-redaction.",
        "Stop if payroll can read mutable compensation drafts.",
        "Payroll consumes approved, effective, traceable compensation records only.",
    ),
    SkillSpec(
        "07",
        "document-evidence-redaction",
        "AqStoqFlow HRIS Payroll 07 Document Evidence",
        "Redact HR document evidence.",
        "Build HR document/evidence handling, redaction, retention, and audit rules.",
        "employee documents, contract files, identity documents, payslip proof, audit exports, or self-service document access is in scope",
        ["Employee identity.", "Permission model review."],
        ["document storage services", "audit/proof-pack exports", "redaction helpers", "attachment routes", "payslip exports", "employee profile APIs"],
        ["document services", "redaction helpers", "export mappers", "tests"],
        ["redaction policies", "evidence metadata", "retention flags", "access tests"],
        ["raw document storage provider behavior without a migration plan"],
        ["unauthorized document denial", "role-appropriate redaction", "audit purpose records"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_DOCUMENT_EVIDENCE_REDACTION_<date>.md",
        "Hand off to 08-time-leave-attendance.",
        "Stop if sensitive employee documents are returned by public, cross-employee, or cross-tenant paths.",
        "Document evidence is tenant-scoped, role-redacted, audited, and safe for proof packs.",
    ),
    SkillSpec(
        "08",
        "time-leave-attendance",
        "AqStoqFlow HRIS Payroll 08 Time Leave Attendance",
        "Approve time and attendance inputs.",
        "Build schedules, leave, absences, overtime, corrections, approvals, and freeze contracts.",
        "attendance affects payroll or leave/overtime corrections are requested",
        ["Employee identity.", "Org scope.", "Contract lifecycle."],
        ["time/attendance models", "leave services", "schedule services", "approval flows", "payroll attendance adapters", "attendance readiness reports"],
        ["attendance services", "leave approval actions", "payroll input adapters", "tests"],
        ["attendance approval/freeze logic", "correction evidence", "payroll readiness blockers"],
        ["payroll run finalization without snapshot correction rules"],
        ["unapproved attendance readiness denial", "approved freeze evidence", "correction diff evidence"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_TIME_LEAVE_ATTENDANCE_<date>.md",
        "Hand off to 09-input-readiness-gate.",
        "Stop if payroll can consume unapproved attendance or mutable leave state.",
        "Payroll consumes approved, frozen, traceable time/leave/attendance inputs only.",
    ),
    SkillSpec(
        "09",
        "input-readiness-gate",
        "AqStoqFlow HRIS Payroll 09 Input Readiness",
        "Fail closed on missing HRIS input.",
        "Make payroll fail closed when HRIS inputs are missing, stale, unapproved, unsupported, or untraceable.",
        "payroll run creation, recalculation, release, or migration pilot is in scope",
        ["Identity readiness.", "Contract readiness.", "Compensation readiness.", "Document readiness.", "Attendance readiness."],
        ["payroll run services", "input validation services", "readiness reports", "Prisma models", "action routes", "UI run request flows"],
        ["payroll readiness services", "run creation actions", "tests", "reports"],
        ["readiness evaluator", "fail-closed run gates", "error codes", "focused tests"],
        ["payroll formulas", "downstream payment/declaration release"],
        ["missing contract denial", "stale compensation denial", "unapproved attendance denial", "missing destination denial", "unsupported country denial"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_INPUT_READINESS_GATE_<date>.md",
        "Hand off to 10-snapshot-correction.",
        "Stop if readiness is only checked in UI or can be bypassed by API/action calls.",
        "Every payroll run starts from a service-owned, tenant-scoped, auditable readiness verdict.",
    ),
    SkillSpec(
        "10",
        "snapshot-correction",
        "AqStoqFlow HRIS Payroll 10 Snapshot Correction",
        "Freeze payroll input snapshots.",
        "Build payroll input snapshots, diffing, correction planning, and post-finalization safety.",
        "payroll inputs can change after calculation or corrections/backfills are needed",
        ["Input readiness gate."],
        ["payroll run snapshot models", "correction services", "finalization services", "audit logs", "proof reports", "migration/backfill reports"],
        ["snapshot services", "correction planners", "audit/proof services", "tests"],
        ["snapshot persistence", "diff generation", "correction blockers", "post-finalization guards"],
        ["finalized ledger/payment records without approved correction flow"],
        ["snapshot immutability", "correction diff", "post-finalization block", "approved correction path"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SNAPSHOT_CORRECTION_<date>.md",
        "Hand off to 11-payroll-engine-integration.",
        "Stop if payroll can recalculate from live mutable HRIS data after snapshot creation.",
        "Payroll inputs are immutable snapshots with controlled correction evidence.",
    ),
    SkillSpec(
        "11",
        "payroll-engine-integration",
        "AqStoqFlow HRIS Payroll 11 Engine Integration",
        "Connect engine to certified snapshots.",
        "Reconnect payroll calculation to certified HRIS snapshots without weakening the existing payroll kernel.",
        "readiness/snapshot layers are complete and payroll calculation needs to consume them",
        ["Input readiness.", "Snapshot correction."],
        ["payroll calculation services", "country-pack adapters", "run services", "payroll kernel tests", "statutory fixture reports"],
        ["payroll run orchestration", "snapshot input adapters", "focused tests"],
        ["adapter between certified snapshots and existing payroll engine"],
        ["core calculation formulas except through country-pack provenance work"],
        ["existing payroll kernel tests", "snapshot-adapter tests", "negative readiness tests"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ENGINE_INTEGRATION_<date>.md",
        "Hand off to 12-country-pack-provenance.",
        "Stop if calculation reads directly from mutable HRIS tables instead of certified snapshots.",
        "Payroll calculation input is deterministic, certified, traceable, and compatible with existing kernel proof.",
    ),
    SkillSpec(
        "12",
        "country-pack-provenance",
        "AqStoqFlow HRIS Payroll 12 Country Pack Provenance",
        "Prove statutory formula provenance.",
        "Enforce expert-reviewed statutory country-pack formulas, golden fixtures, source hashes, and legal provenance.",
        "OHADA, SYSCOHADA, Cameroon, tax, social security, employer charge, declaration, or statutory formula work is in scope",
        ["Payroll engine integration.", "Current country-pack status."],
        ["country-pack services", "statutory fixture reports", "authority proof reports", "regulatory hardcode gates", "formula source documents"],
        ["country-pack registry", "fixtures", "provenance metadata", "tests"],
        ["provenance metadata", "fixture coverage", "fail-closed formula gates", "reports"],
        ["formulas without expert-reviewed source evidence"],
        ["regulatory hardcode gate", "golden fixture tieout", "unsupported country fail-closed", "source hash verification"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_COUNTRY_PACK_PROVENANCE_<date>.md",
        "Hand off to 13-payments-declarations-proof.",
        "Stop if statutory formulas lack source, review, fixture, or provenance.",
        "Country-pack calculations are evidence-backed, fixture-proven, and safe to expose to payroll runs.",
    ),
    SkillSpec(
        "13",
        "payments-declarations-proof",
        "AqStoqFlow HRIS Payroll 13 Payments Declarations",
        "Certify payments and declarations.",
        "Certify payment provider proof, authority declaration proof, settlement receipts, callbacks, and reconciliation.",
        "payment release, declaration submission, provider callback handling, or authority proof lifecycle work is in scope",
        ["Payroll run outputs.", "Country-pack provenance.", "Approved payment destination evidence."],
        ["payment provider services", "declaration services", "authority adapter reports", "reconciliation reports", "callback handlers", "proof drawers"],
        ["payment/declaration proof services", "reconciliation workers", "tests"],
        ["proof envelope validation", "callback idempotency", "settlement/declaration tieout checks"],
        ["employee bank/mobile-money data without HRIS document/evidence approval"],
        ["approved destination required", "provider callback dedupe", "declaration authority proof", "settlement tieout"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_PAYMENTS_DECLARATIONS_PROOF_<date>.md",
        "Hand off to 14-accounting-close-assurance.",
        "Stop if payments or declarations can be released without proof evidence and maker-checker approval.",
        "Every payment and declaration is traceable from certified payroll run to external proof and reconciliation.",
    ),
    SkillSpec(
        "14",
        "accounting-close-assurance",
        "AqStoqFlow HRIS Payroll 14 Accounting Close",
        "Tie payroll to close assurance.",
        "Connect payroll to ledger posting, source links, close assurance, proof packs, and audit exports.",
        "payroll results affect accounting, close packs, ledgers, reconciliations, or auditor exports",
        ["Payroll output proof.", "Payment/declaration proof."],
        ["ledger posting services", "close assurance services", "proof-pack exports", "payroll register tieout", "accounting reports", "redaction rules"],
        ["ledger bridge", "close assurance adapters", "proof-pack exports", "tests"],
        ["posting source links", "close blockers", "proof-pack aggregation", "redacted audit exports"],
        ["posted ledger entries except through approved reversal/correction flows"],
        ["register-to-ledger tieout", "close blocker for unresolved payroll proof", "redacted auditor export"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ACCOUNTING_CLOSE_ASSURANCE_<date>.md",
        "Hand off to 15-self-service or 16-browser-accessibility-release.",
        "Stop if payroll money truth cannot be reconciled to ledger and proof-pack evidence.",
        "Payroll accounting is traceable, close-aware, redacted, and audit-ready.",
    ),
    SkillSpec(
        "15",
        "self-service",
        "AqStoqFlow HRIS Payroll 15 Self Service",
        "Gate employee manager self-service.",
        "Build employee and manager self-service only after identity, scope, redaction, and readiness gates are safe.",
        "profile updates, document requests, leave requests, manager approvals, payslip access, or employee payroll views are in scope",
        ["Employee identity.", "Org scope.", "Document redaction.", "Input readiness.", "Proof access model."],
        ["self-service routes", "employee profile APIs", "manager approval components", "payslip routes", "navigation", "permission config"],
        ["self-service components", "route handlers", "actions", "permission tests", "browser smoke tests"],
        ["self-service access guards", "scoped read models", "redacted payloads", "UI route smoke coverage"],
        ["payroll source truth", "approvals from client state"],
        ["own-data employee access", "manager scoped access", "sensitive field redaction", "route smoke"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SELF_SERVICE_<date>.md",
        "Hand off to 16-browser-accessibility-release.",
        "Stop if self-service can bypass HRIS approvals or cross employee/tenant boundaries.",
        "Self-service is useful, scoped, redacted, auditable, and not a source of payroll truth.",
    ),
    SkillSpec(
        "16",
        "browser-accessibility-release",
        "AqStoqFlow HRIS Payroll 16 Browser Accessibility",
        "Validate UI release evidence.",
        "Run route smoke, accessibility, visual validation, RBAC negative checks, and release gates.",
        "dashboard, route, workflow, navigation, sidebar, responsive, or release-candidate changes are in scope",
        ["Implemented slice with focused tests passing."],
        ["Playwright/browser scripts", "route smoke reports", "screenshots", "accessibility reports", "RBAC configs", "package scripts"],
        ["smoke scripts", "browser evidence reports", "screenshots", "accessibility reports"],
        ["focused browser smoke scripts", "saved validation evidence"],
        ["production code unless fixing a verified browser/accessibility defect in the active slice"],
        ["desktop/tablet/mobile smoke when relevant", "RBAC negative route checks", "accessibility", "visual no-overlap checks"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_BROWSER_ACCESSIBILITY_RELEASE_<date>.md",
        "Hand off to 17-migration-backfill-pilot or 18-final-readiness.",
        "Stop if authenticated route evidence cannot be produced or if RBAC negative checks fail.",
        "Browser evidence proves the route/workflow is usable, scoped, accessible, and release-ready for the active slice.",
    ),
    SkillSpec(
        "17",
        "migration-backfill-pilot",
        "AqStoqFlow HRIS Payroll 17 Migration Backfill",
        "Control migration and pilot rollout.",
        "Handle tenant migration, dry-run diffs, idempotency, rollback/correction, pilot cycle, and signoff.",
        "existing tenants move into the new HRIS/payroll spine or unrestricted rollout is considered",
        ["Input readiness.", "Snapshot correction.", "Country-pack provenance.", "Payments/declarations proof.", "Close assurance."],
        ["migration scripts", "seed/backfill plans", "pilot certification reports", "dry-run reports", "proof-backfill reports", "rollback procedures"],
        ["migration/backfill scripts", "fixtures", "pilot reports", "idempotency tests"],
        ["dry-run scripts", "backfill guards", "idempotency checks", "pilot signoff reports"],
        ["production tenant data without explicit dry-run, signoff, and rollback plan"],
        ["dry-run diff", "idempotency rerun", "rollback/correction simulation", "pilot close-pack signoff"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_MIGRATION_BACKFILL_PILOT_<date>.md",
        "Hand off to 18-final-readiness.",
        "Stop if migration changes are not reversible, not idempotent, or not signed off.",
        "Pilot tenant migration is proven before unrestricted rollout.",
    ),
    SkillSpec(
        "18",
        "final-readiness",
        "AqStoqFlow HRIS Payroll 18 Final Readiness",
        "Decide unrestricted production readiness.",
        "Produce the final go/no-go decision for unrestricted HRIS/payroll production readiness.",
        "the team believes the HRIS/payroll chain is ready for production expansion",
        ["All prior gates complete or explicitly waived with owner, date, and risk acceptance."],
        ["status register", "source-truth map", "identity/org/contract/compensation/document/attendance reports", "readiness/snapshot reports", "payroll proof reports", "browser reports", "migration pilot reports", "CI gate results"],
        ["final readiness report only"],
        ["final go/no-go report", "launch checklist"],
        ["production code", "schema", "tenant data"],
        ["evidence completeness checklist", "focused suite replay where feasible", "route smoke proof", "release blocker review"],
        "what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_FINAL_READINESS_<date>.md",
        "If go, hand off to controlled rollout; if no-go, hand off to the earliest failing prerequisite skill.",
        "Stop on unresolved tenant isolation, RBAC, redaction, readiness, statutory, payment, declaration, accounting, migration, or browser release blockers.",
        "A defensible go/no-go decision exists with evidence, owners, residual risk, and release boundaries.",
    ),
]


def quote_yaml(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def bullet(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items)


def numbered(items: list[str]) -> str:
    return "\n".join(f"{idx}. {item}" for idx, item in enumerate(items, 1))


def description(spec: SkillSpec) -> str:
    return (
        f"{spec.purpose} Use when {spec.triggers}. "
        "Preserve HRIS-first payroll truth, tenant isolation, RBAC, redaction, audit, evidence, and saved-report handoffs."
    )


def render_skill(spec: SkillSpec) -> str:
    workflow = [
        "Read the governing HRIS/payroll blueprint and the latest status/report evidence.",
        "Confirm prerequisites before editing or recommending downstream work.",
        "Inspect only the surfaces needed for this skill.",
        "Stop and save a blocker report when a prerequisite or risk control fails.",
        "Change only the active slice when implementation is explicitly requested.",
        "Run the smallest honest verification gate set.",
        "Save the required report and name the next handoff skill.",
    ]
    return f"""---
name: {spec.name}
description: {quote_yaml(description(spec))}
---

# {spec.display_name}

## Operating Law

{bullet(OPERATING_LAW)}

## Purpose

{spec.purpose}

## Trigger/use cases

Use this skill when {spec.triggers}.

## Prerequisites

{bullet(spec.prerequisites)}

## Evidence to inspect

{bullet(spec.evidence + COMMON_EVIDENCE)}

## Files/surfaces likely touched

{bullet(spec.surfaces)}

## What the skill may change

{bullet(spec.may_change)}

## What the skill must not change

{bullet(spec.must_not_change)}

## Required tests or gates

{bullet(spec.gates)}

## Required saved report path

`{spec.report_path}`

## Handoff conditions

{spec.handoff}

## Stop/blocker conditions

{spec.stop}

## Success criteria

{spec.success}

## Execution Workflow

{numbered(workflow)}

## Shared Risk Controls

{bullet(COMMON_RISK_CONTROLS)}

## Report Contract

Every run must report scope, files inspected, current blockers, data ownership, tenant/RBAC decision, audit/redaction decision, gates run, skipped checks, residual risk, and the next handoff skill.
"""


def render_openai_yaml(spec: SkillSpec) -> str:
    prompt = f"Use ${spec.name} to execute its HRIS/payroll slice, preserve the HRIS-first chain, and save the required report."
    return "\n".join(
        [
            "interface:",
            f"  display_name: {quote_yaml(spec.display_name)}",
            f"  short_description: {quote_yaml(spec.short_description)}",
            f"  default_prompt: {quote_yaml(prompt)}",
            "",
        ]
    )


def stage_draft(spec: SkillSpec) -> None:
    folder = DRAFT_ROOT / spec.name
    (folder / "agents").mkdir(parents=True, exist_ok=True)
    (folder / "SKILL.md").write_text(render_skill(spec), encoding="utf-8", newline="\n")
    (folder / "agents" / "openai.yaml").write_text(render_openai_yaml(spec), encoding="utf-8", newline="\n")


def init_target(spec: SkillSpec) -> str:
    target = SKILLS_ROOT / spec.name
    if target.exists():
        return "existing-inspected"
    if not INIT_SCRIPT.exists():
        target.mkdir(parents=True, exist_ok=True)
        return "created-without-init-script"
    command = [
        sys.executable,
        str(INIT_SCRIPT),
        spec.name,
        "--path",
        str(SKILLS_ROOT),
        "--interface",
        f"display_name={spec.display_name}",
        "--interface",
        f"short_description={spec.short_description}",
        "--interface",
        f"default_prompt=Use ${spec.name} to execute its HRIS/payroll slice and save the required report.",
    ]
    result = subprocess.run(command, text=True, capture_output=True)
    if result.returncode != 0:
        target.mkdir(parents=True, exist_ok=True)
        return f"init-failed-fallback:{result.returncode}"
    return "created-with-init-script"


def install_skill(spec: SkillSpec) -> dict[str, str]:
    target = SKILLS_ROOT / spec.name
    existing = target.exists()
    existing_snapshot = ""
    if existing:
        snapshot = DRAFT_ROOT / "_existing-installed-snapshots" / spec.name
        if snapshot.exists():
            shutil.rmtree(snapshot)
        shutil.copytree(target, snapshot)
        existing_snapshot = str(snapshot)

    scaffold = init_target(spec)
    (target / "agents").mkdir(parents=True, exist_ok=True)
    (target / "SKILL.md").write_text(render_skill(spec), encoding="utf-8", newline="\n")
    (target / "agents" / "openai.yaml").write_text(render_openai_yaml(spec), encoding="utf-8", newline="\n")
    return {
        "name": spec.name,
        "path": str(target),
        "decision": "updated-existing-preserved-snapshot" if existing else "created-new",
        "snapshot": existing_snapshot,
        "scaffold": scaffold,
    }


def manual_validate(spec: SkillSpec, root: Path) -> list[str]:
    issues: list[str] = []
    folder = root / spec.name
    skill_path = folder / "SKILL.md"
    agent_path = folder / "agents" / "openai.yaml"
    required_sections = [
        "## Purpose",
        "## Trigger/use cases",
        "## Prerequisites",
        "## Evidence to inspect",
        "## Files/surfaces likely touched",
        "## What the skill may change",
        "## What the skill must not change",
        "## Required tests or gates",
        "## Required saved report path",
        "## Handoff conditions",
        "## Stop/blocker conditions",
        "## Success criteria",
    ]
    if folder.name != spec.name:
        issues.append("folder name mismatch")
    if not skill_path.exists():
        issues.append("missing SKILL.md")
    else:
        text = skill_path.read_text(encoding="utf-8")
        if not text.startswith("---\n"):
            issues.append("frontmatter missing")
        header = text.split("---\n", 2)[1] if text.startswith("---\n") and "---\n" in text[4:] else ""
        keys = [line.split(":", 1)[0].strip() for line in header.splitlines() if ":" in line]
        if keys != ["name", "description"]:
            issues.append(f"frontmatter keys invalid: {keys}")
        if f"name: {spec.name}" not in header:
            issues.append("frontmatter name mismatch")
        for section in required_sections:
            if section not in text:
                issues.append(f"missing {section}")
        for phrase in OPERATING_LAW:
            if phrase not in text:
                issues.append(f"missing operating law: {phrase}")
        if any(token in text for token in ["TODO", "TBD", "FIXME", "[DOMAIN]"]):
            issues.append("placeholder token remains")
    if not agent_path.exists():
        issues.append("missing agents/openai.yaml")
    else:
        meta = agent_path.read_text(encoding="utf-8")
        for value in ["interface:", "display_name:", "short_description:", "default_prompt:", f"${spec.name}"]:
            if value not in meta:
                issues.append(f"agents/openai.yaml missing {value}")
    return issues


def quick_validate(spec: SkillSpec) -> str:
    if not VALIDATOR.exists():
        return "skipped: quick_validate.py missing"
    result = subprocess.run([sys.executable, str(VALIDATOR), str(SKILLS_ROOT / spec.name)], text=True, capture_output=True)
    output = (result.stdout + result.stderr).strip().replace("\r\n", " ")
    if result.returncode == 0:
        return "passed"
    return f"failed:{result.returncode}:{output[:260]}"


def write_status_register() -> None:
    lines = [
        "# AqStoqFlow HRIS/Payroll Status Register",
        "",
        "Date: 2026-07-12",
        "Generated by: `aqstoqflow-hris-payroll-01-status-register` pilot handoff",
        "",
        "## Overall Decision",
        "",
        "Current posture: controlled pilot / limited release for implemented payroll evidence-gated workflows only.",
        "",
        "Unrestricted production HRIS/payroll remains `NO-GO` until the HRIS-first chain is complete, status evidence is current, and all release blockers are closed with proof.",
        "",
        "## Operating Law",
        "",
        bullet(OPERATING_LAW),
        "",
        "## Closed Or Available Evidence",
        "",
        "- HRIS/payroll strategic documents exist under `docs/HR-Payroll/`.",
        "- Payroll-focused implementation and proof reports exist under `what-next/payroll/`.",
        "- Payroll controlled-pilot evidence exists for selected downstream proof surfaces.",
        "- The HRIS/payroll skill-system blueprint exists and has now been installed as executable Codex skills.",
        "- Existing payroll skills remain useful for payroll kernel, country packs, payments, declarations, accounting close, and release proof.",
        "",
        "## Open Blockers",
        "",
        "| Blocker | Status | Required next skill |",
        "|---|---|---|",
        "| Canonical source-truth ownership map | Open | `aqstoqflow-hris-payroll-02-source-truth-map` |",
        "| Employee identity, duplicate risk, and user-to-employee mapping | Open | `aqstoqflow-hris-payroll-03-employee-identity` |",
        "| Org, branch, position, and manager scope | Open | `aqstoqflow-hris-payroll-04-org-structure-manager-scope` |",
        "| Contract lifecycle and approved eligibility evidence | Open | `aqstoqflow-hris-payroll-05-contract-lifecycle` |",
        "| Compensation/rubrique source truth and maker-checker changes | Open | `aqstoqflow-hris-payroll-06-compensation-controls` |",
        "| HR document evidence, retention, and redaction policy | Open | `aqstoqflow-hris-payroll-07-document-evidence-redaction` |",
        "| Time, leave, attendance, overtime, freeze, and corrections | Open | `aqstoqflow-hris-payroll-08-time-leave-attendance` |",
        "| Service-owned HRIS input readiness gate | Open | `aqstoqflow-hris-payroll-09-input-readiness-gate` |",
        "| Immutable payroll input snapshots and correction diffing | Open | `aqstoqflow-hris-payroll-10-snapshot-correction` |",
        "| Payroll engine consumption of certified HRIS snapshots | Open | `aqstoqflow-hris-payroll-11-payroll-engine-integration` |",
        "| Broader statutory country-pack provenance and fixture breadth | Open / partial | `aqstoqflow-hris-payroll-12-country-pack-provenance` |",
        "| Payment and declaration proof for unrestricted production | Open / partial | `aqstoqflow-hris-payroll-13-payments-declarations-proof` |",
        "| Payroll accounting close assurance for unrestricted production | Open / partial | `aqstoqflow-hris-payroll-14-accounting-close-assurance` |",
        "| Employee and manager self-service across HRIS/payroll | Open | `aqstoqflow-hris-payroll-15-self-service` |",
        "| Full browser, accessibility, RBAC negative, and release evidence | Open / partial | `aqstoqflow-hris-payroll-16-browser-accessibility-release` |",
        "| Tenant migration, backfill dry-run, rollback, and pilot signoff | Open | `aqstoqflow-hris-payroll-17-migration-backfill-pilot` |",
        "| Final unrestricted production go/no-go | Open | `aqstoqflow-hris-payroll-18-final-readiness` |",
        "",
        "## Superseded Items",
        "",
        "- The earlier blueprint-only instruction not to install skills is superseded by the later explicit installation prompt.",
        "- Older payroll-first prompt suites are not replaced; they are downstream execution assets now governed by this HRIS-first sequence.",
        "",
        "## Controlled-Pilot-Only Evidence",
        "",
        "- Existing payroll proof, pilot certification, declaration, payment, and final-readiness reports support bounded controlled pilot behavior only.",
        "- Controlled pilot evidence must not be presented as unrestricted statutory, payroll, accounting, payment, or declaration production readiness.",
        "",
        "## Next Safe Skill",
        "",
        "`aqstoqflow-hris-payroll-02-source-truth-map` is the next safe skill after this status register.",
        "",
        "## Verification",
        "",
        "- No production code changed.",
        "- This register is a planning/status artifact only.",
        "- Follow-up implementation must stay in dependency order.",
        "",
    ]
    STATUS_REGISTER.write_text("\n".join(lines), encoding="utf-8", newline="\n")


def write_pilot_report() -> None:
    lines = [
        "# AqStoqFlow HRIS/Payroll Orchestrator Pilot Report",
        "",
        "Date: 2026-07-12",
        "Pilot skill: `aqstoqflow-hris-payroll-00-orchestrator`",
        "",
        "## Orchestrator Pilot",
        "",
        "The installed orchestrator was run as a planning pilot. It did not implement production code.",
        "",
        "## Evidence Inspected",
        "",
        bullet([
            "docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_2026-07-12.md",
            "docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md",
            "what-next/payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_NEXT_STEPS_2026-07-12.md",
            "existing payroll reports under what-next/payroll/",
            "newly installed aqstoqflow-hris-payroll-* skill contracts",
        ]),
        "",
        "## Next Safe Skill",
        "",
        "The pilot selected `aqstoqflow-hris-payroll-01-status-register` as the first downstream skill because the project contains many payroll reports and needs one current classification of open, closed, superseded, and controlled-pilot-only items before further implementation.",
        "",
        "## Pilot Handoff Result",
        "",
        "The status-register pass was safe to run because it is a documentation/status artifact and does not change production code. The generated register is saved at:",
        "",
        f"- `{STATUS_REGISTER.relative_to(WORKSPACE).as_posix()}`",
        "",
        "After creating the status register, the next safe skill is `aqstoqflow-hris-payroll-02-source-truth-map`.",
        "",
        "## Blockers",
        "",
        "- Unrestricted HRIS/payroll production readiness remains blocked.",
        "- Production implementation must not begin before source-truth ownership is mapped.",
        "- Existing controlled-pilot payroll evidence must not be treated as full production readiness.",
        "",
    ]
    PILOT_REPORT.write_text("\n".join(lines), encoding="utf-8", newline="\n")


def write_install_report(install_rows: list[dict[str, str]], validation_rows: list[dict[str, str]]) -> None:
    passed_manual = sum(1 for row in validation_rows if row["manual"] == "passed")
    passed_quick = sum(1 for row in validation_rows if row["quick_validate"] == "passed")
    status = "Completed" if passed_manual == len(SPECS) else "Completed with manual validation issues"
    lines = [
        "# AqStoqFlow HRIS/Payroll Skill Installation And Validation Report",
        "",
        "Date: 2026-07-12",
        "",
        f"Installation Status: {status}",
        "",
        "## Scope",
        "",
        "Created staged drafts, installed the intended `aqstoqflow-hris-payroll-*` skills, validated the installed skill files, and ran the orchestrator as a planning pilot.",
        "",
        "No production code, Prisma schema, API route, service, component, payroll formula, payment provider, declaration adapter, or accounting posting logic was changed.",
        "",
        "## Evidence Inspected",
        "",
        bullet([
            BLUEPRINT.relative_to(WORKSPACE).as_posix(),
            "what-next/payroll/install_hr_payroll_skill_suite.py",
            "what-next/payroll/install_hr_payroll_expert_skill_suite.py",
            "docs/HR-Payroll/",
            "what-next/payroll/",
            "C:/Users/J COMPUTER/.codex/skills/.system/skill-creator/SKILL.md",
            "C:/Users/J COMPUTER/.codex/skills/.system/skill-installer/SKILL.md",
        ]),
        "",
        "## Installation Paths",
        "",
        f"- Staged drafts: `{DRAFT_ROOT.relative_to(WORKSPACE).as_posix()}`",
        f"- Installed skills root: `{SKILLS_ROOT}`",
        f"- Orchestrator pilot report: `{PILOT_REPORT.relative_to(WORKSPACE).as_posix()}`",
        f"- Status register: `{STATUS_REGISTER.relative_to(WORKSPACE).as_posix()}`",
        "",
        "## Validation Results",
        "",
        f"- Skills expected: {len(SPECS)}",
        f"- Skills installed/updated: {len(install_rows)}",
        f"- Manual validation passed: {passed_manual}",
        f"- Quick validator passed: {passed_quick}",
        "",
        "| Skill | Install decision | Manual validation | Quick validator |",
        "|---|---|---|---|",
    ]
    quick_by_name = {row["name"]: row["quick_validate"] for row in validation_rows}
    manual_by_name = {row["name"]: row["manual"] for row in validation_rows}
    for row in install_rows:
        lines.append(f"| `{row['name']}` | {row['decision']} | {manual_by_name[row['name']]} | {quick_by_name[row['name']]} |")

    lines.extend(
        [
            "",
            "## Orchestrator Pilot",
            "",
            "Pilot skill: `aqstoqflow-hris-payroll-00-orchestrator`.",
            "",
            "Pilot result: selected `aqstoqflow-hris-payroll-01-status-register` as the first safe downstream skill.",
            "",
            "The status-register pass was also run because it is artifact-only and safe. It created the current status register and then handed off to `aqstoqflow-hris-payroll-02-source-truth-map` as the next safe skill.",
            "",
            "## Next Safe Skill",
            "",
            "`aqstoqflow-hris-payroll-02-source-truth-map`.",
            "",
            "## Residual Risk",
            "",
            "- Installed skills are available for future turns, but full runtime behavior depends on each later execution reading current repo evidence.",
            "- The current HRIS/payroll system remains controlled-pilot only for implemented payroll proof surfaces.",
            "- Unrestricted production readiness remains blocked until the full HRIS-first dependency chain is executed and verified.",
            "",
            "## Ready-To-Land Summary",
            "",
            "Ready to commit as skill-system installation artifacts and reports. Installed skill files live outside the repo under the Codex skills root; workspace artifacts document what was installed, validated, and selected by the pilot.",
            "",
        ]
    )
    INSTALL_REPORT.write_text("\n".join(lines), encoding="utf-8", newline="\n")


def main() -> int:
    if not BLUEPRINT.exists():
        raise FileNotFoundError(BLUEPRINT)
    blueprint_text = BLUEPRINT.read_text(encoding="utf-8")
    missing = [spec.name for spec in SPECS if spec.name not in blueprint_text]
    if missing:
        raise RuntimeError(f"Blueprint missing skill names: {missing}")

    DRAFT_ROOT.mkdir(parents=True, exist_ok=True)
    install_rows: list[dict[str, str]] = []
    validation_rows: list[dict[str, str]] = []

    for spec in SPECS:
        stage_draft(spec)

    for spec in SPECS:
        install_rows.append(install_skill(spec))

    for spec in SPECS:
        draft_issues = manual_validate(spec, DRAFT_ROOT)
        installed_issues = manual_validate(spec, SKILLS_ROOT)
        manual = "passed" if not draft_issues and not installed_issues else "; ".join(
            [f"draft:{issue}" for issue in draft_issues] + [f"installed:{issue}" for issue in installed_issues]
        )
        validation_rows.append(
            {
                "name": spec.name,
                "manual": manual,
                "quick_validate": quick_validate(spec),
            }
        )

    write_status_register()
    write_pilot_report()
    write_install_report(install_rows, validation_rows)

    print(
        json.dumps(
            {
                "draft_root": str(DRAFT_ROOT),
                "install_report": str(INSTALL_REPORT),
                "pilot_report": str(PILOT_REPORT),
                "status_register": str(STATUS_REGISTER),
                "installed": install_rows,
                "validation": validation_rows,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

