# POS cart integrity and cashier recovery

2026-09-13. Selected skill: `007-aqstoqflow-pos-ledger-controls`. Current branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`; unrelated changes preserved. This is a bounded implementation within the full platform review, not POS or release certification.

## Evidence and correction

The real PostgreSQL before verifier reproduced three defects in `services/pos/pos.service.ts`: updating quantity 1 to 25 silently persisted 10; a closed cashier shift still permitted removing a cart line; simultaneous additions each returned success but persisted quantity 2 instead of 3. Receipt `c0dd07`, `lanes/environment/pos-cart-v122-before-d5beea5a-acc3-46ac-9c49-c05bb1e6c9f1.json`.

Cart edits now use serializable transactions, consistent with checkout and shift close. Only PostgreSQL P2034 aborts are retried, at most twice; an unknown transport outcome is not automatically replayed. Update/removal check the current tenant, cart creator, draft status and active terminal-linked cashier session inside the transaction. Positive quantities exceeding available stock are rejected without altering or deleting the existing line. Explicit zero retains the existing removal behavior.

The cashier input no longer silently clamps the requested quantity. Rejected entries remain visible across a query refresh, with EN/FR inline recovery text and accessible error association. Successful correction uses the returned persisted quantity. Payment is unavailable while quantities remain unconfirmed or cart mutations are pending. Quantity mutation notifications use the component's localized recovery instead of a duplicate global English message.

Benefits: concurrent additions are retained; insufficient stock cannot quietly change the customer's order; an interrupted edit cannot alter a finalized cart line; the cashier can correct the same entered quantity without retyping after a recoverable rejection.

## Verification and limitations

All commands run from the repository using `C:/Users/J COMPUTER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`. Existing Jest configuration and migration-bearing build scripts were inspected. No build, migration, payment, posting, live provider operation, customer activation or X1 clearance was performed.

- `node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/pos/__tests__/pos.service.test.ts services/pos/__tests__/pos-shift-close.service.test.ts components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx actions/pos/__tests__/tender.actions.test.ts`: 70 passed, four suites, receipt `d43d08`.
- `node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/pos/__tests__/pos-cart-transaction.test.ts`: six passed, receipt `3e4822`. Checks retry bounds, no replay after unknown transport failure and active own-shift requirements. Total 76 distinct tests/five suites.
- The first regression run had 68 passes/one failure (`32babc`): its shift-close expectation omitted the APPLIED audit already written by the existing event service. The expectation was extended to assert that audit, without weakening production controls.
- `lanes/environment/verify-pos-cart-v122.cjs --after`: passed (`a3e5c6`), `pos-cart-v122-after-2c6e1737-7a42-488f-acf7-249115781b88.json`; both concurrent additions persisted and closed-shift/stock denial preserved records.
- `lanes/environment/verify-pos-cart-v122.cjs --boundaries`: passed (`368dd0`), `pos-cart-v122-before-905cab24-fdc9-47a4-8417-ced6d5da08e0.json`. Despite the filename, its internal phase is **boundaries**, after correction. Tenant, other cashier and reserved-stock denials preserve the line. A controlled synthetic finalization between read and deletion aborts the edit; this isolates concurrency and is not a full financial checkout.
- `lanes/environment/verify-pos-cart-browser-v122.cjs`: actual EN/FR local sign-in, real cart actions, rejected input retention, keyboard Tab submission, persisted correction, disabled payment and 1440/768/320 reflow passed (`48b959`). Six screenshots retained, final French mobile visually inspected; no page errors. Source stable. Final report `lanes/environment/pos-cart-browser-v122-83393f73-135d-44aa-b9e1-1e93a19d2532.json`.
- Initial browser `pos-cart-browser-v122-e89e0368-c2b3-4439-9776-afe04f6221bd.json` passed its assertions but visual inspection exposed duplicate English notification; corrected and rechecked. The initial fixture omitted pos.read, so it is not proof of a fully authorized shift display. Final fixture includes explicit pos.use and pos.read. No role was changed outside the synthetic organization.
- Development route readiness: initial EN81,792ms/FR23,836ms; final EN14,263ms/FR13,314ms. Different compilation and fixture conditions prohibit a speedup claim.

Database: `stoquify_local_registration_20260906_01`, with checked owned provenance. App: `http://127.0.0.1:3110`. No payment or journal was created. Native screen-reader, actual browser zoom, complete contrast, unknown-outcome client replay and complete sale-to-ledger runtime proof remain open.

