# Statement Proof Network Report

Date: 2026-08-08
Status: Phase 5 active; settlement, compensating reversal, and protected reversal action foundations certified; statement capability not implemented
Primary skill: `stoquify-statement-proof-network`

## Entry Baseline

Phase 5 is active after the certified Slice 433 transition gate.

Current reusable foundations are customer ledger writes, supplier/AP invoice and payment controls, signed public receipt tokens, expiry/tamper rejection, hash-only token registry, revocation, access counts, last-access time, audit logs, public-route gating, and contact redaction.

## Capability State

- Customer statement generation: missing.
- Supplier statement generation: missing.
- Immutable statement snapshot/content hash: missing.
- Statement-specific signed token and registry: missing.
- External statement route: missing.
- Recipient view log: missing.
- Dispute workflow: missing.
- Promise-to-pay workflow: missing.
- Consented WhatsApp/email delivery: missing.

No external statement access is authorized.

## Required Ordering

1. Establish versioned, service-owned customer statement generation from tenant-scoped balance truth.
2. Prove opening balance, period movements, closing balance, currency, source tables, truncation, and redaction.
3. Extend the proven vocabulary to supplier/AP statements.
4. Define immutable statement snapshots and content hashes.
5. Add statement-specific signed, expiring, revocable recipient access and view logs.
6. Add dispute and promise-to-pay commands.
7. Add external UI and consented delivery only after the source and access gates pass.

## Verification Baseline

- Phase 5 entry suites: 9 suites / 78 tests passed.
- TypeScript and Prisma validation passed.
- Public receipt token and route guard evidence passed.
- Direct inventory confirms zero Statement Proof Network implementation files.

## Slice 434 Source-Truth Result

The first customer-statement candidate was rejected after live source tracing proved that the customer ledger is not yet complete receivables truth:

- production writes cover POS on-account residuals and POS voids only;
- no production customer-settlement ledger writer exists;
- no receipt-to-invoice allocation model exists;
- the former helper trusted caller-supplied running balances.

Slice 434 therefore hardened the source boundary instead of generating a statement. The customer-ledger service now owns tenant resolution, balance derivation, type polarity, negative-balance prevention, optional credit-limit enforcement, and a prior-balance compare-and-set update. Both POS producers use the kernel.

Verification passed 6 suites / 273 tests, TypeScript, focused lint, JavaScript syntax, diff hygiene, and the live report-trust gate at 28/28.

## Slice 435 Source-Truth Result

Slice 435 adds the missing positive incoming collection path as a dedicated `CustomerSettlement` aggregate rather than overloading the legacy POS `Payment` model.

The source command requires critical collection authorization and fresh authentication, validates tenant/customer/sales-order scope, conserves the declared amount across bounded allocations, limits each allocation to the customer-ledger open amount, and writes credits through the Slice 434 balance kernel.

Every allocation has a required unique link to its ledger credit. Replay loads by those stored links and verifies the sales-order reference and exact debit/credit evidence instead of rediscovering rows from descriptions. Settlement, allocations, ledger, posting, source link, close invalidation, audit, business event, and outbox evidence share one serializable transaction.

The default `AR-CUSTOMER-SETTLEMENT` rule supports cash, bank transfer, mobile money, card, and cheque rails and fails closed when required accounting configuration is absent.

Verification passed 13 suites / 343 tests, Prisma format/generation/validation, TypeScript, focused lint, JavaScript syntax, diff hygiene, and the live report-trust gate at 29/29.

This foundation still references current `SalesOrder`-backed open items. It does not add a separate SalesInvoice lifecycle or authorize statement generation.

## Slice 435 Next Control (Superseded)

Slice 435 is certified complete at the current-worktree implementation level. No Slice 436 is selected.

Run a fresh `/caveman full` Phase 5 audit for a narrow compensating customer-settlement reversal command. Reversal must restore allocation/open-balance truth and customer balance through explicit linked evidence, reverse accounting through controlled journal evidence, preserve idempotency and audit/event provenance, and never delete posted source rows.

## Slice 436 Source-Truth Result

Slice 436 adds the source-owned compensating reversal foundation required to preserve customer-settlement chronology. Each allocation receives one directly linked `PAYMENT_REVERSAL` debit through the Slice 434 balance kernel, the original journal is mirrored through controlled accounting evidence, and the settlement reaches `REVERSED` only through one final serializable compare-and-set.

Exact replay revalidates original and reversal ledger entries, posting batches, journals, source links, the tenant-scoped applied business event, and the notification outbox payload hash. The service owns its execution clock and returns a bounded DTO rather than the persistence record. Generic journal reversal refuses customer-settlement journals and records a durable redacted bypass audit.

Verification passed 15 focused reversal tests, 73 combined accounting/event/security tests, 262 report-trust mutations, TypeScript, Prisma validation/generation, focused lint, syntax, and hygiene checks. Live report-trust readiness is 30/30.

This remains an internal service foundation. No authenticated action, API, UI, provider refund, external statement, signed access, recipient workflow, or delivery channel is authorized.

## Next Control (Superseded)

Slice 436 is certified complete at current-worktree service-foundation level. This prior next-control statement is superseded by Slice 437.

The subsequent live audit selected the authenticated reversal action boundary before any invoice or statement source-truth implementation.

Customer statement generation remained blocked during that selection.

## Slice 437 Protected-Boundary Result

Slice 437 binds the source-owned compensating reversal service to one finance-owned protected server action. The action requires exact `finance.receivables.reverse` permission, allowed-command audit evidence, five-minute fresh authentication, and enforced/audited finance-module write entitlement.

Fresh-auth user, tenant, assurance organization, assurance level, and timestamp must match the protected context. The timestamp must be a real finite `Date`; assurance must be finite and at least password level. Only after this verification does the action parse the bounded canonical command and invoke the service with context-derived control evidence.

Verification passed 14 protected-action tests, 86 tests across the eight-suite action/accounting/event/security bundle, 290 report-trust mutations, TypeScript, scoped lint, syntax, diff hygiene, exposure checks, and the live report-trust gate at 31/31. The final independent constrained re-review reported no findings.

This is a dormant authenticated boundary. No route, UI, API, or product caller exists, so public reversal execution is not authorized. No statement, snapshot, token, recipient action, provider refund, or delivery channel was added.

## Next Control

Slice 437 is certified complete at current-worktree protected-action-boundary level. No Slice 438 is selected.

Run a fresh `/caveman full` Phase 5 audit through `stoquify-referral-war-room-orchestrator`. The leading candidate is an immutable posted customer receivable document foundation that resolves customer-scoped receivable grouping and invoice-grade source truth.

Customer statement generation remains blocked pending that audit and the remaining immutable invoice/statement truth work. Signed statement links, recipient actions, external routes, and delivery remain unauthorized.
