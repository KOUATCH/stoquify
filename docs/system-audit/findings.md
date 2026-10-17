# Platform correctness findings

Audit date: 2026-09-30. Severity is conditional on the affected product promise. P1 means material correctness or launch blocker; P2 means bounded correctness, assurance or completeness work. These are findings from one coordinated review using the listed professional lenses, not independent expert certifications.

Implementation status and evidence strength are separate. Local data is development evidence, not production.

| ID | Priority | Classification | Finding |
|---|---|---|---|
| F01 | P1 | Implementation defect | Foreign-currency posting and financial statements disagree with base-currency semantics |
| F02 | P1 | Implementation defect | Generic reversal can reverse source-owned POS accounting without reversing the business transaction |
| F03 | P1 | Implementation defect | Concurrent offline enqueues can overwrite a sale, and corrupt storage is silently treated as empty |
| F04 | P1 | Implementation defect | A sale left SYNCING can disappear from pending replay after restart or a thrown transport error |
| F05 | P1 for offline release | Capability boundary / rollout gap | Offline replay is deliberately unavailable outside the test-authorized pilot |
| F06 | P1 for professional close | Implementation / workflow contract gap | Period close can succeed while close assurance still has a blocking finding |
| F07 | P1 | Implementation defect | Accounting base currency can change despite locked setup and existing ledger history |
| F08 | P2 | Implementation defect | Fiscal-year generation can create a period before the requested year starts |
| F09 | P2 | Reporting contract defect | General-ledger running balance omits activity before the selected start date |
| F10 | P2 | Database assurance / defense gap | Posted general-ledger evidence lacks the database protections present in newer evidence domains |
| F11 | P1 for statutory payroll release | External qualification and supported-scope limit | Country-pack publication does not establish complete production statutory payroll support |
| F12 | P2 | Product capability gap | Professional financial and decision-support promises exceed the connected BI sources |
| F13 | P2 | Verification maintenance / evidence gap | Readiness checks need reconciliation with current behavior |
| F14 | P2 | Operations documentation / deployed-evidence gap | Operational recovery and account-deletion instructions do not match current system evidence |

## F01 — Foreign-currency posting and financial statements disagree with base-currency semantics

- **Severity / classification:** P1; Implementation defect.
- **Implementation status:** Incorrect for non-unit FX.
- **Business outcome:** Professional accounts and financial BI can be balanced but materially misstated.
- **Concrete scenario:** A manual entry for 100 EUR with illustrative rate 655.957 stores baseDebit=100 instead of 65,595.70. In a separate report probe, 100 EUR and 100 XAF on the same account become 200.00 XAF, rather than 65,695.70 XAF.
- **Evidence:** [services/accounting/journals.service.ts:347](<E:/ohada saas/Focused projects/stoquify/services/accounting/journals.service.ts:347>); [services/accounting/financial-statements.service.ts:533](<E:/ohada saas/Focused projects/stoquify/services/accounting/financial-statements.service.ts:533>); [verification/accounting-behavior-probes.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/accounting-behavior-probes.json>) (FX_BASE_AMOUNT, REPORT_CURRENCY_MIX).
- **Confidence and limits:** High: actual current service functions with synthetic transaction doubles; the local sample contains 12 non-unit-rate lines with no conversion mismatch, so actual stored corruption was not established.
- **Domains:** Accounting, purchasing, sales, inventory valuation, payroll postings, BI.
- **Cause / uncertainty:** Manual journal lines copy nominal amounts into base fields; statement aggregation sums nominal debit/credit by account and then labels the result with the organization accounting currency.
- **Correction:** Define one immutable transaction/base currency contract, documented rate direction and rounding. Convert when recording the fact; aggregate authoritative base values for functional-currency statements. Reject unsupported or missing rates. Separately disclose transaction-currency ledgers.
- **Migration / backfill:** Inventory historic non-unit-rate and mixed-currency entries. Reconstruct only from approved original rate evidence; make controlled corrections and invalidate affected close/export evidence. Do not silently reinterpret old rows.
- **Owner:** Accounting kernel engineer + qualified accountant.
- **Dependencies:** Agreed base-currency policy; F07.
- **Acceptance:** 100 EUR plus 100 XAF produces 65,695.70 XAF under the illustrative rate; balanced journal, source amount, trial balance and statements tie out. Test reversals, rounding and missing-rate rejection.

