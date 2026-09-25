# Reconciliation preparation workbench — v115

The existing reconciliation workspace now contains a searchable, paginated run browser and preparation review. Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation`, then **Review reconciliation runs / Consulter les rapprochements**. The default list contains runs awaiting review or sign-off; **All runs** includes retained history for other states.

## Delivered behavior

The server owns run discovery, complete filtered counts, current status, preparation preview and verified history. Run and history pages contain at most 20 records with deterministic cursors. History returns the recorded actor, time, reason and receipt ID, excluding the private before-state, request digest and source evidence. A retained receipt is explicitly historical; it does not establish current readiness or signature.

The review uses the existing dashboard shell, semantic tokens, controls and button hierarchy. Selection and preparation use brand treatment; neither displays an approval/health badge. Current status, reason, requirement results, history and recovery controls are translated in EN/FR. Inline named regions receive keyboard focus; no additional dialog or theme wrapper was introduced.

Prerequisites explain the next action: verify provider/settlement setup, review the open accounting period, import external evidence, close exceptions, complete suspense treatment, or inspect ledger/source provenance. A failed query remains an error. Signed or otherwise ineligible runs return an explicit state explanation without offering a valid preview revision.

The selected run and exact request survive reload. Draft storage is scoped to organization, actor and run. An unreadable draft blocks submission; reset first reloads authoritative history, then discards only the local request. A failed reset retains local bytes. Password confirmation does not automatically resubmit. Explicit retry uses the original reason, preview revision and UUID. A saved receipt is reported even if subsequent refresh fails.

Read access requires reconciliation and accounting read. Submission additionally requires current run authority and the existing enforced module/fresh-authentication boundary. Preparation cannot sign, post money or bypass an independent reviewer.

## How to use it and where inputs come from

1. Search using a provider name or existing run reference from reconciliation records. Select the run and read its current status and history.
2. Enter a meaningful review reason describing the evidence and obligations examined. This is the only new substantive operator input.
3. Select **Check preparation requirements**. Resolve the displayed prerequisite through the existing provider setup, statement import, exception review or accounting workflow. The source revision comes from the server; do not invent one.
4. Select **Prepare for independent sign-off**. If prompted, enter your current account password, then explicitly retry. Keep the browser draft if the result is uncertain.
5. Read the receipt and current status. An independent authorized signer must still complete sign-off. The existing signing service rejects source/setup changes after preparation.
6. For a correction to a financial outcome, use the existing source recovery workflow. Refresh this review afterward: reopened status and old preparation history are displayed separately. Resetting a browser request never reverses server decisions.

## Verification record

Passed: 101 focused tests across six suites (37 preparation tests and 64 existing workbench/signing/detail regressions), plus a final four-test component rerun after cleanup. Final full typecheck passed (`5da123`). Both actual EN/FR browser journeys passed with stable source (`a46d67`), retaining ten screenshots: `lanes/environment/run-preparation-v115-browser-a0f2d0d3-bac.json`. The checks cover read-only denial, current prerequisites, password confirmation, reload and exact retained submission, actual preparation/history, source-owned reopening, 320/768/1440 reflow and keyboard focus return. No page errors or missing translations were observed; CSS preload warnings remain recorded.

Local route-load observations: English 57023/14997 ms and French 10124/7092 ms. These shared-development-environment observations do not meet any claimed production budget; investigate the slow first load separately. They are not evidence of production performance certification.

The first browser attempt, `lanes/environment/run-preparation-v115-browser-fa3f9620-25f.json`, failed in both languages because its helper waited for a run-list screen after hydration had already restored the selected run. Screenshots showed the saved request remained available. The helper now recognizes either the list or restored detail. That attempt also has changed source during execution and is not a final integration pass.

Initial full typecheck found unfinished inventory syntax outside this batch (`d62e05`). Later full typecheck passed (`8bad60`). The initial workbench regression could not load its server-action imports (`f0ef71`); narrow mocks for unrelated server-action boundaries fixed that fixture, without mocking the main workbench under test. Windows held the test file in a memory-mapped section, preventing truncating writes; an authorized append preserved existing content. The production authentication path was unchanged.

Eight-file lint initially returned one cleanup-ref warning (`0679f4`). Removing an unnecessary cleanup counter increment resolved it; the changed component and existing workbench test lint then passed (`af54c3`). Exact counts and source bindings are retained in the aggregate evidence. Selected skill: `009-aqstoqflow-payment-reconciliation-moat`; the next numbered recommendation is `010-aqstoqflow-inventory-valuation-kernel` after completing the current reconciliation handoffs, without reducing the whole-platform scope.

## Rollout, recovery and remaining work

No schema migration, production deployment, live activation, external delivery or X1 approval was performed. Keep the v114 preparation receipt and signer-validation implementation when rolling presentation changes back. Do not delete retained receipts or reset signed statuses manually.

Remaining verification includes native assistive technology/zoom, additional role and module combinations, larger history pages in PostgreSQL, deliberate committed-response loss in the actual preparation browser journey, conflicting reviewers, and the complete independent-signing/export browser handoff. The v114 owned service journey verifies genuine signing/export/reversal with synthetic inputs; it is not a substitute for those browser checks.

Architecture/backend/data/security/audit/finance responsibilities apply to the new scoped read models and existing preparation boundary. Frontend/design-system/UX/localization/accessibility responsibilities apply to the inline review and recovery flow. QA/release/operations apply to source-bound tests, actual browser results and recovery guidance. Commercial packaging retains existing module enforcement; no terms or prices change. Statutory/country rules, POS/offline, purchasing/AP, HRIS/payroll, analytics and AI/agents are not applicable to this bounded presentation/read-model change; their separate platform workflow work remains open. No professional certification is claimed.


## Final evidence binding

Actual browser result: lanes/environment/run-preparation-v115-browser-a0f2d0d3-bac.json. Both languages passed with stable source; local route timings and CSS preload observations remain in the receipt, without a production performance claim. Source: evidence/source-baseline-v115.json, 2026-09-13T10:30:54.559Z, branch codex/migration-control-plane-release-2026-08-29, commit a05a41ef66cd5d98fd69ae3df18225795f912232. Aggregate: evidence/run-preparation-ui-v115.json. Initial failures above remain retained.
