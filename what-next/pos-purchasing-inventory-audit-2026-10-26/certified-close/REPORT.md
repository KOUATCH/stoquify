# Certified close-pack lifecycle — local verification

The complete service/database lifecycle **passed** using the existing owners on the explicitly disposable PostgreSQL database. One sequential integration test exercises seven retained stages: real readiness assessment, draft export, independent certification, sealing, reopening, correction, recertification and resealing. It also exercises denied certification, concurrent certification, audit-failure rollback and replay. No application defect was exposed and no application source or migration was changed in this continuation.

This supersedes the earlier evidence gap for a complete certified close-pack lifecycle **within this synthetic, zero-tax XAF, cash-payment, nonnegative-stock scope**. It does not certify provider settlement, statutory compliance, every race schedule, authenticated close screens or the entire program.

## Environment and source

- HEAD: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`, with the pre-existing dirty working tree preserved. HEAD alone does not identify the tested source.
- Target: `localhost/stoquify_pos_audit_20261026_d30f`, public schema, PostgreSQL 17.5, 120 completed migrations. Credentials are read only from the ignored local fixture and are absent from this report.
- [Start source](start-source.json), [final source](final-source.json), and their working-tree snapshots bind the result to the local source. The manifest covers the selected accounting, purchasing, inventory, reconciliation, control, authorization, schema, script and discovery-graph scope; it is not a hash of the entire repository. Additional harness hashes and the exact source comparison are in [summary.json](summary.json).
- Workflow/routing, current command definitions and classifications were inspected before verification. `npm run agent:workflow:check` was the first check and passed. The local target-bound runner was inspected before execution; it does not load application environment files. No application build, schema promotion, deployment, live provider call, commit or push occurred.
- The final two test edits add TypeScript non-null assertions to already successful run-ID queries; they have no emitted runtime effect. Database evidence precedes those type-only edits. The final scoped TypeScript result is recorded separately.

## Actual owners and prerequisites

```mermaid
flowchart LR
  A[Receipt and approved AP cash payment] --> B[Cash reconciliation review]
  B --> C[Approved balance schedules]
  C --> D[runCloseAssurance: READY]
  D --> E[exportClosePack: CERTIFIED]
  E --> F[closeAccountingPeriod]
  F --> G[reopenAccountingPeriod]
  G --> H[postPurchaseReturn]
  H --> I[New schedules and READY assessment]
  I --> J[New certified export and period seal]
