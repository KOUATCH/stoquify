# Daily Digest signal audit — 2026-09-27

Primary workflow: AN-DAILY-DIGEST. Base HEAD `62a56036a5ac9b37236a20c9b148052199069479`, branch `codex/migration-control-plane-release-2026-08-29`, plus working changes. Previous turn classified as progress: the Inventory Loss handoff and cache privacy contract gained runtime evidence. Current turn corrects an unsupported payroll risk inference and identifies a remaining currency defect.

## Current source boundary

The Digest passes five snapshot kinds to the shared signal builder: tenant operating, payment truth, inventory cash, close readiness and optional inventory loss. They produce six signal families below. Branch-payroll allocation, explicit external facts, drawer variance, provider duplication and refund/void facts are outside this particular Digest producer boundary; their existing platform workflows remain in scope of the overall goal.

Graph references: `graph_app.json` route node `locale_dashboard_dashboard_daily_digest_page_tsx`, community 37; `graph_actions.json` signal action node `signals_business_signals_actions_ts`, community 120. Current page, Digest composer, snapshot and shared signal sources were inspected to confirm the live relationships.

| Family | Source/meaning and label review | Evidence and remaining scope |
|---|---|---|
| Payment suspense | Open count/value produces review action; nullable combined currency total is preserved. EN/FR title and source route agree. | Existing mixed-currency proof retained; six-family composer check preserves 123.45 EUR rather than inventing a risk monetary impact. |
| Stockout | Zero/negative availability triggers review; inventory value alone does not establish obsolete stock. | Existing trigger regression retained; EN/FR composer retains exact stock value and currency. |
| Inventory loss | Recorded loss and incomplete proof drive review. Approval attribution does not establish causation. | XAF in the loss detail is retained even when another workspace KPI is EUR; current loss handoff receipt remains the destination proof. Full destination localization remains IN-013 work. |
| Purchasing delay | Positive overdue count uses recorded expected-delivery time; pending count alone does not prove lateness. | EN/FR composer preserves the pending KPI separately from overdue signal count, with POs/commandes units. |
| Close | Open findings, blocked close runs or unavailable evidence produce source review; genuine blockers remain. | EN/FR source label, 37% example KPI, evidence and destination contract checked. No close certification is inferred. |
| Payroll | Forecast proof blockers and active employee-balance cases justify review. Approved/paid/posting history alone does not establish exposure. | False history-only risk corrected and runtime verified. Employee-balance currency aggregation remains an engineering defect; this family audit is not closed. |

Across all six families, the composer regression verifies EN/FR titles, localized routes, source hashes, organization scope, preserved input values, observation semantics, and null assessed urgency/monetary impact. Existing custom-source wording remains untouched. This is a source-contract review, not a calibrated risk-model or accounting certification.

## Correction: historical payroll activity was presented as risk

`APPROVED_OR_PAID_PAYROLL_STATUSES` includes APPROVED, EMITTED, PAID, POSTED and ARCHIVED. The tenant snapshot counts these records by creation period. The shared signal builder formerly converted any positive count into a medium Payroll Exposure signal, including when active employee-balance count and forecast blockers were both zero.

The builder now requires an active employee-balance case for that recovery signal. The independent forecast-proof signal remains unchanged. Historical counts and records remain available in the snapshot; no approval, payment, posting or history is rewritten. Shared Manager hidden-action counts consequently stop counting the nonexistent risk. Explicit signal facts and branch-payroll rules are unchanged.

Baseline regression reproduced twice (run counts 1 and 20): expected no signal, received medium payroll exposure with no blockers (`55f4be`). First shared regression run passed 184 tests and failed one Manager expectation that counted this removed phantom action; its expectation was corrected from three hidden actions to two while retaining real access assertions. Eight shared suites then passed **185 tests** (`51ae0e`). The final six-family addition passes the **95-test Digest suite** (`97567d`). Changed-file ESLint passed. These counts overlap; they must not be added together.

## Actual application and persisted-source evidence

