# v99 — Correction evidence export verification

9 September 2026. Branch codex/migration-control-plane-release-2026-08-29, HEAD a05a41ef66cd5d98fd69ae3df18225795f912232. Source bindings: [receipt](evidence/suspense-export-v99.json) and [baseline](evidence/source-baseline-v99-final.json). This is a bounded implementation batch; the full workflow assignment remains active.

## Results

- 111 tests / 11 suites passed: scoped action identity and verified fresh authentication, strict export contracts, record hash/revision validation, browser byte verification, uncertain response recovery, permission/identity denial, download focus and connected suspense/ledger/certification/notification regressions. Final receipt: [tests](evidence/suspense-export-tests-v99-focus-final.json), session39310/fe2e6e exit0.
- 61 tests / 2 additional suites passed for the affected queue and parent workbench: [layout consumers](evidence/suspense-export-layout-tests-v99.json), session70380/389652 exit0. Combined172 tests/13 suites.
- 12 actual owned PostgreSQL checks: [runtime](lanes/environment/suspense-export-v99-2c920813-e3d.json). Missing read/export permissions, expired auth, foreign tenant/object, stale revision, proposal/rejection/approval exports, immutable exact retry, linked exact-decimal financial evidence, redaction, subsequent posting with historical replay, damaged-journal/file denial, audit-failure rollback, concurrent duplicate and all33 history records across timestamp ties.
- Actual EN/FR normal password sessions and server actions: [browser](lanes/environment/suspense-export-v99-browser-b8aadb83-d47.json), 16 screenshots and 4 downloaded JSON files in [artifacts](evidence/suspense-export-v99-files). Password step-up does not auto-export; a lost committed response survives reload; retry downloads the exact retained bytes with one receipt. New keyboard download, restored focus/Escape, 320/390/768 widths, 200% text and export-permission removal verified. No page errors.
- Route load including initial history: EN 132405ms, FR 17521ms. The earlier failed run observed EN27073ms/FR16042ms. These are noncontrolled development observations, not a measured improvement or production performance certification.
- TypeScript after focus correction session58950/ff5630 exit0 and after mobile layout session69138/31b21f exit0. Lint12 files session75286/346eed exit0, final panel/test session89237/f3fb8f exit0 and parent/queue layout session6563/ec61d9 exit0. Pre-layout baseline session80487/341210 is preserved; the final baseline is linked above.

## Preserved failed attempt

Browser5321b868-7f5 passed real downloads, hash checks and responsive paths, then failed keyboard focus return in both languages. Download handoff left focus outside the panel. The panel now restores the originating control after controls re-enable, or its named region when the retry control disappears. A regression test and the final browser run verify this correction. Earlier tests110/11 and type/lint passed before this final focus change; they do not replace final-source evidence.

Browserb2a95fb2-dbe passed its automated checks, but visual review found French history clipped at320px: page overflow was hidden, so a document-scroll-width assertion was insufficient. The affected grid now uses a shrinkable single column; the queue can shrink and its buttons wrap. The final browser verifier checks the panel and every text-line rectangle at320/390/768px and200% text. The earlier nominal pass is not accepted as reflow proof. Attemptad7c6bf9-5ee failed withECONNREFUSED after the prior server stopped; its handle was missing before the owned launcher was restarted.

## Scope and rollout

Only stoquify_local_registration_20260906_01 and the loopback application were used. Ownership guards and pre-existing-record snapshots passed. Synthetic correction fixtures used actual posting/correction services; no external message, live payment, production migration, deployment, certificate issuance or expert approval occurred. No v99 schema change. The v97 cycle migration/client and v98 services remain prerequisites.

See [user/operator guide and review matrix](SUSPENSE_CORRECTION_EXPORT_GUIDE.md). The export proves retained application evidence and unchanged bytes, not independent signer identity or new approval. The application cannot attest that the user saved the download.

## Exact verification commands

