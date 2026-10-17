# Cash Command inventory and payroll navigation

2026-09-28T10:31:21.510Z. FA-CASH-COMMAND remains In progress. Previous turn delivered verified independent source admission; this turn completes three destination handoffs, not the full workflow.

The stock card now opens the existing inventory items route. Payroll payment/recovery and declaration links require the destination's page and workbench read permissions. Aggregate permission remains independent: permitted cash or payroll totals are preserved when destination access is absent. The destination link is disabled with visible EN/FR guidance. Cards, change strips, risks, action queues and the primary action use admitted destinations, and secondary signal permissions are preserved. Links across these representations retain the selected EN/FR locale; source identity and hashes are unchanged.

| Cash indicator | Destination | Additional destination requirements |
|---|---|---|
| Stock cash buffer | /dashboard/inventory/items | inventory.items.read |
| Employee recovery / payroll net pay | /dashboard/payroll/payments | payments.reconciliation.read and payroll.command.read, alongside payroll.payments.reconcile |
| Statutory liability | /dashboard/payroll/declarations | payroll.command.read, alongside payroll.declarations.manage |

## Verification and limits

- evidence/cash-navigation-checks-d4c78fcd-9e40-405a-8f8b-875ae63ddc89.json: 197 tests/seven suites, changed-file lint and full typecheck passed. Tests preserve aggregate values, verify each missing destination permission, disable alternate representations, preserve additional permissions, localize links and expose denial guidance without hover.
- lanes/environment/cash-navigation-5415d34a-4dad-47b2-8d90-b67b34a2adca.json: four passing actual authenticated EN desktop/FR 320px payroll journeys. Two completed inventory journeys are reused from lanes/environment/cash-navigation-5ecd6ed7-726d-46e7-af1e-e4bcebf246cd.json, with their source hashes checked against the same current code; that run later failed on a payroll hydration error, so it is not represented as an overall pass. All six journeys verify an initially disabled destination, authorized keyboard entry, the destination workbench, Back with retained language, permission withdrawal against an already-rendered link, and disabled links after refresh. Eighteen screenshots and development handoff timings are retained. Business-record equality before/after is verified by the passing payroll run; only owned synthetic roles were changed to exercise authority. This does not verify payroll posting, statutory compliance or production performance.
- Previous failures are retained: Jest needed its existing ESM routing configuration isolated while exercising the real localizePath function; TypeScript exposed a nullable drill-through return type and was corrected. Browser attempts revealed a default navigation wait timeout, an assertion aimed at an unrelated proof tooltip, and a strict selector encountering nested payroll main landmarks. The verifier was corrected without relaxing destination or revocation assertions. One run reported a hydration mismatch after payroll navigation, with the browser back on Cash Command; its original trace was truncated before the component detail. The follow-up captures trace tails and passed all four payroll journeys with no page errors. That intermittent defect remains unidentified and open. Nested destination landmarks remain a separate accessibility finding.
- Existing tenant source, payroll calculation and BI adapter runtime behavior are unchanged. Their prior source admission/proof evidence is retained through exact source bindings plus focused regression. Published design reports and unrelated working-tree edits remain intact.

## Using and operating the change

Open /en/dashboard/finance/cash-command or /fr/dashboard/finance/cash-command. A visible indicator does not guarantee access to its source workspace. If the link is disabled, ask the organization administrator to review the destination permissions listed above and current module read grants, then refresh. No extra approval record, migration or user-entered reference is required for these read-only handoffs. Neither link access nor a forecast grants authority to release a payment or approve a declaration.

No deployment or live customer activation occurred. Use existing release controls for rollout; inspect denied-link rates and destination errors. Rollback requires restoring the coherent Cash navigation projection, page localization and card mapping together; keep the already-verified pre-query source guards. Do not weaken destination route guards to make a link succeed.

## Remaining work and review

- Cash drawer destination requires finance.cash-drawer.read OR finance.read in addition to source CASH_DRAWER_READ. Align this remaining link and verify other finance/action-queue handoffs.
- An intermittent hydration mismatch occurred after a payroll handoff when back on Cash Command. Four subsequent EN/FR payroll journeys passed with no page errors; the cause remains unidentified and is not claimed fixed.
- Complete server-authored EN/FR copy, honest current-observation labels and empty-forecast grading.
- Verify remaining proof subjects, genuine posted payroll lifecycle and full accessibility/latency requirements. Payroll destination nested main landmarks were observed and remain with its broader accessibility review.

Security/backend/architecture: source rights and destination rights remain distinct; current route denial is verified. UX/product: useful totals survive restricted navigation, language and Back are retained, explanations are visible. Finance/data/audit: no business writes or proof-rule changes. Quality/SRE: bound tests and runtime evidence; no production latency or full accessibility claim. Packaging/operations: no grant expansion or commercial changes. Country rules, migrations, offline and AI: not applicable to these read-only links.
