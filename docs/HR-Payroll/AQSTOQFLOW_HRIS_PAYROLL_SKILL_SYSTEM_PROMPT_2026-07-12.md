# AqStoqFlow HRIS/Payroll Skill System Prompt

Date: 2026-07-12
Scope: prompt saved from the attached instruction for designing the HRIS-first payroll skill system.

## Prompt

Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Act as a senior enterprise HRIS/payroll skill-system architecture team:

- Senior enterprise software architect: design a focused skill suite that executes the HRIS-first payroll roadmap in dependency order without duplicating or weakening existing payroll work.
- Skill-system architect: convert the roadmap into small, reusable, triggerable Codex skills with clear prerequisites, gates, outputs, and handoff rules.
- Cybersecurity and RBAC specialist: ensure every skill preserves tenant isolation, RBAC, module entitlement, fresh auth, maker-checker approvals, audit, redaction, safe errors, and release gates.
- HRIS/payroll business logic expert: protect employee truth, contracts, compensation, time/leave/attendance, payroll snapshots, statutory traceability, payments, declarations, and corrections.
- OHADA/SYSCOHADA-aware platform architect: keep statutory, country-pack, payroll tax, accounting, and regulatory rules evidence-based and expert-reviewed.
- Enterprise controls expert: ensure payroll integrates with ledger posting, reconciliation, close assurance, proof packs, and final release evidence.

## Mission

Using the HRIS/payroll documents and related existing skill-suite documentation, design a finely targeted system of Codex skills that can execute the roadmap toward a bulletproof, modern, secure, professional, enterprise-grade HRIS/payroll platform.

The skill system must make HRIS the people/source-data truth and payroll the consumer of certified HRIS snapshots.

Core chain:

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

Do not implement HRIS/payroll production code in this run unless explicitly instructed later. This run is for designing, rationalizing, and optionally preparing the skill suite.

## Evidence To Inspect

Inspect and cite:

- `docs/HR-Payroll/README.md`
- `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_PROMPT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_NEXT_STEPS_2026-07-12.md`
- Existing HR/payroll prompt and skill docs under `docs/prompts/skills/`
- Existing HR/payroll reports under `what-next/payroll/`
- Existing installed or generated skill-suite scripts, especially `what-next/payroll/install_hr_payroll_skill_suite.py` and `what-next/payroll/install_hr_payroll_expert_skill_suite.py`
- Current code surfaces only as needed: `prisma/`, `services/payroll/`, `actions/payroll/`, `components/payroll/`, `app/[locale]/(dashboard)/dashboard/payroll/`, `config/permissions.ts`, `lib/security/rbac-permissions.ts`, and `package.json`

## Required Output

Produce a saved skill-system blueprint under:

- `docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_2026-07-12.md`

Produce a run report under:

- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_REPORT_2026-07-12.md`

If explicitly asked to install the skills, also create/update the actual skills under:

- `C:\Users\J COMPUTER\.codex\skills\`

Do not install or overwrite skills unless the user explicitly requests installation.

## Skill System To Design

Design the suite as small, dependency-aware skills. Include at minimum:

1. `aqstoqflow-hris-payroll-00-orchestrator`
   - Selects the next safe HRIS/payroll slice.
   - Reads current roadmap/status reports.
   - Stops on failed prerequisite gates.

2. `aqstoqflow-hris-payroll-01-status-register`
   - Creates the canonical HRIS/payroll status register.
   - Separates open, closed, superseded, and controlled-pilot-only blockers.

3. `aqstoqflow-hris-payroll-02-source-truth-map`
   - Maps ownership across HRIS, payroll, accounting, assurance, compliance, and country packs.

4. `aqstoqflow-hris-payroll-03-employee-identity`
   - Builds employee identity, tenant scope, duplicate-risk, and user-to-employee mapping boundaries.

5. `aqstoqflow-hris-payroll-04-org-structure-manager-scope`
   - Builds org unit, branch, position, manager, and scoped access rules.

6. `aqstoqflow-hris-payroll-05-contract-lifecycle`
   - Builds contract lifecycle, evidence, approvals, termination, amendments, and readiness blockers.

7. `aqstoqflow-hris-payroll-06-compensation-controls`
   - Builds compensation/rubrique source truth, salary-change maker-checker, benefits/deductions boundaries.

8. `aqstoqflow-hris-payroll-07-document-evidence-redaction`
   - Builds HR document/evidence handling, redaction, retention, and audit rules.

9. `aqstoqflow-hris-payroll-08-time-leave-attendance`
   - Builds schedules, leave, absences, overtime, corrections, approvals, and freeze contracts.

10. `aqstoqflow-hris-payroll-09-input-readiness-gate`
    - Makes payroll fail closed when HRIS inputs are missing, stale, unapproved, unsupported, or untraceable.

11. `aqstoqflow-hris-payroll-10-snapshot-correction`
    - Builds payroll input snapshots, diffing, correction planning, and post-finalization safety.

12. `aqstoqflow-hris-payroll-11-payroll-engine-integration`
    - Reconnects payroll calculation to certified HRIS snapshots without weakening the existing payroll kernel.

13. `aqstoqflow-hris-payroll-12-country-pack-provenance`
    - Enforces expert-reviewed statutory country-pack formulas, golden fixtures, source hashes, and legal provenance.

14. `aqstoqflow-hris-payroll-13-payments-declarations-proof`
    - Certifies payment provider proof, authority declaration proof, settlement receipts, callbacks, and reconciliation.

15. `aqstoqflow-hris-payroll-14-accounting-close-assurance`
    - Connects payroll to ledger posting, source links, close assurance, proof packs, and audit exports.

16. `aqstoqflow-hris-payroll-15-self-service`
    - Builds employee and manager self-service only after identity, scope, redaction, and readiness gates are safe.

17. `aqstoqflow-hris-payroll-16-browser-accessibility-release`
    - Runs route smoke, accessibility, visual validation, RBAC negative checks, and release gates.

18. `aqstoqflow-hris-payroll-17-migration-backfill-pilot`
    - Handles tenant migration, dry-run diffs, idempotency, rollback/correction, pilot cycle, and signoff.

19. `aqstoqflow-hris-payroll-18-final-readiness`
    - Produces the final go/no-go decision for unrestricted HRIS/payroll production readiness.

## For Each Skill Define

For every skill, specify:

- Name
- Purpose
- Trigger/use cases
- Prerequisites
- Evidence to inspect
- Files/surfaces likely touched
- What the skill may change
- What the skill must not change
- Required tests or gates
- Required saved report path
- Handoff conditions
- Stop/blocker conditions
- Success criteria

## Risk Controls

The skill system must prevent:

- UI-derived payroll truth
- Payroll inventing HRIS truth
- Duplicate employee truth
- Payroll calculation without certified HRIS readiness
- Unreviewed statutory formulas
- Payment release without approved destination evidence
- Declaration submission without authority proof
- Backfill mutation without dry-run/signoff
- Cross-tenant or cross-employee leakage
- Broad refactors outside the active slice
- Stale reports being treated as current truth

## Verification

For the blueprint-only run:

```powershell
rg -n "aqstoqflow-hris-payroll-00-orchestrator|input-readiness-gate|snapshot-correction|final-readiness" docs/HR-Payroll what-next/payroll
rg -n "HRIS owns people truth|Payroll consumes certified HRIS snapshots|Do not install|prerequisites|stop" docs/HR-Payroll what-next/payroll
```
