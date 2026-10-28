# AqStoqFlow HR/Payroll Prompt 17 Payment Reconciliation Report

Date: 2026-06-26
Skill: aqstoqflow-hrpayroll-17-payment-reconciliation
Source prompt suite: what-next/payroll/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md

## Execution Status

Status: implemented and validated.

Prompt 17 was executed as a server-owned payroll payment reconciliation slice. It did not add speculative UI routes. The implementation creates a protected read model and a controlled settlement-evidence workflow that links payroll payment batches to provider/statement evidence, payment exceptions, match records, close assurance, sensitive-action controls, and immutability runtime proof.

## Prerequisite Gate

| Gate | Result | Evidence |
| --- | --- | --- |
| Approved payment destination workflow passes | PASS | Prompt 10 release path blocks payroll payment release unless approved destination evidence exists. |
| Payroll payment posting setup is ready | PASS | Prompt 05/10/15 established payroll payment posting, accounting source links, and register tie-out evidence. |
| Payment close-impact decision exists | PASS | PAYROLL_PAYMENT_RELEASED already invalidates close evidence; Prompt 17 adds PAYROLL_PAYMENT_RECONCILED. |
| Archive/export evidence is ready | PASS | Prompt 14 payslip archive/export evidence and Prompt 15 payroll register export/read model are present. |
| Settlement state can be modeled safely | PASS | New migration allows only forward settlement lifecycle status changes while preserving immutable payment content. |
| Data-trust/close impact is clear | PASS | Open payment exceptions already feed data-trust blockers; settlement now feeds close assurance with a distinct close source. |

No hard prerequisite blocker remains for Prompt 17.

## Implemented Scope

1. Added `services/payroll/payment-reconciliation.service.ts`.
   - Builds a payroll payment reconciliation read model from server-owned payment batches, payment transactions, match records, payment exceptions, suspense items, and provider/statement evidence.
   - Derives settlement states on the server: LEDGER_BLOCKED, AWAITING_PROVIDER_EVIDENCE, EXCEPTION_OPEN, READY_TO_SETTLE, PARTIALLY_SETTLED, SETTLED.
   - Applies payroll amount, provider reference, and suspense-detail redaction policies.
   - Records payroll reconciliation read audit evidence.
   - Records settlement evidence with fresh auth, RBAC, maker-checker, provider/statement proof, business event, exception resolution, transaction state update, batch lifecycle update, audit log, and close invalidation.

2. Added `actions/payroll/payroll-payment-reconciliation.actions.ts`.
   - Exposes protected server actions only.
   - Derives organization, actor, permissions, and fresh-auth context from the server session.
   - Revalidates payroll payment surfaces after settlement evidence is recorded.

3. Added payroll reconciliation authorization controls.
   - New canonical permission: `payroll.payments.reconcile`.
   - RBAC risk: critical.
   - Legacy compatible aliases: PAYROLL_APPROVE, PAYMENT_RECONCILIATION_SIGN, MANAGE_FINANCIAL_CONTROLS.
   - Sensitive action: `payroll.payment.reconcile` with critical risk, L1 assurance, 300 second fresh-auth window, self-approval block, and audit action `PAYROLL_PAYMENT_RECONCILIATION_CONTROL`.

4. Added close-assurance source metadata.
   - New source code: `PAYROLL_PAYMENT_RECONCILED`.
   - Event source: `payroll.payment_batch.reconciled`.
   - Close impact: certified close evidence stale.

5. Added controlled immutability lifecycle migration.
   - Migration: `prisma/migrations/20260626143000_payroll_payment_reconciliation_lifecycle/migration.sql`.
   - Allows only forward settlement status changes after release:
     - RELEASED to PARTIALLY_SETTLED or SETTLED.
     - PARTIALLY_SETTLED to PARTIALLY_SETTLED or SETTLED.
     - SETTLED remains SETTLED.
   - Still blocks amount, allocation, evidence hash, and ledger mutation.

6. Updated runtime immutability proof.
   - Added a forbidden status reversal check.
   - Changed the allowed payroll payment lifecycle check to prove status can move to SETTLED with reconciliation status evidence.

