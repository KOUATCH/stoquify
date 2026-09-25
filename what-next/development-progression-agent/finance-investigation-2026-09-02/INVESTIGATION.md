# Finance route latency and zero-row investigation

Date: 2026-09-02. Local development investigation; not release evidence.

## Findings

The historical local capture cannot establish finance route latency or data absence. Its 42 artifacts include 21 raw zero-row counts, and reported `usefulResultMs` spans approximately 7.8–63.2 seconds. That timer stopped after authorization requests, an accessibility scan, layout checks, directory creation, and a full-page screenshot. It measured the capture workflow rather than time to useful data.

The harness did not wait for data to load. Rows were counted after the screenshot, so metadata could describe a different render from the image. The French mobile payables screenshot shows skeletons even though its metadata reports one row.

| Observation | Evidence and explanation |
| --- | --- |
| Receivables sometimes showed zero rows | The French desktop screenshot explicitly displays the loading state. A read-only query now finds 12 receivable documents issued by the current as-of date. Their issue dates are May 1–12, 2026. An archived English mobile artifact also counted 12 rows. Zero during loading is not an empty ledger. |
| Cash flow sometimes showed zero rows | The English desktop screenshot displays skeletons. Other artifacts counted 13 statement lines. There are no month-to-date payments in the current fixture, but zero cash activity does not imply that a statement has no rendered lines. |
| Payables showed zero or one row | All 12 fixture payments are incoming; there are no outgoing purchase-order payments. The disbursement table can legitimately be empty. The old counter included the table's single empty-message row as if it were a payment. This says nothing about the separate outstanding-payables summary. |
| Financial statements always showed zero rows | The default Overview renders summary cards and metric rows using divs. The archived image contains balance-sheet values despite having no HTML table. Current default period is September 2026: zero posted/reversed entries in that period, versus 14 cumulative entries through period end. Period P&L zeros are consistent with those dates. |
| Journals and other tables counted rows | Raw `tbody tr` counts could include empty placeholders. The fixture currently has 14 posted/reversed entries; historical journal captures counted 15 rows across draft and posted sections. |

Read-only fixture evidence: [fixture-observations.json](./fixture-observations.json). The transaction verified `transaction_read_only=on`; no fixture data was changed. Aggregate queries took 3–34 ms in this sample. These are **not** full-service or browser latency measurements and do not rule out slower joins, authorization, compilation, or rendering.

## Changes

- Added a shared route-aware observer to both local and approved X1 capture harnesses. It waits for the expected data surfaces and explicit ready/empty states, recognizes the financial-statement summary, and rejects errors or access-denied states.
- Exposed existing table and finance query states as DOM attributes. Pending and refreshing data cannot pass as a successful empty capture.
- Counted visible data rows while excluding headers, hidden copies, and single-cell colspan placeholders. Results distinguish `table-rows`, `table-empty`, and `summary`; table emptiness does not claim the entire page has no business data.
- Stopped `usefulResultMs` at data readiness. Version 2 measurements separately record navigation, authorization, accessibility, screenshot, and total capture elapsed time.
- Required the result classification and count to agree immediately before and after the screenshot. A render transition causes capture failure rather than misleading metadata.
- Retained authorization, tenant-isolation, accessibility, layout, and external approval checks. Historical evidence files remain unchanged.

The source read path confirms that finance dashboard reads already fan out using Promise.all. Receivables and accountant-portal hooks correspond to knowledge-graph communities 21 and 30 in `graphify-out/graph_hooks.json`; current source was used to verify their query behavior. No speculative backend optimization was made.

## Live measurement limitation and next action

The available Codex browser session redirected to login. An existing Edge dashboard displayed a Runtime ChunkLoadError for its dashboard bundle, and subsequent Edge control attempts could not attach reliably. Current development trace entries also include login requests and webpack rebuilds; they cannot be used as authenticated finance measurements or explain the older capture conclusively.

A fresh authenticated local capture remains necessary. Reuse or sign in as the local fixture external accountant, reload after the development build settles, then run the corrected local matrix under a new run ID. Record cold and warm runs separately. Review version 2 useful-result timings before deciding whether a specific route or service needs optimization. Formal X1 release approvals remain separate and unresolved.

Validation: 25 tests passed across five focused suites (readiness, evidence binding, history contracts, cash-flow table, and evidence validation). The corrected local Playwright configuration lists 43 tests: 42 route/locale/viewport cases plus aggregation. Listing did not run a browser capture. Machine-readable results: [focused-tests.json](./focused-tests.json). No fresh authenticated screenshots, latency improvement, or release readiness is claimed by this investigation.

## Historical sources

- `what-next/evidence/finance-x1/local-simulation/LOCAL-X1-20260901144339/manifest.local-simulation.json`
- `screenshots/desktop/fr/receivables-history.png` under that run
- `screenshots/desktop/en/cash-flow.png` under that run
- `screenshots/desktop/en/financial-statements.png` under that run
- `screenshots/mobile/fr/payables.png` under that run
