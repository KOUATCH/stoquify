# Remaining local verification and B6 repair

This continuation verifies the remaining independently understood local scenarios. It does not close the entire program: MTN MoMo integration and the user-deferred operating/rollout decisions remain open. The shared [evidence register](../EVIDENCE_REGISTER.md) remains authoritative; older reports retain their original scope and dates.

## Source and environment

- HEAD: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`, with extensive pre-existing changes preserved. All 3,354 fingerprints matched revalidation 02 before editing. [Start manifest](start-source-manifest.json), [starting working tree](working-tree-start.txt).
- The final manifest detects seven additional changes made concurrently outside this work: the HRIS payroll-handoff action/test/client, `app/not-found.tsx`, and the cinematic landing hero/shell/test. They were not edited or reverted here. Evidence certifies the four owned application files and scoped scenarios, not those unrelated changes; see `unrelatedConcurrentChanges` in the summary.
- Only synthetic local PostgreSQL 17.5 database `stoquify_pos_audit_20261026_d30f` was mutated. Inspected runners enforce that database and localhost; connection credentials remain in ignored scratch files. The initial sandbox connection failure was environmental; the fixed-target runner subsequently connected with approved local execution.
- The actual Next application runs from the existing isolated, environment-free copy at `.codex-tmp/workflow-closure-app`, with the four changed application files synchronized from the tested tree. It uses `http://127.0.0.1:3168`, synthetic authentication and this disposable database. No deployment, schema change, live charge, commit or push occurred.
- Existing graph evidence was used for discovery: `graphify-out/graph_actions.json`, `receiveItems()` / community 2, dated 2026-08-09. Current owners were traced in source before behavioral claims; the graph is not current coverage evidence.

## Confirmed defects and correction

### F6 / B6 — authority could change between action admission and financial commit

**Priority: high.** Trigger: an authorized cashier passes the public action check, then their role, session or account is revoked before the service transaction. The initial real database regression produced five failures: revoked commit role/session/account, and revoked refund/void permission, still completed financial operations. [Before results](authority-before-results.json) and [before log](authority-before.log) preserve that reproduction.

Intended behavior: interactive financial transactions must use the current server-owned actor/session authority. Revocation either precedes admission and denies the operation, or waits for an already admitted transaction to finish. Denial must not create stock, payment or sale effects.

Correction is confined to three application files:

1. `actions/pos/tender.actions.ts:49,75,95` supplies authenticated session ID/token in a separate service argument, never from tender input. Commit checks session-to-protected-context binding; corrections use the existing protected fresh-auth claims.
2. `services/pos/tender-write-access.ts:22` locks organization, actor, tenant role membership and session, then rereads account usability, effective permission, session validity and correction assurance inside the transaction. It follows the purchasing authority lock order and existing RBAC/account policies.
3. `services/pos/pos.service.ts:2180,3375,3590` invokes that check before interactive commit/refund/void effects, including before commit-result replay.

The optional server-only authority argument preserves the existing trusted offline admission contract. Every public interactive tender action supplies it; this change does not claim that all internal service invocations now use interactive session authentication. Existing checkout identity, tenant/terminal/shift, module, stock-event and accounting controls remain in place.

Acceptance: the 11 authority/location/race PostgreSQL cases pass, including current-authority refund and void success. The action tests prove client-supplied authority cannot replace the server-owned claims. See [owned application patch](owned-application.patch).

### F7 / B6 — raw serialization conflicts escaped existing recovery handling

**Priority: medium.** Explicit PostgreSQL locks can surface serialization/deadlock failures as Prisma `P2010` with SQLSTATE `40001` or `40P01`. The existing POS retry recognized `P2034` only, returning generic `INTERNAL_ERROR` for these raw-query failures. The new deterministic waiting-transaction checks exposed this path.

`services/pos/pos.service.ts:659` now recognizes only those two serialization/deadlock SQLSTATEs as retryable. The existing limit of two whole-transaction attempts is unchanged. Exhaustion at line 2913 returns `DATABASE_CONFLICT` / HTTP 409 with guidance to retry the retained request, instead of a generic 500. There is no partial commit or new operation identity.

