# HR21 development08 — payroll-input handoff

Status: VERIFIED_SCOPED. Final checks and independent evidence closure are recorded in evidence.json and INDEPENDENT-REVIEW.md. Overall HR21 remains IMPLEMENTED_PENDING_VERIFICATION.

## Correctness fix

The actual native Next/browser download omitted the retained CSV's leading UTF-8 marker. Its bytes therefore did not match the immutable csvHash. The saved failed attempt02 contains the exact difference. The specific underlying Flight decoder mechanism is suspected, not independently established.

The retained-package server action now transports the original UTF-8 bytes as base64, omitting the raw CSV string. The client decodes once with strict UTF-8 while preserving any existing marker, then uses the existing download path. It does not add a marker, regenerate a CSV, alter the immutable record or bypass authorization. Original service API and JSON manifest remain unchanged.

Changed production files: actions/hris/payroll-handoff.actions.ts, components/hris/HrisPayrollHandoffClient.tsx and components/hris/payroll-handoff-download.ts. Long accented/quoted CSV regression tests cover marker-present and marker-absent content; malformed UTF-8 is rejected.

## Verification boundaries

| Evidence class | Result and scope |
| --- | --- |
| Source inspection | Independent source review approved transport fix, recovery helpers, fixture cleanup guards and retained-draft selector correction. Final consistency review recorded separately. |
| Pure/mocked tests | 29 passed across4 suites: byte decoding, contract exports, protected action configuration and handoff UI behavior. Before the action fix,2 new regressions failed and24 existing tests passed. No real database claim from these tests. |
| Bounded type checks | Diagnostics0 for handoff UI/client/actions and imported dependencies. No full application build claim. |
| Real database/native owners | Synthetic approved contract/document/destination/compensation prerequisites; actual native time certification and correction; real handoff action transactions. Two immutable packages, two recipient receipts, two issuance events and two recipient events. No payroll run/payment batch. |
| Rendered/browser | Actual isolated Next server, native credential sessions and password checks, Chromium:13/13 connected workflow stages, including fixture setup. Real CSV/JSON downloads matched retained bytes and SHA-256; independent CSV parser reconciled identities/dates/units/amounts/compensation/snapshots. EN blocker and French390px recipient screenshots inspected; no uncaught page errors. Not a full accessibility/console audit. |
| Safety and closure | Two negative startup checks prevented database/browser creation and replaced stale PASS evidence. Synthetic tenant/user/session/account rows cleaned. Named handoff deletion guards restored inside the cleanup transaction. Owned Next35584 and PostgreSQL55464 stopped and ports closed. Final manifest verifies source/runtime/evidence hashes. |

The browser retained both eligible employees while office attendance was missing, excluded exactly one draft employee, blocked issue, then accepted native certification. A deliberate source change after preview rejected issue without creating a package. Original totals:960 scheduled,900 worked,60 absent, XAF300.30 contract salary reference; compensation10.15 and20.25 preserved. These are synthetic reference amounts, not calculated earnings.

The addressed recipient had no preparation control, rejected one employee and accepted the other. Both downloads retained the rejection draft. A deliberately lost successful response followed by an explicit identical request produced only one receipt. Native correction changed office time480→450, leaving original artifacts and receipt intact; version2 linked version1 and contained870 worked/90 absent. The recipient acknowledged both replacement rows. Downloading the superseded original still yielded the original bytes.

Expiring server-side password assurance required password confirmation and an explicit retry; verification alone did not record another outcome. Revoking current salary visibility denied the download and cleared private workspace details. Restoring authority allowed exact recovery. The French narrow view showed the replacement and acknowledged receipt.

## Exploratory attempts and limitations

Attempt01 correctly blocked the initially malformed synthetic destination proof (requester also applier). A separate fourth synthetic actor corrected the fixture. Attempt02 reproduced the product CSV-marker defect. Attempt03 proved the fix through real downloads but the test looked inside collapsed details; attempt04 encountered multiple accessibility alerts and needed a scoped selector. These attempts remain FAILED with cleanup evidence and are not counted as qualification. The final frozen-source run passed all13 stages.

Contract/document/payment/compensation approval metadata is explicitly supplied prerequisite data, not proof of native hiring or approval workflows. Employee labels do not claim this slice independently tested shift allocation; development07 covers that boundary. The isolated harness made no external transfers, real operator grants, deployment or statutory calculation. Environment-file guard messages are expected in native source loading; no root environment was consumed.

Next: effective termination. Independent review identified a concrete integration gap where ended approved contract/compensation inputs are omitted from the final-period handoff. NEXT.md requires a native-termination regression and correction before broader lifecycle qualification. Hosting details are not a development dependency.
