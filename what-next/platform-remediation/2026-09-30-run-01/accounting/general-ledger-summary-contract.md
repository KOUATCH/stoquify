# R06 empty-range ledger acceptance remainder

Contract review and subsequent authorized implementation, 2026-09-30. The parent requested the compatible service/export changes below after the review; no new public action or CSV renderer was introduced.

## Confirmed current behavior and consumer paths

The reviewed implementation calculated opening balance correctly but returned only `lines.map(...)`. With opening 100 and zero June lines, it returned `[]`, losing the summary at export. The corrected shared report now calculates a versioned summary in the same repeatable-read snapshot; the legacy `getGeneralLedger` wrapper intentionally still returns transaction rows. Export preserves `data:[]` and adds opening/closing 100 in its hashed summary.

Current discovered production callers are:

1. `actions/accounting/reports.actions.ts::getGeneralLedgerAction`, guarded by `accounting.reports.read`, which forwards the array unchanged.
2. `services/accounting/reports.service.ts::exportAccountingReport` for GENERAL_LEDGER, guarded through `exportAccountingReportAction` by export permission/fresh authentication. It now keeps transaction rows in `payload.data`, adds `summary` with `general-ledger-summary.v1`, keeps transaction-only `rowCount`, and hashes the complete payload.

A repository-wide TypeScript/TSX search found no direct UI/hook consumer of these two action exports. This is a static search result, not proof that external/dynamic callers do not exist. No General Ledger CSV formatter or download consumer was found along this service/action path; `fileType:"csv"` currently labels the returned report payload. Do not claim browser/CSV acceptance from the service tests.

## Compatible implementation and remaining consumers

Items 1–4 below are implemented locally, with `getGeneralLedgerReport` private to the service. Its summary receives currency from the existing accounting authority during export assembly. Effective date/currency and decimal/sign semantics are explicit. Items 5–6 remain consumer/format work; exposing a new action was deliberately deferred because the existing export action can already return the additive summary.

1. Extract the existing repeatable-read body into `getGeneralLedgerReport(input)` returning `{ rows, summary }`. Calculate all totals from the same snapshot, including opening aggregate completeness checks.
2. Keep existing `getGeneralLedger(input)` as `return (await getGeneralLedgerReport(input)).rows` for array consumers. Preserve existing transaction-row IDs and row count; do not manufacture a journal entry for opening balance or attach custom properties to arrays that JSON would discard.
3. The summary contract should contain explicit decimal strings: `openingDebit`, `openingCredit`, `openingBalance`, `movementDebit`, `movementCredit`, `movementBalance`, `closingBalance`, `rowCount`, plus `amountBasis:"FUNCTIONAL_CURRENCY"`, effective start/end and functional currency. Define debit-positive sign semantics in the contract, regardless of account's normal balance.
4. Export GENERAL_LEDGER through the new report method, retaining `data: report.rows` and adding `summary: report.summary` to the hashed payload. Existing rows/rowCount remain compatible; the newly exposed summary is integrity protected. Keep report-schema evolution explicit rather than assuming all consumers tolerate additional fields.
5. Add an explicitly named report action (or a documented versioned response) for consumers needing the summary, under the same tenant scope and read permission. Existing array action remains available while callers migrate. For no movements, display “No movements in the selected period” alongside opening 100 / movement 0 / closing 100; an empty table must not imply a zero account balance.
6. Implement or locate the actual CSV adapter before claiming file export complete. It must preserve a clearly separated summary section/record type and the existing transaction row count, include the report's effective date/currency/provenance, and treat descriptions as data. JSON export includes both fields naturally.

## Additional period-label mismatch found in the export path

The reviewed export accepted `periodId` for provenance while querying only optional date bounds. A period-only request could label an all-history ledger as one period. The local correction now resolves the tenant period before reading financial data, derives omitted bounds from that period, and rejects explicit bounds outside the period or reversed bounds. Query, summary, normalized filters and filter hash use the same effective range. Trial-balance filtering remains unchanged.

- Resolve the tenant-owned requested period first.
- Derive effective range bounds from that period when dates are omitted. Define how explicit bounds interact with the period; conservatively reject contradictory ranges rather than silently mislabeling them.
- Use exactly those effective bounds in the query, normalized filters, provenance and filter hash. Do not attach one period's label to a different date population.

## Acceptance cases

| Case | Required result |
|---|---|
| Opening 100, no selected movements | `rows:[]`, rowCount 0, opening 100, movement 0, closing 100; JSON and actual CSV preserve summary. |
| Opening 100, debit 25 | One transaction row, opening 100, movement 25, closing 125; existing array row running balance remains 125. |
| Opening credit 100, debit 25 | Debit-positive opening -100, movement 25, closing -75; sign contract visible. |
| Foreign and functional currency lines | Nominal 100 EUR + 100 XAF report as functional 65,695.70 with explicit currency; no nominal fallback. |
| Missing opening base evidence | Blocked; SQL SUM skipping null must not turn unavailable evidence into 0. |
| No opening population and no movements | Known-zero summary distinct from unavailable evidence. |
| Period-only export | Query and hash use selected period bounds; pre-period activity contributes only to opening. |
| Conflicting period/date inputs | Explicit safe rejection or previously agreed intersecting policy, consistently represented in query/provenance/hash. |
| Archived or foreign account | Retained valid tenant account evidence allowed as required; foreign/missing account rejected without data disclosure. |
| Concurrent backdated posting | Real PostgreSQL test proves one repeatable-read snapshot for opening, movement and summary. |
| Existing array caller | Same transaction-only array shape; no synthetic IDs or extra financial entries. |

R06 remains **PARTIAL** pending final test capture, real PostgreSQL isolation evidence, actual file rendering/browser acceptance and reviewed accounting policy. Fiscal clipping, in-range running balances, compatible service/export summary and period/query alignment are implemented locally. The legacy array-only read action still cannot display a no-movement summary without adopting the export payload or a future explicit report action.
