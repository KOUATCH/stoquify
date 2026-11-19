# AF08 evidence and deliverable inspection

**Date:** 20 October 2026. **Fixture:** synthetic client and source data only.  
This document distinguishes artifact inspection from service, database and browser verification.

## Canonical financial controls

The database test uses an explicitly constructed historical posted ledger fixture, then the existing balance-sheet evidence proposal and independent approval services. The binder re-reads those controls through the existing source services.

| Pilot heading | Account | Currency | Opening | Additions | Reductions | Closing |
|---|---|---|---:|---:|---:|---:|
| Cash / settlement | 571 | XAF | 0.00 | 100.20 | 0.00 | 100.20 |
| Accounts receivable | 411 | XAF | 0.00 | 200.10 | 0.00 | 200.10 |
| Accounts payable | 401 | XAF | 0.00 | 80.00 | 0.00 | 80.00 |
| Inventory | 311 | XAF | 0.00 | 50.05 | 0.00 | 50.05 |

Supporting totals equal the ledger in all four columns, and all differences are 0.00. These are separate account controls, not a combined financial statement total. A separate SQL case introduces EUR cash evidence and confirms currency separation and immediate unavailability after withdrawal of approval.

Machine-readable evidence:

- [Canonical JSON](2026-10-20-run-01/sample-workpapers.json)
- [CSV schedule](2026-10-20-run-01/sample-workpapers.csv)
- [PDF binder](2026-10-20-run-01/sample-workpapers.pdf)
- [Retained hash and format checks](2026-10-20-run-01/reconciliation-checks.json)
- [Artifact inspection result](2026-10-20-run-01/artifact-inspection.json)

## PDF inspection

The actual PDF contains five A4 portrait pages: a scope/limitations cover followed by cash, receivables, payables and inventory pages. The cover identifies the client, accounting period, inclusive UTC endpoints, observation time, source revision/hash, review hash, canonical JSON hash and watermark.

Each schedule prints the ledger, supporting totals and differences in the same four-column order, with account/currency and retained source references. Every page carries the same draft watermark and page number. The binder is expressly not certified.

The PDF was rendered to images and visually inspected using the [five-page contact sheet](2026-10-20-run-01/workpapers-contact-sheet.png). Titles, numeric columns, evidence references and footers were present without clipping in this fixture. Text extraction confirmed scope, dates, watermark, draft labels and every displayed amount.

The initial fixed-width table notices were resolved by specifying the table width explicitly. The final sample was re-rendered from the unchanged retained canonical JSON. PDF creation time and file ID are derived from that publication, so equivalent retries produce deterministic bytes.

This is a focused synthetic artifact inspection, not a PDF accessibility certification or a guarantee for every future font/language/account-label combination.

## CSV and JSON inspection

The CSV contains a scope/review/hash/limitations manifest followed by four account schedules. Every row repeats client, period, account, currency, availability, source revision/hash and evidence identity. Twelve amount cells per account represent ledger, support and differences across the four columns.

The verifier parses the CSV and compares all those amount cells to canonical JSON. Dates remain explicit UTC strings, decimals remain exact strings, and currencies are never converted or combined.

Formula tests cover direct and whitespace/control-prefixed spreadsheet operators, embedded quotes and a formula-bearing account label in the actual rendered CSV. The escaping helper is shared with the pre-existing AR export.

JSON preserves the retained review identities, source bindings and redaction markers. The fixture deliberately includes a private-looking source description and conclusion; neither appears in exported JSON/CSV/PDF text. Source item details and attachments are not included.

## Service, database and component evidence

The focused lane passes 135 tests across five suites, including eight jsdom cases. It covers strict command validation, formula handling, deterministic rendering, existing balance-sheet controls, current authority regressions, EN/FR controls, explicit retry after authentication, uncertain-outcome key reuse and client-data clearing.

Ten real PostgreSQL scenarios cover (nine in the final authority suite, plus the targeted history-cap regression after the final source review):

1. Four nonzero schedules, preparation, independent review and three formats from one retained canonical publication.
2. Immediate source drift and denial of an old export replay.
3. Missing support, blocked positive review and changes requested.
4. Foreign-period denial, expired fresh auth, managed engagement suspension and revoked mandate.
5. Copy-only roll-forward with no inherited support or review.
6. Concurrent duplicate submissions/exports, failed export audit rollback and safe retry.
7. EUR/XAF separation and withdrawn source approval.
8. Superseded review history and old preview rejection after new preparation.
9. Session expiry during a real export-audit wait, with both publication and audit rolled back by the final authority check.
10. Rejection of a 101st decision without changing the stored count or losing read, exact-retry or export access.

The SQL fixture bypasses no application authority on the tested review/export services. Historical journal fixture construction is not presented as testing the production posting workflow.

## Authenticated browser evidence

The real Better Auth journey passes preparation, self-review denial, independent review after password step-up and explicit retry, and JSON/CSV/PDF downloads from one retained redacted publication. It does not mark the Close run certified.

English and French layouts at 1440px and 390px have no binder-level horizontal overflow; schedule tables have their own focusable horizontal scroll regions. All four scoped axe scans report zero violations, and no page errors were recorded. The desktop and French mobile screenshots were visually inspected: readable headings, separate ledger/support/difference rows, explicit draft language and wrapped source references.

The source-change check marks the old review stale immediately. The final module-denial check clears client figures. That check initially used an empty module list, which invokes existing legacy defaults; the corrected synthetic fixture explicitly omits Close while retaining accounting. Its targeted rerun passed. Initial cold-build/port-collision and fixture failures remain recorded rather than being presented as a single uninterrupted pass.

See `2026-10-20-run-01/browser-verification.json`, the retained pre-recovery report, logs and screenshots. The targeted recovery used the final service containing the separately SQL-tested history-cap guard; the UI was unchanged.

## Interpretation

These results establish the bounded AF08 behavior in the inspected working tree. They do not establish production-scale capacity, live client suitability, full statutory reporting, audit opinion, settlement approval or AF16 release readiness.
