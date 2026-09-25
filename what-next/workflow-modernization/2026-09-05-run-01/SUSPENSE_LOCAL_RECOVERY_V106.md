# v106 — Unreadable draft and keyboard recovery

Date: 2026-09-09. This bounded correction continues PR-15 and PR-16; it does not complete either whole workflow or the platform review.

## Delivered behavior

An unreadable saved resolution draft previously disabled the controls without an actionable recovery path. Its warning now remains visible independently of loading and error notices. The operator can explicitly reload authoritative records and reset this browser draft. A failed server read leaves the original local bytes intact. Review-comment edits cannot silently overwrite unreadable state. If storage cannot retain an exact request, the application does not submit that request.

After a successful reset, focus returns to the resolution review region because the reset button disappears. When closing a resolved item whose original queue button has disappeared, focus returns to the existing queue. Existing available openers continue receiving focus normally. No second modal or application shell is introduced.

## What the operator should do

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation`, inspect the item and open **Resolution and recovery / Résolution et réouverture**. For a final item, locate it through retained records.

If an unreadable-draft warning appears, choose **Reload records and reset this browser draft / Recharger les données et réinitialiser ce brouillon local**. This reloads the current server history before clearing only the current organization/user/item browser draft. It does not cancel, reverse or delete any recorded decision. Review the loaded history before starting another proposal. If reload fails, retry when service access is restored; the draft is retained.

No new information is required for this recovery action. The organization, user and item come from the current authenticated context. Existing proposal inputs remain documented in [the operator guide](SUSPENSE_RESOLUTION_OPERATOR_GUIDE.md). A valid pending request should normally be retried exactly; resetting local state is not a means of undoing a server outcome.

## Changed source

- `components/finance/PaymentSuspenseResolutionPanel.tsx`: persistent storage warning, authoritative reset, protected hydration, reset focus.
- `components/finance/PaymentSuspenseQueue.tsx`: focusable queue and fallback when the opener disappears.
- `components/finance/__tests__/PaymentSuspenseResolutionPanel.test.tsx`: malformed-state recovery, failed read preservation, prohibited overwrite, failed storage submission and focus checks.
- `messages/en.json` and `messages/fr.json`: recovery label, explanation and confirmation.

## Verification and limits

Final command receipts and source bindings are recorded in `evidence/suspense-local-recovery-v106.json`. Direct installed Node commands are used for Jest, TypeScript, ESLint and the inspected owned-browser harness. The default migration-bearing build is not invoked. No schema or migration change.

Retained intermediate tests: 29/2 in `evidence/suspense-local-recovery-v106-tests.json`, then 30/2 in `evidence/suspense-local-recovery-v106-tests-final.json`. Final focused tests additionally assert focus after reset. The first browser attempt `lanes/environment/suspense-resolution-local-recovery-v106-browser-f80e4876-109.json` completed both locales with 12 screenshots and unchanged unrelated rows, but source changed during execution; it is not the final bound pass.

The final browser harness uses ordinary password sessions in owned synthetic organizations on loopback port 3110. It checks keyboard reset, no financial change from reset, preservation of unrelated browser keys, EN resolution and FR expense write-off, independent step-up without automatic effects, refresh/exact retry, queue focus fallback, retained history and independent reopening with one clearing reversal. Screenshots cover 320px, tablet and desktop. These are development observations, not performance or accessibility certification. Full screen-reader, contrast and native zoom audits remain open.

## Review and rollout

Selected skill: `009-aqstoqflow-payment-reconciliation-moat`. Frontend, workflow, accessibility, EN/FR and quality reviews address the reproduced defects. Architecture review reuses the existing panel and queue; backend, security/IAM and finance/controls preserve authoritative reads and exact-request requirements; audit/privacy retain server evidence and isolate browser keys; database/migration review finds no schema change; operations/support supplies the recovery procedure; packaging keeps current permissions and module rules. New statutory/country rules, POS/offline, HR/payroll, AI, provider integration and billing changes are not applicable to this local recovery correction.

Passed gates require the final evidence receipt: focused tests, typecheck, changed-source lint and actual scoped EN/FR journeys. Open gates remain durable resolution/recovery exports, genuine connected sign-off/export handoffs, broader race/context tests, legacy financial evidence and full accessibility/performance review. These are engineering tasks; no new external approval is needed to continue implementation.

Roll out with the existing reconciliation interface controls. A UI rollback must preserve all server decisions, ledger guards and retained history. Resetting a browser draft never rolls back accounting. Do not deploy, clear X1, replace the held notification trigger or issue external messages from this verification. Next numbered skill is `010-aqstoqflow-inventory-valuation-kernel` after the reconciliation boundary is completed.


## Final bound results

- Tests: evidence/suspense-local-recovery-v106-tests-complete.json, 30 passed/2 suites, session 48708, receipt 6c18bc, exit 0.
- Typecheck: session 63841, receipt ffca42, exit 0.
- Lint: session 89184, receipt 0a1d4f, three source/test files, exit 0.
- Browser: lanes/environment/suspense-resolution-local-recovery-v106-browser-ff8ffda6-f9c.json; both locales passed, 12 screenshots, no page errors, source stable and unrelated financial rows unchanged.
- Local route-to-queue milliseconds: en: 28001/13191/13387; fr: 10594/10245/13499. Observations only.
- Screenshots: evidence/suspense-local-recovery-v106-files.
- Baseline: evidence/source-baseline-v106.json; 2819 files, 995 tests.
- Aggregate: evidence/suspense-local-recovery-v106.json.
