# Workbench lifecycle component checks

Evidence date: 2026-09-05. This is component and translation evidence, not actual browser, production or accessibility certification.

Source: `components/modules/ModuleCompositionWorkbench.tsx`, its scoped CSS, the existing `moduleComposition` EN/FR namespace and `components/modules/__tests__/ModuleCompositionWorkbench.test.tsx`.

| Attempt | Actual result |
| --- | --- |
| First expanded 18-test run with the existing 5-second per-test limit | 3 passed, 15 failed; 132.541 seconds. Fourteen tests timed out and one new test used a duplicate summary/legend text selector. The selector was scoped to the summary; timeouts were investigated with a focused rerun. |
| Focused retailer recipe with 20-second limit | 1 passed, 17 intentionally unselected; 7.293 seconds. Assertions unchanged. |
| Full 18-test rerun with 20-second limit | 18 passed; 29.225 seconds. Command subsequently exited 1 because the optional JSON evidence write was denied (`EPERM`). No JSON result was produced by that attempt. |
| Final expanded scope/retained coverage with 20-second limit and authorized evidence write | 22 passed, 0 failed; 53.534 seconds; command exit 0. Actual Jest output: `workbench-lifecycle-final.json`. |
| Scoped ESLint | Passed, exit 0, for the workbench and its test file. |
| Independent UI review regression suite | 25 passed, 0 failed; 68.4 seconds; command exit 0. Actual Jest output: `workbench-lifecycle-review.json`. Includes exact-command identity retries for Save/Reopen, preserved focus and newer-operation completion notice. |
| Final sandbox catalogue visibility correction | 1 passed, 24 intentionally unselected; 13.475 seconds; command exit 0. Actual Jest output: `workbench-lifecycle-sandbox-card.json`. This focused rerun verifies the last one-line presentation change and the expanded sandbox assertion after the full 25-test checkpoint. |

The per-test limit was raised at execution time to distinguish time spent on the expanded interactive workbench from functional failures; assertions were not weakened. The failed first attempt and unsuccessful evidence write remain recorded above.

The final suite covers draft recipes/dependencies/search, server-bound review and identity confirmation, preserved drafts, stale snapshots, durable draft reopening, authorized destinations, French labels, hydration, requested versus active revisions, permitted same-operation resume, unsupported stop rejection, offline-stop explanations, authorized historical links, reactivation as a new draft, actual tenant payroll scope and an explicitly limited compliance sandbox.

The reconciliation owner added a further observation label while the suite was running. That additive message key does not occur in the component fixtures; the subsequent read-only registry audit checks the current EN/FR dictionaries against every current issue, requirement, operation and observation code. Browser evidence and full source/build bindings are owned by the integration verification record.

The subsequent independent review also checked stopped workspace-card wording, dependency propagation, the inventory count continuation guard, tenant-derived action identity and lifecycle revision/authority checks. No new backend authorization bypass was established in that bounded review; this is not a security certification. Accounting stop remains unavailable because of its required reconciliation dependent. Current supported stop controls are Inventory, Purchasing and Payroll; Sales, POS and Payment reconciliation also remain unavailable.

The catalogue uses detailed preparation requirements for its user-facing setup statements. The server owner removed the conflicting coarse setup advisories from preview and derived the compatibility setup field from those same requirements. A verified compliance sandbox remains visibly limited in the catalogue, review and recorded lifecycle. That backend change is verified in the owner's separate service evidence; component tests do not certify it.