## F02 — Generic reversal can reverse source-owned POS accounting without reversing the business transaction

- **Severity / classification:** P1; Implementation defect.
- **Implementation status:** Incomplete source-ownership enforcement.
- **Business outcome:** The ledger may no longer agree with stock, sales or tender evidence.
- **Concrete scenario:** Pass a POSTED POS_SALE journal to reverseJournalEntry. The current function marks it REVERSED and creates a MANUAL reversal without invoking the sale, payment or stock owner.
- **Evidence:** [services/accounting/posting.service.ts:420](<E:/ohada saas/Focused projects/stoquify/services/accounting/posting.service.ts:420>); [verification/accounting-behavior-probes.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/accounting-behavior-probes.json>) (SOURCE_OWNED_REVERSAL).
- **Confidence and limits:** High at service boundary; authorized actor was mocked. No unauthorized-access or live-money exploit was attempted.
- **Domains:** Accounting, POS, inventory, AP, payroll.
- **Cause / uncertainty:** Only CUSTOMER_SETTLEMENT and PAYMENT_SUSPENSE receive explicit source-owned rejection here; the generic path accepts other economic source types.
- **Correction:** Permit generic reversal only for explicitly eligible manually owned entries. Route business-source corrections to the owning command and preserve original/reversal/source links across every effect.
- **Migration / backfill:** Read-only scan for generic reversals of business sources; reconcile each source before correcting. Preserve old evidence and create explicit compensating records.
- **Owner:** Accounting and source-domain maintainers.
- **Dependencies:** Source-type ownership inventory; F01 for currency-safe corrections.
- **Acceptance:** POS/AP/payroll/inventory sources cannot use generic reversal; source correction reverses the appropriate stock, obligation, tender and journal effects exactly once.

## F03 — Concurrent offline enqueues can overwrite a sale, and corrupt storage is silently treated as empty

- **Severity / classification:** P1; Implementation defect.
- **Implementation status:** Local durability unsafe.
- **Business outcome:** A cashier can receive a successful enqueue result while a sale is absent from the durable queue.
- **Concrete scenario:** Two concurrent enqueues both load the same state before awaited hashing. Both return sequence 1; only the second sale remains. Separately, malformed stored JSON reloads as an empty sequence-1 queue.
- **Evidence:** [lib/pos/offline-local-queue.ts:1](<E:/ohada saas/Focused projects/stoquify/lib/pos/offline-local-queue.ts:1>); [verification/offline-behavior-probes.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/offline-behavior-probes.json>).
- **Confidence and limits:** High: actual queue module, WebCrypto, in-memory Storage; this proves the algorithmic lost update, not physical device or browser crash durability.
- **Domains:** Offline POS, stock, payments, fiscal evidence.
- **Cause / uncertainty:** Asynchronous read-modify-write over one localStorage snapshot has no serialization across calls/tabs; parse failures erase the usable state in memory.
- **Correction:** Use transactional durable queue storage with cross-tab coordination, monotonic sequence allocation and explicit corruption quarantine/recovery. Acknowledgement must mean durable persistence; recover without reusing identities.
- **Migration / backfill:** Version queue storage and migrate existing pending records without dropping IDs, hashes or sequence history. Preserve corrupted payloads for authorized recovery.
- **Owner:** Offline/edge engineer.
- **Dependencies:** Before enabling F05.
- **Acceptance:** Concurrent enqueues in one and multiple tabs survive reload with all sales and unique sequences; inject storage quota, parse and write failures; no success response for non-durable sale.

## F04 — A sale left SYNCING can disappear from pending replay after restart or a thrown transport error

