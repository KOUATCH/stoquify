# Payment Reconciliation Readiness Audit

Date: 2026-06-14
Platform: AqStoqFlow / OHADA SaaS
Suite stage: 01 - payment reconciliation readiness audit
Gate result: PASS TO STAGE 02, WITH CAPTURE-READINESS LIMITS

## Executive Verdict

AqStoqFlow currently has a usable payment reconciliation workbench surface built from existing `Payment` data. It is operator-ready for capture-readiness review: run summaries, failure groups by rail, duplicate provider-reference alerts, and suspense-ready failure candidates are present.

Compliance status is partial. The current implementation is not yet certified reconciliation evidence because the schema does not contain durable provider event, statement line, reconciliation run, match record, suspense item, or exception case records. The current workbench must therefore continue to label itself as a `PAYMENT_CAPTURE_READ_MODEL` and must not claim that internal payment records are external provider statement evidence.

Stage 02 can begin. The next step should add additive durable evidence schema and permissions without backfilling fake provider history or posting suspense.

## Current Maturity Classification

Classification: Capture-readiness read model

What it can do now:
- Summarize payment reconciliation readiness from internal `Payment` records.
- Group likely failures by payment rail and failure type.
- Detect duplicate provider references already captured on payments.
- Surface suspense-ready candidates for operator review.
- Gate access through `payments.reconciliation.run`.

What it cannot honestly do yet:
- Prove provider statement evidence.
- Preserve immutable provider webhook evidence.
- Preserve imported statement file and statement line evidence.
- Preserve durable reconciliation run certificates.
- Preserve match decisions and corrections.
- Open durable exception cases.
- Post or reverse suspense accounting entries.
- Support certified sign-off over a durable reconciliation evidence package.

## Platform Primitive Map

### Payment Capture

Primary model:
- `prisma/schema.prisma` contains `Payment` with `paymentNumber`, `amount`, `method`, `status`, provider references, mobile money fields, bank reference fields, idempotency key, and organization scope.

Important existing uniqueness and lookup controls:
- `@@unique([organizationId, idempotencyKey])`
- `@@unique([organizationId, method, transactionId])`
- `@@unique([organizationId, method, authorizationCode])`
- `@@unique([organizationId, mobileMoneyProvider, mobileMoneyReference])`
- `@@unique([organizationId, method, bankReference])`
- `@@index([organizationId, createdAt])`
- `@@index([organizationId, method, status])`

Supported payment methods include `CASH`, `CARD`, `MOBILE_MONEY`, `BANK_TRANSFER`, `CREDIT`, `STORE_CREDIT`, `CHEQUE`, and `MIXED`.

### Existing Reconciliation Workbench

Read-model service:
- `services/payments/payment-reconciliation-workbench.service.ts`

Current provenance flags:
- `mode: "PAYMENT_CAPTURE_READ_MODEL"`
- `persistentRunsAvailable: false`
- `providerStatementPersistenceAvailable: false`

Pure reconciliation readiness service:
- `services/payments/payment-reconciliation.service.ts`

Current checks include:
- Missing provider capture reference.
- Duplicate internal provider reference.
- Duplicate provider settlement reference.
- Non-final payment status.
- Missing settlement line.
- Unmatched provider reference.
- Amount mismatch.
- Gross settlement mismatch.
- Fee mismatch.

Server action:
- `actions/payments/reconciliation-workbench.actions.ts`
- Uses `protect` and requires `payments.reconciliation.run`.

Hook:
- `hooks/payments/usePaymentReconciliationWorkbench.ts`
- Uses TanStack Query with a 30 second refresh interval and 15 second stale time.

Dashboard route:
- `app/[locale]/(dashboard)/dashboard/finance/reconciliation/page.tsx`

Dashboard component:
- `components/finance/PaymentReconciliationWorkbench.tsx`

Navigation:
- `config/sidebar.ts` links Finance > Payment Reconciliation to `/dashboard/finance/reconciliation`.

### Accounting And Ledger Backbone

