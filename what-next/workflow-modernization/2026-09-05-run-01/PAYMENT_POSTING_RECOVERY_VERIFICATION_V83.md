# Payment posting recovery — verification v83

Evidence date: 2026-09-08. Workspace: `E:\ohada saas\Focused projects\stoquify`. Selected skill: `011-aqstoqflow-purchasing-ap-controls`. Source identity, hashes and dirty-tree record are retained in `evidence/source-baseline-v83.json`. No unrelated user changes were reverted.

## Exact commands

```powershell
$runtime = 'C:\Users\J COMPUTER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $runtime node_modules/jest/bin/jest.js --runInBand --runTestsByPath `
  components/purchasing/__tests__/PaymentPostingRecoveryWorkbench.test.tsx `
  components/purchasing/__tests__/PaymentExecutionWorkbench.test.tsx `
  services/purchasing/__tests__/payment-posting-recovery.service.test.ts `
  services/purchasing/__tests__/ap-ledger-retry.test.ts `
  services/purchasing/__tests__/payment-release-evidence.test.ts `
  services/purchasing/__tests__/payment-request-evidence.test.ts `
  services/purchasing/__tests__/supplier-payment-balance.test.ts `
  actions/purchasing/__tests__/ap-control.actions.test.ts `
  scripts/__tests__/module-purchases-route-evidence.test.js `
  --json --outputFile=what-next/workflow-modernization/2026-09-05-run-01/evidence/payment-posting-recovery-final-v83.json

& $runtime node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false

& $runtime node_modules/eslint/bin/eslint.js `
  components/purchasing/PaymentPostingRecoveryWorkbench.tsx `
  components/purchasing/PaymentExecutionWorkbench.tsx `
  components/purchasing/__tests__/PaymentPostingRecoveryWorkbench.test.tsx `
  services/purchasing/payment-posting-recovery.service.ts `
  services/purchasing/payment-posting-recovery-contracts.ts `
  services/purchasing/ap-control.service.ts `
  services/purchasing/__tests__/payment-posting-recovery.service.test.ts `
  actions/purchasing/payment-release.actions.ts i18n/request.ts 'app/[locale]/layout.tsx' `
  'app/[locale]/(dashboard)/dashboard/purchases/payables/payments/recovery/page.tsx' `
  'app/[locale]/(dashboard)/dashboard/purchases/purchases-route-data-access.ts' `
  scripts/__tests__/module-purchases-route-evidence.test.js

& $runtime node_modules/eslint/bin/eslint.js components/purchasing/PaymentPostingRecoveryWorkbench.tsx
& $runtime what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-payment-posting-recovery.cjs
& $runtime what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-payment-posting-recovery-browser.cjs
& $runtime what-next/workflow-modernization/2026-09-05-run-01/capture-source-baseline.cjs
```

The fixture commands first verify ownership of the exact localhost database. Only synthetic organizations are created/changed. Browser traffic is restricted to `http://127.0.0.1:3110`; accounting rules and bank execution documents in fixtures are synthetic. The owned launcher uses `.next-workflow-supplier`. No default migration-bearing build, migration, reset, live bank operation, outbound message or deployment was run.

## Results

| Check | Result and evidence |
| --- | --- |
| Focused regression | 114 tests / 9 suites passed; session 83989, exit 0; `evidence/payment-posting-recovery-final-v83.json`. |
| Typecheck | Session 5461, exit 0. It began before the final single calendar-date formatting expression; all structural TypeScript changes were included. Final component tests, lint and actual browser execution include that expression. Earlier incremental typecheck 74463 also passed. |
| Changed-file lint | Session 36638, exit 0; final calendar-date component recheck 38337, exit 0. |
| Owned database | Eight checks passed; session 55190, exit 0; `lanes/environment/payment-posting-recovery-ecacca72-2a6.json`. Current authority, SOD, foreign scope, missing setup, changed configuration, expired assurance, concurrent/exact retry and tampered provenance exercised. |
| Actual EN/FR application | Session 74721, exit 0; `lanes/environment/payment-posting-recovery-browser-11f74bf2-289.json`. Four stages and eight screenshots per language; zero page errors. |
| Persisted business effects | One journal in the retained batch, one original reconciliation transaction, one applied recovery event. Invoice, supplier, allocation and supplier-ledger snapshots unchanged. Original posting exception resolved without changing its type; distinct missing-statement exception remains open. |
| Non-fixture preservation | Both final database and browser receipts report unchanged non-fixture records and stable tested source hashes. |
| Actual visual review | Inspected final French mobile preview and desktop history, plus earlier English mobile preview. Final accounting date has no local-time shift. |

