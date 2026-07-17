# Stoquify Enterprise HRIS Targeted Skill System

Date: 2026-07-14
Source proposal: `docs/new ideas/STOQUIFY_ENTERPRISE_HRIS_CURRENT_STATE_AND_FULL_SYSTEM_PROPOSAL_2026-07-14.md`
Status: skill-system blueprint only. No installed skill folder was created, overwritten, or removed by this pass.

## Executive Decision

Reuse the installed `aqstoqflow-hris-payroll-*` suite as the payroll-grade execution spine, but add a People Core layer before it. The existing suite is strong for source-truth mapping, employee identity, org scope, contracts, compensation, document evidence, time/leave snapshots, input readiness, snapshot correction, payroll engine integration, country-pack provenance, payments/declarations proof, accounting close assurance, self-service, browser evidence, migration, and final readiness.

The missing specialization is a dedicated HRIS/People Core skill family that creates a first-class HRIS boundary before payroll execution skills continue. These skills should be generated as drafts first, validated, then installed only after review. They must not overwrite the existing payroll skill folders.

## Operating Law

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.
- UI never creates business truth.
- Every skill either closes one prerequisite gate, saves a blocker report, or hands off to the next dependency.

## Relationship To Existing Skills

Reuse existing skills for downstream payroll and assurance work:

- `aqstoqflow-hris-payroll-00-orchestrator` through `18-final-readiness`
- Payroll kernel, country-pack, payments, declarations, accounting close, browser/accessibility, migration, and final-readiness skills
- UI/UX route-smoke and accessibility skills where People workspace browser evidence is needed
- Security diff/validation skills when code changes cross RBAC, redaction, or tenant boundaries

Add new People Core skills only for the upstream HRIS boundary and full HRIS product surface. The recommended prefix is `stoquify-hris-*` or `aqstoqflow-hris-core-*` to avoid confusion with the already-installed HRIS/payroll chain.

## Standard Skill Contract

Every generated `SKILL.md` should include:

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
- Shared risk controls
- Report contract

Every skill report must include scope, files inspected, current blockers, data ownership, tenant/RBAC decision, audit/redaction decision, gates run, skipped checks, residual risk, and next handoff.

## Skill Chain

