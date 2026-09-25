# POS verification matrix

Run started 23 September and continued 24 September 2026. Starting revision and dirty source baseline are in [baseline](baseline.md). Recorded command logs establish each result; source inspection, mocked behavior, real database transactions, browser observations and production readiness are distinct evidence levels. No live financial action was used as a test.

## Completed focused checks

| Check | Result | Evidence / scope |
| --- | --- | --- |
| POS UI, hooks and retained request tests | PASS — 17 suites, 96 tests, exit 0 | [Frontend log](evidence/frontend-resumed.log), [exit](evidence/frontend-resumed-exit.json). Includes recovery/Charge/layout behavior, scoped reads and lifecycle races. |
| Latest lifecycle fence rerun | PASS — 4 tests, exit 0 | [Log](evidence/lifecycle-final.log), [exits](evidence/frontend-final-exits.json). These repeat cases in the frontend total. |
| Changed frontend/hook ESLint | PASS with warning — 0 errors, 1 `react-hooks/exhaustive-deps` warning about intentionally advancing a generation ref in cleanup | [Log](evidence/frontend-lint-final.log). Independent lifecycle review found no blocking fence defect. Do not call this warning-free lint. |
| POS route guard and route inventory tests after localized denial change | PASS — 2 suites, 3 tests, exit 0 | [Log](evidence/pos-route-final.log), [exit](evidence/pos-route-final-exit.json). Existing guard contracts preserved. |
| Core service regression | PASS — 6 suites, 109 tests, exit 0 | [Log](evidence/services-regression-final.log), [service verification](evidence/services-verification.json). Earlier 129-test run covered a different suite set and is not added. |
| Service/test ESLint | PASS — exit 0 | [Log](evidence/services-eslint-final.log). |
| Cash-payment history after location correction | PASS — 1 suite, 10 tests; scoped lint exit 0 | Six existing cases plus four new cases cover two locations, no match, unlinked/unfiltered history and sale-over-purchase precedence. [Final source hashes](evidence/cash-history-location-final.json) and preserved pre-fix source provide provenance. |
| Actions, receipts, terminals, public page/API and middleware | PASS — 23 suites, 177 tests | [Log](evidence/security-completion-tests.log). All 13 POS action suites plus selected service/public boundary suites. |
| Public receipt diagnostic redaction after broader run | PASS — 15 tests, including one added case | [Log](evidence/receipt-public-redaction-tests.log). Repeats earlier cases; do not add 15 to the 177 as distinct tests. |
| Security/action/receipt/page ESLint | PASS — exit 0 before and after final redaction | [Initial log](evidence/security-completion-lint.log), [final log](evidence/receipt-public-redaction-lint.log). |
| Payment static-gate regressions | PASS — 15 tests | [Green log](evidence/payment-gate-green-tests.log), [exits](evidence/payment-gate-correction-exits.json). Negative fixtures prevent weakening the financial mismatch rule. |
| EN/FR keys and interpolation | PASS — POS 407/407, drawer 154/154, cash history 126/126, terminal 87/87 | [Parity result](evidence/localization-parity.json). Does not establish linguistic quality or full accessibility. The route-copy correction was additionally inspected in the browser. |
| Project typecheck, first resumed pass | PASS — exit 0, no diagnostics | [Log](evidence/typecheck-resumed.log), [exit](evidence/typecheck-resumed-exit.json). Final receipt/route changes require final build type-validation or a fresh typecheck; final status below. |
| Project typecheck during concurrent hook correction | FAIL — exit 2, one TS2339 at `hooks/useCashPaymentHistoryWorkbench.ts:116` | [Failed log](evidence/typecheck-final.log), [exit](evidence/typecheck-final-exit.json). The current property guard was written after this run began; provenance below. |
| Project typecheck for the earlier source/config freeze | PASS — exit 0, no diagnostics; seven source/config hashes unchanged | [Log](evidence/typecheck-final-stable.log), [start hashes](evidence/typecheck-final-stable-start.json), [exit/end hashes](evidence/typecheck-final-stable-exit.json), [comparison](evidence/typecheck-final-stable-integrity.json). Ran 03:56:06–04:12:21 UTC; later browser-discovered edits are not covered by this historical pass. |
| Prisma validation | PASS — exit 0; validation itself made no schema change | [Log](evidence/prisma-validate.log), [exit](evidence/prisma-validate-exit.json). The separately authorized application migration is recorded below. |
| Scoped source integrity at the earlier freeze | PASS — coordinator recheck matched all 132 captured files, zero drift at that stage | [Source manifest](evidence/source-final.json), captured 03:59:31 UTC. This is source integrity evidence, not a successful build or coverage of later edits. The typecheck separately compares its seven source/config hashes. |
| Drawer null-closing-balance follow-up | PASS — scoped ESLint exit 0/no diagnostics; exact one-line display diff and browser correction observed | [Verification](evidence/drawer-closing-balance-verification.json): open null displays `Non disponible`, closed numeric balance retains its recorded amount. A numeric-zero fixture was not separately exercised; the strict null check preserves its branch. Full project typecheck was not rerun for this display-only correction. |
| Follow-up source integrity | PASS — comparison of the 132 captured files finds only the intended drawer component change | [Follow-up manifest](evidence/source-browser-followup.json). Drawer component SHA-256 `19c50b829579bd57d697e825df3b223e1f01423616178be470312c1e49e85ff4`; the earlier manifest remains historical. |

