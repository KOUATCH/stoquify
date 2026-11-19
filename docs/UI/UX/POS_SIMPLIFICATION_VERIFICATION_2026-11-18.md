# POS selling-screen simplification — 18 November 2026

Selected skill: `007-aqstoqflow-pos-ledger-controls`. Scope: simplify the existing selling screen and verify supported checkout/operations controls without deployment or real transactions.

## Result

- Register setup defaults to collapsed for an active shift, retaining location, terminal and shift context in its summary. Setup remains expanded when a shift needs opening.
- Routine device/browser information lives inside setup. Verified empty local recovery information is hidden; pending, failed or unverifiable evidence remains visible. Remote close blockers retain their actual counts and an expandable recovery action.
- Removed the repeated toolbar controls, grand totals and ordinary zero payment previews. The sticky footer retains the total, tender and Charge action. Credit, uncovered amounts and change remain distinct when applicable.
- Blocker actions open/focus the appropriate setup, status, customer, tender, quantity, receipt or search surface. Uncertain-checkout recovery and checkout safeguards are preserved.
- Device labels distinguish keyboard barcode entry and session drawer records from verified hardware. EN/FR text explicitly states that live offline selling and receipt printing/delivery are unavailable in this pilot.

No sale, payment, refund, shift opening/closing, conflict correction, message delivery, hardware operation or deployment was submitted. Browser checks did not change cart/customer/tender data.

## Owned changes

Production presentation: `components/pos/ProfessionalPOSSystem.tsx`, `POSCheckoutShell.tsx`, `pos-workspace.css`, `offline/OfflineSyncStatusStrip.tsx`, `offline/LocalOfflineRecovery.tsx`, `messages/en.json`, `messages/fr.json`.

Regression evidence: `components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx`, new `POSOperationalDisclosures.test.tsx`, new `jest.pos-selling-workspace.config.cjs`, and three receipt-provider regressions in `services/pos/__tests__/receipt-public.test.ts`. Operations evidence is in [POS_OPERATIONS_VERIFICATION_2026-11-18.md](POS_OPERATIONS_VERIFICATION_2026-11-18.md).

Checkout mutation/recovery commands, `canCommitSale`, financial services, database schema and authorization policies were not changed.

Baseline HEAD: `80e4abb283216b9f8e04b94e5020393f7dcabf62`, with extensive pre-existing local changes. Git was read using an explicit work-tree path; no Git configuration or metadata was repaired. No commit was requested or created.

## Browser evidence

Route: `/en/dashboard/pos` and `/fr/dashboard/pos`; existing seeded SUPER ADMIN account, Bepanda Store / Seed POS Terminal 012, existing shift, empty cart. The unresolved seeded conflict was retained. These fixtures do not establish production failure rates.

Viewport values below are measured CSS pixels from `innerWidth/innerHeight`. The desktop tool's browser zoom required smaller screenshot-pixel dimensions; tablet emulation used exact CSS dimensions. Dimensions were checked rather than inferred from the tool request.

| CSS viewport | Locale/state | Observed result |
| --- | --- | --- |
| 1440 × 900 | EN, empty cart, collapsed setup/status | First products at about y=366; right checkout and Charge within viewport; no horizontal overflow. Earlier review was about y=646. |
| 1280 × 720 | EN, narrow desktop | First products at about y=366; Charge at y=618–666; no horizontal overflow. |
| 768 × 1024 | EN, portrait tablet | First products at about y=409, previously y=864; persistent cart summary; drawer Charge at y=967–1015; no horizontal overflow. |
| 1024 × 768 | EN/FR, landscape tablet | First products at about y=365; drawer footer at y=470–767 and Charge at y=711–759; no horizontal overflow. |

Also observed: empty-cart Charge disabled with explanation; Find an item/Chercher un article closes the drawer and focuses product search; expanded conflict summary explains the safe next step; French setup/device disclosure distinguishes records from hardware and warns against duplicate payment/data deletion. At catalog scroll end, search stays below the header, and the last card ends above the persistent summary (about y=656 versus summary top y=699 at 1024 × 768).

Final EN/FR page checks had no console errors after fresh navigation. A transient missing-message error during the locale edit was resolved by loading the completed messages; both JSON files parsed and the final rendered helper was checked.

Screenshots: [desktop](../../../artifacts/pos-simplification-2026-11-18/desktop.jpg), [tablet portrait](../../../artifacts/pos-simplification-2026-11-18/tablet-portrait.jpg), [tablet checkout](../../../artifacts/pos-simplification-2026-11-18/tablet-checkout.jpg). The checkout screenshot predates the final empty-cart copy refinement; final EN/FR copy was checked in the DOM and on desktop.

Browser automation used the available Chrome DevTools connector after computer-use calls aborted before dispatch. Only UI disclosure/focus/scroll and locale navigation were exercised. The temporary POS review tab was closed; no user tab was closed.

## Automated checks — executed

