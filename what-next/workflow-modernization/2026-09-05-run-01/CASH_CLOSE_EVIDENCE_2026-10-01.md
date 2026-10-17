# Cash Command close evidence

Primary workflow: **FA-CASH-COMMAND**. This is a delivered correction to its close-source contract, not closure of Cash Command or the platform assignment. Prior turn classification: **progress** (source-treatment and denial corrections with persisted and browser evidence). Branch `codex/migration-control-plane-release-2026-08-29`; HEAD `62a56036a5ac9b37236a20c9b148052199069479`; shared dirty checkout preserved. No schema change, migration, deployment or live certification.

## Finding and delivered behavior

The close-readiness snapshot previously granted `certified` from a count of rows whose status was `CERTIFIED`. It did not establish current retained exports, invalidation, or complete control evidence. Cash copied that grade and could show a green zero issue count. The proof reader was stricter, but its full export count also included individually invalidated artifacts even though their displayed nodes were blocked.

The snapshot now reads selected runs and their evidence in one **RepeatableRead** transaction. It applies the existing per-run evidence grading policy, excludes stale certified exports, checks complete findings/checklists/unavailable evidence, and binds the supporting identities to its opaque source hash. Private IDs and metadata remain outside the snapshot DTO. Certified/blocked counts reflect evidence decisions. A certified run cannot promote another unfinished run or an accounting period without a close review. Existing organization-wide unresolved evidence and critical-finding obligations remain effective, including those outside the selected run set.

The proof reader checks every retained certified export, including records outside its display limit. Invalidated artifacts remain visible as history. `EXPORTED` without current certified evidence remains operational under the existing policy; `CERTIFIED` without that evidence is blocked. The policy has not been replaced with a new professional approval rule.

Cash shows **Review required / Examen requis** when evidence conditions need review. A zero count from raw or operational evidence uses information styling. Success requires certified evidence without stale freshness or reported conditions. Each authorized trust signal now has a native keyboard-operated disclosure containing its source conditions and next actions. New close explanations are localized in EN/FR; custom evidence text is preserved.

## Bounded acceptance

1. Missing and individually stale certified exports cannot establish current certification; retained history survives.
2. High/critical unresolved findings, failed/unavailable controls and missing evidence remain blocking.
3. Tenant, period and voided-run boundaries remain effective; organization-wide obligations remain explicitly distinct from selected-run proof.
4. A concurrent committed invalidation cannot mix status and evidence inside one close snapshot; the next read observes the invalidation.
5. Read failures propagate and a later successful retry recovers; no failed query becomes a zero-row success.
6. Cash reflects the source grade and explains review in EN/FR with keyboard disclosure and mobile reflow.
7. Focused regression, changed-file lint, TypeScript and source stability are recorded against current files.

The focused frozen test run passed **250 tests across 11 suites**. Changed-file lint passed with one existing `request.current` cleanup warning in CashCommandDashboard; it was left unchanged. The owned database run passed **seven cases**, including separate PostgreSQL reader/writer backends, stable sources and unchanged financial/outside-fixture records. The paused read returned the complete pre-invalidation revision; the next snapshot, Cash projection and proof request all reported blocked evidence. This establishes point-in-time snapshot consistency, not instantaneous invalidation of a response already being read.

Receipts:

- `evidence/cash-close-jest-ff05e9d1-d3a4-4176-94a1-32c42a17bac3.json` (exact commands, counts and hashes).
- `evidence/cash-close-lint-18b4a159-16f6-4c5a-a4db-79fd43d8f754.json` (zero errors; existing warning retained).
- `lanes/environment/close-readiness-runtime-4bcf68fc-3e88-4865-9a60-f9726791062c.json` (actual persisted and concurrency checks).

Failed attempts: initial aggregate session 16835 could not save its receipt due sandbox EPERM and is not claimed as verification. Its corrected run is listed above. `close-readiness-runtime-31f207c3-7d13-4292-ad5b-3a8670488662.json` failed before fixture creation because the verifier sorted `tenantModuleConfiguration` by nonexistent `id`; the verifier now uses `organizationId`. Pre-fix proof-reader regressions and frozen owner results are retained under `evidence/close-current-export-*5b09b3bf-889e-48a3-a891-563b88d0e126*`. Those owner counts are included in the aggregate, not added again.

