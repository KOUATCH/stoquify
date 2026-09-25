# Bounded lifecycle verification

Date: 2026-09-05. All database writes in this verification use explicitly owned loopback targets. No customer database, production deployment, X1 approval or manufactured authentication session is involved.

## Results

- PostgreSQL composition/lifecycle smoke: **18 passed, 0 failed**, `../modern-modules-postgres-smoke-b3c4a2958253.json`. All recorded source bindings remained unchanged during execution.
- Reconciliation obligation helper: **6 passed**, including actual PostgreSQL temporary-table tests, `reconciliation-obligations-tests.json`.
- Domain admission and unchanged offline-sync suites: **75 passed**, `domain-admission-tests.json`.
- Full type checking passed (parent's final source check). Focused lint of all seven owned lifecycle/browser verification files passed again after the final transfer-test addition.
- Expanded browser lifecycle batch: **10 passed, 2 intentional project skips, 0 failed**, `../browser-results-lifecycle-full.json` (491.4 seconds). It covers six customer journeys across EN/FR desktop/mobile, denied users, legacy preservation, French 834px/320px reflow, actual dialog accessibility checks, keyboard focus and durable preparation/history.
- Corrected mobile screenshot subset: **3 passed, 0 skipped, 0 failed**, `../browser-results-mobile-capture-final.json` (234.5 seconds). These are repeated customer journeys to repair capture timing, not three additional distinct functional cases. Screenshots now wait for the rendered localized Applied/Appliquée state as well as committed ACTIVE state.
- Additional French transfer-denial case: **1 passed, 0 skipped, 0 failed**, `../browser-results-stopped-work-fr.json` (68.1 seconds total; started 14:09:36 UTC). A real reviewed Inventory stop produces the French stopped-work explanation through the normal transfer action; the persisted transfer count remains unchanged and the failed form draft remains available. The final native image was visually inspected by the verification and parent agents. This additional case does not rerun the lifecycle batch.
- Initial browser lifecycle batch: **8 passed, 2 intentional project skips**. Its screenshot process did not reliably wait for mobile viewport rendering, so images are historical evidence only in `../screenshots-before-scroll-capture-fix/`. The results are retained in `../browser-results-before-scroll-capture-fix.json`. The expanded recapture pass is recorded separately; these historical images are not visual acceptance proof.

## Database behaviors verified

Actual service execution against PostgreSQL covers duplicate and competing requests, persisted REQUESTED/PREPARING events, preservation of the previous active revision, accounting-ready/provider-waiting progression, resuming the same operation to ACTIVE, no repeated unchanged successful step, idempotent resume, superseded request rejection, tenant-scoped history, immutable command and lifecycle evidence, grant constraints, and preservation of all nineteen legacy capabilities.

Explicit inventory, purchasing and payroll stops reach RETAINED on empty synthetic obligations. New-work admission denies their operations while all grant eligibility remains preserved. A separately reviewed inventory reactivation restores its admission. Existing obligations, real domain approval workflows, and customer records are not fabricated by these tests.

The real database exposed a production defect in timestamp-map hashing: JSONB object key ordering made a valid multiple-stop request falsely stale. The backend fixed canonical hashing and the real PostgreSQL regression now passes. Earlier failed runs remain retained; they must not be substituted for the final passing run.

The later browser-only `inventory-denial` fixture stage is the sole difference from the final PostgreSQL smoke's recorded input hashes. All recorded production-service source hashes remain unchanged. This additional branch is restricted to the exact French retailer browser fixture and requires an already reviewed, persisted Inventory stop. It adds two synthetic locations, one zero-priced item, ten test units only on initial creation, and explicit transfer/location read/create permissions to that fixture's existing role. It does not modify sessions, assurance, grants, stop policy, real customer data or approval evidence. This helper-only addition does not retroactively bind the earlier PostgreSQL run to the new branch.

The extra browser case exposed an existing permission-registry mismatch: the route required `TRANSFERS_READ`, but the server did not recognize that key. The parent added the exact `inventory.transfers.read` ↔ `TRANSFERS_READ` mapping with negative permission tests. There is no broad inventory-read, create, approve or wildcard bypass. The later French boundary receipt covers that mapping; earlier lifecycle receipts do not claim to test this subsequently corrected transfer route.

## Synthetic setup boundaries

`scripts/modern-modules-lifecycle-fixture.ts` checks the exact database name, loopback host, bound DATABASE_URL/DIRECT_URL, organization ID prefix and onboarding source inside its transaction. It creates real domain rows for the test fixture: mapped accounts, default journals, current open period, non-payroll canonical posting templates, an isolated provider/settlement mapping and a cashless terminal. The actual readiness collector must accept accounting rows before fixture settings are marked READY.

Four required readiness purposes have no corresponding template in the existing canonical default array: CASH_DRAWER_CLOSE, GOODS_RECEIPT, EXPENSE_APPROVAL and INVENTORY_ADJUSTMENT. The fixture supplies explicitly synthetic balanced scaffolds for these four purposes. This verifies lifecycle mechanics; it does not validate financial posting policy, approve live provider setup, or certify SYSCOHADA compliance. Synthetic provider approval-state rows are marked as test data and contain no real approver or signature assertion.

Browser users sign in through the actual authentication endpoint and supply the real fixture password for the application's fresh-identity challenge. The setup helper never writes sessions or assurance timestamps.

## Targets and commands

- Browser: `stoquify_local_modern_modules_20260905_01`, `http://127.0.0.1:3107`, `.next-modern-modules-integration`.
- Controls: `stoquify_local_modern_modules_controls_20260905_01`.
- Both helpers require all four composition/lifecycle migrations before starting verification.
- Run `node scripts/run-modern-modules-postgres-smoke.js run` for the controls smoke. Every run creates and retains uniquely owned synthetic organizations.
- Start the isolated browser app using `node scripts/modern-modules-local-verification.js start`; run `node scripts/modern-modules-local-verification.js test` to authenticate and verify it.
- The fixture command is callable only under `MODERN_MODULES_LOCAL_VERIFICATION=1`, only for the five declared browser fixtures, and only for `waiting`, `accounting`, `provider`, `pos` or the more narrowly scoped `inventory-denial` stage. It never resets application data.

## Visual evidence and observed loading

Current images in `../screenshots/` show actual application content. Preparation and retained-record screenshots scroll their real target region into view and settle browser rendering before capture. The earlier almost-white mobile images remain in `../screenshots-before-scroll-capture-fix/`. Earlier active images that caught an in-flight resume response remain in `../screenshots-before-ui-active-settle/`; they are not final active-state visual proof. No image was edited or synthesized.

The initial successful French action check had inadequate notice screenshots. A subsequent immediate capture established a real interface defect: the notification occupied the viewport but sat behind the transfer dialog at the same stacking level. Both images and passing functional receipts remain under `../screenshots-before-denial-capture-timing/`, `../browser-results-stopped-work-fr-before-capture-timing.json`, and `../browser-results-stopped-work-fr-notice-occluded.json`. These results prove denial and no write, but do not prove a readable notice. The narrow correction adds the real stopped-work error inside the dialog. The final check targets that inline alert, verifies it is not covered using browser hit testing, and captures it before the subsequent database no-write assertion.

The six current builder measurements are 8185ms (EN desktop retailer), 6163ms (EN desktop service), 6793ms (FR desktop service), 9504ms (FR mobile retailer), 6987ms (FR mobile service), and 5481ms (EN mobile retailer): range 5.481–9.504 seconds, median 6.890 seconds. These are observed development-route loads on the isolated server, with no approved performance-budget comparison or production certification. Inherited navigation and transfer-form labels still contain English on French routes; the integrated composer and new stopped-work denial are the localization scope.

## Remaining restrictions

POS, sales, reconciliation and accounting operational stopping remain unavailable. The rejected offline continuation proposal is unapplied. Reconciliation must support authentic late evidence for pre-existing payments before its stop can be enabled. See `RECONCILIATION_CONTINUATION_LIMIT.md` and `OFFLINE_CONTINUATION_APPROVAL.md` for the concrete remaining requirements.

The unrelated unchanged POS shift-close exact-payload expectation failed in the initial combined run and remains untouched. Passing focused suites do not imply that expectation or broad repository release gates passed.

The transfer route also logged a shared-auth server-rendering error, including after a clean isolated-server restart: `TypeError: Cannot read properties of null (reading 'useRef')` at `lib/auth-client.ts:18` (`authClient.useSession`), `hooks/useClientAuth.ts:8`, and `components/inventory/transfers/TransferDashboard.tsx:133`. The successful browser case recovered through client rendering and exercised the real action. These shared sources were not changed for this task. Preserve this observed dependency limitation; a passing action does not establish error-free server rendering. Initial route timeout, unknown-permission denial and development-render failure receipts are retained separately.

## Source bindings for the focused domain/helper results

`FINAL_VERIFICATION_BINDINGS.json`, observed at 2026-09-05 14:11:40 UTC, records current application/driver hashes, all three separate browser receipts, current screenshot hashes/timestamps, and the six development loading observations. It compares the final French dialog, hook, permission registry and test source before/after that case. It explicitly distinguishes this later boundary verification from the earlier PostgreSQL and lifecycle browser runs. The parent's final full typecheck passed during 14:08:57–14:10:32 UTC; the final browser driver lint also passed. The isolated verification application remains available on port 3107; no production deployment was performed.

| Source | SHA-256 |
| --- | --- |
| services/modules/module-reconciliation-obligations.service.ts | 38ce6fe4b3f74ab85199227eb7235177e0733a17e1ce1faf672ca8b40f82d0d6 |
| services/pos/pos.service.ts | 3cfb6db6e51a1d30b33bd74bf61cb2ef06a508eeea827ba7c9a88037409aea22 |
| services/order-to-cash/delivery-order.service.ts | f7529c1f9c3acd0080c3a8190a57bbfebf477622861e4415f7a9a45f8e71a4ec |
| services/reconciliation/payment-reconciliation-run.service.ts | 0d8c80ef828dd406ade1632f4d250bda1a8906d7118340465c0d22cd42e64a15 |