Relevant durable accounting primitives already exist:
- `JournalEntry`
- `JournalEntryLine`
- `LedgerPostingBatch`
- `AccountingSourceLink`
- `LedgerAuditEvent`
- `AuditLog`
- `AccountingPeriod`

Existing accounting reconciliation service:
- `services/accounting/reconciliations.service.ts`

This is useful for the certified reconciliation future state, but payment evidence ingestion and suspense posting should not bypass the ledger-first accounting kernel.

### Permissions And Sensitive Controls

Existing permissions:
- `payments.reconciliation.run`
- `payments.reconciliation.sign`
- `payments.export`

Existing RBAC mapping:
- `lib/security/rbac-permissions.ts` maps reconciliation run/sign permissions to high/critical financial control risks.

Existing sensitive action policies:
- `services/controls/sensitive-action.service.ts` defines `payment.reconciliation.run` as high risk.
- `services/controls/sensitive-action.service.ts` defines `payment.reconciliation.sign` as critical risk with fresh-auth and no self-approval semantics.

Required next permissions:
- `payments.reconciliation.read`
- `payments.reconciliation.import`
- `payments.reconciliation.match`
- `payments.reconciliation.override`
- `payments.reconciliation.exception.assign`
- `payments.reconciliation.exception.resolve`
- `payments.reconciliation.suspense.propose`
- `payments.reconciliation.suspense.post`
- `payments.reconciliation.certificate.export`
- `payments.provider-account.manage`

### Notifications And Operator Surface

Notification primitives exist:
- `components/notifications/NotificationProvider.tsx`
- `components/notifications/NotificationSystem.tsx`

The current workbench can show operator errors and refresh results, but durable exception escalation, owner assignment, SLA notifications, and certified sign-off notifications are not yet implemented.

## Missing Durable Reconciliation Models

No durable payment reconciliation evidence models were found in `prisma/schema.prisma` for:
- `ProviderEvent`
- `StatementFile`
- `StatementLine`
- `PaymentRail`
- `ProviderAccount`
- `PaymentTransaction`
- `MatchRecord`
- `ReconciliationRun`
- `SuspenseItem`
- `PaymentException`

These should be added in Stage 02 as additive schema only. Do not synthesize historic provider events or statement lines from existing payments.

## Internal Vs External Record Representation

Current state:
- Internal records are represented by `Payment`.
- External records are not durable yet.
- The read model simulates reconciliation pressure from captured provider reference fields, but it does not hold provider proof.

Required target representation:
- Internal payment intent/capture: `Payment` and future `PaymentTransaction`.
- External webhook or callback evidence: `ProviderEvent`.
- External statement file evidence: `StatementFile`.
- External statement movement evidence: `StatementLine`.
- Match decision and correction evidence: `MatchRecord`.
- Certified run evidence: `ReconciliationRun`.
- Exception workflow evidence: `PaymentException`.
- Suspense workflow candidate/posting evidence: `SuspenseItem`.

## Match States Required

The platform should distinguish these states:
- `UNMATCHED`: no acceptable counterpart yet.
- `CANDIDATE`: possible match, not accepted.
- `AUTO_MATCHED`: deterministic match by rule.
- `PROPOSED`: engine or operator suggested match.
- `NEEDS_REVIEW`: material exception or low confidence.
- `APPROVED`: accepted by authorized operator.
- `REJECTED`: reviewed and rejected.
- `CORRECTED`: superseded by a correction.
- `VOIDED`: invalidated by reversal, duplicate, or certification rollback.

Current implementation covers some of these concepts in memory through failure and suspense-ready summaries. Durable state storage is absent.

## Exception Handling Requirements

The current error-handling foundation is good but incomplete for certified reconciliation.

Existing foundation:
- Protected server actions through `services/_shared/protect.ts`.
- Error-handling infrastructure under `lib/error-handling`.
- Sensitive-action controls for run and sign operations.
- Operator notification components.

Required additions:
- Durable `PaymentException` records.
- Exception ownership and assignment.
- Exception severity and SLA fields.
- Maker/checker approval on overrides.
- Correlation IDs on action, ingestion, run, match, and export paths.
- Audit trail from exception open to resolution.
- Notification routing for high-risk exceptions and overdue SLAs.
- No suspense posting until exception state and accounting period checks allow it.