The browser exercises actual sign-in and password verification, existing payment-screen navigation, setup blockers, incorrect password, stale revision, committed response loss, reload with the same retry reference, history and revoked-role direct-route denial. It checks mobile/tablet reflow, dialog keyboard containment and return, reduced-motion screenshots and 200% text sizing. These are scoped checks, not native screen-reader, full WCAG or browser-level zoom certification.

Observed development navigation-to-preview durations were **24,834 ms EN** and **12,252 ms FR**. They include the existing page, navigation and development compilation/caching. No approved production budget was supplied or inferred, and no performance improvement is claimed.

## Corrections and failed attempts retained

- Initial backend typecheck 82976 found nullable document hash arguments. Both calls now use the declared optional-input contract. Later typechecks passed.
- Earlier database receipts `payment-posting-recovery-4f1d8d87-f3d.json` and `payment-posting-recovery-dbfb6ed1-e0d.json` passed before final evidence-validation additions; they are historical, not the final source binding.
- Focused run 96979 passed 45 tests and failed one route-evidence assertion. The page used a combined variable declaration that the conservative guard scanner intentionally leaves unresolved. The page now uses the established separate `const surface` declaration; the scanner was not weakened. The final route assertion passed.
- Regression run 99692 passed all 114 tests but exited 1 because Windows denied writing the JSON receipt (EPERM). The approved narrow rerun 83989 retained the complete result and exited 0. This was a filesystem error, not an automatic approval-review rejection.
- First browser run 56263 retained `payment-posting-recovery-browser-c42ea2be-d9e.json`: English passed; French stopped on an ambiguous alert selector that also matched hidden application announcement regions. The verifier now identifies the visible stale message by its expected text. No announcements were removed.
- Visual review of that first run found the accounting calendar date rendered with time/timezone. The final component formats the date in UTC without time; recording timestamps still include timezone. Both actual browser journeys were repeated successfully afterward.

## Current limitations and next work

- Whole AP and platform workflows remain incomplete. This verifies the retained payment-posting recovery path within PA-031 and its PA-023 handoff.
- Reversal, late/changed-date execution, adoption of legacy records without verified request/approval/execution evidence, final credit-aware invoice status and downstream statement/close completion remain engineering work.
- Existing matching, settlement, suspense allocations and ambiguous/corrupt provenance intentionally require review. Broader legitimate post-recovery reversal/history behavior needs its own lifecycle proof.
- Account-level rule incompatibilities are ultimately checked by the existing posting kernel; richer preview diagnostics and recovery guidance for those failures remain an improvement opportunity. A rule's existence is not statutory approval or proof that posting will succeed.
- Source pagination/high volume, the full cross-object/module/read-only/expired-session browser matrix and native assistive technology remain unverified. Actual foreign-scope and current authority checks are recorded separately in unit/database evidence.
- The French recovery workbench is localized; the inherited desktop shell still shows the English title **Purchases** in the screenshot. That shared-shell localization gap remains recorded for its owning workflow. Fixture-defined period/account names are stored data, not interface translations.
- No bank execution authenticity, provider delivery, production release, professional certification or X1 approval is established.

See `SUPPLIER_PAYMENT_POSTING_RECOVERY_GUIDE.md` for the input/owner/source table, rollback instructions and review matrix. The next recommended numbered skill after the remaining AP priorities is `012-aqstoqflow-payroll-presence-engine`; this checkpoint does not declare the AP prerequisites complete.