The final database authority log records actual SQLSTATE 40001 and successful transaction retry followed by current-authority denial. Three mocked tests cover exhausted P2034 / raw 40001 / raw 40P01 classification. A run overlapping other database suites exhausted both attempts and exposed the generic-error mapping; final suites were run serially after that correction. This is not a sustained-load certification. Intermediate logs overwritten during iteration are not represented as retained proof; the initial F6 reproduction and final results are retained.

### F8 / B7 — product stock details lacked accessible semantics and keyboard scrolling

**Priority: medium.** The actual French mobile POS scan reported two serious axe findings: `aria-progressbar-name` on the stock bar and `scrollable-region-focusable` on the SKU/barcode strip. [Original scan](pos-axe-before-fr.json) preserves both. Visible stock quantities already provide the bar's information, so the bar is now decorative (`aria-hidden`). The details strip now has a localized item/SKU/barcode region name, normal tab order, pointer scrolling and an inset focus ring using the existing theme token.

Only `components/pos/ProfessionalPOSSystem.tsx:1912,1965` changed for this batch. No financial handler, translation file or shared progress primitive changed. The approved POS contract and master were followed. Focused UI/UX Pro Max search (`ux-guidelines.csv`, Accessibility/Keyboard Navigation and Interaction/Focus States) supported keyboard reachability and visible focus. Compact-control advice was not used to turn the static detail strip into a button. No framework-version-specific guidance or new design system was adopted.

Acceptance: actual English/French desktop and mobile routes must have no detected WCAG A/AA axe violations in the exercised main region; the details strip must be reachable by Tab with a visible ring and scroll with ArrowRight, without introducing a sale or payment. See [rendered checks](pos-accessibility-results.json).

## Verification by evidence class

| Evidence class | Result | Evidence and limit |
|---|---|---|
| Workflow contract | PASS | `npm run agent:workflow:check`, exit 0, before application/database checks; existing unclassified-command inventory remains. Custom commands were inspected for side effects and target restrictions. |
| Source/static | PASS | Scoped TypeScript exit 0 with no diagnostics, [typecheck log](typecheck.log); owned diff inspected and `git diff --check` passed. This is not runtime/security certification. |
| Mocked unit/action tests | 69 PASS in 2 suites | [Results](unit-results.json), [log](unit.log): current session binding, forged input, correction claims, POS transaction behavior and exhausted conflicts. |
| Real PostgreSQL authority | 11 PASS | [Results](authority-results.json), [reconciliation and lock waits](authority-reconciliation.json), [log](authority.log). |
| Real PostgreSQL supplier corrections | 4 PASS | [Results](extended-results.json), [reconciliation](extended-reconciliation.json), [log](extended.log). |
| Real PostgreSQL existing full POS | 15 PASS; one opt-in browser case skipped | [Results](pos-results.json), [log](pos.log). Includes identity/replay, stale cart, balance, rollback and uncertain-result controls. |
| Real PostgreSQL connected chain | 8 PASS | [Results](chain-results.json), [durable reconciliation](chain-reconciliation.json), [log](chain.log). |
| Browser fixture preparation | 1 PASS; not a business scenario | [Results](browser-seed-results.json), [log](browser-seed.log). Creates a fresh synthetic authenticated cashier, received stock and retained cart. |
| Authenticated browser / accessibility | PASS for retained recovery; 4 final rendered views PASS | Actual Next route and real database; EN/FR × 1440/390px keyboard focus/scroll, no page overflow and zero detected main-region WCAG A/AA axe violations. No component mock substituted for authorization or persistence. |
| External provider | BLOCKED | No MTN MoMo sandbox configuration, endpoint or credentials available. No provider calls were attempted. |

The database total is **38 behavioral cases plus one fixture-preparation case**. Older purchasing/worker/upgrade/browser passes remain historical evidence; they were not counted again here. No schema changed, so the prior upgrade/restore rehearsal was not repeated without cause.

## Completed local scenario and invariant matrix