## Design and operating guidance

Open `/en/dashboard/pos` or `/fr/dashboard/pos`. A cashier needs current `pos.use` and `pos.read`, an active own shift and linked terminal/drawer, and an available item at that location. The organization administrator supplies role assignments and terminal/location setup; the cashier supplies quantities; stock availability comes from inventory records.

Enter the intended quantity and leave the field or press Enter. If rejected, the stored order remains unchanged and your entry remains for correction. Check available stock and whether your own shift is still active; enter a valid quantity. Do not charge until the pending quantity message disappears. If a transport error occurs during an additive operation, inspect the actual cart before adding again: durable client request identity for additions is still open work.

Existing dashboard warning tokens, Input, POSButton, localized notifications and inherited shell are reused. No second design system. The UI checklist, current globals and existing POS warning treatment informed the changed field. Historical action graph community 78 identifies `pos_cart_actions_*`; current actions → hooks → POS component and service/schema were inspected to verify those relationships.

No schema or backfill required. Deploy only through the existing authorized staging/release process. Verify concurrent additions, active-shift denial, recovery and checkout regression on the intended cohort before production. Preserve historical lines; do not bypass current draft/shift checks as recovery. No release approval is claimed.

## Review matrix and remaining work

| Lens | Current result |
| --- | --- |
| Architecture/backend/distributed systems | Shared cart transaction boundary corrected; interrupted and concurrent edits checked. Transport uncertainty is not retried automatically. |
| Database/data integrity | Real PostgreSQL proof; existing quantity and finalized line preserved on denial. No schema change. |
| IAM/privacy/fraud | Tenant/creator/current shift checks verified; comprehensive action/module/read-only policy review remains open. |
| Frontend/UX/localization/accessibility | EN/FR draft retention, inline errors, pending payment prevention and three widths verified; native assistive technology remains open. |
| Product/operations | Explicit quantity intent replaces silent substitution; supplied inputs and recovery described above. |
| Finance/accounting/ledger | Cart changes precede posting; no posted financial effects claimed. Complete checkout/rollback/refund/void/Z-report ties remain unverified. |
| QA/release/SRE | Focused tests and real runtime evidence; variable development latency remains unresolved. |
| Audit/records/API/events | Existing shift-close audit expectation reconciled; cart action response and durable additive request identity need further review. |
| POS/offline/providers | POS cart reviewed; offline queue/device/ingestion/replay paths now explicitly inventoried and require their own review. |
| SaaS/module/commercial | Existing module admission retained; inconsistent observe/enforce boundaries remain explicit work. No price or activation decision. |
| Statutory/country packs | Not applicable to changed rules: no tax or fiscal recipe changed. Previous country-pack skill completion is not claimed. |
| Purchasing/AP, HRIS/payroll, analytics, AI/agents | Not applicable to this cart patch: those domain behaviors are unchanged and remain in the full review scope. |

High-priority next findings: POS hooks omit actor/tenant from some cache keys; failed shift/catalog reads can be unwrapped as absent data; terminal archive checks precede an unguarded update; complete new-work/read-only enforcement, cart-add durable idempotency and checkout handoff require verification. These are outstanding engineering work, not external approvals. Do not advance this POS slice to certification while they remain.

The skill's three dated technical-spec/ordered-chunk files were absent at the stated paths; its packaged chunk blueprint and available graph report were read. Next recommended numbered skill is `008-aqstoqflow-compliance-center`, after unresolved POS invariants are handled. This does not reduce the full platform objective.


Final typecheck: `node_modules/typescript/bin/tsc --noEmit --pretty false`, passed receipt c68dee. Final lint: `node_modules/eslint/bin/eslint.js` on service, component, hook, component test, close test and new transaction test, passed c954f2. Source checkpoint `evidence/source-baseline-v122.json`; six final screenshots are source-bound in the aggregate.