TypeScript passed using the existing `tsc --noEmit --pretty false` command: `evidence/cash-close-typecheck-09eb19b8-cb69-4250-9344-00d6ac97ea84.json`.

Actual browser receipt: `lanes/environment/close-readiness-browser-b97afcf1-f169-40e9-8e02-c6005133ec1f.json`. EN 1440px and FR 320px passed keyboard Enter/Space opening/closing/reopening, retained focus with a visible 2px outline, localized missing-export title/detail/next action, horizontal reflow, and the authorized Close link. Six actual screenshots are retained beside the receipt. Both open-condition screenshots and the EN destination were visually inspected. Sources and financial/outside-fixture fingerprints remained unchanged; no pageerror was captured. Measured development load observations were 9,269ms EN and 6,793ms FR, including the harness's page-ready checks; these are not comparable production budgets or evidence of a speedup.

**The destination is not passed as a complete workflow.** The actual Close & Assurance Center screenshot still displays the retained `CERTIFIED / 100%` state and “No high-risk journey blockers are visible” for this missing-export fixture, alongside a blocked certification action. It does not yet expose the current-proof condition established by the Cash read model. That is a verified remaining handoff defect owned by **FA-CLOSE-READ**, with the screenshot `close-readiness-browser-b97afcf1-f169-40e9-8e02-c6005133ec1f-en1440-authorized-close-destination.png` as evidence. Navigation/title checks alone do not verify its certification presentation.

No native assistive-technology, production performance or full-workflow certification follows from this checklist. The final input manifest and scoped review bind the exact receipts and current files. Earlier packages with modified source bindings are retained as historical evidence, not silently recertified.

## Operating instructions

Open `/{locale}/dashboard/finance/cash-command` and expand **Review conditions / Examiner les conditions** under the close signal. Follow the displayed source workspace action when your role permits it.

For missing evidence, the accounting reviewer needs the relevant accounting period, current assessment, completed control evidence and retained certified close pack from Close Assurance. For invalidation, inspect the recorded source change and run the authorized reassessment/certification process. A displayed readiness percentage is a recorded assessment score; it does not override a current blocker. Do not edit status fields or upload an unrelated PDF to dismiss the condition. Existing authority, export and authentication controls remain in force.

## Rollout and recovery

Deploy through the existing approved process after remaining release decisions. No migration/backfill is required for this change. Monitor close-read latency and transaction timeouts on representative tenants; these queries now share one connection and one snapshot. If a read fails, use the application's existing retry behavior. Do not replace errors with empty evidence. Reverting the affected source restores earlier behavior but reintroduces the false-certification defect; retain this finding with any rollback decision.

## Remaining boundaries and review responsibilities

This transaction covers the **close snapshot only**, not every independently loaded Cash source or a later proof request. The proof service retains its supplied-client contract. Whole-page source consistency, concurrent authority revocation, comprehensive interrupted-process recovery and genuine downstream certification still require their own evidence.

Independent source review identified a further **write-side race** in `close-assurance-pack.service.ts`: export certification reads the run and later updates it from the earlier metadata, while invalidation independently writes BLOCKED/stale. Without a shared row lock or version predicate, certification may overwrite a concurrently committed invalidation. This is an actionable source interleaving, not yet a database reproduction or repaired behavior. It remains owned by **FA-CLOSE-PACK**, with a Cash proof dependency; it is the next concurrency correction to investigate.

Architecture/backend/data, security/tenant privacy, frontend/design system, workflow/localization, product, quality and SRE reviews apply to the changes above. Finance/controls and audit review concern truthful evidence and retained history, not new accounting calculations. The existing close grading policy is reused; OHADA/country-pack expert approval is neither supplied nor claimed. API/event review covers actual invalidation and retained event/outbox evidence in the isolated check; delivery is not claimed. Rollout/support instructions appear above. SaaS eligibility and pricing are unchanged. POS/offline, purchasing, payroll calculation, provider execution and AI behavior are not applicable to this patch because their operations and contracts are unchanged; their original workflow requirements remain in the register.
