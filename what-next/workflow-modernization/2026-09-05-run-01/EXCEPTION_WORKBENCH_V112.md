# Exception case workbench — v112

Evidence date: 2026-09-13. Selected skill: `009-aqstoqflow-payment-reconciliation-moat`. The previous goal turn was progress: v111 delivered independently reviewed financial-exception closure and verified actual clearing reversal/reopening. This batch connects that boundary to operators. The full platform goal remains active.

## Delivered implementation

The existing reconciliation suspense queue now opens an exception case browser. Its tenant-scoped, service-owned read model offers open/all views, twenty-record keyset pages and complete matching counts from one repeatable-read transaction. The catalogue distinguishes financial-review support from investigations requiring their own source/security evidence. Support is not eligibility or approval.

Selecting a case loads its current state and paginated retained proposals/decisions. History verifies receipt hashes, record identity, independent decision lineage and scoped audit records. It exposes reasons, actor references, dates and receipt references, without returning private before-images or certificate payloads. Historical reads remain available after reopening; they do not claim that old financial evidence establishes current readiness.

Operators enter a reason, verify current financial/source evidence and explicitly submit a proposal. Another authorized person opens that proposal from history, enters a decision reason and approves or rejects. The proposer cannot decide; the run maker cannot approve. Server services retain current permission, fresh-authentication, tenant, stale-revision and transactional/idempotency controls. Closure does not post money or sign the run.

The panel uses existing dashboard surface/border/brand/trust tokens, Button/Input/Textarea components, inherited organization context and the current authenticated shell. Review panels use the existing attention treatment. Retained approvals have descriptive text rather than a current-success color. All new copy is present in EN/FR. No new schema, migration, package or provider is introduced.