| ID / result | Starting state, actor and sequence | Expected rule / observed durable evidence |
|---|---|---|
| LOCAL-POS-AUTH / PASS (3) | Cashier with prepared checkout and received 3 units at 100; revoke role, delete session, or disable account after action admission, then commit. | Transaction-owned current authority rejects each with FORBIDDEN; stock remains 3/300, no commit or payment, sale unchanged. |
| LOCAL-POS-CORRECTION / PASS (2) | Complete a cash sale, remove refund or void authority, invoke correction. | No stock/value/payment/sale-state change after denial. |
| LOCAL-POS-ALLOWED / PASS (2) | Complete sale with current server-owned session and fresh assurance, refund/void with current authority. | Corrections remain usable and restore exact stock 3/300. Existing full-chain suite additionally ties out cash and accounting. |
| LOCAL-POS-WAIT / PASS (2) | Independent connection holds actor row; checkout waits; remove role or delete session, then release lock. | Observed real PostgreSQL wait, serialization retry, FORBIDDEN, zero additional effects. Mock locks are not used. |
| LOCAL-POS-LOCATION / PASS (1) | Prepared checkout; substitute another tenant's location, then reassign terminal to a different location in the same tenant. | Both fail; no financial or stock effects. Current source has no per-user location-assignment relation: no invented policy is certified. |
| LOCAL-RECEIVING-RACE / PASS (1) | Admitted receiver holds authority while blocked on supplier row; another connection revokes role; release supplier. | Recursive PostgreSQL blocking graph shows both waiters. Admitted receipt completes before revocation; subsequent receiving is denied without additional effects. |
| LOCAL-CREDIT / PASS | Receive 2/200; invoice and independently approve/pay 200; return 1; concurrent same-key supplier credit, changed-payload reuse, then concurrent same-key credit reversal. | Exactly one original credit and one reversal; `amountPaid` stays 200, cash stays -200. Outstanding/supplier balance goes 0 → -100 → 0. Credit transfers claim 100 to AP debit 100; reversal restores claim. Stock remains 1/100. |
| LOCAL-CORRECTION-RACE / PASS | Same settled return; two distinct new credit identities compete; attempt return reversal while credit active. | One credit succeeds, one fails. Active-credit guard denies return reversal with complete balance snapshot unchanged. |
| LOCAL-CLOSED / PASS, bounded | Settled credited return; actual close without required certification is denied; install explicit synthetic closed-state transition receipt, attempt same/current and next-period credit reversal, then controlled reopen and later-period correction. | Both closed-original reversal attempts deny without effects. Retained original credit replay still works. Existing reopen owner converges on replay, rejects changed reason; correction posts into next period. Return reversal restores stock 2/200, claim 0, AP 0, cash -200 and retained history. |
| LOCAL-CLOSED-NEW / PASS | Returned settled invoice in synthetic closed period; attempt new credit. | No payable, journal or stock change. |
| Prior POS and connected-chain regressions / PASS (23) | Fresh scoped fixtures on the repaired final source. | Duplicate identity and changed payload, approval/partial/full receipt, held stock, refund/void, stock contention, receipt rollback, uncertain outcome and accounting tie-outs continue to pass. Exact cases and snapshots in linked results. |

**Closed-period evidence boundary:** the synthetic retained period-control receipt is fixture setup, not a successfully certified close pack. No trigger was disabled. Initial attempts to seed a closed period without the proper transition receipt were rejected by the database; the corrected fixture is explicit in source and [initial diagnostic evidence](extended-initial-results.json) is retained. The existing journal guard requires reopening the original journal's period before reversal metadata changes, even when the new reversal is dated in a later open period. This was treated as existing intended behavior; no AP or period-control application code was changed.

## Procedures

Run from the repository root. Inspect definitions and the command registry first. The fixed-target runners read only the existing ignored synthetic fixture; they do not load application environment files or select a production database.

```powershell
npm run agent:workflow:check
node node_modules/jest/bin/jest.js --config jest.remaining-local.config.cjs --runInBand --no-cache --json --outputFile=what-next/pos-purchasing-inventory-audit-2026-10-26/remaining-local/unit-results.json
node node_modules/typescript/bin/tsc --project tsconfig.remaining-local.json --noEmit --incremental false
node what-next/pos-purchasing-inventory-audit-2026-10-26/remaining-local/run.cjs authority
node what-next/pos-purchasing-inventory-audit-2026-10-26/remaining-local/run.cjs extended
node what-next/pos-purchasing-inventory-audit-2026-10-26/remaining-local/run.cjs pos
node what-next/pos-purchasing-inventory-audit-2026-10-26/remaining-local/run.cjs chain
node what-next/pos-purchasing-inventory-audit-2026-10-26/remaining-local/run.cjs browser-seed
node what-next/pos-purchasing-inventory-audit-2026-10-26/remaining-local/start-app.cjs
node what-next/pos-purchasing-inventory-audit-2026-10-26/remaining-local/pos-browser.cjs
node what-next/pos-purchasing-inventory-audit-2026-10-26/remaining-local/pos-accessibility.cjs
```

