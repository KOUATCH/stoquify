# Certificate export verification — v100

9 September 2026. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `a05a41ef66cd5d98fd69ae3df18225795f912232`. Shared dirty working tree preserved. Full source/working-tree binding: `evidence/source-baseline-v100.json`. Aggregate: `evidence/certificate-export-v100.json`. Source discovery is not workflow completion.

## Delivered boundary

The old exporter regenerated time/actor/correlation-dependent bytes and overwrote one receipt per certificate. The new strict request binds the reviewed certificate hash, authenticated actor and idempotency key. It retains exact bytes/SHA-256 and issuance effects atomically. Current authority, active actor, signed certificate and source evidence are rechecked before new issuance or replay. New requests have distinct receipts; retries return original bytes. The action uses verified authentication provenance and the reconciliation module read contract.

The EN/FR interface reviews evidence and consequences, saves interrupted requests in scoped session storage, supports explicit password verification/retry, checks response scope and file integrity, and restores keyboard focus. Shared verified-download behavior also serves correction exports; its existing consumer was regression-tested. No schema migration, payment, external provider request or production deployment occurred.

## Results and exact bindings

| Verification | Result |
| --- | --- |
| Before reproduction | `lanes/environment/certificate-export-before-v100-a28f8962-306.json`: actual capture/match/sign service certificate; two exports reused receipt but changed bytes/hash/timestamp. Source stable and original records unchanged. |
| Focused tests | 91 passed / 6 suites, `evidence/certificate-export-tests-v100.json`, session76182 exit0. Includes actions, certification, workbench, correction panel and verified download consumer. |
| Final panel regression | 7 passed / 1 suite, `evidence/certificate-export-focus-tests-v100.json`, session63970 exit0. Adds permission-ready focus transition to the six prior panel cases. **92 distinct tests**, not 98. |
| Owned database | 11 checks passed, `lanes/environment/certificate-export-v100-b95bf1c6-26c.json`, session12c11c exit0; source stable and nonfixture records unchanged. |
| Actual browser | EN/FR passed, `lanes/environment/certificate-export-v100-browser-d7b4dd54-c5a.json`, session99538/c64dfa exit0; 16 screenshots and 4 downloaded JSON files; source stable, original records unchanged and no page errors. |
| TypeScript | Initial session37113 and integration session26892 exit0; final post-focus session87899/0e608c exit0. |
| Changed-file lint | Eleven affected files exit0, receipt8fface; final panel/test exit0, receipt58e433. |

Database checks cover actual HMAC capture → automatic match → independent sign service, missing read/export authority, expired assurance, foreign tenant/actor/object, stale certificate hash, inactive actor, immutable bytes, changed transport metadata, conflicting actor reuse, separate new request, malformed retained content, late issuance-audit rollback, concurrent duplicate, suspended-provider retained retrieval, and live certificate/source drift. No live provider or external statutory sign-off is inferred from synthetic setup.

Browser checks use normal password sessions through actual application actions. Authentication does not automatically issue an export. A response deliberately lost **after server commit** survives page reload; retry produces the same retained file and one receipt. A separate keyboard request issues a second receipt. Permission removal leaves read review available and disables export. Text rectangles and panel bounds fit 320/390/768px widths and 200% text in both languages. Final EN/FR320 screenshots were visually inspected. This is not a full screen-reader, contrast or native zoom certification.

Measured route-to-review observations: EN27067ms, FR14335ms in the local development server. These are not controlled performance comparisons, approved budgets or evidence of production performance. Full application build was not run in this batch.

## Preserved failed attempts

- Initial five suites: 84 tests passed, but process74851 exited1 because sandbox permissions prevented writing the JSON report (`EPERM`). It is not recorded as a successful command. The authorized rerun retained the report and added the shared correction-panel regression.
- Initial browser `certificate-export-v100-browser-e60b508f-6e3.json` failed focus entry in both languages before downloads. The region could become visible while read permission was refreshing, then render without rerunning its focus effect. The final effect includes permission readiness, with a focused regression and actual successful browser recheck. Failed screenshots remain preserved.
- The completed before-verifier wrote its final report and disconnected the database but retained an event-loop timer. Its exact script/process identity and completed evidence were checked; only owned process13864 was stopped. This is reported as verifier cleanup, not a natural successful process exit. New verification scripts explicitly exit after completed cleanup/report writing.