- **Severity / classification:** P1; Implementation defect.
- **Implementation status:** Restart/retry recovery incomplete.
- **Business outcome:** An accepted offline sale remains unsynchronized without a working automatic recovery path.
- **Concrete scenario:** Persist a queue item as SYNCING, then reload. Pending count is zero and replay envelope is null. The hook marks SYNCING before awaiting the server call; thrown failures do not restore the persisted status.
- **Evidence:** [hooks/posHooks/useOfflineSync.ts:221](<E:/ohada saas/Focused projects/stoquify/hooks/posHooks/useOfflineSync.ts:221>); [lib/pos/offline-local-queue.ts:1](<E:/ohada saas/Focused projects/stoquify/lib/pos/offline-local-queue.ts:1>); [verification/offline-behavior-probes.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/offline-behavior-probes.json>).
- **Confidence and limits:** High: persisted-state probe plus hook inspection; no actual browser kill or network fault was injected.
- **Domains:** Offline POS, support operations.
- **Cause / uncertainty:** Only QUEUED/FAILED records are eligible; SYNCING has no expiring lease or restart reconciliation.
- **Correction:** Add attempt identity and recoverable lease; on startup reconcile stale in-flight attempts with the server by immutable event identity before retrying. Return explicit retry/conflict states for thrown transport failures.
- **Migration / backfill:** Recover existing SYNCING records without assigning new sale identities; reconcile already committed events first.
- **Owner:** Offline/edge engineer + POS owner.
- **Dependencies:** F03 durable queue; server idempotency contract.
- **Acceptance:** Terminate tab after send, before response, and after server commit; restart completes once without stranded entries or duplicate economic effects.

## F05 — Offline replay is deliberately unavailable outside the test-authorized pilot

- **Severity / classification:** P1 for offline release; Capability boundary / rollout gap.
- **Implementation status:** Development-only replay.
- **Business outcome:** The current repository cannot substantiate a production offline-sales promise.
- **Concrete scenario:** Replay authorization requires NODE_ENV=test and AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS=1. Normal production use fails this gate.
- **Evidence:** [services/pos/offline-sync.service.ts:1268](<E:/ohada saas/Focused projects/stoquify/services/pos/offline-sync.service.ts:1268>); [verification/offline-pos-fiscal-replay-gate.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/offline-pos-fiscal-replay-gate.json>).
- **Confidence and limits:** High static evidence. Passing the structural replay gate confirms scaffolding, not production authorization.
- **Domains:** Offline, product packaging, rollout, provider/fiscal integration.
- **Cause / uncertainty:** Production admission is intentionally disabled; that is an honest boundary, but the requested business capability remains incomplete.
- **Correction:** Keep the limitation explicit in product/support material. After F03/F04, complete disposable-database concurrency tests, real-device recovery, replay authorization and country/provider evidence before a controlled pilot.
- **Migration / backfill:** No production flag flip or migration during audit; future enablement needs compatibility and rollback plan.
- **Owner:** Product owner + offline lead + release assurance.
- **Dependencies:** F03, F04, F02, source/fiscal/provider qualification.
- **Acceptance:** A documented production-safe pilot configuration executes full offline sale→replay→stock/tender/journal/fiscal flow, with duplicate/reordered/denied-device cases and recovery evidence.

## F06 — Period close can succeed while close assurance still has a blocking finding

- **Severity / classification:** P1 for professional close; Implementation / workflow contract gap.
- **Implementation status:** Period locking and assurance readiness are separate.
- **Business outcome:** Users may lock an incomplete period and mistake CLOSED for evidence-complete close.
- **Concrete scenario:** The service probe supplies BLOCKED / INVENTORY_MISMATCH close assurance, while the narrower preflight passes. The period becomes CLOSED without reading assurance.
- **Evidence:** [services/accounting/periods.service.ts:349](<E:/ohada saas/Focused projects/stoquify/services/accounting/periods.service.ts:349>); [verification/accounting-behavior-probes.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/accounting-behavior-probes.json>) (CLOSE_WITHOUT_ASSURANCE_READ).
- **Confidence and limits:** High for the period-close service. Certified export has a separate stronger gate; this is not a demonstrated bypass of that export gate.
- **Domains:** Accounting close, inventory, payroll, purchasing, UX.
- **Cause / uncertainty:** Preflight covers drafts, unresolved batches, batch links, payment exceptions/suspense/sign-off and balance by currency; it does not consume the complete close-assurance readiness contract.
- **Correction:** Agree whether locking is a distinct operational action or professional close. For professional close, consume authoritative source completeness, inventory/AP/payroll tie-outs and current assurance version under the period lock. If lock-only remains, clearly label it and do not propagate a readiness claim.
- **Migration / backfill:** Re-evaluate previously CLOSED periods against current readiness; preserve historic state and append findings, with controlled reopen where needed.
- **Owner:** Accounting close owner + product/workflow lead.
- **Dependencies:** F01, F02; source completion contracts.
- **Acceptance:** Inventory/payroll/AP blocker or stale assurance prevents professional close; valid signed evidence permits it; concurrent posting versus close yields one consistent ordering.