## Enterprise Readiness Checklist

| Area | Status | Notes |
| --- | --- | --- |
| Tenant scoping | Partial | Current payment and workbench queries are organization-scoped. Future provider evidence tables need organization-scoped compound indexes and tenant-safe imports. |
| RBAC | Partial | Run/sign permissions exist. Granular import, match, exception, suspense, provider-account, and certificate permissions are still needed. |
| Sensitive actions | Partial | Run/sign policies exist. Manual override, suspense post, import approval, and certificate export policies are still needed. |
| Auditability | Partial | `AuditLog`, `LedgerAuditEvent`, and sensitive controls exist. Durable reconciliation run and match audit trails are missing. |
| Provider evidence | Gap | No durable `ProviderEvent`, `StatementFile`, or `StatementLine` tables yet. |
| Matching engine | Partial | Pure capture-readiness matching exists. Durable match records, confidence, rule trace, corrections, and approvals are missing. |
| Suspense workflow | Partial | Suspense-ready candidates exist. Durable suspense cases and ledger postings are missing. |
| Notifications | Partial | UI notification infrastructure exists. Reconciliation-specific exception, SLA, and sign-off notification workflows are missing. |
| Error handling | Partial | Protected actions and general enterprise error tools exist. Reconciliation-specific correlation IDs, ingestion idempotency errors, retry classification, and dead-letter workflows are missing. |
| Rate limits and circuit breakers | Partial | General resilience primitives exist. Provider ingestion and reconciliation run limits must be explicitly wired. |
| Reconciliation provenance | Partial | Current source metadata is honest. Durable evidence package provenance is missing. |
| Exports | Partial | Payment/accounting export controls exist. Certified reconciliation package export controls are missing. |
| Privacy and retention | Gap | Provider payload redaction, masking, retention, legal hold, and secure raw evidence handling are not yet defined. |
| Accessibility and i18n | Partial | Current dashboard uses `next-intl`, currency formatting, loading states, and theme-aware classes. Full accessibility verification is still required. |
| Feature flags and rollback | Gap | No reconciliation-specific feature flags, kill switch, migration rollback notes, or staged rollout controls were found. |
| Runbooks and recovery | Gap | No provider import recovery, statement replay, suspense rollback, or reconciliation certification runbook exists yet. |

## First Rail Recommendation

Recommended first rail: Mobile money.

Rationale:
- The existing `Payment` model already captures `mobileMoneyProvider`, `mobileMoneyReference`, and mobile money fee amount.
- The current reconciliation service already evaluates provider capture references and fee drift.
- The platform appears oriented toward OHADA/Cameroon retail workflows where mobile money reconciliation is operationally important.

Alternative first rail:
- Bank transfer statement CSV if real bank statement files are easier to obtain than provider webhook payloads.

Execution recommendation:
- Add the evidence schema generically enough for multiple rails.
- Pilot ingestion and matching with mobile money first.
- Do not hard-code Orange Money, MTN MoMo, GIMAC, or bank-specific assumptions into the core reconciliation state model.

## Stage 02 Edit Surface

Stage 02 should touch only additive foundation areas:
- `prisma/schema.prisma`
- A new Prisma migration for payment reconciliation evidence tables.
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `services/controls/sensitive-action.service.ts`
- Focused schema/permission validation tests if the repository has a local pattern for them.

Stage 02 should not:
- Create fake provider evidence from existing payments.
- Backfill certified reconciliation runs from the read model.
- Post suspense entries.
- Replace the existing capture-readiness dashboard.
- Change accounting posting behavior before the suspense workflow stage.

## Stage Gate Decision

Stage 01 gate: PASS.

The current platform is suitable to proceed to Stage 02 because it has:
- A real payment capture model with provider reference fields.
- An honest capture-readiness dashboard.
- Organization-scoped protected server actions.
- Existing payment reconciliation services and hooks.
- Existing RBAC and sensitive-action primitives.
- A ledger-first accounting backbone.

The Stage 02 implementation must preserve the distinction between internal payment capture data and external provider evidence.
