# Delivery 13 — Live accountant findings and recovery fixes

Date: 14 October 2026. Source revision: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`, with unrelated working-tree changes preserved. Status: two local fixes; live role/responsive acceptance incomplete.

## Live findings

The existing Edge session was confirmed as **Accountant** by both the page DOM and browser accessibility tree, in the same organization used for the earlier accountant checks. Reconciliation reached its authenticated shell and loading skeleton. Later accessibility/screenshot inspection still showed loading placeholders rather than financial results. This is an observed loading problem, not proof of its cause.

The trial-balance page displayed a specific failure: functional-currency evidence is missing from a historical journal line. Immediately below, it instructed the accountant to check permissions. Source inspection confirmed that every report failure received this permissions hint. The ledger service deliberately refuses to produce the report when functional amounts are absent; that control remains intact.

## Changes

1. **Trial-balance recovery follows the actual failure.** A protected-action `FORBIDDEN` response offers access review. The known missing-currency-evidence response offers journal review, explains that totals are withheld, and retains the underlying reporting block. Other read failures offer a full report reload. No synthetic totals or accounting corrections are introduced. Each link preserves EN/FR locale; destination guards still control admission.
2. **French trial-balance presentation.** The route locale now reaches the existing bilingual table. Page heading, summary labels, balance status and recovery instructions are translated. The known currency-evidence diagnostic is translated at the presentation boundary. Other server-supplied safe error messages remain as supplied; this does not claim complete translation of every backend error or account name.
3. **Reconciliation loading is understandable and escapable.** Loading now has a visible EN/FR heading, polite status announcement, explicit statement that results are not yet available and a dashboard return link. Decorative skeletons are hidden from assistive technology. The loading branch no longer creates a second main landmark inside the dashboard shell. No permission lookup, refresh interval, query, timeout or transaction behavior changed. This presentation fix does not claim to resolve the underlying stalled read.

## Browser recovery attempts and coverage

The selected Edge connection initially responded to DOM inspection. Opening reconciliation was followed by timeouts in page evaluation, screenshot focus and other tab inspection. Closing the owned stalled tab did not restore DOM control. Reinitializing the tool session and reconnecting existing tabs provided intermittent recovery. A fresh browser inventory showed a changed Edge extension instance and newly available Chrome. The browser's accessibility interface and screenshot interface then supplied actual accountant/reconciliation evidence, while DOM actions still timed out. A Chrome session inventory attempt also timed out before any role was confirmed there.

An empty diagnostic-tab observation was refused by the browser URL policy; the tab was closed without a workaround. No browser profile, extension cache or user browser process was modified or terminated. No application server was restarted. The user was asked to bring Edge to the foreground and reconnect the Codex extension; no credentials or new sign-in were requested. That connection assistance remains pending.

| Route / browser | Role / locale / viewport | State and result |
|---|---|---|
| `/en/dashboard/accounting/reports/trial-balance`, Edge | Accountant confirmed; EN; normal browser size, CSS viewport not measured | Live missing-currency-evidence failure and misleading permissions hint reproduced before editing; post-change browser check unavailable |
| `/en/dashboard/finance/reconciliation`, Edge | Accountant confirmed; EN; normal size; screenshot 1523×733 pixels, not a measured CSS viewport | Authenticated shell and persistent loading placeholders observed; populated/error/denied resolution not verified |
| French reconciliation language link | Same session; intended FR | Click/direct navigation timed out; French route arrival not verified |
| Reconciliation phone attempt, Edge | Intended 390×844 override | Supported viewport setting succeeded; tab inspection timed out. No layout acceptance claimed. Override reset successfully |
| Chrome role session | Role unconfirmed | Session setup/inventory timed out. No Chrome role coverage credited |
| Owner and cashier | Actual sessions unavailable to reliable inspection | Open; no substitution with Accountant or SUPER ADMIN evidence |

Captured pre-fix loading evidence: [reconciliation screenshot](evidence/delivery-13-reconciliation-loading.jpg). Neither screenshot nor jsdom tests establish responsive behavior, visual contrast, keyboard focus or screen-reader operation. Accountant portal/access-review destination journeys, 1440×900 and 1024×768 checks, and successful phone inspection remain open.

## Verification and controls

- Workflow contract: passed, exit 0; 196 package scripts outside the reviewed manifest. Current script, lifecycle and registry definition inspected first.
- Trial-balance page/table mocked tests: **9 passed in 2 suites**, exit 0. Includes known evidence failure in EN/FR, real denial classification, unchanged report permissions, hidden report totals on failure, French table wiring and existing filtering/full-total invariance. Evidence: `evidence/delivery-13-tests.json`.
- Reconciliation mocked tests: **54 passed in 2 suites**, exit 0; `evidence/delivery-13-reconciliation-tests.json`. Includes the new EN/FR loading announcement, single main landmark, safe exit, absence of financial results during loading and no mutation submission, plus the existing actor/organization scope and recovery tests. Combined with trial balance: **63 tests passed across 4 suites**.
- Scoped TypeScript: both trial-balance and reconciliation configurations passed, exit 0. Normal dependency resolution, `noEmit`, incremental metadata disabled.
- ESLint: both changed production files passed, exit 0.
- Real database tests, migrations, seeds, builds and deployment: not run. No business transaction, permission/module change, invitation or external message submitted. Normal application reads may create audit records.

The two isolated Jest configurations use installed Next/Jest without an application directory, avoiding application config/environment setup. Server actions and authority dependencies are mocked. Checks preserve actor/organization boundaries and do not certify a real database workflow.

Commands:

```text
npm run agent:workflow:check
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.accountant-recovery.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/delivery-13-tests.json
node node_modules/typescript/bin/tsc --project docs/system-audit/2026-10-12-ui-ux-review/roadmap/tsconfig.accountant-recovery.json --pretty false
node node_modules/eslint/bin/eslint.js "app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/page.tsx"
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.reconciliation-recovery.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/delivery-13-reconciliation-tests.json
node node_modules/typescript/bin/tsc --project docs/system-audit/2026-10-12-ui-ux-review/roadmap/tsconfig.reconciliation-recovery.json --pretty false
node node_modules/eslint/bin/eslint.js components/finance/PaymentReconciliationWorkbench.tsx
```

Project UI/UX Pro Max focused query: `error recovery actionable messages`, domain `ux`, returned **Accessibility / Error Messages** and **Feedback / Error Recovery** from `ux-guidelines.csv`. Clear recovery paths and status announcements apply without a framework upgrade or palette change. The design master and reconciliation/AP evidence controls remain authoritative. The dated route graph had no exact current trial-balance page match; current source supplied the behavioral evidence.

## Next acceptance and rollback

Once browser actions respond reliably: inspect the permission/data-read outcome behind the reconciliation loading state, verify the changed EN/FR panels and their actual destinations, then complete accountant phone/tablet/desktop and owner/cashier journeys. Do not weaken permission guards or repair historical financial data to manufacture a passing UI check.

Pre-edit bytes/hashes are retained in `evidence/delivery-13-baseline.json`. Reverse only `evidence/delivery-13-owned.patch` after checking later overlapping edits; do not reset files to HEAD. Post-edit hashes are in `evidence/delivery-13-files.json`. No commit or deployment was performed. The connection issue and broader roadmap remain unfinished.