## F07 — Accounting base currency can change despite locked setup and existing ledger history

- **Severity / classification:** P1; Implementation defect.
- **Implementation status:** Locked settings remain mutable.
- **Business outcome:** Historical amounts can be relabeled and accounting/organization currency can diverge.
- **Concrete scenario:** updateAccountingSettings accepts a new baseCurrency when setupStatus=LOCKED; it performs no history or setup-lock rejection. The protected action accepts a valid three-character currency.
- **Evidence:** [services/accounting/accounting-settings.service.ts:252](<E:/ohada saas/Focused projects/stoquify/services/accounting/accounting-settings.service.ts:252>); [actions/accounting/settings.actions.ts:36](<E:/ohada saas/Focused projects/stoquify/actions/accounting/settings.actions.ts:36>); [verification/accounting-behavior-probes.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/accounting-behavior-probes.json>) (LOCKED_SETTINGS_MUTATION).
- **Confidence and limits:** High for valid baseCurrency updates. The probe also sends arbitrary policy text directly to the service; that does not establish action-level reachability for invalid policy values.
- **Domains:** Accounting setup, organization settings, valuation, BI.
- **Cause / uncertainty:** The newer organization-profile path blocks direct currency changes, but accounting settings have a separate mutable authority.
- **Correction:** Freeze economic settings after activation/history or implement an explicit effective-dated migration with reviewed conversion, reporting and close invalidation. Use one authoritative currency transition policy.
- **Migration / backfill:** Compare organization/accounting currency and historical reports. Any correction requires audited migration; do not change historical denomination by configuration alone.
- **Owner:** Accounting/platform settings owners.
- **Dependencies:** Currency authority decision; F01.
- **Acceptance:** Valid currency updates fail after locked setup or ledger activity; authorized migration maintains old-period denomination and explicitly converts future periods.

## F08 — Fiscal-year generation can create a period before the requested year starts

- **Severity / classification:** P2; Implementation defect.
- **Implementation status:** Fiscal-boundary generation incorrect for partial first month.
- **Business outcome:** Posting/date controls admit days outside the intended fiscal year.
- **Concrete scenario:** A fiscal year starting 15 June produces a first period beginning 1 June.
- **Evidence:** [services/accounting/periods.service.ts:21](<E:/ohada saas/Focused projects/stoquify/services/accounting/periods.service.ts:21>); [verification/accounting-behavior-probes.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/accounting-behavior-probes.json>) (PARTIAL_FISCAL_YEAR).
- **Confidence and limits:** High synthetic service reproduction; the inspected local database has no out-of-bounds periods.
- **Domains:** Accounting calendar, close, reporting.
- **Cause / uncertainty:** Monthly generation normalizes to the first of the month without clipping to fiscal-year bounds.
- **Correction:** Clip initial/final periods to the requested year, or explicitly reject unsupported partial-month starts. Validate overlap and bounds in transaction/database controls.
- **Migration / backfill:** Scan existing fiscal periods; do not move dates containing posted entries without reviewed correction.
- **Owner:** Accounting engineer.
- **Dependencies:** Business calendar policy.
- **Acceptance:** Mid-month start/end, leap day and adjacent years have exact bounded coverage and no overlap.

## F09 — General-ledger running balance omits activity before the selected start date