## Real PostgreSQL evidence

Only the explicitly identified disposable localhost database `stoquify_pos_audit_20260923_d1532fb1` is used for test writes. [Target](evidence/postgres-target.json), [review](evidence/services-review.md) and guarded runners establish provenance. The initial clone copied schema only, with no application rows.

| Suite | Result | What it establishes / does not establish |
| --- | --- | --- |
| Commit registry | PASS — 3 tests | Unique concurrent claim, cross-tenant source constraint and result lifecycle immutability. Not a complete sale. [Log](evidence/services-postgres-commit.log). |
| Shift close | PASS — 7 tests | Concurrent close/replay/conflict, active writer ordering and rollback on event/apply/outbox/audit failure. Adjacent collaborators simulated. [Log](evidence/services-postgres-close-final.log). |
| Checkout lifecycle | PASS — 5 tests | Competing owners, retained requests across close, rollback, scoped denial and late edits. Limited cloned tables do not include all production constraints. [Log](evidence/services-postgres-lifecycle-final.log). |
| Refund/void corrections | PASS — 4 tests | Opening drawer selection, concurrent single refund outflow and rollback after posting failure. Real POS/drawer/payment rows; stock/accounting/events simulated. [Log](evidence/services-postgres-corrections-final.log). |
| Full financial-kernel commit | PASS — 2 tests, exit 0 after approved disposable-only migration | Real checkout preparation, tracked stock, journals, receivables/customer balances, cash/on-account and business events. One concurrent result; a proven late failure rolls all real kernels back, preserves the request, then retries successfully. [Log](evidence/services-postgres-full-commit-final.log), [exit](evidence/services-postgres-exits-full-commit.json), [review](evidence/full-commit-readiness.md). |

The table records **21 distinct PostgreSQL cases**: 19 bounded cases and two real-kernel integration cases. Initial failed close assertions and test-development failures remain available; the final logs replace them as outcome evidence without erasing their history.

The full integration attempt first exposed a missing `ledger_posting_batches.postingCycle` column. A read-only 30-model audit confirmed the omission in the actual local application database as well as the clone. Automatic approval initially rejected applying the migration during verification; the user then explicitly approved only the named disposable target. A dedicated runner validated the exact SQL SHA-256 and target before applying that existing migration. [Disposable migration result](evidence/postgres-approved-posting-cycle.json) records exit 0. The reusable test runner remains migration-free. At that stage the application schema remained unchanged; the separate application authorization and completed result below supersede that earlier blocker. Zero-tax synthetic posting rules are test setup, not a statutory configuration recommendation.

The [application migration preflight](evidence/app-posting-cycle-preflight.json), recorded 04:04:29 UTC, used a guarded read-only transaction against metadata/catalogs only. At that time the exact `20260909093000_add_suspense_posting_cycles` migration had zero history records; `postingCycle`, its scope constraint and replacement unique index were absent, while the prior source/purpose unique index remained valid and ready. This confirmed an unapplied migration on the application target. The preflight performed no business-row reads or mutations.

### Superseding authorized application migration

**PASS — exit 0; POS-R-10 resolved on the local application target.** After the user's explicit application authorization, the exact original migration was applied to `localhost:5432/stoquify_replay_next_20260830`, schema `public`, from 04:42:03 to 04:42:12 UTC on 24 September. Its SHA-256 is `cd5d20a342504c2f1d27c8644c3d41a8f80019d56a0a459678166df6ff8f119f`. The SQL committed at 04:42:04 UTC, and the narrowly scoped Prisma `migrate resolve --applied 20260909093000_add_suspense_posting_cycles` command exited 0.

