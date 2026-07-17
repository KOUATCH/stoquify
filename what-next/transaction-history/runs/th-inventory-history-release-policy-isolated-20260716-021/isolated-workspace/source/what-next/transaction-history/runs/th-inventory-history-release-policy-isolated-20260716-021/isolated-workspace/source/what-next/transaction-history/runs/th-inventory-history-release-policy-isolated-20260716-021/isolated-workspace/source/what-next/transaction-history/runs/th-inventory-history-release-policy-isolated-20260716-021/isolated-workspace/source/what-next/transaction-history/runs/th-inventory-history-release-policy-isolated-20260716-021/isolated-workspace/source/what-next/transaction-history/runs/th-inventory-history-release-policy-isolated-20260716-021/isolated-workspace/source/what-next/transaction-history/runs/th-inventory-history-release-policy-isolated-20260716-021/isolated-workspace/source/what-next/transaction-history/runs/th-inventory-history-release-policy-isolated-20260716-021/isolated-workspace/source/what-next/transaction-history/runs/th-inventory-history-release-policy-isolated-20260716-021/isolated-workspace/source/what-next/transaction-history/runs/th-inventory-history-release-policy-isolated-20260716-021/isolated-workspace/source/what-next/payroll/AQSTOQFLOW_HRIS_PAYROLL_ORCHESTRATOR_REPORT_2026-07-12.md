# AqStoqFlow HRIS/Payroll Orchestrator Report

Date: 2026-07-12
Skill run: `aqstoqflow-hris-payroll-00-orchestrator`
Mode: planning/orchestration only

## Scope

Ran the installed HRIS/payroll orchestrator to select the next safe dependency-ordered slice.

No production HRIS/payroll code was changed. This run only reviewed current roadmap/status evidence and saved the orchestrator decision.

## Files Inspected

- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hris-payroll-00-orchestrator\SKILL.md`
- `docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_INSTALLATION_AND_VALIDATION_REPORT_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ORCHESTRATOR_PILOT_REPORT_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_STATUS_REGISTER_2026-07-12.md`
- Recent payroll evidence reports under `what-next/payroll/`

## Prerequisite Decision

Prerequisite status: passed.

The current roadmap and status evidence are readable. The HRIS/payroll skill suite is installed and validated. The status-register pass has already been created, and it identifies the earliest incomplete prerequisite as the source-truth ownership map.

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## Current Blockers

The active blocker is the missing canonical source-truth ownership map.

Open downstream blockers remain:

- Employee identity, duplicate-risk, and user-to-employee mapping are not yet certified.
- Org, branch, position, and manager-scope ownership is not yet mapped.
- Contract lifecycle and payroll eligibility evidence are not yet fully sequenced under the HRIS-first chain.
- Compensation/rubrique source truth and maker-checker approval are not yet the next runnable slice because they depend on source-truth mapping.
- Payroll input readiness, snapshots, engine integration, country-pack provenance, payments/declarations proof, accounting close assurance, self-service, browser release evidence, migration/backfill pilot, and final readiness remain downstream gates.

## Data Ownership Decision

Do not proceed to implementation by editing payroll services or UI first.

The next safe work is an ownership map that assigns each critical HRIS/payroll field and workflow to exactly one source of truth:

- HRIS owns employee, contract, compensation, org, manager scope, documents, payment-destination evidence, and time/leave/attendance truth.
- Payroll owns certified snapshots, calculation runs, registers, payslips, payroll corrections, payment/declaration requests, and payroll proof envelopes.
- Accounting owns ledger truth, posting rules, close blockers, reconciliation state, and auditor proof-pack linkage.
- Assurance owns evidence completeness, release gates, close packs, and final go/no-go proof.

## Tenant/RBAC Decision

The next skill must prove tenant isolation, RBAC, module entitlement, fresh-auth needs, and manager/employee scope before any broad HRIS implementation begins.

No access behavior was changed in this orchestrator run.

## Audit/Redaction Decision

The next skill must classify which HRIS/payroll fields are sensitive, which are employee-visible, manager-visible, payroll-operator-visible, accountant-visible, auditor-visible, or internal-only, and which evidence must be redacted or hash-only.

No payload or export behavior was changed in this orchestrator run.

## Gates Run

- Report consistency grep over `docs/HR-Payroll` and `what-next/payroll`.
- Installed-skill evidence was checked through the prior validation report.
- No-production-code-change check is limited to the scoped git status after this report is saved.

## Skipped Checks

- Jest, Prisma, typecheck, browser, accessibility, and policy gates were skipped because this orchestrator run is planning-only and touched no production code.
- Source-code implementation surfaces were not modified.

## Next Handoff Skill

Next safe skill: `aqstoqflow-hris-payroll-02-source-truth-map`.

Reason: `aqstoqflow-hris-payroll-01-status-register` is already complete as an artifact-only pass. The status register marks the canonical source-truth ownership map as the first open prerequisite.

## Execution Prompt For Next Skill

Use `aqstoqflow-hris-payroll-02-source-truth-map` to map HRIS, payroll, accounting, assurance, compliance, and country-pack ownership across the current repo and reports. Save the required source-truth map report under:

`what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SOURCE_TRUTH_MAP_2026-07-12.md`

Stop if any critical field has multiple write owners and no safe owner can be inferred.

## Success Criteria

The orchestrator run is successful because:

- Current roadmap/status evidence is readable.
- The earliest incomplete prerequisite is selected.
- The selected next skill has clear prerequisites, verification, and stop conditions.
- No production code, schema, API route, service, component, payroll formula, payment/declaration logic, or accounting posting logic was changed.
