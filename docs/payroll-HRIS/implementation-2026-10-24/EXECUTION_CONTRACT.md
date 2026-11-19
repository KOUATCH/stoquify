# Shared execution contract

**Planning package:** 24 October 2026. Applies to every HR prompt in this directory. Read the [master plan](README.md) and the selected prompt before implementation. This document supplies common controls; the selected prompt supplies its exact scope and acceptance criteria.

## 1. Mission and authorization boundary

Deliver dependable general-purpose HR for 1–200 employees in the OHADA zone, including office and shift workers. Extend the existing system and logical employee master. Current technical payroll admission remains Cameroon, monthly and single-employer; the regional product target does not change supported statutory combinations.

This package is a plan. Creating it runs none of its implementation prompts. A subsequent instruction to execute a selected prompt authorizes that bounded development work, not unspecified production migrations, live payments, filings, external messages or deployment. Respect authorization already present in the execution session; do not ask again for routine reversible work. Obtain missing authorization only for the concrete action that actually requires it, after completing safe preparation.

Use one active implementation slice at a time. Review-board language denotes review lenses, not an instruction to spawn agents or claim independent review. Do not spawn subagents unless a later user or applicable instruction expressly authorizes delegation. Use real qualified reviewers where required; self-review is not independent approval.

## 2. Evidence-first entry

1. Read current AGENTS.md and [WORKFLOW](../../ecc/WORKFLOW.md), [skill routing](../../ecc/skill-routing.md), [command registry](../../ecc/command-registry.json) and [test lanes](../../ecc/test-lanes.md). Inspect applicable nested instructions.
2. Read the [assessment](../hris-assessment-ohada-1-200-2026-10-24.md), the selected finding/source references and relevant current code. Reproduce the defect or establish the capability gap. If it has already been fixed, verify it and report the residual work; do not recreate the fix.
3. Read the [October blueprint](../../../plans/stoquify-cameroon-hris-payroll-blueprint-2026-10-07.md), [current execution document](../../ecc/cameroon-blueprint-execution-2026-10-07.md) and [Trust Spine register](../../HRIS-Payroll/payroll-trust-spine-execution/EXECUTION_REGISTER.md). Prior completion claims retain their historical scope; this plan adds acceptance slices and does not reset completed WPs.
4. Check relevant graphify-out graphs and dates for relationships, then verify behavior in current source. Consult relevant what-next/ and innovation/ evidence where it applies; do not load all historical reports or regenerate graphs implicitly.
5. Record commit, branch, baseline status and relevant file hashes. This repository has inherited local changes: understand overlapping edits before modifying a file. Do not revert, stage, format or clean unrelated work.
6. Declare the narrow owned-file set, transaction/write map and tests. Candidate paths in each prompt are starting points, not permission to refactor entire directories.
7. Confirm dependency evidence at the current baseline. A dependency marked VERIFIED needs its required evidence, not merely a prior completion statement. When code changed afterward, reassess the affected proof.

For UI changes read the [design-system master](../../../design-system/stoquify/MASTER.md), relevant page contract and existing component registry. Use current components/tokens. No generic redesign or unrelated lint cleanup.

## 3. Permanent review lenses

Use the following lenses in every slice; include a brief finding or justified not-applicable result, without manufacturing extra work:

| Lens | Required question |
|---|---|
| Enterprise/platform architecture | Does the change preserve domain ownership, tenancy, modularity and integration contracts? |
| Backend/domain/integration | Are transitions, transactions, retries, events and provider failures correct? |
| Data/database/migration | Are constraints, precision, provenance, backfills and recovery explicit? |
| Security/IAM/privacy/abuse | Are permissions, entitlement, actor identity, separation of duties and redaction enforced server-side? |
| Frontend/design systems | Does the changed interface follow existing primitives and truth contracts? |
| Workflow/accessibility/localization | Can the intended role complete the task, recover from errors and use EN/FR and keyboard access? |
| Product/business process | Does it solve the selected operational need without expanding scope? |
| Quality/release assurance | Is there proportional positive, negative, concurrency and recovery evidence? |
| SRE/DevSecOps/performance | Can failures be detected, diagnosed and recovered without leaking sensitive data? |
| SaaS/product operations | Are entitlements, onboarding, support and rollout coherent? |

Activate HRIS/payroll and records/evidence lenses throughout. Activate statutory/finance/ledger, provider/payment, analytics, import/export and change-management specialists when their boundaries are touched. AI, POS/inventory and purchasing are normally outside these slices; mark them not applicable unless actual impact emerges.

## 4. Implementation invariants

- Keep authoritative HR state in existing services. UI and read models cannot approve, calculate or override business truth independently.
- Preserve tenant scope, module access, fresh authorization where required, authenticated actor identity, own/team separation and independent approval. Do not fix access friction with broader roles.
- Reuse the PayrollEmployee-backed single employee master and existing lifecycle, ledger, snapshot, outbox, audit and error controls. Do not create a second employee database, parallel approval engine or generic workflow platform.
- Root-client writes must establish the required transaction; supplied transactions must remain owned by the caller. Ledger/state/audit/events that form one outcome commit or roll back together.
- Define a complete semantic replay identity. Exact retries recover the original outcome; mismatched payloads conflict. Review simultaneous distinct operations as well as duplicated requests.
- Preserve original imports, certified revisions and paid/frozen history. Corrections create authorized linked revisions or adjustments; they do not rewrite history.
- Make effective dates, timezone, period inclusion and as-of access policy explicit. Current authorization and historical business facts are different inputs that require a documented rule.
- Keep country rules effective-dated and provenance-backed. No invented OHADA-wide tax/leave/payroll default, no draft-to-approved promotion to satisfy tests, and no automatic legal certification.
- Existing production admission and exact committed-replay recovery must coexist. New effects recheck admission; legitimate recovery must not repeat the effect or become stranded.
- Log identifiers/correlation and failure category, not salaries, bank details, document contents, secrets or entire personal records.
- Keep scope to the selected prompt. Advanced recruitment/performance/training, autonomous employment decisions, biometrics, broad microservice rewrites and unrelated product redesign are excluded.

