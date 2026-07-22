# AqStoqFlow Close Assurance Engine Run Report

Date: 2026-07-20
Skill: `020-aqstoqflow-close-assurance-engine`
Workspace: `E:\ohada saas\Focused projects\stoquify`
Verdict: `COMPLETED_WITH_FOCUSED_ENGINE_HARDENING`

## Scope

Executed the close-assurance engine skill after the 018 readiness audit and 019 schema migration trail. The existing engine already exposed the target server functions, so this run hardened the active implementation rather than replacing it.

## Service Functions Covered

Existing exported engine functions remain the public service surface:

- `runCloseAssurance`
- `getCloseAssuranceDashboard`
- `getCloseEvidenceGraph`
- `assignCloseFinding`
- `commentOnCloseFinding`
- `requestCloseWaiver`
- `approveCloseWaiver`
- `updateAccountantReview`

This run added no new public route surface and left close pack export/certification behavior to the existing pack service and future certification-gate work.

## Domains Covered

The engine now fails closed across these close-readiness domains:

- accounting period state and close preflight;
- draft journal entries;
- unresolved or failed posting batches;
- unlinked posted entries;
- ledger balance and source traceability;
- payment reconciliation sign-off;
- open payment exceptions and suspense;
- data-trust/provenance readiness;
- inventory class 3 valuation readiness;
- payroll finance forecast proof;
- AP, payroll, and compliance exposure through the data-trust service.

Unavailable ledger, payment reconciliation, data-trust, inventory, or payroll evidence is represented as `UNAVAILABLE` evidence and open blocker findings rather than as success or zero.

## Blocker Rules Hardened

- Ledger reconciliation dependency failure becomes a critical unavailable ledger finding.
- Payment reconciliation and data-trust dependency failures now create high findings so the run status becomes `BLOCKED`.
- Unknown dependency errors are converted to safe unavailable messages in the dashboard payload.
- Existing preflight blockers continue to cover drafts, failed posting batches, unlinked posted entries, open exceptions, open suspense, unsigned reconciliation runs, and unbalanced trial-balance issues.
- Same-actor waiver approval remains blocked for segregation of duties.

## Evidence Graph Coverage

The evidence graph remains reference-based and does not fabricate missing evidence. It now maps source-link evidence into graph nodes/edges for the source document, source link evidence, posting batch, and journal entry when those references are present in data-trust source-link metadata.

Unavailable ledger, payment reconciliation, and data-trust dependencies now also create explicit unavailable evidence items.

## Notification Coverage

Close workflow events now use the existing durable `BusinessEvent` plus `NOTIFICATION` outbox pattern for:

- close assurance run completed;
- close assurance blocked;
- critical finding created;
- finding assigned;
- finding due soon;
- accountant comment added;
- waiver requested;
- waiver approved;
- accountant review updated.

A dedicated waiver rejection command is not part of the current 020 service responsibility list, so rejection notification remains a future extension if a reject workflow is added.

## Files Changed

- `services/accounting/close-assurance.service.ts`
- `services/accounting/__tests__/close-assurance.service.test.ts`

## Validation

Passed:

- `npx jest --runTestsByPath "services/accounting/__tests__/close-assurance.service.test.ts" --runInBand`
- `npm run typecheck`
- `npm run prisma:validate`
- `npx jest --runTestsByPath "services/accounting/__tests__/close-assurance.service.test.ts" "actions/accounting/__tests__/close-assurance.actions.test.ts" "services/_shared/__tests__/protect.test.ts" --runInBand`

Focused service coverage now includes clean readiness, payroll blocker, inventory blocker, open suspense/unsigned reconciliation blocker, draft journal blocker, failed posting batch blocker, unbalanced ledger blocker, missing domain data, cross-tenant period denial, notification events, due-soon assignment event, waiver request event, source-link graph mapping, and same-actor waiver approval denial.

## Remaining Gates

Portal gates for skill 021:

- Render real service data only.
- Keep `POSTED`, `OPERATIONAL`, and `UNAVAILABLE` provenance visually distinct.
- Cover empty/loading/permission-denied/unavailable/stale/retry/degraded UI states.
- Add browser smoke, responsive, keyboard/focus, and accessibility evidence.

Certification/export gates for skill 022:

- Certified export must require fresh auth and segregation of duties.
- High/critical findings, unavailable critical evidence, unsigned reconciliation evidence, stale inventory evidence, and payroll/AP/tax blockers must fail closed.
- Export schema/version, redaction, deterministic hash, watermark, and limitation language must be frozen.
- Statutory/OHADA/SYSCOHADA claims must remain advisory unless backed by authoritative country-pack evidence or qualified external review.
