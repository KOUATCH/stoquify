# P09 — Synthetic archive fixture and verification manifest

18 October 2026. [Static fixture](../../../../services/organization/__fixtures__/authorized-archive.v1.json); [contract checker](../../../../services/organization/authorized-archive-contract.ts); [independent reader and negative tests](../../../../services/organization/__tests__/authorized-archive-contract.test.ts).

Fixture `p09-fixture-v1`, organization `synthetic-org`, snapshot `synthetic-snapshot-1`. Hand-authored fictional data only. Generated/effective/recorded time `2026-10-18T00:00:00Z` is a **fixed fixture clock**, not the test-run timestamp. No real credentials, account, transaction, bank details, customer or provider operation. `synthetic@example.invalid` is deliberately non-deliverable. No database/application import, upload or download occurred.

| Dataset | Records | Reconstructed meaning |
|---|---:|---|
| organization-settings | 1 | XAF, Africa/Douala, FR/EN; synthetic scale 2, not a legal precision decision |
| locations | 2 | Shop A and warehouse B |
| roles-membership | 4 | Owner/cashier role definitions and two principal references; no login material |
| item-unit-tax-codes | 1 | Item A, EACH, quantity scale 0, translated names; tax absent |
| customer-supplier-masters | 2 | Fictional customer/supplier; contact email requires explicit party.contact scope |
| attachments (record descriptors) | 2 | Receipt and receipt-of-goods evidence records point to actual synthetic text bytes |
| sales-returns-shifts | 1 | Sale A: 1 EACH, XAF 1,250.00, original SalesOrder source ID |
| purchasing-ap | 1 | Purchase A: 2 EACH, XAF 800.00, original PurchaseOrder source ID |
| journals-source-links | 4 | Two balanced posting pairs, document control debit/credit total XAF 2,050.00 each |
| audit-approvals | 1 | Owner review of cashier sale with receipt evidence |
| opening-closing-positions | 2 | Site A 5 + 2 purchased − 1 sold = 6; site B 7 + 0 = 7 |
| **Total** | **21** | 11 JSON dataset files plus 2 text attachments = **13 files** |

`manifest.files` holds exact byte length, SHA-256, MIME and per-file count. The content strings are the canonical bytes when encoded as UTF-8; do not prettify/reformat them without changing hashes. The outer fixture JSON is an in-memory transport, not a released ZIP format. `MANIFEST.json` in evidence separately fingerprints the source/fixture/artifacts for this run. That provenance hash is not an authorized customer archive signature.

The fixture explicitly marks 11 categories included **only for their bounded DTO subset**, seven blocked (stock/receiving/transfers; payments/reconciliation/AR; close/review/comments; import provenance; offline pending; analytics/reports; commercial lifecycle), and two excluded (payroll, credentials). Completeness is **partial**. A PO-shaped row does not prove supplier invoices/payments; stock positions do not prove valuation; postings do not prove a whole GL; an approval does not prove a complete audit trail. The detailed production requirement/blocker for each category is in PORTABILITY_COVERAGE.

## Check design

The manifest validator imports only Node crypto and installed Zod. Tests read the checked-in static fixture; they do not call the fixture authoring helper. The independent reader reconstructs fixed expected source IDs, links, attachment text, two site positions, and exact debit/credit totals using its own code and handwritten expected values. It does not reuse the validator, schema or decimal aggregation helper. This prevents the test from merely comparing an exporter to itself; there is no exporter in P09.

Negative fixtures cover file/byte/row/total/hash disagreement; missing category or duplicate category/path/record ID; incomplete claims; declared credentials; authority mismatch; unauthorized contact scope; extra credential/bank/provider fields; missing/wrong links; removed required evidence; removed evidence/attachment even after resealing; traversal/drive/remote paths; unknown version; incorrect units/currencies/stock movement/position; unbalanced journal; numeric instead of decimal-string money; and mismatched currency labels at zero. A positive exact-money case exceeds JS safe integer range. On failure the checker exposes error codes and **no reconstructed records**.

This does not prove every secret can be detected in free text or an attachment, exporter source completeness, live authority, storage integrity under failure, size/zip-bomb safety, production currency conversion, or reconstruction in another vendor. Those require the P10/P16 decision/runtime work. The input envelope is a bounded synthetic validator, not an untrusted production upload interface.

## Reviewed invocation

```powershell
npm run agent:workflow:check
node docs/retention/execution/P09/evidence/run-tests.cjs
```

Workflow script/lifecycle/registry reviewed before execution. The test helper invokes installed `node_modules/jest/bin/jest.js --config jest.retention-archive.config.cjs --runInBand --no-cache --json --outputFile <dated-owned-path>`, captures the real child exit status and writes logs/results under P09. Configuration uses `nextJest()` **without project dir**, one exact suite, narrow roots, node environment, no app setup/Prisma mocks/dotenv. It imports only the pure module, static fixture and Node crypto. No package script/registry changed; this direct lane was reviewed independently, not treated as implicitly approved by V1.

First run: 41/41 pure cases passed. Review added category/file declaration, MIME, negative quantity, stock-to-transaction checks; next run: 45/45 passed. Review tightened zero-currency matching and prevented returning records on failure (46/46 passed), then added a Windows reserved-filename rejection. See RESULT for the final 47-case run and exact timestamps/exit status. All intermediate outputs are retained, not summed as separate coverage. Existing customer/AP/background tests were inspected only. No broad build/typecheck/lint/test suite, migration, seed, network/provider call, browser or database was run.
