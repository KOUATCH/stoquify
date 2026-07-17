# AqStoqFlow HRIS/Payroll Skill System Blueprint Report

Date: 2026-07-12
Mode: prompt execution, blueprint-only

## Scope

Ran the attached prompt to design a finely targeted HRIS-first skill system for the HRIS/payroll roadmap.

This run did not implement HRIS/payroll production code and did not install or overwrite any Codex skills, because the prompt explicitly says: "Do not install or overwrite skills unless the user explicitly requests installation."

## Produced Artifacts

- `docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_PROMPT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_REPORT_2026-07-12.md`

## Evidence Used

- Existing HRIS/payroll strategy documents under `docs/HR-Payroll/`
- Existing payroll execution reports under `what-next/payroll/`
- Existing prompt and generated skill-suite patterns under `docs/prompts/skills/`
- Existing skill installation scripts:
  - `what-next/payroll/install_hr_payroll_skill_suite.py`
  - `what-next/payroll/install_hr_payroll_expert_skill_suite.py`
- Prior payroll architecture guidance emphasizing service-owned truth, redaction, entitlement safety, tenant isolation, proof packs, and smallest honest verification gates.

## Decision

The system should add a new HRIS-first skill layer that coordinates with the existing payroll skills.

Existing payroll skills and reports remain useful for payroll kernel, statutory country packs, provider proof, declarations, close assurance, and browser release evidence. The missing layer is a dependency-aware HRIS command chain that proves employee identity, org scope, contracts, compensation, documents, time/leave/attendance, input readiness, and immutable snapshots before payroll runs.

## Why This Matters

If payroll is built before the HRIS foundation, it is forced to invent or duplicate HR truth. That creates risk in:

- Employee identity and duplicate records.
- Manager and branch scope.
- Contract eligibility.
- Salary and benefit approval.
- Attendance and overtime approval.
- Payment destination evidence.
- Statutory declaration traceability.
- Correction and backfill safety.
- Tenant isolation and redaction.
- Ledger tieout and close assurance.

The skill system therefore enforces the chain:

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## Skill Suite Designed

The blueprint defines these skills:

1. `aqstoqflow-hris-payroll-00-orchestrator`
2. `aqstoqflow-hris-payroll-01-status-register`
3. `aqstoqflow-hris-payroll-02-source-truth-map`
4. `aqstoqflow-hris-payroll-03-employee-identity`
5. `aqstoqflow-hris-payroll-04-org-structure-manager-scope`
6. `aqstoqflow-hris-payroll-05-contract-lifecycle`
7. `aqstoqflow-hris-payroll-06-compensation-controls`
8. `aqstoqflow-hris-payroll-07-document-evidence-redaction`
9. `aqstoqflow-hris-payroll-08-time-leave-attendance`
10. `aqstoqflow-hris-payroll-09-input-readiness-gate`
11. `aqstoqflow-hris-payroll-10-snapshot-correction`
12. `aqstoqflow-hris-payroll-11-payroll-engine-integration`
13. `aqstoqflow-hris-payroll-12-country-pack-provenance`
14. `aqstoqflow-hris-payroll-13-payments-declarations-proof`
15. `aqstoqflow-hris-payroll-14-accounting-close-assurance`
16. `aqstoqflow-hris-payroll-15-self-service`
17. `aqstoqflow-hris-payroll-16-browser-accessibility-release`
18. `aqstoqflow-hris-payroll-17-migration-backfill-pilot`
19. `aqstoqflow-hris-payroll-18-final-readiness`

## Installation Status

Not installed.

The correct next action, if installation is approved later, is:

1. Generate staged skill drafts.
2. Reuse the existing installer patterns.
3. Validate each `SKILL.md`.
4. Preserve all existing payroll skills.
5. Install under `C:\Users\J COMPUTER\.codex\skills\`.
6. Save an installation report.

## First Execution Recommendation

Run `aqstoqflow-hris-payroll-01-status-register` first.

Reason: the workspace already has many payroll reports. Before implementing another slice, the project needs one canonical status register that distinguishes open blockers, closed work, superseded findings, and controlled-pilot-only evidence.

## Verification

Blueprint-only verification commands:

```powershell
rg -n "aqstoqflow-hris-payroll-00-orchestrator|input-readiness-gate|snapshot-correction|final-readiness" docs/HR-Payroll what-next/payroll
rg -n "HRIS owns people truth|Payroll consumes certified HRIS snapshots|Do not install|prerequisites|stop" docs/HR-Payroll what-next/payroll
```

## Residual Blockers

- The actual skills are not installed yet.
- The canonical status register is not created yet.
- No production HRIS/payroll code was changed in this run.
- No browser, Jest, Prisma, or typecheck gates were necessary for this artifact-only blueprint run.

## Ready-To-Land Summary

Ready to commit as documentation/planning artifacts.

No production code, schema, API route, service, component, or installed skill was changed.