PowerShell from the repository root; direct executables avoid migration-bearing lifecycle hooks. The baseline and publisher are one-use commands and must not be repeated under the same filenames.

```powershell
$verificationNode = 'C:\Users\J COMPUTER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $verificationNode node_modules/jest/bin/jest.js --runInBand --runTestsByPath components/finance/__tests__/PaymentSuspenseCorrectionPanel.test.tsx services/reconciliation/__tests__/payment-suspense-correction-record.test.ts hooks/payments/__tests__/correction-export-download.test.ts services/reconciliation/__tests__/payment-suspense-correction.contracts.test.ts services/reconciliation/__tests__/payment-suspense-ledger.service.test.ts services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts actions/payments/__tests__/reconciliation.actions.test.ts services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts services/reconciliation/__tests__/payment-reconciliation-notifications.test.ts services/accounting/__tests__/posting-batch-identity.test.ts services/accounting/__tests__/posting.service.test.ts --json --outputFile=what-next/workflow-modernization/2026-09-05-run-01/evidence/suspense-export-tests-v99-focus-final.json
& $verificationNode node_modules/jest/bin/jest.js --runInBand --runTestsByPath components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx components/finance/__tests__/PaymentSuspenseQueue.test.tsx --json --outputFile=what-next/workflow-modernization/2026-09-05-run-01/evidence/suspense-export-layout-tests-v99.json
& $verificationNode node_modules/typescript/bin/tsc --noEmit --pretty false
& $verificationNode node_modules/eslint/bin/eslint.js services/reconciliation/payment-suspense-correction-record.ts services/reconciliation/payment-suspense-correction-export.service.ts services/reconciliation/payment-suspense-correction.service.ts services/reconciliation/payment-suspense-correction.contracts.ts services/reconciliation/__tests__/payment-suspense-correction-record.test.ts hooks/payments/correction-export-download.ts hooks/payments/__tests__/correction-export-download.test.ts actions/payments/reconciliation.actions.ts actions/payments/__tests__/reconciliation.actions.test.ts components/finance/PaymentSuspenseCorrectionPanel.tsx components/finance/PaymentSuspenseQueue.tsx components/finance/__tests__/PaymentSuspenseCorrectionPanel.test.tsx
& $verificationNode node_modules/eslint/bin/eslint.js components/finance/PaymentSuspenseCorrectionPanel.tsx components/finance/__tests__/PaymentSuspenseCorrectionPanel.test.tsx
& $verificationNode node_modules/eslint/bin/eslint.js components/finance/PaymentReconciliationWorkbench.tsx components/finance/PaymentSuspenseQueue.tsx
& $verificationNode what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-export-v99.cjs
& $verificationNode what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/supplier-ack-local.cjs
& $verificationNode what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-export-browser-v99.cjs
& $verificationNode what-next/workflow-modernization/2026-09-05-run-01/capture-source-baseline.cjs
& $verificationNode what-next/workflow-modernization/2026-09-05-run-01/publish-suspense-export-v99.cjs verified-final-typecheck-and-lint-exit-0 lanes/environment/suspense-export-v99-browser-b8aadb83-d47.json
```

Final browser session22680/006126, final baseline74949/636838, publisher0cd2d5 all exit0. Owned application launcher16113 was confirmed ready before the final browser run. Final English and French320px screenshots were visually inspected; text wraps within the panel. Earlier b2a95fb2-dbe nominal reflow assertions are superseded by measured text rectangles and final visual review. No full screen-reader/contrast certification is claimed.

## Remaining scope

PR-13 remains incomplete: resolution/write-off, real sign-off issuance after correction, broader country/provider/retention/accessibility coverage, prior inconsistency repair and rollout. Certificate-export auth provenance and mutable receipt behavior remain separate findings for the next connected batch. The v94 alert-trigger cutover remains held and unchanged. Platform coverage: 229 provisional / 0 whole complete / 209 unmapped.