## Files Changed By This Prompt

- `actions/payroll/payroll-payment-reconciliation.actions.ts`
- `actions/payroll/__tests__/payroll-payment-reconciliation.actions.test.ts`
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `lib/security/__tests__/rbac-permissions.test.ts`
- `prisma/migrations/20260626143000_payroll_payment_reconciliation_lifecycle/migration.sql`
- `scripts/payroll-immutability-runtime-check.js`
- `services/accounting/close-assurance-pack.service.ts`
- `services/controls/sensitive-action.service.ts`
- `services/controls/__tests__/sensitive-action.service.test.ts`
- `services/payroll/payment-reconciliation.service.ts`
- `services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts`
- `services/payroll/__tests__/payroll-immutability-migration.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_17_PAYMENT_RECONCILIATION_REPORT_2026-06-26.md`

The worktree contains many unrelated pre-existing modifications and deletions. They were not reverted or normalized by this prompt.

## Validation Run

| Gate | Result | Notes |
| --- | --- | --- |
| `npm test -- --runTestsByPath services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts actions/payroll/__tests__/payroll-payment-reconciliation.actions.test.ts lib/security/__tests__/rbac-permissions.test.ts services/controls/__tests__/sensitive-action.service.test.ts services/payroll/__tests__/payroll-immutability-migration.test.ts --runInBand` | PASS | 5 suites, 43 tests. |
| `npm run prisma:validate` | PASS | Prisma schema valid. |
| `npm run typecheck` | PASS | TypeScript clean after enum-set fix. |
| `npm run service:boundary:fail` | PASS | 0 active service-boundary violations. |
| `npm run policy:gates` | PASS | Full aggregate passed, including live payroll immutability runtime proof. |
| Payroll immutability runtime check | PASS | Required triggers 8/8; forbidden mutation checks blocked 12/12; allowed lifecycle checks passed 3/3; blockers 0. |
| `npm test -- --runTestsByPath services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand` | PASS | 1 suite, 7 tests. |
| `npm run prisma:generate` | FALLBACK USED | Native engine generation hit Windows EPERM rename lock on `query_engine-windows.dll.node`. |
| `npx prisma generate --no-engine` | PASS | Prisma Client generated with engine=none. |

## Single Source Of Truth Review

Preserved:

- Services own payroll payment reconciliation truth.
- Server actions expose protected workflows only.
- Read model derives from existing payment transactions, match records, exceptions, suspense items, statement lines, provider events, payroll batches, and close evidence.
- No client-computed payroll payment reconciliation metrics were added.
- No dashboard-specific shadow service or duplicate reconciliation table was added.
- No UI route or placeholder surface was introduced.
- Finalized payroll payment evidence remains immutable; only controlled forward lifecycle status fields can change.
- Cash/settlement claims require provider event, statement line, statement file, or approved match evidence.
- Sensitive payment settlement requires permission, fresh auth, audit, and maker-checker protection.

Risks avoided:

- Avoided changing released payment amounts, allocations, bank file hash, document hash, evidence hash, ledger links, or posted business event evidence.
- Avoided treating payroll release as settlement.
- Avoided settlement without provider/statement proof.
- Avoided making the UI the source of reconciliation truth.

## Blockers

No Prompt 17 implementation blocker remains.

Operational note: native `prisma generate` remains vulnerable to local Windows file locks on the Prisma query engine DLL. The release-menu fallback `npx prisma generate --no-engine` passed.

## Handoff Criteria

Prompt 17 handoff criteria are satisfied:

- Payment batch detail and reconciliation read model exist.
- Provider/file references, matches, exceptions, settlement evidence, retry status, and evidence links are modeled server-side.
- Payment state feeds close assurance through `PAYROLL_PAYMENT_RECONCILED`.
- Policy gates and runtime immutability proof pass.
- The next safe skill is `aqstoqflow-hrpayroll-18-close-data-trust`.

## Recommended Next Action

Run `aqstoqflow-hrpayroll-18-close-data-trust` to connect the now-proven payroll payment settlement state into the broader close/data-trust presentation and final release readiness path.