| Order | Proposed Skill | Purpose | Main Gates | Report Path |
| --- | --- | --- | --- | --- |
| 00 | `stoquify-hris-00-orchestrator` | Select next safe People Core slice and prevent payroll-first drift | Status register current; no production code change unless downstream skill selected | `what-next/payroll/STOQUIFY_HRIS_ORCHESTRATOR_REPORT_<date>.md` |
| 01 | `stoquify-hris-01-current-state-register` | Reconcile proposal, repo, and reports into one current HRIS truth register | Evidence map covers HRIS, payroll, accounting, RBAC, UI, migration | `what-next/payroll/STOQUIFY_HRIS_CURRENT_STATE_REGISTER_<date>.md` |
| 02 | `stoquify-hris-02-people-boundary-facade` | Create or design `services/hris/*` facade over current payroll source storage | No duplicate employee master; payroll still passes focused tests | `what-next/payroll/STOQUIFY_HRIS_PEOPLE_BOUNDARY_FACADE_<date>.md` |
| 03 | `stoquify-hris-03-permissions-and-route-shell` | Add HRIS permission taxonomy and `/dashboard/people` shell | HRIS/payroll permissions separated; route access negative tests pass | `what-next/payroll/STOQUIFY_HRIS_PERMISSIONS_ROUTE_SHELL_<date>.md` |
| 04 | `stoquify-hris-04-employee-identity-profile` | Build employee directory/profile read model with redaction and user mapping | Tenant isolation, duplicate detection, own-record denial tests | `what-next/payroll/STOQUIFY_HRIS_EMPLOYEE_IDENTITY_PROFILE_<date>.md` |
| 05 | `stoquify-hris-05-lifecycle-workflows` | Model onboarding, transfer, suspension, termination, offboarding, rehire | Maker-checker, payroll readiness impact, audit timeline | `what-next/payroll/STOQUIFY_HRIS_LIFECYCLE_WORKFLOWS_<date>.md` |
| 06 | `stoquify-hris-06-org-position-manager-scope` | Move from location-scope to org, position, reporting-line, delegation truth | Manager negative tests; effective-dated assignment overlap checks | `what-next/payroll/STOQUIFY_HRIS_ORG_POSITION_MANAGER_SCOPE_<date>.md` |
| 07 | `stoquify-hris-07-contract-document-evidence` | Wrap contracts and document evidence behind HRIS approvals and retention | Contract overlap, signed evidence, document access/redaction tests | `what-next/payroll/STOQUIFY_HRIS_CONTRACT_DOCUMENT_EVIDENCE_<date>.md` |
| 08 | `stoquify-hris-08-compensation-benefits-control` | Move employee-level compensation inputs behind HRIS approvals | Salary maker-checker, stale comp readiness block, country-pack separation | `what-next/payroll/STOQUIFY_HRIS_COMPENSATION_BENEFITS_CONTROL_<date>.md` |
| 09 | `stoquify-hris-09-payment-destination-privacy` | Own payment-destination request/approval as HRIS sensitive workflow | Fresh auth, masked/hash storage, no raw destination leaks | `what-next/payroll/STOQUIFY_HRIS_PAYMENT_DESTINATION_PRIVACY_<date>.md` |
| 10 | `stoquify-hris-10-time-leave-attendance-engine` | Build schedules, leave, attendance, overtime, corrections, and freeze contracts | Unapproved time/leave blocks payroll; correction diff evidence | `what-next/payroll/STOQUIFY_HRIS_TIME_LEAVE_ATTENDANCE_ENGINE_<date>.md` |
| 11 | `stoquify-hris-11-approval-inbox` | Create HR/manager approval queue for lifecycle, leave, documents, compensation | SoD matrix, pending approval blockers, safe denied states | `what-next/payroll/STOQUIFY_HRIS_APPROVAL_INBOX_<date>.md` |
| 12 | `stoquify-hris-12-movement-history` | Build HR movement and evidence timeline from audit/business events | Redacted event payloads, proof badges, filter safety | `what-next/payroll/STOQUIFY_HRIS_MOVEMENT_HISTORY_<date>.md` |
| 13 | `stoquify-hris-13-payroll-readiness-contract` | Connect People Core to existing readiness/snapshot payroll skills | Payroll consumes certified HRIS proof only; stale proof fails closed | `what-next/payroll/STOQUIFY_HRIS_PAYROLL_READINESS_CONTRACT_<date>.md` |
| 14 | `stoquify-hris-14-employee-self-service` | Open own profile, docs, leave/time, payment requests, payslips safely | Own-employee resolver, DOM redaction, fresh-auth export | `what-next/payroll/STOQUIFY_HRIS_EMPLOYEE_SELF_SERVICE_<date>.md` |
| 15 | `stoquify-hris-15-manager-self-service` | Open team roster, approvals, readiness, tasks without broad sensitive data | Scoped manager tests; no salary/identifier leakage | `what-next/payroll/STOQUIFY_HRIS_MANAGER_SELF_SERVICE_<date>.md` |
| 16 | `stoquify-hris-16-accounting-finance-assurance-bridge` | Prove HRIS changes flow safely to payroll, finance, accounting, and close | Register-to-ledger tieout; close fails on missing HRIS/payroll proof | `what-next/payroll/STOQUIFY_HRIS_ACCOUNTING_FINANCE_ASSURANCE_BRIDGE_<date>.md` |
| 17 | `stoquify-hris-17-browser-accessibility-rbac-release` | Validate People/Payroll routes in real browser and role matrix | Desktop/tablet/mobile smoke; a11y; RBAC negative; no-overlap checks | `what-next/payroll/STOQUIFY_HRIS_BROWSER_ACCESSIBILITY_RBAC_RELEASE_<date>.md` |
| 18 | `stoquify-hris-18-migration-backfill-pilot` | Dry-run tenant migration and pilot People Core close | Reconciliation hashes, idempotency, rollback/correction proof | `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_<date>.md` |
| 19 | `stoquify-hris-19-final-readiness` | Produce go/no-go for enterprise HRIS/payroll release | Complete evidence pack, owner signoff, commit SHA attestation | `what-next/payroll/STOQUIFY_HRIS_FINAL_READINESS_<date>.md` |
| 20 | `stoquify-hris-20-extended-hris` | Govern deferred modules after People Core is stable | Each extension reuses HRIS boundary, RBAC, redaction, audit, release gates | `what-next/payroll/STOQUIFY_HRIS_EXTENDED_HRIS_<date>.md` |

## Minimal Installation Path

1. Generate draft skill folders under `what-next/payroll/stoquify-hris-skill-suite-drafts-<date>/`.
2. Validate every `SKILL.md` for prerequisites, stop conditions, evidence paths, gates, and report paths.
3. Snapshot any installed skill folder that would be replaced.
4. Install only after review and only into a non-conflicting skill name.
5. Run `stoquify-hris-00-orchestrator` first.
6. Save installation and validation evidence under `what-next/payroll/`.

## Validation Commands

Use commands that already exist in the repo:

```powershell
rg -n "stoquify-hris-00-orchestrator|people-boundary-facade|final-readiness" docs/HR-Payroll what-next/payroll
rg -n "services/hris|actions/hris|dashboard/people|hris\\." docs/HR-Payroll what-next/payroll config services actions app
npm run prisma:validate
npm test -- --runTestsByPath config/__tests__/permissions.test.ts config/__tests__/sidebar.test.ts --runInBand
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts --runInBand
npm run ui:smoke:payroll:dry-run
```

Add broader `npm run typecheck`, `npm run policy:gates`, and Playwright route smoke only after the active implementation slice changes code and the worktree is clean enough to interpret failures.

## Non-Goals

- Do not install new skills during a planning-only run.
- Do not overwrite the installed `aqstoqflow-hris-payroll-*` suite.
- Do not duplicate payroll kernel skills.
- Do not create a new employee master table before the facade and migration strategy are approved.
- Do not build self-service before identity, manager scope, redaction, and own-record tests are in place.
- Do not claim unrestricted production readiness from controlled pilot evidence.

## Final Skill-System Decision

Build the People Core skill layer next, but keep it draft-first. The existing HRIS/payroll suite is valuable and should remain the downstream payroll assurance chain. The new skill layer should force the system to create HRIS ownership before payroll, finance, accounting, and close assurance depend on it.
