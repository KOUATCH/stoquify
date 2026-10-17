# P03 — Synthetic fixture manifest

13 October 2026. Version `opening-fixture-v1`. **Synthetic, non-statutory, not imported or posted.** Organization `synthetic-cutover-a`; locations `site-a` and `site-b`; item units EA and KG. Foreign tenant/location IDs exist only in negative-test mutations.

## Retained files

| Artifact | SHA-256 / purpose |
|---|---|
| [Source JSON](../../../../services/onboarding/__tests__/fixtures/opening-position-source.json) | `ae9c0c9dfa0daa45ce7207d299457b050b945bba03d9b45e3f597f5c54a776c3` |
| [Independent control sheet](../../../../services/onboarding/__tests__/fixtures/opening-position-controls.json) | `6d4d13de88217f73e095f8cfbd0a787678258168f539de0b25470de64642cc1c` |
| [Test-only contract checker](../../../../services/onboarding/__tests__/fixtures/opening-position-contract.ts) | Integer precision, tenant/unit/source/review/coverage and accounting consistency checks; no posting behavior. Current hash in evidence/SOURCE_MANIFEST.json. |
| [Contract tests](../../../../services/onboarding/__tests__/opening-position-contract.test.ts) | Compare computed controls to independent literals, then mutate defects deliberately. |

The maker and reviewer IDs are fictional and distinct. `FIXTURE_APPROVED / NON_STATUTORY_ARITHMETIC_ONLY` is test input, not a real accounting or pilot approval. Reviewer D05 remains open.

## Source counts and independent arithmetic

| Category | Counts / interpretation |
|---|---|
| Master references | 2 locations + 2 items + 1 customer + 1 supplier = 6; no actual masters created. |
| Opening stock source rows | 7 received = 4 accepted + 3 retained rejected rows. |
| Open items | 1 AR residual and 1 AP residual; no historical invoice/payment migration. |
| Opening ledger | 5 proposed lines, using symbolic accounts only. |
| Position rows | 11 accepted (4 stock + 2 open items + 5 ledger) + 3 rejected = 14, excluding the 6 master references and review metadata. |

| Source ID | Location / unit | Quantity | Unit cost | Retained value |
|---|---|---:|---:|---:|
| stock-001 | site-a / EA | 10.000 | 100.00 | 1,000.00 |
| stock-002 | site-b / EA | 5.000 | 100.00 | 500.00 |
| stock-003 | site-a / KG | 2.500 | 400.00 | 1,000.00 |
| stock-004 | site-b / KG | 1.250 | 400.00 | 500.00 |

Independent totals: **15.000 EA**, **3.750 KG**; site-a value **2,000.00**, site-b **1,000.00**; each item value **1,500.00**; total inventory **3,000.00**. Never sum EA and KG into one physical quantity.

AR: external invoice 1,500.00 − settled-before-cutover 300.00 = **1,200.00** outstanding. AP: external invoice 1,000.00 − settled-before-cutover 300.00 = **700.00** outstanding. These are source residuals, not current posting requests. AP increases the GL credit despite the supplier subledger's debit-for-amount-owed convention.

| Symbolic GL control | Debit | Credit | Retained coverage |
|---|---:|---:|---|
| FIXTURE_INVENTORY | 3,000.00 | — | stock-001 through stock-004 exactly once |
| FIXTURE_AR | 1,200.00 | — | ar-001 |
| FIXTURE_CASH | 500.00 | — | retained source ledger-003; illustrative cash control |
| FIXTURE_AP | — | 700.00 | ap-001 |
| FIXTURE_EQUITY | — | 4,000.00 | retained source ledger-005; illustrative balancing source |
| Total | **4,700.00** | **4,700.00** | Difference **0.00** |

Cash/equity are declared source controls in this artificial data, not guessed production balancing plugs. Real cash statements, account mappings and retained source support are required at actual cutover. The independent sheet stores amounts in hundredths and quantities in thousandths as decimal strings; e.g. inventory 300000, debit/credit 470000. Exact integer arithmetic prevents binary floating-point drift.

## Rejections and deliberate negative cases

Retained `reject-001` has UNKNOWN_ITEM, `reject-002` WRONG_LOCATION and `reject-003` PRECISION (quantity 1.0001). These rows are not included in accepted values. Preserve their source IDs and rejection reason when proposing a correction; a corrected revision requires renewed review.

Tests also cover quantity and valuation mismatches, duplicate IDs/positions/documents, foreign tenant masters and rows, incorrect units, monetary precision, missing review, self-review, pending decision, cutoff mismatch, wrong currency/counterparty, incorrect AR residual, incorrect AP GL side, missing/wrong/duplicate source coverage, rejected-row inclusion and unsupported stock auto-GL effects.

Two particularly important regressions:

- Duplicating the inventory debit **and an equal credit** leaves the ledger balanced, but still produces duplicate coverage and control-account drift. A balanced trial balance alone cannot detect all double posting.
- Changing stock and ledger totals consistently can leave internal checks clear. Exact comparison with the retained independent control sheet still fails. Expected controls must never be regenerated from the implementation under test.

The fixture suite and selected inventory/import controls passed; see [RESULT.md](RESULT.md). PostgreSQL replay, stock-to-ledger resolution, actual AR/AP posting, browser work and qualified accounting review were **not performed**. See [OPENING_POSITION_CONTRACT.md](OPENING_POSITION_CONTRACT.md) for the explicit V3 and P07/P13 handoff.
