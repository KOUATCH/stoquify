# Purchase approval: retained attempts

All runtime attempts use the owned local verification database and synthetic `workflow_supplier_ack_` records. Original payment, journal and non-fixture role invariants were unchanged in each completed runtime receipt. A failed attempt remains failed; later evidence does not overwrite it.

## Baseline and database checks

- `../lanes/environment/purchase-approval-before-f5523891-31e.json` (`46f2e6`): five successfully reproduced defects, not five correctness passes: revoked role/session accepted, changed reviewed line accepted, expired password assurance accepted, exact retry rejected after the original approval.
- `../lanes/environment/purchase-approval-after-14444ea2-b5c.json` (`82758b`): first five corrected groups passed.
- `../lanes/environment/purchase-approval-after-0d7946aa-b2c.json` (`61435a`): ten groups passed, adding tenant/requester/grant cases, concurrent identical commands, later-state recovery and atomic rollback/retry. Later read-model changes require a final source-bound rerun.

## Automated checks

- `purchase-approval-tests-01.json` (`c736bd`, `33b59e`): 67 tests passed; register suite could not load the unmocked localization boundary. Added its appropriate test boundary.
- `purchase-approval-tests-02.json` (`c0711f`): 69 tests / six suites passed.
- `purchase-approval-tests-03.json` (`fc83ef`): 114 tests / ten suites passed. Further register regression and final presentation changes require the final rerun.
- `purchase-approval-tests-04.json`, `purchase-approval-final-checks-31e3c346-91c.json` (`5f1ba2`): 114 of 115 tests passed, including the new initial-navigation regression. The password/credential-exclusion UI test exceeded its five-second deadline. Typecheck/lint were not run after that failure. Retried the unchanged assertions and timeout with a new receipt; no gate was relaxed.
- `purchase-approval-tests-05.json`, `purchase-approval-final-checks-52744def-518.json` (`ae2edb`, `2e12b3`, `b26817`): 115 tests / ten suites and typecheck passed. Lint had zero errors and one cleanup-counter warning. This preceded the final register identity fix. The counter cleanup subsequently uses a stable callback; final checks are retained separately.
- Typecheck attempts `6f866c` and `4a8770` exposed nullable response contracts, requester-name typing and a hook aggregator reference; corrected. `584ac6` passed, but concurrent edits make it insufficient as final binding.

## Actual-browser attempts

The following JSON receipts and their unchanged PNGs are in `../lanes/environment/`.

| Receipt | Result and follow-up |
| --- | --- |
| `purchase-approval-browser-20fb5545-7b7.json` (`944984`) | Both approval buttons absent because the order DTO omitted requester ID. Preserved creator/approver IDs in the read model. Shared `app/globals.css` also changed during this attempt; source stability failed and that unrelated edit was preserved. |
| `purchase-approval-browser-929246ee-157.json` (`46aff2`) | EN keyboard opening/focus return succeeded before review reset; FR hit a development-runtime syntax error. Stabilized callback refs, added a regression test and restarted only the owned app. This did not by itself establish the register reset's cause. |
| `purchase-approval-browser-aad8967a-2f0.json` (`c01ab4`) | EN/FR stale-review paths and normal widths passed, but 200% CSS text reflow overflowed. Corrected local dialog grid, wrapping, padding and button sizing. |
| `purchase-approval-browser-32432b01-6d5.json` (`374b34`) | Both detail approval journeys, keyboard return and responsive/reflow checks passed. Register review then disappeared before submission; both complete journeys failed. |
| `purchase-approval-register-probe-637921a1-c16.json` (`e430ab`) | Valid session and preview; register dialog appeared then disappeared. No approval request was sent. |
| `purchase-approval-register-probe-fafd7d95-bab.json` (`c71f37`, `235784`) | Temporary state instrumentation showed remount/reset, with no close-handler event. Debug instrumentation was subsequently removed. |
| `purchase-approval-register-memory-probe-190dbb78-def.json` (`556533`, `fbb70b`) | Deferring screenshot file writes did not prevent the reset. Navigation events coincided with reset; no Fast Refresh event explained it. Filesystem watching was an unconfirmed hypothesis, not an established defect. |
| `purchase-approval-browser-3db0eeaa-0ca.json` (`2dfea9`) | Both sign-ins returned HTTP 500 before approval could be tested. Restarted the verified owned development app (`c769ef`, `545f28`, `0880d0`); no production process or data reset. |
| `purchase-approval-browser-64ca9e16-409.json` (`53cc53`, `82941d`) | EN detail passed; register showed a build error caused by the newly added query variable colliding with an existing export-query variable. FR sign-in then returned 500 while that build failed. Renamed the new variable and ran automated checks before retrying the browser. This was an implementation error, not evidence of an authentication defect. |
| `purchase-approval-browser-27481b73-717.json` (`fc45a6`) | Both full detail approvals passed again, but both register reviews still disappeared. The unchanged-search guard did not solve the reset. A dedicated route-history probe was prepared before making another behavioral correction. |

Source inspection found that the purchase register scheduled URL search normalization on initial display. Its shared hook already compares the resulting URL. Skipping an unchanged search and initializing from the current query did not solve the observed review interruption. The screenshot-file hypothesis also failed the memory-only probe. These hypotheses must not be reported as established causes.

## Register identity diagnosis

- `purchase-approval-navigation-probe-9e0c173a-f8d.json` (`f20fc9`, `939221`): same-path router history replacements; no redirect explained the reset.
- `purchase-approval-presence-probe-38eb2d4f-5b9.json` (`5e2227`): reproduced EN/FR without any screenshots, excluding capture as the cause.
- `purchase-approval-presence-probe-6e3ef1b3-bd3.json` (`b0464b`): removing the nested loading boundary did not fix it. Restored the route; `cac85a` verifies its hash again matches source v51.
- `purchase-approval-fiber-probe-cfbf91e0-504.json` (`5bfd43`, `0c6f0e`): component types and keys matched before/after. This alone did not show which mounts were replaced.
- `purchase-approval-mount-probe-51c98cc8-7ba.json` (`3c20ea`): in both languages the register mount and all its descendants were replaced; its parent and remaining ancestors persisted. The register was a memo-wrapped client export.
- `purchase-approval-mount-probe-8caf9412-f31.json` (`15636a`, `f81530`): after removing only the register's outer memo wrapper, both languages retained mount 7 before/after the response and kept the review open. This is bounded evidence about this route/runtime, not a claim about all React memo usage. The unsuccessful search change was then restored too.

An attempted final-check invocation (`5c3755`) stopped at the existing-receipt guard before running tests; it did not overwrite test receipt 05. The final invocation uses receipt 06.

## Tool execution limitations

Scoped helper writes initially returned filesystem `EPERM` (`3ebc30`, `830f46`); scoped escalated retries succeeded. CRLF/exact-match failures in the one-use UI editor (`c23250`, `8f1ae9`) were resolved with narrow edits (`7d0908`, `09673b`). These were not automatic approval-review rejections. Earlier unrelated global authentication/provider review rejections remain respected.

The final checkpoint links the final passing source-bound database, browser, test, typecheck and lint evidence. No native screen-reader, native browser zoom, full release build, live deployment, X1 clearance or full-platform completion is inferred from these attempts.