## Commands

PowerShell from the workspace; direct executables avoid migration/seed-bearing lifecycle hooks. Baseline and publisher are one-use commands; do not overwrite existing evidence.

```powershell
$verificationNode = 'C:\Users\J COMPUTER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $verificationNode node_modules/jest/bin/jest.js --runInBand --runTestsByPath components/finance/__tests__/ReconciliationCertificateExportPanel.test.tsx components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx components/finance/__tests__/PaymentSuspenseCorrectionPanel.test.tsx hooks/payments/__tests__/correction-export-download.test.ts actions/payments/__tests__/reconciliation.actions.test.ts services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts --json --outputFile=what-next/workflow-modernization/2026-09-05-run-01/evidence/certificate-export-tests-v100.json
& $verificationNode node_modules/jest/bin/jest.js --runInBand --runTestsByPath components/finance/__tests__/ReconciliationCertificateExportPanel.test.tsx --json --outputFile=what-next/workflow-modernization/2026-09-05-run-01/evidence/certificate-export-focus-tests-v100.json
& $verificationNode node_modules/typescript/bin/tsc --noEmit --pretty false
& $verificationNode node_modules/eslint/bin/eslint.js services/reconciliation/payment-reconciliation-certification.service.ts services/reconciliation/reconciliation-certificate-export.contracts.ts actions/payments/reconciliation.actions.ts hooks/payments/usePaymentReconciliationDashboard.ts hooks/payments/correction-export-download.ts hooks/payments/verified-evidence-download.ts components/finance/ReconciliationCertificateExportPanel.tsx components/finance/PaymentReconciliationWorkbench.tsx components/finance/__tests__/ReconciliationCertificateExportPanel.test.tsx actions/payments/__tests__/reconciliation.actions.test.ts services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts
& $verificationNode node_modules/eslint/bin/eslint.js components/finance/ReconciliationCertificateExportPanel.tsx components/finance/__tests__/ReconciliationCertificateExportPanel.test.tsx
& $verificationNode what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-certificate-export-v100.cjs
& $verificationNode what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-certificate-export-browser-v100.cjs
& $verificationNode what-next/workflow-modernization/2026-09-05-run-01/capture-source-baseline.cjs
& $verificationNode what-next/workflow-modernization/2026-09-05-run-01/publish-certificate-export-v100.cjs verified-final-typecheck-and-lint-exit-0 lanes/environment/certificate-export-v100-browser-d7b4dd54-c5a.json
```

## Scope and remaining work

Owned database `stoquify_local_registration_20260906_01`, loopback app `http://127.0.0.1:3110`, ownership assertions and external-network fencing. Fixtures use synthetic provider/account/payment setup, actual capture/match/sign/export services, and no professional approval. Historical nonfixture records and old export receipts are preserved. Source graph node `finance_paymentreconciliationworkbench_tsx` was a locator; current source is authoritative.

PR-14 explicitly covers export/recovery, separately from PR-10 sign-off and PR-06 statement orchestration. It remains partially verified: discovery beyond recent runs, cross-session receipt retrieval, large/provider/country/period variants, full accessibility, external outbox dispatch and production rollout remain open. The new-export close-invalidation policy is preserved and disclosed pending connected review; drift invalidation remains necessary. Suspense final resolution/write-off and the wider workflow register are still required. No whole workflow/platform certification, X1 clearance or held v94 cutover is claimed.

Selected skill: `009-aqstoqflow-payment-reconciliation-moat`. Next numbered skill is `010-aqstoqflow-inventory-valuation-kernel` after remaining reconciliation boundaries; this recommendation does not change the full workflow objective. [User/operator procedure and review matrix](CERTIFICATE_EXPORT_GUIDE.md).

Final discovery baseline af6e4c exited0: 2798 source/config/test files, 987 tests, 159 pages, 18 handlers, 168 action sources, 33 background candidates, 2398 UI controls and 47 explained exclusions. These are discovery counts, not passing workflows. The aggregate register source-baseline pointer was corrected from its stale v98 label to the actual v100 input.
