---
name: 011-aqstoqflow-ap-gate-closer
description: Close the remaining AqStoqFlow 011 purchasing/AP gates after the backend AP kernel exists. Use when finishing AP server actions, RBAC, fresh-auth maker-checker, AP workbench UI, SYSCOHADA supplier invoice/payment posting recipes, outbound payment reconciliation integration, typed errors, notifications, tests, and release evidence for the 011-aqstoqflow-purchasing-ap-controls suite step.
---

# AqStoqFlow 011 AP Gate Closer

## Purpose

Use this skill to finish the open 011 purchasing/AP sub-slice without bypassing enterprise gates. This skill complements, and does not replace, `011-aqstoqflow-purchasing-ap-controls`.

The current expected starting point is a backend AP kernel with:

- `SupplierInvoice`, `SupplierInvoiceLine`, `ThreeWayMatch`
- `SupplierBankAccount`, `SupplierBankChangeRequest`
- `SupplierPayment`, `SupplierPaymentAllocation`
- `postSupplierInvoice`, `requestSupplierBankChange`, `approveSupplierBankChange`, `releaseSupplierPayment`
- explicit `LedgerPostingBatch` blockers where balanced AP posting recipes are not ready

## Required Context

Read these first when present:

- `what-next/AQSTOQFLOW_011_PURCHASING_AP_CONTROLS_EXECUTION_REPORT_2026-06-15.md`
- `services/purchasing/ap-control.service.ts`
- `services/purchasing/ap-control.schemas.ts`
- `services/purchasing/__tests__/ap-control.service.test.ts`
- `prisma/schema.prisma`
- `actions/*` and `components/*` patterns for existing management workflows
- `services/accounting/posting-rules.service.ts`, `services/accounting/default-posting-rules.service.ts`, and posting tests
- `services/payments/*` and `services/reconciliation/*` for outbound payment evidence

For detailed acceptance criteria and build order, read `references/011-ap-gate-closure-blueprint.md`.

## Operating Rules

1. Treat 011 as incomplete until action/RBAC, UI, ledger, reconciliation, and verification gates all pass.
2. Keep the backend AP kernel as the source of truth; UI and actions must not reimplement AP totals, match logic, duplicate detection, payment release checks, or bank-change checks.
3. Enforce tenant scope, RBAC, module gates, fresh-auth, and maker-checker at the server-action boundary before calling AP services.
4. Preserve explicit close blockers until balanced SYSCOHADA AP posting recipes are implemented and tested.
5. Do not advance to `012-aqstoqflow-payroll-presence-engine` while any 011 CRITICAL or HIGH gate remains open.
6. Treat country-specific VAT, withholding, fiscal, and payment behavior as country-pack controlled and expert-review required.

## Build Sequence

### 1. Action And RBAC Gate

Create or extend `actions/purchasing/*` with typed action results for:

- post supplier invoice
- request supplier bank change
- approve supplier bank change
- release supplier payment
- read AP workbench data

Each action must:

- derive `organizationId` from the authenticated session, not client input
- check module availability for purchasing/AP/accounting/payment work as relevant
- check permission names specific to AP posting, supplier bank approval, and payment release
- require fresh auth for bank approval and payment release
- preserve maker-checker separation
- return `{ ok: true, data }` or `{ ok: false, error }` with safe user/operator messages

### 2. AP Workbench UI Gate

Build a professional operational workbench under the purchasing/payables dashboard surface. It should expose:

- supplier invoice posting and duplicate/match feedback
- three-way match review and exception states
- supplier bank-change approval queue
- supplier payment release queue
- ledger blocker and reconciliation status

Required UI states:

- loading
- empty
- validation error
- permission denied
- partial/degraded accounting setup
- stale/as-of
- retry
- bilingual French-first strings
- light/dark theme behavior

### 3. Balanced Ledger Gate

Replace explicit AP posting blockers only when balanced posting recipes exist for:

- supplier invoice: purchase/input VAT/AP liability
- supplier payment: AP liability settlement to bank/mobile/cash clearing

The recipe/service must:

- resolve open fiscal period
- resolve active leaf accounts
- produce balanced debit/credit journal entries
- create source links, audit events, and business-event evidence
- fail closed with typed accounting errors and a visible blocker

### 4. Outbound Reconciliation Gate

Connect released supplier payments to the payment reconciliation truth model:

- create outbound payment evidence or payment transaction records
- preserve supplier payment source links
- surface reconciliation-required notifications
- block close while released supplier payments remain unreconciled or suspense-backed

### 5. Verification Gate

Do not mark 011 complete until these pass:

- Prisma validation and generate
- typecheck
- focused AP service tests
- server-action tests for tenant rejection, RBAC rejection, fresh-auth rejection, SoD rejection, and safe errors
- UI state tests or component tests for AP workbench critical states
- accounting posting tests proving balanced entries or explicit blockers
- reconciliation integration tests for released supplier payments
- inventory boundary regression gate

## Stop Conditions

Stop and report instead of advancing if:

- any AP action accepts `organizationId` from client input as trust
- any UI imports Prisma or calls AP services directly from client components
- any finalized invoice/payment can be mutated without compensating event
- supplier payment can release with pending/unapproved bank destination
- ledger recipes are missing but blockers are removed
- supplier payment is marked final without reconciliation evidence, suspense, or visible blocker

## Output Contract

End with:

- selected skill: `011-aqstoqflow-ap-gate-closer`
- files changed
- gates passed
- gates blocked
- verification result
- whether `011-aqstoqflow-purchasing-ap-controls` may advance to `012`