- **Severity / classification:** P2; Reporting contract defect.
- **Implementation status:** Period movement exposed as running balance.
- **Business outcome:** An accountant can interpret period movement as the account balance.
- **Concrete scenario:** Opening balance 100 before the selected start plus movement 25 yields runningBalance=25; no opening query is made. A protected general-ledger action exposes this service.
- **Evidence:** [services/accounting/reports.service.ts:210](<E:/ohada saas/Focused projects/stoquify/services/accounting/reports.service.ts:210>); [actions/accounting/reports.actions.ts:92](<E:/ohada saas/Focused projects/stoquify/actions/accounting/reports.actions.ts:92>); [verification/accounting-behavior-probes.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/accounting-behavior-probes.json>) (GL_OPENING_BALANCE).
- **Confidence and limits:** High for returned data; no live user screen was verified. If a consumer intentionally wants period movement, the field must say so.
- **Domains:** Accounting reports, API/UX, BI.
- **Cause / uncertainty:** Accumulation starts at zero over the selected date range.
- **Correction:** Return opening balance, movements and closing balance with explicit denomination, or rename period-only movement fields. Preserve reversed originals and corrections.
- **Migration / backfill:** No fact migration; version report contract and invalidate/reissue misleading derived exports where required.
- **Owner:** Accounting reporting + workflow UX.
- **Dependencies:** F01 currency contract.
- **Acceptance:** Opening 100 + debit25 - credit10 closes115, with independently reconciled opening and movement totals.

## F10 — Posted general-ledger evidence lacks the database protections present in newer evidence domains

- **Severity / classification:** P2; Database assurance / defense gap.
- **Implementation status:** Application enforcement carries ledger invariants.
- **Business outcome:** A future direct writer, maintenance error or incomplete service guard has a wider blast radius.
- **Concrete scenario:** Catalog inspection finds no noninternal trigger on journal_entries or journal_entry_lines. Their key relationships use plain IDs rather than tenant-composite keys; journal lines can cascade with their entry.
- **Evidence:** [prisma/schema.prisma:7717](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7717>); [verification/database-metadata.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/database-metadata.json>); [verification/database-tieouts.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/database-tieouts.json>).
- **Confidence and limits:** High schema/catalog evidence; no mutation exploit was attempted, and sampled line/account/entry tenant consistency passed. No RLS does not by itself establish a vulnerability.
- **Domains:** Database, accounting, security, retention.
- **Cause / uncertainty:** Older ledger schema relies on services, unlike newer finalized payroll/fiscal evidence with DB immutability controls. Database roles/privileges and all dynamic writers were not proven.
- **Correction:** First inventory legitimate writers and privileges. Add scoped posted-evidence immutability, tenant-consistent relations and controlled reversal/correction operations; formalize retention/deletion boundaries without breaking allowed draft changes.
- **Migration / backfill:** Preflight orphans and tenant mismatches; stage NOT VALID/validation or equivalent safe migration; preserve archived evidence and test restore. Avoid blanket triggers incompatible with supported transitions.
- **Owner:** Database engineer + accounting controls.
- **Dependencies:** F02 owner rules; migration/recovery evidence.
- **Acceptance:** On disposable PostgreSQL, illegal posted edits/deletes and cross-tenant links fail, while valid draft editing/posting/source correction remain possible.

## F11 — Country-pack publication does not establish complete production statutory payroll support