## 5. Commands and verification lanes

Before every verification command, inspect its current package/script/config/setup definition and registry classification. A command name does not prove it is read-only. Inspect lifecycle hooks. Do not run application configuration, seeders or reset scripts through an unreviewed wrapper.

Start the implementation session with the contract check after that inspection:

```powershell
npm run agent:workflow:check
```

A previously used scoped mocked-test recipe is:

```powershell
node node_modules/jest/bin/jest.js --config jest.payroll-trust-spine.config.cjs --runInBand --no-cache --runTestsByPath services/hris/__tests__/operational-time-decision-concurrency.test.ts services/hris/__tests__/leave-balance.service.test.ts services/hris/__tests__/org-effective-scope.service.test.ts components/hris/__tests__/HrisApprovalInbox.test.tsx
```

Inspect current config/setup and choose only the relevant existing/new test files for the slice; do not assume this four-suite recipe covers every prompt. Inspect the registered database/browser runner and derive its exact reviewed command at execution time; this plan intentionally supplies no blind database reset command. Save commands, exit codes and artifacts. Missing test infrastructure is an explicit evidence gap.

Report these separately:

| Lane | What it can establish | What it cannot establish |
|---|---|---|
| Source/graph inspection | Current paths, invariants, ownership and potential defects | Runtime correctness |
| Mocked unit/component tests | Local logic and simulated boundaries | Real PostgreSQL locking, constraints, transactions or real provider behavior |
| Isolated real-database tests | Concurrent state, constraints, rollback, replay and relevant integration | Production performance, provider acceptance or legal correctness |
| Authorized provider/test-store integration | Specific adapter/storage protocol outcomes | Actual bank settlement, filing acceptance or broad production certification |
| Rendered/browser/assistive checks | Tested role journeys, layouts, localization and accessibility behavior | Unexercised roles/devices or complete WCAG conformance |
| Qualified domain review | Specified rules/examples and applicability | Automatic software or deployment certification |

Never infer database success from mocks. For concurrency tests, arrange contenders deterministically, assert committed outcomes and audit/event counts, and show cleanup. Use synthetic identities across two tenants, own/team/HR/unauthorized roles and independent maker/checker users.

Do not load application .env to discover a database target. Use a specifically identified authorized disposable target and bounded fixture namespace. Inspect migration/reset/cleanup side effects; verify resolved absolute targets before recursive file cleanup. No shared/production database mutation by assumption.

No build is required merely to claim analysis or unit success. npm run build loads application configuration and writes output; release:schema:promote is a separate mutating stage. Review each according to actual need and authorization. Do not invoke production seeders, live connectors or schema promotion from a generic test step.

## 6. Data and release design

Before any schema change, record:
- why existing models cannot satisfy the accepted requirement;
- tenant keys, constraints, indexes and concurrency effects;
- additive migration and deterministic backfill, including ambiguous legacy records;
- compatibility during rollout, validation, restart/resume and rollback;
- explicit target and required authorization for actual data execution.

Prefer expand/validate/contract when relevant; destructive contraction is not part of a routine feature slice. A feature flag is proposed only where needed and should reuse existing module/tenant admission infrastructure. Disabling a feature does not undo financial or employment history; use controlled compensating actions.

For UI, cover empty/loading/error/denied/pending/stale states, preserve entered values after failures, and avoid reporting unknown as zero. Use server pagination/counts under the same scope. Test touched workflows in EN/FR at 360/768/1440 CSS pixels with keyboard and appropriate assistive checks.

## 7. Required evidence and status

For selected ID, write:
- what-next/hris-implementation-2026-10-24/ID/RESULT.md: problem/current evidence, owned changes, acceptance matrix, commands/results, review lenses, unresolved decisions, data/release/rollback notes and next eligible slice.
- what-next/hris-implementation-2026-10-24/ID/evidence.json: baseline SHA plus relevant file hashes, test lane, command, outcome, timestamp, artifact paths and acceptance IDs. Do not include secrets or personal records.
- Tests and any bounded migration/runbook required by the selected scope.

Replace ID with the actual identifier, such as HR-01. Link screenshots/logs; do not claim they exist until created. Assign acceptance IDs ID-AC01 onward in listed order.

Append a dated follow-up entry to docs/ecc/cameroon-blueprint-execution-2026-10-07.md as the active execution register, referencing these IDs and the existing historical programs. Preserve historical completion and other writers' edits. Do not create an independent competing status register. The plan.json file in this package is an immutable planning manifest, not a live completion ledger.

Use:
- PLANNED: no implementation/evidence closure.
- IN_PROGRESS: bounded work is active.
- IMPLEMENTED_PENDING_VERIFICATION: code exists; required evidence is missing.
- VERIFIED: every applicable acceptance criterion has current evidence.
- BLOCKED: state the precise external decision/environment/reviewer dependency and safe work completed.

If a runtime dependency is unavailable, continue safe preparation or focused unit work where meaningful, but do not mark the dependent slice VERIFIED or enable it. Do not wait indefinitely or repeatedly ask for the same authorization. Document the missing input and concrete next action.

Finish each slice with a self-contained outcome: files changed, behavior, separate test results, remaining risks/limits, status and next eligible ID. Stop after the selected slice unless the user expressly requested a larger sequence.