```

Concrete source boundaries, relative to repository root:

| Boundary | Owning source |
|---|---|
| Accounting configuration readiness | `services/accounting/accounting-settings.service.ts:424` |
| Schedule proposal and independent approval | `services/accounting/balance-sheet-evidence.service.ts:33`, `:51` |
| Actual close assessment and accountant review | `services/accounting/close-assurance.service.ts:2494`, `:4652` |
| Export authorization, current proof, hashing and durable certification | `services/accounting/close-assurance-pack.service.ts:2101` |
| Seal and certificate-bound period receipt | `services/accounting/periods.service.ts:382` |
| Versioned reopen, replay and invalidation | `services/accounting/period-control.service.ts:66` |
| Invoiced return and stock/accounting correction | `services/purchasing/purchase-return-credit.service.ts:150` |

The fixture uses a real received order, approved supplier invoice and independently recorded cash payment. It completes synthetic account mappings/journals/posting configuration, marks setup ready through its owner, obtains an independently reviewed `CASH_REVIEWED` receipt, and proposes/approves balance schedules through their owners. No CLOSED period, READY assessment, certificate or period-control event is inserted as a shortcut. The fixture ends its synthetic period after the business steps so that assessment can run against a completed period.

The initial probe correctly identified incomplete accounting setup, unresolved cash review, missing schedules and the old test account's missing class-3 classification. [Initial prerequisites](initial-prerequisites.json) records these fixture gaps; they are not product defects. Two unused required posting purposes lack a shared template, so the fixture supplies balanced synthetic readiness configuration for them. Their business execution is not certified here. Schedules are derived from the synthetic ledger and approved by a distinct actor; this proves control execution, not the authenticity of external supporting documents.

## Scenario and invariant evidence

All rows below passed in **one** PostgreSQL test, not seven independent tests. [Retained stages](lifecycle-reconciliation.json), [Jest results](lifecycle-results.json), [execution log](lifecycle.log) and [read-only final reconciliation](database-readback.json) contain concrete IDs, amounts, receipts and hashes.

| Stage | Procedure and expected invariant | Observed result |
|---|---|---|
| BLOCKED_DRAFT | Assess before schedule approval; request draft and certified output | Actual assessment BLOCKED; watermarked noncertified draft succeeds; certified export denied. Independent canonical SHA-256 calculation matches the draft. |
| REAL_READY | Approve schedules and assess through the owner | Actual READY assessment, portal trust T4 and no blockers. No readiness status seeded. |
| CERTIFICATION_DENIALS | Remove supplied permission, age authentication, self-certify as preparer, use foreign tenant and obsolete assessment | All denied; stock, journals, returns, payments and payment transactions unchanged. These are service controls; production action-to-session binding is covered separately by mocked tests. |
| CERTIFY_ROLLBACK_AND_RACE | Record independent review; fault certification audit; then issue two concurrent certification calls | Audit fault leaves zero certified exports and run READY. Concurrent calls yield one success and one denial, exactly one durable certificate. Its canonical hash and watermark match; actor session tokens absent. No deterministic lock-wait barrier was instrumented for this race. |
| PERIOD_SEAL | Fault seal audit, retry, repeat old version, attempt return in sealed period | Failed seal leaves period OPEN and zero control events. Retry closes it with version 1 and exact certificate/hash approval. Repeated old-version close and sealed-period return denied without financial effects. |
| REOPEN_CORRECT_INVALIDATE | Reopen using retained identity, replay, change payload, then return one invoiced unit and replay return | Exact reopen replay returns the same event; changed reason denied. Old certificate hash retained and evidence marked stale. Original assessment cannot certify again. One return posts once, stock/value become 1/100 and no extra payment occurs. Assessment becomes BLOCKED pending refreshed schedules. |
| RECERTIFY_AND_RESEAL | Refresh and approve schedules; reassess, certify and seal | New assessment READY, distinct certificate hash, period CLOSED/version 3. History is exactly CLOSE/REOPEN/CLOSE; final seal binds the new certificate/hash, preserving the first hash. |

The permission, freshness, independence, current-revision, transaction, replay, evidence-invalidation and period-version invariants map to the respective rows above and their retained durable data. Certified pack contents are retained locally as [first certificate](certified-first.json) and [corrected certificate](certified-corrected.json). The application stores export metadata/hash; this test does not assert server-side re-download of the original bytes. A seal is historical approval evidence, not a promise that a prior assessment remains current after every subsequent period-state change.

### Final financial reconciliation

| Measure | Before correction | After correction/reseal |
|---|---:|---:|
| Stock quantity / value | 2 / 200.00 | 1 / 100.00 |
| Inventory GL, debit net | 200.00 | 100.00 |
| GRNI and AP net | 0.00 / 0.00 | 0.00 / 0.00 |
| Supplier return claim, debit net | 0.00 | 100.00 |
| Cash ledger movement, credit | 200.00 | 200.00 |
| Posted balanced journals | 3 | 4 |
| Return / supplier-payment / payment-transaction counts | 0 / 1 / 1 | 1 / 1 / 1 |

Cash is a synthetic ledger movement, not a bank/provider balance claim. Final readback confirms both certificates, one draft, period version 3, and zero residual lifecycle fault functions. Fault triggers were removed in `finally`; no production guard was disabled.

## Verification classes and exact procedures

| Evidence class | Result |
|---|---|
| Workflow contract | PASS; `npm run agent:workflow:check`. Tool receipt `a536b0`, exit 0. |
| Real PostgreSQL | PASS; one end-to-end test, seven retained stages, 140.227 seconds. `node what-next/pos-purchasing-inventory-audit-2026-10-26/certified-close/run.cjs`; session 57137, exit 0. |
| Final durable readback | PASS; read-only RepeatableRead transaction, no leftover test fault functions. `node what-next/pos-purchasing-inventory-audit-2026-10-26/certified-close/readback.cjs`; receipt `08185c`, exit 0. |
| Mocked/pure unit/action controls | PASS; 139 tests in 5 suites. `node node_modules/jest/bin/jest.js --config jest.certified-close.config.cjs --runInBand --no-cache --json --outputFile=what-next/pos-purchasing-inventory-audit-2026-10-26/certified-close/unit-results.json`; session 93761, exit 0. These do not prove database locks. |
| Scoped TypeScript and source review | Final results and source comparison in `summary.json`; command `node node_modules/typescript/bin/tsc --project tsconfig.certified-close.json --noEmit --incremental false`. Initial two nullable test-reference errors were corrected with type-only assertions. |
| Rendered/browser/accessibility | NOT RUN in this continuation. No UI changes. No claim about close-screen EN/FR, keyboard/focus, responsive behavior or real authenticated browser flows. |
| External provider | OUT OF SCOPE / unavailable: no MTN MoMo sandbox was configured or called. Cash evidence is not provider evidence. |

The readback and integration runner require the existing ignored credentials file and installed local dependencies. They refuse a non-localhost target, a different database name or production NODE_ENV. Running the integration test creates fresh synthetic records in this named disposable database; it is not a read-only command. The readback script enforces a read-only transaction.

## Remaining limits, ownership and rollback

No application repair batch was necessary. Owned additions are the two `certified-close` test/fixture TypeScript files, scoped Jest/TypeScript configurations, this evidence directory and the shared register update. Existing accounting-owner diffs were already present and are not attributed to this continuation. Test harness and reporting changes have no deployed runtime behavior or migration impact; rollback consists of excluding these additions, while preserving existing application edits and retained audit history.

The broad program remains incomplete. MTN account/product/sandbox configuration and a safe callback/test endpoint are required for provider settlement and uncertain-outcome certification. Retention, creator resumption, escalation, default durable-authoring rollout and legacy compatibility remain open by user instruction. The default legacy duplicate-create risk and mixed-version rollout certification are not resolved here. Negative-stock certification remains excluded; behavior is unchanged. Authenticated close UI journeys and external-document authenticity remain separate evidence gaps. No claim of deployment approval, statutory certification, absolute security or freedom from future refactoring is made.