[Application result](evidence/application-migration-result.json) and [postflight](evidence/application-migration-after.json) verify the column/default, validated cycle check and valid new unique index; the old unique index is absent. The unrelated idempotency index, other columns/constraints and all 86 prior migration-history entries are preserved. History now has 87 entries including the matching completed migration. This schema/history change did not run a live sale, apply every pending migration or establish readiness for other environments.

## Repository and release gates

Exact invocations, exits, meanings and red/green proof are in [QA summary](evidence/verification-summary.md).

| Gate | Outcome |
| --- | --- |
| Offline replay | PASS, exit 0, 16/16 checks |
| Payment cash truth | PASS after source-marker correction, exit 0, 14/14 checks |
| Service boundary | PASS, exit 0, 0 active violations |
| Workflow assurance | PASS, exit 0, 38 checks / 11 indexes / 2 engines |
| Local public receipt configuration | PASS locally; production secret absent, production release not verified |
| Inventory boundary | FAIL, exit 1, 20 findings outside current POS runtime: 19 findings in historical fixture files and one in an existing lifecycle fixture script |
| POS contract/program governance | BLOCKED, exit 1, authentic approvals and external evidence missing; technical checks alone are not release approval |

## Production build and final source checks

**Build: TIMED OUT, exit 1.** `npm run build:app -- --skip-clean` used isolated output `.next-pos-enterprise-build-20260924` and no migration command. Next compiled successfully in 24.7 minutes, then entered lint/type validation. The 30-minute wrapper limit expired before type-validation completion and packaging. Next child and wrapper both returned 1. This is not a successful production build. [Complete log](evidence/build-isolated.log).

The cash-history correction landed after this build started. Strict inspection of the compiled page found payment queries but did not establish the new location predicate. [Compiled evidence](evidence/compiled-cash-history.json) therefore does not certify that artifact against the final source. The later standalone typecheck covers that cash-history correction, while the subsequent one-line drawer display correction has its own scoped lint/browser evidence. A fresh completed final-source build remains required before release.

The first final-source typecheck began at 03:36:44 UTC and reported TS2339 because the inferred action failure union did not guarantee a `code` property. Current source already guards that access with `"code" in response`; its last write was 03:43:59 UTC, during the check, and its SHA-256 is `F03A12CBCCF5CF28277C8B088645FC1033352B883E7AA7AAE6DB8763A61DB0B7`. Authorship of that concurrent correction was not established by the QA reviewer. The failed run remains evidence of the source it loaded. A new `npm run typecheck` ran 03:56:06–04:12:21 UTC after a source-stable handoff and **passed with exit 0 and no diagnostics**. The hook, history action/service, localized POS guards, tsconfig and next-env hashes were unchanged across that run. This pass predates the follow-up drawer display correction and does not convert the timed-out production build into a release artifact. The one-line follow-up was validated through scoped ESLint and observed browser behavior, without rerunning the full project typecheck.

**Unintended generated-output cleanup:** Windows npm's PowerShell shim did not forward `--skip-clean`. The wrapper saw existing `.next` output as stale/incomplete because `standalone/server.js` was absent and explicitly reported `.next cleaned: yes`; it removed that generated directory. Source files and the isolated development output were preserved. No attempt was made to pass off the isolated partial build as a replacement production artifact, and no further directory cleanup or automatic build retry was performed. Future controlled verification must set `BUILD_APP_SKIP_CLEAN=1` explicitly and verify output-directory behavior, rather than relying on forwarded flags. The wrapper also hard-codes `.next` for final output checks despite `NEXT_DIST_DIR`; that separate limitation remains.

**Configuration restoration:** after build and the failed typecheck ended, the build-owned include/reference were removed and original bytes restored only after verifying that Next's include sorting was the sole additional difference. [Build cleanup](evidence/build-config-cleanup.json) proves restored pre-build hashes. The coordinator then removed only the dev include; [dev cleanup](evidence/dev-config-cleanup.json) records final tsconfig SHA-256 `254b180507594bf66fe34990b43ff01937db12b09f9ea30316eba451cedda328`, which is the config pinned by the final check. No directory was removed during these configuration cleanups.

## Browser coverage

The discovered route set contains 13 patterns / 26 localized targets in [route inventory](evidence/route-inventory.json). The new bearer receipt route is language-driven by the receipt and has EN/FR rendering tests; it is not a new pair of locale-prefixed routes.

Initial attempts encountered stopped-server, cold-compile and browser automation timeouts. After starting the isolated development server, the in-app browser exposed an accountant session without `OPERATE_POS`. Both language variants correctly denied access; the French page initially displayed English custom copy, which was corrected and observed in a subsequent DOM snapshot. The user was shown the POS tab and offered to switch to an existing authorized account; no permission expansion or impersonation was performed.