- **Severity / classification:** P1 for statutory payroll release; External qualification and supported-scope limit.
- **Implementation status:** CM only; draft/expert-review capabilities.
- **Business outcome:** A customer could overestimate the supported legal/tax scope if packaging summarizes the pack as fully ready.
- **Concrete scenario:** CM-2026.1 is PUBLISHED, but CNPS is SUPPORTED_DRAFT/SOURCE_CHECKED and IRPP productionCalculationSupported is false. E-invoicing also requires expert review. Registry inspection found Cameroon, not an all-OHADA ruleset.
- **Evidence:** [services/regulatory/country-packs/cameroon.ts:16](<E:/ohada saas/Focused projects/stoquify/services/regulatory/country-packs/cameroon.ts:16>); [services/regulatory/country-packs/registry.ts:1](<E:/ohada saas/Focused projects/stoquify/services/regulatory/country-packs/registry.ts:1>); [DGI 2026 tax-code publication](https://www.impots.cm/en/node/1333).
- **Confidence and limits:** High for code-declared support; no legal-rate correctness or authority acceptance certification. A newer official tax-code publication exists than the cited 2025 code; this alone does not prove any rate wrong.
- **Domains:** Payroll, compliance, sales packaging, country adapters.
- **Cause / uncertainty:** Required qualified review and authority/provider evidence remain incomplete; some reference provenance needs refresh.
- **Correction:** Maintain capability-level country/version support. Refresh official references and have qualified reviewers validate formulas, effective dates, examples and artifacts. Preserve blocked states until independent approval and acceptance evidence exist.
- **Migration / backfill:** Version rules and snapshots; never overwrite historical payroll rule provenance. Recalculate differences only through approved correction runs.
- **Owner:** Country-pack maintainer + independent payroll/tax expert.
- **Dependencies:** Reviewed source dossier; provider/authority sandbox access.
- **Acceptance:** Reviewed golden cases for each declared family, prorations/regularization/rounding/corrections; authority artifact validation and signed qualification scoped to a specific version.

## F12 — Professional financial and decision-support promises exceed the connected BI sources

- **Severity / classification:** P2; Product capability gap.
- **Implementation status:** Financial analytics intentionally partial.
- **Business outcome:** Users cannot obtain a complete explainable financial cockpit or a verified cash-flow statement from the current financial-metrics contract.
- **Concrete scenario:** financial-metrics.v2 returns FINANCIAL_SOURCES_NOT_CONNECTED and null financial statements/ratios while exposing narrower payroll evidence. Dedicated fixed-asset and budget subledgers were not found in the model inventory.
- **Evidence:** [services/analytics/financial-analytics.service.ts:41](<E:/ohada saas/Focused projects/stoquify/services/analytics/financial-analytics.service.ts:41>); [services/bi/bi-evidence-adapter.service.ts:1](<E:/ohada saas/Focused projects/stoquify/services/bi/bi-evidence-adapter.service.ts:1>); [bi-capability-matrix.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/bi-capability-matrix.md>).
- **Confidence and limits:** High for explicit null/partial contract; medium for absence of whole product features based on systematic model/file inventory. Manual journals can represent entries without providing an asset-management workflow.
- **Domains:** BI, accounting, product strategy.
- **Cause / uncertainty:** Operational snapshots and trust contracts are more complete than connected professional financial measures.
- **Correction:** Complete ledger-correct financial reporting after F01/F06/F09. Prioritize margin/COGS, aging, cash/settlement exceptions and close progress before forecasts. Keep unsupported values unavailable and distinguish order activity from revenue/cash.
- **Migration / backfill:** Version metric definitions/snapshots; rebuild derived data from corrected sources with provenance, not default zero values.
- **Owner:** BI/data engineer + finance/product owner.
- **Dependencies:** F01, F06, F09, source coverage.
- **Acceptance:** Every shipped KPI has the contract in the BI matrix and a source-to-result tie-out; absent evidence produces an explicit limitation, not a fabricated figure.

## F13 — Readiness checks need reconciliation with current behavior

**Timing update:** The 23 failures below are from the initial sweep. Concurrent accountant/payroll edits were subsequently rechecked; [concurrent-changes-and-rechecks.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/concurrent-changes-and-rechecks.md>) records the later outcomes. Initial stale-mock observations are not automatically current defects.

- **Severity / classification:** P2; Verification maintenance / evidence gap.
- **Implementation status:** Test and structural-gate blockers remain.
- **Business outcome:** Teams cannot use current green/red summaries as an accurate release decision without triage.
- **Concrete scenario:** The four main unit/service groups produced 3,061 passed and 23 failed assertions across 310 suites using the audit adapter. Eight selected structural gates passed; payroll trust-spine and report-trust gates blocked. Some failures are stale mocks or string markers, while broader runtime proof is still absent.
- **Evidence:** [scripts/payroll-trust-spine-readiness-gate.js:253](<E:/ohada saas/Focused projects/stoquify/scripts/payroll-trust-spine-readiness-gate.js:253>); [scripts/report-trust-export-gate.js:4162](<E:/ohada saas/Focused projects/stoquify/scripts/report-trust-export-gate.js:4162>); [verification-summary.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification-summary.md>); [verification/test-failure-register.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/test-failure-register.json>).
- **Confidence and limits:** High observed outputs; failure classifications are bounded by source review and the audit-specific runner. This is not a claim that all failing checks are false positives.
- **Domains:** QA, release assurance, accounting, payroll, reporting.
- **Cause / uncertainty:** Mocks omit new close/entitlement lookups or assume a prior raw-SQL argument shape; country expectations assume a stronger support state; scanners match exact implementation/test text.
- **Correction:** Restore representative mocks and current contracts, replace brittle text checks with behavior/structured contract checks where practical, and triage remaining report gate clauses. Preserve original failing evidence; do not weaken controls or approve blocked statutory capability to make tests green.
- **Migration / backfill:** No business-data change required; verification baselines must retain provenance and rationale.
- **Owner:** QA lead + affected module maintainers.
- **Dependencies:** Confirm intended contracts; run exact repository CI in controlled environment.
- **Acceptance:** All failures have a documented cause and regression evidence; clean exact-config CI and database/browser matrices pass without changing business safety expectations.

## F14 — Operational recovery and account-deletion instructions do not match current system evidence

- **Severity / classification:** P2; Operations documentation / deployed-evidence gap.
- **Implementation status:** Runbook stale; current recovery objectives unverified.
- **Business outcome:** Support may run ineffective legacy instructions or lack a tested recovery path during an incident.
- **Concrete scenario:** RUNBOOK.md uses SQL against "User", "Account" and "Session" while current mapped tables are users/accounts/sessions, and still says no restore drill. A later 29 August local restore rehearsal exists for 80 migrations, while this audit sees 87.
- **Evidence:** [docs/operations/runbooks/RUNBOOK.md:70](<E:/ohada saas/Focused projects/stoquify/docs/operations/runbooks/RUNBOOK.md:70>); [what-next/migrations/staging-primary-restore-rehearsal-2026-08-29.md:1](<E:/ohada saas/Focused projects/stoquify/what-next/migrations/staging-primary-restore-rehearsal-2026-08-29.md:1>); [verification/schema-database-comparison.json](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification/schema-database-comparison.json>).
- **Confidence and limits:** High documentation mismatch. The older local restore is useful evidence, not current deployed PITR/RPO/RTO or functional restoration proof.
- **Domains:** SRE, security/privacy, support, database migrations.
- **Cause / uncertainty:** Operational instructions and recovery evidence have not been consolidated against the current schema/release.
- **Correction:** Replace obsolete commands with reviewed current lifecycle procedures; rehearse current-version backup restoration on an isolated target and test authentication, financial/source invariants and worker recovery. Record measured RPO/RTO, operator and date.
- **Migration / backfill:** Use restore-only environments; no shared reset or data deletion. Retention/legal-hold policy must precede destructive account/tenant cleanup.
- **Owner:** SRE + privacy/security + support.
- **Dependencies:** Current schema release; designated recovery target.
- **Acceptance:** A new operator follows the runbook successfully on a disposable clone; deployed backup retention/PITR and restore time are evidenced; no incorrect legacy SQL remains.

## Historical finding revalidation

| Historical concern | Current classification | Evidence / scope |
|---|---|---|
| Currency/base amounts | Confirmed | F01 reproduced on current functions; current local FX sample happens to be consistent. |
| Source-owned reversals | Changed, still incomplete | Customer settlement and payment suspense now explicitly protected; POS_SALE still reproduced, F02. |
| Close versus posting concurrency | Changed / static improvement | Period close takes FOR UPDATE; transactional getOpenPeriodForDate takes FOR SHARE. A concurrent PostgreSQL proof across all producers was not run. |
| Archived accounts disappearing | Resolved in inspected reporting paths | Retained accounts and account descriptors are included; focused retained-account tests are in finance results. |
| Reversed originals omitted | Resolved in inspected report filters | POSTED and REVERSED originals are retained with compensating entries. |
| Organization profile currency edits | Resolved in that path, separate defect remains | Current profile update blocks uncontrolled currency changes; accounting settings still allow them, F07. |
| Arbitrary analytics currency / truncated order totals | Changed / improved | Current order-activity service derives org currency/timezone, SQL aggregates and explicit order-activity semantics; no 1,000-row cap in that aggregation. Financial statements still have F01. |
| General-ledger opening balance | Confirmed contract issue | F09. |
| Partial fiscal-year boundary | Confirmed | F08; no matching local-data anomaly found. |
| Assurance versus close status | Confirmed, bounded | F06; certified export remains a distinct gate. |

Earlier reports were navigation aids. No historical READY or certification label was accepted as current deployed proof.
