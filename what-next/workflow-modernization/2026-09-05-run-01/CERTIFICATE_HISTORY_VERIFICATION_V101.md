# Certificate history and late-evidence verification — v101

9 September 2026. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`. Shared dirty worktree preserved. Source/working-tree binding: `evidence/source-baseline-v101.json`. Aggregate: `evidence/certificate-history-v101.json`. These artifacts record a verified batch, not completion of the platform assignment.

## Delivered behavior and findings

PR-14 now discovers older certificate records and receipt history through bounded, deterministic, tenant-scoped pages. The previous dashboard fetches twelve recent runs and renders only five. The new history searches by run ID/provider, preserves failed-refresh state, exposes minimal receipt summaries, and reopens a same-actor request through the existing fresh-authenticated export service. It does not return file payloads during browsing or grant approval/entitlement. New exports and historical recovery remain distinct; legacy and damaged receipts are explicit.

The populated fixture reproduced a connected sign-off bug. Matching and source-manifest queries used occurrence **or** receipt date for verified/processed events; sign-off used receipt date alone. A matched August event received in September was incorrectly treated as absent. Sign-off and the detail count now use the manifest's existing window and eligible statuses. No-event sign-off, independence, source consistency, ledger truth, unresolved-item and open-period controls remain.

## Verification receipts

| Check | Result |
| --- | --- |
| Initial focused tests | 98 tests / 6 suites passed, session81355/ce08f6; `evidence/certificate-history-tests-v101-initial.json`. |
| Final tests after late-evidence correction | **99 tests / 6 suites passed**, session41799/8e3112; `evidence/certificate-history-tests-v101.json`. Includes service, action authority metadata, history/recovery UI, workbench and shared certification behavior. |
| Owned database | **9 checks passed**, session86919/7cb524; `lanes/environment/certificate-history-v101-778c73f4-e9b.json`; source stable, nonfixture records unchanged. |
| Actual browser | **EN/FR passed**, session3779/d08297; `lanes/environment/certificate-history-v101-browser-8ec8cc0a-874.json`; 20 screenshots and 2 original JSON downloads. Source stable, no page errors, nonfixture records unchanged. |
| TypeScript | Initial13730 and intermediate57034 exit0; final28455/0b0a13 exit0. |
| Changed-file lint | Final12-file command d13917 exit0, no warnings. Initial52d441 had one new effect-cleanup ref warning, subsequently removed with the redundant cleanup increment. |

Database proof includes 22 certificates produced through actual capture/matching/independent-sign services, including late-arriving evidence. It confirms the target is outside the actual dashboard's twelve-run result, reaches every run/receipt once across timestamp ties, refuses changed cursor filters and foreign/missing authority, exposes no content in summaries, and makes no business writes during history reads. Twenty-one issued receipts are paginated; another reader receives no original-actor request. Recovery returns original bytes/ID through the export service; damaged receipts are marked for review and current source drift still refuses download.

The browser starts a new ordinary password session without the former tab's saved request. It visits both pages of run history, searches the old target, preserves twenty prior rows after an intentionally lost read response, retries the same search, visits both receipt pages and recovers the oldest receipt. Password verification is explicit and does not auto-export. Downloaded bytes/SHA-256 equal the original retained file; receipt count remains21. Keyboard selection and focus return, read-only permission removal, 320/390/768px and200% text were checked. Every text-line rectangle stays within the viewport. Final EN/FR320 images were visually inspected. No full screen-reader/native zoom/contrast certification is claimed.

Local route-to-history observations were EN27786ms and FR10022ms. They are development observations, not controlled improvements, approved budgets or production performance certification. No full application build or production deployment was run.

## Preserved failed attempts and correction

1. `certificate-history-v101-6fb08834-652.json`, session54250 exit1: an empty-day fixture hit the valid requirement for provider events/statement lines. The control was retained and the fixture was populated.
2. `certificate-history-v101-0c552c98-848.json`, session52448 exit1: a real captured and automatically matched older payment still failed sign-off because the received-date-only count omitted its late-arriving event. Source inspection identified the mismatch with matching/manifest, and the production count/detail query was corrected. The final fixture exercises a target occurring August1 and received September8.
3. `certificate-history-v101-88517a92-944.json`, session19147 exit1: capture/match/sign succeeded, but the fixture omitted requested reconciliation modules when calling the dashboard. The dashboard correctly denied access. The fixture's isolated module setup was corrected; no production module gate was weakened. Its target was also changed to the genuinely older business-date run because the dashboard sorts business date before creation time.

All failed runtime reports preserve source hashes and unchanged nonfixture snapshots. Synthetic creation timestamps intentionally create ordering ties; this is pagination test data, not historical issuance provenance. Provider occurrence/receipt timestamps and ephemeral HMAC verification clocks are isolated fixture inputs. Every successful certificate still comes from actual application services, not direct `SIGNED` assignments or fabricated professional approvals.

## Exact commands

PowerShell from the workspace. Direct executables avoid build/migration/seed lifecycle hooks. Baseline/publisher commands are one-use; preserve their existing outputs.

```powershell
$verificationNode = 'C:\Users\J COMPUTER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $verificationNode node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/reconciliation/__tests__/reconciliation-certificate-history.service.test.ts components/finance/__tests__/ReconciliationCertificateHistory.test.tsx components/finance/__tests__/ReconciliationCertificateExportPanel.test.tsx components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx actions/payments/__tests__/reconciliation.actions.test.ts services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts --json --outputFile=what-next/workflow-modernization/2026-09-05-run-01/evidence/certificate-history-tests-v101.json
& $verificationNode node_modules/typescript/bin/tsc --noEmit --pretty false
& $verificationNode node_modules/eslint/bin/eslint.js services/reconciliation/reconciliation-certificate-history.service.ts services/reconciliation/reconciliation-certificate-history.contracts.ts services/reconciliation/payment-reconciliation-certification.service.ts actions/payments/reconciliation.actions.ts components/finance/ReconciliationCertificateHistory.tsx components/finance/ReconciliationCertificateExportPanel.tsx components/finance/PaymentReconciliationWorkbench.tsx components/finance/__tests__/ReconciliationCertificateHistory.test.tsx components/finance/__tests__/ReconciliationCertificateExportPanel.test.tsx services/reconciliation/__tests__/reconciliation-certificate-history.service.test.ts actions/payments/__tests__/reconciliation.actions.test.ts services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts
& $verificationNode what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-certificate-history-v101.cjs
& $verificationNode what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-certificate-history-browser-v101.cjs
& $verificationNode what-next/workflow-modernization/2026-09-05-run-01/capture-source-baseline.cjs
& $verificationNode what-next/workflow-modernization/2026-09-05-run-01/publish-certificate-history-v101.cjs verified-final-typecheck-and-lint-exit-0 lanes/environment/certificate-history-v101-browser-8ec8cc0a-874.json
```

## Environment, release and remaining scope

Ownership-checked database `stoquify_local_registration_20260906_01` and loopback app `http://127.0.0.1:3110`; external browser traffic fenced. Synthetic provider/account/payment setup with actual services. No live payment/provider effect, external message, schema migration, rollout or X1 approval. Existing legacy records, dashboard notification trigger and held v94 cutover remain unchanged. The history-specific read-only assertion starts after the existing dashboard call, whose retained notification trigger has separate behavior.

PR-14 remains partial for large data and broader provider/period/country/accessibility contexts; PR-10 remains partial for complete sign-off and cross-day allocation policies. The separate final suspense resolution/write-off and all other workflow families remain required. History visibility never means source freshness or approval. Existing new-export close-invalidation policy remains disclosed and unchanged pending connected review.

Selected skill: `009-aqstoqflow-payment-reconciliation-moat`. Files changed are bound by the aggregate/baseline; domain review and operational inputs are in [the guide](CERTIFICATE_HISTORY_GUIDE.md). Next numbered skill is `010-aqstoqflow-inventory-valuation-kernel` after remaining reconciliation boundaries, without narrowing the full objective.

Publication479227 exited0. Final baseline85468/da2c11 contains2803 source/config/test files,989 tests,159 pages,18 handlers,168 action sources,33 background candidates,2411 control candidates and47 explained exclusions. Register remains230 provisional workflows /0 whole complete /209 unmapped entry sources. These counts do not establish complete discovery or passing workflows. [Next connected implementation](SUSPENSE_TERMINAL_RESOLUTION_NEXT_BOUNDARY.md).