| Route pair | Current browser observation |
| --- | --- |
| `/en/dashboard/pos`, `/fr/dashboard/pos` | Access-denied state observed; corrected French title and guidance observed. The final in-app English POS observation still shows `Point of sale access is required`; the existing POS tab is retained for handoff. Edge acquisition and a smaller DOM-read attempt failed before a usable authorized view. Authorized cashier verification is BLOCKED awaiting the user's login with an existing permitted cashier/manager account; the account-switch question remains unanswered. No cashier pass is claimed. |
| `/en/dashboard/settings/terminals`, `/fr/dashboard/settings/terminals` | English Edge navigation reached login after cold compilation; authenticated page not verified. |
| `/en/dashboard/finance/cash-drawer`, `/fr/dashboard/finance/cash-drawer` | English and French read-only dashboard render PASS in the accountant session. The later French render supersedes the earlier loading/timeouts: scope controls, drawers, movements, session reconciliation, journal and related links are visible. French location filtering narrows 13 drawers to one; a location without sessions shows a localized empty state. Keyboard Down/Down/Enter selects “7 derniers jours”; relevant links retain `/fr`. Session expansion exposes localized labels and updates `aria-expanded`. The corrected open-session null final balance shows `Non disponible`; a closed numeric amount is preserved. No financial mutation tested. |
| `/en/dashboard/finance/cash-payment-history`, `/fr/dashboard/finance/cash-payment-history` | Not yet browser-verified. |
| `/en/dashboard/sales`, `/fr/dashboard/sales` | Not yet browser-verified. |
| `/en/dashboard/finance/sales`, `/fr/dashboard/finance/sales` | Not yet browser-verified. |
| `/en/dashboard/finance/stock-to-cash`, `/fr/dashboard/finance/stock-to-cash` | Not yet browser-verified. |
| `/en/dashboard/finance/reconciliation`, `/fr/dashboard/finance/reconciliation` | Not yet browser-verified. |
| `/en/dashboard/finance/cash-flow`, `/fr/dashboard/finance/cash-flow` | Not yet browser-verified. |
| `/en/dashboard/accounting/journals`, `/fr/dashboard/accounting/journals` | Not yet browser-verified. |
| `/en/dashboard/accounting/close`, `/fr/dashboard/accounting/close` | Not yet browser-verified. |
| `/en/dashboard/manager-action-center/daily-close`, `/fr/dashboard/manager-action-center/daily-close` | Not yet browser-verified. |
| `/en/dashboard/analytics/reports`, `/fr/dashboard/analytics/reports` | Not yet browser-verified. |

The English denied state was measured at requested 1440×900, 1024×768 and 390×844 viewport settings. Actual `innerWidth` values were 1043, 742 and 282 CSS pixels respectively under the existing browser scaling; document widths were 1032, 731 and 271, with no horizontal overflow. A narrow denied-state screenshot was captured in the task. This does not prove responsive checkout, long-cart, split-tender, print, keyboard, zoom or screen-reader behavior. The viewport override was reset before handing the browser to the user.

In the subsequent French drawer checks, the measured viewport stayed **927×521** despite requested 1440/1024/390 overrides, and no horizontal overflow was measured at that one actual size. These override attempts do **not** establish mobile or tablet drawer coverage. Keyboard evidence is limited to the observed period selector and session expansion; it is not a full keyboard or assistive-technology audit. The coordinator's [browser follow-up](evidence/browser-completion-2026-09-24.md) records the expanded read-only scope and display correction. Several French strings still omit accents, so functional localization does not establish editorial polish. The viewport override was reset, and the original `Tous les lieux` / `Aujourd'hui` filter values were restored and observed.

At 04:03 UTC on 24 September, the coordinator observed `http://localhost:3000/digital-receipt/pos-audit-missing` in the existing in-app browser. Accessibility-tree text showed both English “Receipt unavailable” and French “Reçu indisponible” with safe guidance; the screenshot showed a readable, naturally expanding bilingual unavailable state. No receipt data or Charge controls were shown. **Invalid-link receipt smoke: PASS for this bounded state only.** It does not establish valid-token access, printing, successful receipt rendering, or broader receipt workflow coverage. See the coordinator's [browser verification](evidence/browser-verification.md).

## Release decision

Hold broader rollout until the explicit failed/blocked checks and operational prerequisites in [findings](findings-register.md) are resolved. “Enterprise grade,” absolute security, statutory compliance and full end-to-end readiness are not conclusions supported by these bounded checks.