Before starting the isolated app, copy the four application files listed above into the matching paths of `.codex-tmp/workflow-closure-app`. That copy reuses the existing dependency junction and synthetic configuration. Start-app runs until the owned process is stopped; the browser runs in a separate process. Never use the real workspace's production environment to reproduce this report.

## Authenticated browser evidence

The real `/en/dashboard/pos` cashier route denied submission after the harness revoked the stored permission when the outgoing checkout request was intercepted. The denial message came from the financial action's FORBIDDEN result; the database had zero commits. Restoring the synthetic role and reloading preserved the original request. The UI checked for the original result before retrying. The harness then allowed the real commit and discarded its success response. A subsequent status lookup recovered exactly one commit and one payment; stock was 0/0 after selling all three received units. [Functional result](pos-browser-results.json), [denied screen](pos-denied-en.png), [recovered English screen](pos-recovered-en.png).

That first successful functional run discovered the two accessibility findings; its `status: PASS` refers to the financial/recovery assertions and its explicit `axeViolationCount: 2` must not be read as an accessibility pass. B7 was then applied and the separate four-view EN/FR rendered verification rechecked keyboard focus/scroll, page overflow, axe and unchanged commit/payment counts on the final source. It does not constitute a screen-reader audit.

Earlier browser attempts failed because of harness timing and response-body collection: background access refresh could remove the checkout control, and the browser protocol could not retrieve one response body. One early harness restored permission before the financial response had completed. These are not used as product-defect proof. The final harness waits for the specific financial-denial UI state before restoring access. The old `pos-failure.*` files are diagnostic artifacts, not final results.

## Remaining gates and scope limits

1. **BLOCKED — MTN MoMo provider verification.** Needed: named sandbox account/product, configuration through the normal local secret mechanism, a safe callback/test endpoint and reproducible provider fixtures. Required scenarios: accepted-but-lost reply, unknown result lookup, duplicate/out-of-order callback, worker restart/retry and reconciliation. Local inbox and cash-ledger tests do not prove external settlement or MTN callback conformance.
2. **OPEN by user decision — retention/resumption/escalation policy and authoring rollout compatibility.** Retention duration, creator recovery rights and purchasing-administrator escalation remain undecided. Existing rollout flags were unchanged. Legacy default-cohort duplicate creation remains a known risk outside the enabled durable cohort; this continuation did not authorize enabling that cohort globally or rewriting compatibility policy.
3. **NOT CERTIFIED — mixed-version/mixed-flag deployment transitions.** Requires concrete release artifacts/topology and a rollout decision. Keep flags consistent and preserve retained-intent recovery during rollback. No deployment was attempted.
4. **EXCLUDED by user decision — negative-stock valuation certification.** Behavior remains unchanged.
5. **Evidence limits, not newly discovered defects:** a complete certified close-pack lifecycle, every authorization interleaving/alternate writer, screen-reader use and every tax/currency/production data shape were not certified. Tests cover the named supported positive-stock, zero-tax fixtures and transitions. The synthetic closed-state fixture cannot close a certified-close requirement. Earlier optional wizard-progress presentation review is not silently claimed fixed.

## Compatibility and rollback

No database schema, provider integration or rollout default changed. Existing internal/offline service calls preserve their existing admission contract. The owned patch is relative to this continuation's preserved baseline, so pre-existing user edits are not mistaken for new changes.

To roll back B6, reverse only the three owned financial application hunks together after reviewing current source. B7's component accessibility hunk can be reverted independently. Keep all retained business records, identities, receipts and the earlier B5 routing. No data deletion or migration rollback is needed. Reverting these patches reopens the demonstrated authority/recovery/accessibility defects; a rollback is not a claim that the old behavior is safe.

Final source hashes, working-tree status, browser results and [process-cleanup receipt](process-cleanup.json) are linked by [the continuation summary](summary.json). Scoped TypeScript was rerun after B7 and exited 0 without diagnostics. The isolated server and its child were stopped; no listener remains on port 3168. Overall program verification remains incomplete while the blocked/open gates above remain.