All 294 tests below passed in isolated mocked/pure configurations. Six targeted footer/focus tests were repeated after the last footer refinement; those are a subset, not six extra unique tests. These results are not database concurrency or hardware evidence.

| Scope | Result |
| --- | --- |
| POS service, commit recovery, lifecycle, cart transaction, offline sync | 5 suites / 149 tests passed |
| Sale/payment/reversal posting and accounting invariants | 4 suites / 18 tests passed |
| Receipt schema/public token/registry, protected tender actions, receipt hooks | 5 suites / 50 tests passed |
| POS screen, checkout shell, catalog cards, operational disclosures | 5 suites / 77 tests passed |
| Footer cash/credit/blocker/focus follow-up | 6 selected tests passed |
| Scoped ESLint on changed TSX presentation | Passed |
| Workflow command contract | Passed; 196 unclassified scripts were not executed by that check |
| Scoped `git diff --check` | Passed; existing CRLF-to-LF notices only |

Commands for financial evidence:

```powershell
node node_modules/jest/bin/jest.js --config jest.pos-purchasing-inventory-repairs.config.cjs --runInBand --no-cache --runTestsByPath services/pos/__tests__/pos.service.test.ts services/pos/__tests__/commit-recovery.service.test.ts services/pos/__tests__/checkout-lifecycle.service.test.ts services/pos/__tests__/pos-cart-transaction.test.ts services/pos/__tests__/offline-sync.service.test.ts
node node_modules/jest/bin/jest.js --config jest.pos-purchasing-inventory-repairs.config.cjs --runInBand --no-cache --testMatch '**/*.test.ts' --runTestsByPath services/accounting/postings/post-sale.test.ts services/accounting/postings/post-payment.test.ts services/accounting/postings/post-reversal.test.ts services/accounting/__tests__/invariants.test.ts
node node_modules/jest/bin/jest.js --config jest.pos-selling-workspace.config.cjs --runInBand --silent --json
npm run agent:workflow:check
```

Mocked/pure checks cover scoped ownership/permissions, revision and retained commit identity, exact replay versus changed payload, uncertain-result reads, posting failure rejection, balanced XAF posting math and source trace, refund/void compensation controls, receipt redaction/security and unconfigured delivery remaining PENDING. Live offline replay remains disabled outside its isolated test authorization.

## Real PostgreSQL — executed separately

The guarded `scripts/run-s04-s05.cjs` bootstrap/POS runner executed twice against newly created, uniquely named localhost databases: `stoquify_pos_audit_20261118_4b82a4227c34` and `stoquify_pos_audit_20261118_c3ab62bac61e`. All 123 checked-in migrations and checksum verification applied only to these disposable targets. The application database was not queried or changed.

**16 distinct PostgreSQL cases passed; 1 optional isolated browser/HTTP-adapter case failed before the browser could connect; 0 skipped. The full suite exit code remains 1.** The repeat run does not make the sixteen cases thirty-two distinct checks.

The passing cases cover concurrent duplicate completion with one financial/stock effect, foreign scope and retained request identity, cash/credit/stock/accounting tie-out to the trial balance, synthetic bank collection and independent reversal, receipt failure recovery without reposting, stale cart and insufficient stock, signed offline replay/conflicts/revocation/expiry/lost acknowledgement, serialization retry and injected final-result failure rolling back the real financial kernels while preserving recovery intent.

The first adapter launch was blocked by missing bundled Chromium. A bounded attempt with an already installed, signature-verified Microsoft Edge was also blocked when the browser exited before Playwright connected (Windows named-pipe/Crashpad launch failure). No browser was downloaded or installed, assertions were not changed, and the case was not skipped. The temporary test-only launch option was removed from final source. This isolated adapter failure is separate from the successful rendered localhost:3000 desktop/tablet checks.

Both owned databases were dropped after verifying zero active connections; absence was confirmed. No real sale, payment or provider operation occurred. The fixtures use synthetic zero-tax mappings and trusted service controls, so these tests do not prove deployed authentication, statutory acceptance or real settlement.

Full database evidence and exact runner commands: [workflow proof](<C:/Users/J COMPUTER/Documents/Codex/2026-11-16/http-localhost-3000-en-dashboard-pos/pos-workflow-proof-20261118/README.md>). Summary and cleanup evidence are also copied under `artifacts/pos-simplification-2026-11-18/`.

## Remaining operational proof

This task does not certify a complete deployable POS. There is no returns/refund UI calling the existing guarded correction actions; those service controls passed mocked tests. Receipt delivery defaults are unconfigured stubs and the POS offers NONE only. Physical scanner/printer/drawer operation was not tested. The isolated browser/HTTP-adapter case remains blocked by test-browser launch capability. No application build, application migration, production certification or deployment was run; schema preparation was confined to the two new disposable test databases.

Rollback: reverse only this task's presentation/copy/test hunks, preserving the pre-existing work tree. No data rollback is needed because no application business records were changed.

Next numbered skill: `008-aqstoqflow-compliance-center` only if separately pursuing compliance work; it was not invoked for this UI task.