[Final receipt](lanes/environment/digest-payroll-history-5b7cc927-be91-4d6d-8dfc-95433737952d.json): passed, source hashes stable. Owned local database `stoquify_local_registration_20260906_01`, app port 3110, provider/network fences, ordinary local authentication. Synthetic historical rows explicitly carry unavailable/synthetic country-pack evidence; they do not represent authenticated approvals or verified payroll calculations.

Real snapshot counts all five historical statuses. EN desktop and FR 320px show no corresponding risk/action when there is no balance case or forecast blocker. Adding a synthetic upcoming period awaiting actual proof creates the expected missing-proof blocker and payroll-register action in both languages. Payroll runs/periods and payment, journal and business-event counts are unchanged during reads. Fixture creation is separate from the read-effect comparison.

Screenshots: [EN history](lanes/environment/digest-payroll-history-5b7cc927-be91-4d6d-8dfc-95433737952d-en-history-only.png), [FR history](lanes/environment/digest-payroll-history-5b7cc927-be91-4d6d-8dfc-95433737952d-fr-history-only.png), [EN missing proof](lanes/environment/digest-payroll-history-5b7cc927-be91-4d6d-8dfc-95433737952d-en-missing-forecast-proof.png), [FR missing proof](lanes/environment/digest-payroll-history-5b7cc927-be91-4d6d-8dfc-95433737952d-fr-missing-forecast-proof.png). French missing-proof screenshot visually inspected: warning, source limitations, read-only notice and review link remain visible.

Retained failed attempt: [140180ee receipt](lanes/environment/digest-payroll-history-140180ee-1b16-4456-89ed-bb8ca695c65f.json), initial route navigation exceeded 120 seconds. The owned server was confirmed live and reused; the subsequent run passed without increasing the timeout. Development timing is not production performance certification. The owned server tree was stopped only after final browser completion.

## Remaining defect and next action

The employee-balance model has a currency per case. `tenant-operating-snapshot.service.ts` currently aggregates outstanding amounts without grouping by currency and publishes an unlabeled amount in the recovery blocker. The shared signal also applies an absolute amount threshold to that aggregate; Cash Command consumes it. A count can be valid while its combined monetary total is not.

Next: reproduce multiple currencies in the owned database, define the nullable total/per-currency source contract, preserve missing/conversion limitations and genuine recovery controls, and verify consumers including Cash Command. Inspect the related forecast and settlement aggregates for the same boundary. This is engineering work, not missing external approval. Do not label the six-family semantics audit complete until this is resolved.

## Verification and operating limits

Focused commands used installed Node with `node_modules/jest/bin/jest.js --runInBand --runTestsByPath` for the signal rules, action queue, Digest service/presentation, Owner, Manager/Manager-location and Cash Command suites. ESLint covered the changed service and three changed test files. The full unchanged `tsc --noEmit --pretty false` **passed**, exit 0, no diagnostics, stable source/configuration hashes: [terminal receipt](evidence/payroll-signal-typecheck-8dd5d4c4-1963-413a-bcaf-c411f389851b.json). It completed without timeout or restart. `git diff --check` passes.

Unrelated inventory traceability/reseed files and a concurrently added `.next-systematic-reseed/types/**/*.ts` tsconfig include were preserved. The checker binds that current configuration; no reseed script, migration or deployment was executed here.

Users continue to `/en/dashboard/daily-digest` or `/fr/dashboard/daily-digest`. Historical payroll remains available through its existing authorized workspace. A quiet Digest is not evidence of payroll approval or absence of every risk; source limitations still apply. Existing active balance cases and missing forecast proof still require the authorized payroll review process.

Review accountability: backend/data/analytics review owns source triggers and units; security preserves role/module filtering and redaction; payroll/finance/audit review distinguishes historical activity from an outstanding obligation; UX/localization verifies visible wording; quality/SRE records real reads, unchanged effects and failed attempts. New statutory calculations, country-pack approvals, payment-provider behavior, billing, POS writes and AI execution are not applicable to this read-signal correction. Broader platform requirements remain open.
