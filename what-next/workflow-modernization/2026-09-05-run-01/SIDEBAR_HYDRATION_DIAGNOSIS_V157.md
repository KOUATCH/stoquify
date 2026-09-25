# v157 — Screenshot-induced hydration warning

Evidence date: 2026-09-15. Branch `codex/migration-control-plane-release-2026-08-29`; commit `a05a41ef66cd5d98fd69ae3df18225795f912232`. Existing dirty tree preserved. This batch changes verification scripts and records only; no application code changed.

## Finding and correction

Prior Daily Digest captures recorded a truncated React attribute mismatch naming Sidebar. The expanded diagnostic reproduced it in EN and FR: the Sidebar and Navbar search inputs unexpectedly had inline `caret-color: transparent`. Application source does not set that inline style. The installed Playwright implementation (`node_modules/.pnpm/playwright-core@1.62.1/node_modules/playwright-core/lib/coreBundle.js`, around lines 21116–21124) applies that style while hiding carets for screenshots. Capturing server-visible content before client hydration can therefore alter the DOM React is reconciling.

A fresh login followed by an actual mode interaction, before taking a screenshot, had no console or page errors. The original screenshot-first recovery fixture reproduced the warning. Changing only screenshot options to `caret: 'initial'` removed the warning across the same complete recovery fixture. This evidence identifies screenshot instrumentation as the cause of this observed warning. It does not certify all application hydration paths.

The v157 fixture now preserves native caret styles during all captures and explicitly fails on hydration diagnostics. Expanded diagnostics redact the owned database URL, authentication secret and fixture password before retention, with a 30,000-character bound. Original v154–v156 evidence remains unchanged. No warning suppression, hydration opt-out, notification adapter change or shared-shell patch was applied.

## Verification

Executed with the bundled Node executable and inspected local fixture helpers against owned database `stoquify_local_registration_20260906_01`, localhost app port 3110, existing `.next-workflow-supplier`. Browser network fenced to that origin. Real credential login. No migration/reset, external provider or notification mutation.

| Evidence | Result |
| --- | --- |
| `lanes/environment/sidebar-hydration-v157-394faac4-cb26-4ba9-8a32-e2e9fe0dbd44.json` | Fresh EN/FR login, interaction then capture: no console/page errors. Receipt `1a946c`. |
| `lanes/environment/digest-recovery-v157-4e3e46e7-aa67-46d5-86a5-2039405a236e.json` | Original capture defaults: reproduced inline caret mismatches; functional assertions passed. Receipt `44ad0e`. |
| `lanes/environment/digest-recovery-v157-20dc6594-5f1e-44e3-8e16-435e0ca2649e.json` | Corrected capture: zero hydration errors and zero unhandled page errors in both languages. Receipt `b5abad`. |
| `evidence/source-baseline-v157.json` | Current source/tree snapshot, receipt `509b8c`. |

Runtime command: `node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-digest-recovery-v157.cjs`.

Retained all v156 functional checks: keyboard mode switching and distinct content at 1440/768/320, source limitations, localized workspace/source links, browser/organization timezone difference, deliberate invalid-currency rendering failure, keyboard retry with fresh server request, and current-permission denial. Expected React error-boundary console report for deliberately invalid currency remains; it is not suppressed. Selected proposal/event/payment/journal counts unchanged. Fixture currency restored. Thirty corrected screenshots retained; French 320px Command inspected and shows readable content without the development issue badge. No new application tests/lint/typecheck were run because application source did not change; prior results remain historical, not newly executed passes.

The first attempt to create the diagnostic copy was denied by filesystem permissions and a following execution found no file. Scoped creation then succeeded. These setup failures are retained in tool receipts; they are not successful verification runs.

## Guide and operational consequences

Users continue to open `/en/dashboard/daily-digest` or `/fr/dashboard/daily-digest`; no new input or procedure is required. Operators collecting pre-hydration screenshots should preserve caret styles using `caret: 'initial'`, retain console diagnostics, and verify a real interaction separately. Do not add production styles or suppress React warnings to accommodate the capture tool. The tradeoff is that a focused input caret can remain visible in evidence.

No deployment or migration is needed for this verification correction. For recovery, retain this new script alongside the historical captures; do not overwrite old results. Browser assertions must continue to reject genuine hydration errors.

## Remaining work and review responsibilities

French source messages remain untranslated, including the three observed setup blockers. Their verified semantic owners are payment-truth snapshot `payment-provider-account-missing`, close-readiness snapshot `close-periods-missing`, and tenant-operating snapshot `tenant-active-location-missing`. Continue at those presentation boundaries while preserving IDs, evidence and custom text. Other dynamic signals, source labels, populated actions, complete roles/tenants, query failures, screen-reader/zoom, governed agents and the full workflow register remain incomplete. Full-page screenshot blanking remains a separate evidence limitation.

Architecture/frontend/UX: verified shared Sidebar and Navbar relationship; graph community 60 is a historical discovery hint only. Security/privacy: redacted diagnostics and local network scope; no permission changes. Quality/SRE/release: reproducible tooling defect corrected; no production performance or release certification. Product/support: avoid an unnecessary shell modification and retain trustworthy evidence. Backend/data, finance/controls/audit/analytics, SaaS/AI: existing source and selected effect counts unchanged. OHADA/country rules, POS/offline, purchasing/AP, HR/payroll, payments/providers, ledger/close, APIs/events: not applicable to domain changes in this batch because only verification tooling changed; their broader workflow reviews remain required.

These are engineering review observations, not professional approvals. Whole-platform completion remains false.
