# AqStoqFlow Skill 009 — Payment Reconciliation Moat Execution

**Execution date:** 2026-07-26  
**Selected skill:** `009-aqstoqflow-payment-reconciliation-moat`  
**Decision:** **PARTIAL PASS — PRODUCTION RELEASE BLOCKED**

## Executive conclusion

Stoquify already has a substantial payment-reconciliation control plane: authenticated and replay-resistant provider-event capture, immutable statement evidence, deterministic and manual matching, maker-checker suspense workflows, reconciliation exceptions, evidence manifests, daily certification, close invalidation, tenant/RBAC controls, and operational UI coverage.

The focused verification suites pass. However, one high-severity accounting invariant is not yet satisfied:

> A suspense item can be changed to `POSTED_TO_SUSPENSE` after only a ledger posting batch is created. The current path does not prove that a balanced journal was created and posted, that the configured suspense account was used, or that the payment item amount reconciles to the ledger.

The payment cash-truth gate has therefore been hardened to fail until the runtime and certification layers prove this ledger truth. No speculative financial posting recipe was added because the required debit/credit counterpart policy is not defined in an approved accounting contract.

## Controls verified

- Provider callbacks are signature-checked, timestamp-checked, payload-hashed, deduplicated, and captured immutably.
- Forged, stale, tampered, or replayed callbacks cannot initiate a posting.
- Statement files and lines retain immutable hashes and duplicate fingerprints.
- Provider accounts and imported evidence are tenant-scoped.
- Reconciliation supports deterministic exact matching, explainable suggestions, manual resolution, amount exceptions, and itemized suspense.
- Manual and suspense workflows enforce maker-checker separation and sensitive-action controls.
- Reconciliation evidence manifests bind the provider-event, statement, and payment-transaction legs.
- Certification blocks unresolved exceptions and suspense items, binds source evidence hashes, and invalidates stale close evidence.
- Server actions apply permission, module, tenant, and fresh-authentication boundaries.
- Operational reconciliation and certification surfaces are present.

## High-severity blocker

### Current behavior

`approveSuspensePosting` invokes `createLedgerPostingBatch` and then marks the suspense item `POSTED_TO_SUSPENSE`.

`createLedgerPostingBatch` creates a posting batch only. It does not, by itself:

- create a journal entry;
- create balanced debit and credit lines;
- create and verify the accounting source link;
- post the journal;
- prove use of the configured suspense account;
- prove that the journal amount and currency match the suspense item; or
- prove aggregate agreement between operational suspense and the general ledger.

The certification service currently treats the presence of `ledgerPostingBatchId` as sufficient evidence for an item labelled `POSTED_TO_SUSPENSE`. That foreign key is useful traceability, but it is not accounting proof.

### Why implementation stopped here

There is no approved repository contract defining the accounting treatment for `PAYMENT_SUSPENSE` or `SUSPENSE_RECLASSIFICATION`, including the permitted counterpart account by provider, payment rail, transaction direction, and settlement state. Inventing that treatment would risk silently changing financial behavior.

Under Skill 009, failure of a HIGH financial invariant requires a release stop rather than an assumed posting recipe.

## Required remediation contract

Implement one canonical ledger gateway operation, such as `postPaymentSuspenseToLedger`, backed by an approved accounting recipe. It must execute atomically and idempotently:

1. Lock and re-read the tenant-scoped suspense item.
2. Reject already-posted, stale, cross-tenant, unauthorized, or maker-equals-checker requests.
3. Resolve the configured suspense account and the permitted counterpart account from an explicit versioned policy.
4. Create the posting batch, journal entry, balanced journal lines, and source link in one transaction.
5. Validate amount, currency, direction, accounting period, source identity, and idempotency key.
6. Post the journal successfully.
7. Only after posted-ledger verification, set the suspense item to `POSTED_TO_SUSPENSE`.
8. Emit audit, outbox, close-invalidation, and notification evidence.
9. Roll back the entire operation if any step fails.

Add a certification assertion such as `assertPaymentSuspenseLedgerTruthInTx` that verifies:

- the batch belongs to the same tenant and expected payment source;
- the batch and journal have the required final posted status;
- exactly the expected journal and source link exist;
- debit and credit totals balance;
- the suspense-account line matches the suspense item’s amount, currency, and direction;
- the counterpart account is allowed by the effective provider/rail policy;
- no duplicate economic posting exists; and
- the operational suspense aggregate agrees with suspense-ledger movement for the reconciliation scope and day.

The assertion must fail closed during certification and close whenever any mismatch, missing journal, draft batch, duplicate link, or evidence drift is detected.

## Database migration blocker

The current migration history does not contain a confirmed foundational migration for the payment reconciliation tables represented in the Prisma schema, including provider accounts/events, statement files/lines, payment transactions, matches, suspense items, reconciliation runs, and exceptions.

The migration safety gate passes its present static checks, but that result does not prove that a clean production database can be built to the current payment schema. Before production release:

- reconcile the deployed database baseline with the Prisma schema;
- add or formally baseline the missing payment-reconciliation DDL;
- verify constraints, indexes, tenant keys, uniqueness, immutable evidence fields, and foreign keys;
- execute clean-database and upgrade-path migration tests against the production database engine.

## Gate changes

The payment cash-truth gate now includes:

`suspense_posting_reconciles_to_posted_ledger`

It requires both:

- a canonical `postPaymentSuspenseToLedger` runtime path; and
- an `assertPaymentSuspenseLedgerTruthInTx` certification assertion.

A regression test confirms that merely calling `createLedgerPostingBatch` does not satisfy the gate.

## Verification results

- Provider and payment service suites: **7 suites, 32 tests passed**
- Reconciliation, certification, and action suites: **6 suites, 59 tests passed**
- Workbench UI suite: **1 suite, 6 tests passed**
- Hardened payment cash-truth gate suite: **1 suite, 4 tests passed**
- Current unique focused suite total: **15 suites, 101 tests passed**
- TypeScript typecheck: **passed**
- Prisma schema validation: **passed**
- Ledger close-truth gate: **10/10 passed**
- Error-boundary gate: **passed; 0 active violations**
- Migration safety static gate: **8/8 passed**, with local execution skipped
- Payment cash-truth gate: **10/11 passed — intentionally blocked** by `suspense_posting_reconciles_to_posted_ledger`

## Files changed by this execution

- `scripts/payment-cash-truth-gate.js`
- `scripts/__tests__/payment-cash-truth-gate.test.js`
- `what-next/payment-cash-truth-readiness.md`
- `what-next/payment-cash-truth-readiness.json`
- `what-next/ledger-close-truth-readiness.md`
- `what-next/ledger-close-truth-readiness.json`
- `what-next/prisma-migration-deployment-readiness.md`
- `what-next/prisma-migration-deployment-readiness.json`
- `what-next/AQSTOQFLOW_SKILL_009_PAYMENT_RECONCILIATION_MOAT_EXECUTION_2026-07-26.md`

No payment posting runtime was modified because its missing accounting recipe requires an explicit, reviewed financial policy.

## Release decision and next step

Do not certify payment reconciliation for production until the posted-ledger suspense invariant and migration baseline are implemented and independently verified.

After those blockers are closed, rerun Skill 009 and require all payment cash-truth checks to pass. The next suite skill is `010-aqstoqflow-inventory-valuation-kernel`, but advancement must not be interpreted as production approval of the payment reconciliation boundary.