## User procedure and information needed

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation`, then **Review exception cases / Examiner les dossiers d’exception** in the suspense queue. Accounting read permission is needed in addition to reconciliation read. Your administrator assigns these existing permissions; a browser selection cannot grant access.

1. Select an open case, or switch to all cases to inspect a resolved case. The application supplies its ID, current state, type and retained history.
2. Complete the financial treatment in the existing suspense resolution workflow. If the original source link is missing, review its original evidence through the source-link workflow. Security/source investigations require their own evidence; this financial closure path cannot substitute for them.
3. Enter why closure is justified. Obtain that information from the actual investigation and retained financial/source records. Verify the preview; the server supplies its evidence revision and financial decision reference.
4. Submit the proposal and confirm your current password if prompted. Password verification never automatically sends the request. Explicitly retry when ready. The exact request is retained in this tab under organization, actor and case scope.
5. An independent authorized reviewer opens the proposal from case history, examines its reason/current evidence, enters their own reason and approves or rejects. The system generates proposal/decision IDs, actor references, timestamps and audit records; users do not invent or paste these IDs.
6. Inspect the retained decision and current case state. The reconciliation run still needs its separate review/sign-off process. A later financial reversal may reopen the exception while preserving its earlier decisions.

After a recoverable failure, refresh records or retry the retained request. If the source changed, inspect current history before explicitly clearing the local request and preparing a new one. Clearing local state cannot undo a server decision. An unreadable local draft blocks new writes until records are refreshed and the local request is explicitly reset. A committed request followed by a failed refresh displays its receipt reference and the refresh failure separately.

## Verification ledger

- Initial focused service/action run: 39 tests in two suites passed; process exited 1 because the sandbox denied writing its JSON result. Receipt `85362a`. This is not recorded as a successful command.
- Expanded service/action/source/manifest regression: 59 tests in four suites passed, exit 0. `evidence/exception-workbench-v112-tests.json`, receipt `0c3861`.
- First UI typecheck and lint found one missing closing brace in the refresh-failure handler. Corrected without changing domain behavior. Failed receipts `7ec70d` and `f01c6e` remain evidence of the attempt.
- Eight changed TypeScript files linted successfully, exit 0, receipt `bf958e`.
- The following configured typecheck identified an unsafe generic indexed access in the new panel's action-result type (`201d8e`). Replaced it with conditional inference; this is a type-only correction. A browser run spanning that correction must not be used as stable-source proof.
- Final configured typecheck and actual owned EN/FR browser journeys: results pending at this record's creation. No pending check is a pass.
- Final configured typecheck completed with exit 0 (`73b9e6`); eight changed TypeScript files passed lint after the type correction (`0557aa`). Browser results remain separately assessed.
- First browser attempt `lanes/environment/exception-workbench-v112-browser-db26a8be-bc6.json`: both languages confirmed read-only denial, then failed waiting for a proposal receipt because the verifier tested prompt visibility before the password challenge finished rendering. Screenshots confirm the safe retained request and password prompt. Replaced the instantaneous check with an awaited assertion. The fixture's genuine initial exception state is `RESOLUTION_PROPOSED` after financial preparation, so preservation checks now compare against that recorded state instead of assuming `OPEN`. Source stability also failed because the type-only correction occurred during this run. These attempts are not browser passes. The first cold EN route observation was 190386 ms; later observations were 23399–42896 ms. These are local development observations, not production budgets.

## Review responsibilities and remaining scope

Architecture/backend/data: service-owned read models, repeatable-read totals, stable bounded pagination, redacted history and preserved transaction boundaries. Security/IAM/privacy: protected read/write actions, current tenant/actor binding, fresh authentication and independent review; private retained payloads stay server-side. Finance/controls/audit: source/financial treatment remain separately verified, immutable decision lineage is retained, and no run certification is implied. Frontend/UX/localization: existing shell/components, EN/FR, recoverable drafts and explicit request retry. Quality/SRE: focused regressions and actual local browser evidence; local timings are observations with no approved production budget. Packaging: existing module enforcement is reused; no commercial eligibility or pricing change. Rollout/support: no migration/deployment; retain server receipts and refresh before changing local requests.

Country-pack/statutory rules: no new statutory interpretation or certification; operational evidence still requires appropriate expert review. POS/offline, purchasing/AP, payroll, analytics and AI/agents: not applicable to this bounded change because their behavior, data and authority do not change. They remain in the full-platform workflow register.

Still required: nonfinancial investigation adapters; terminal legacy/domain evidence compatibility; reviewed-run preparation and genuine sign-off/export/reopening; remaining full-platform workflows. This batch does not clear X1, authorize production activation or establish complete platform verification.

Visual inspection of the second run's English desktop and 320-pixel history screenshots confirms retained-decision labels and non-color state explanations. The narrow view wraps without horizontal overflow, but nested panel padding leaves too little reading width. Reducing that mobile nesting remains a concrete UX correction; reflow alone is not a complete mobile-quality pass.

The second browser run completed successfully (`019e23`, `lanes/environment/exception-workbench-v112-browser-2e643fef-d55.json`) with stable source. Both languages verified read-only denial, proposer decision denial, independent rejection/approval, password verification, retained-request reload, exact proposal replay with one receipt, verified history, all-case discovery, 320/768/1440 reflow and focus return. Monitored financial records within each owned fixture remained unchanged during closure. No page errors or missing translations were observed. CSS preload warnings were retained (19 English observations and 18 French observations); they were not reclassified as clean console output. Warm development route observations were 15,526/16,509/17,149 ms in English and 15,385/19,181/10,699 ms in French. No approved performance-budget pass is asserted. The French narrow screenshot also confirms the reading-width issue noted above.


## Final batch binding

Final typecheck passed (receipt 73b9e6). Browser evidence: lanes/environment/exception-workbench-v112-browser-2e643fef-d55.json; both EN/FR journeys passed with stable source. Six desktop/tablet/mobile screenshots are referenced in that record. Console observations are retained separately; browser passes do not establish broad accessibility or production performance certification. The initial failed command attempts remain documented above.

Source baseline: evidence/source-baseline-v112.json, 2026-09-13T09:24:45.270Z, branch codex/migration-control-plane-release-2026-08-29, commit a05a41ef66cd5d98fd69ae3df18225795f912232. Aggregate: evidence/exception-workbench-v112.json. Coverage: 234 provisional workflows / 0 whole workflows complete / 212 unmapped entry sources. Further exceptional browser recovery and nonfinancial investigation/run-signing handoffs remain required.
