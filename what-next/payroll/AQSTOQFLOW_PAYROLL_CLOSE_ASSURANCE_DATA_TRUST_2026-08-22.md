# AqStoqFlow Payroll Close Assurance and Data Trust — 2026-08-22

Status: `APPROVED_FOR_WP6_INTERNAL_ENGINEERING_ONLY`

WP5 closes the payroll-to-close trust boundary without advancing any production claim.

## Outcome

- Payroll approval and payslip emission now invalidate affected certified-close evidence transactionally.
- Invalidation happens after the tenant-scoped CAS winner is known and before audit/event completion; rollback and replay tests prove no loser or replay duplicates it.
- A shared classifier distinguishes verified runtime transition proof, missing post-cutover proof, and disclosed legacy partial evidence.
- Accountant data trust and close assurance now hard-block emitted-unposted payroll and missing modern transition proof.
- Financial analytics withholds payroll amounts when lifecycle proof is missing or legacy-partial.
- Branch profitability and released-payment assurance accept only posted, paid, or archived payroll runs.

## Verification

- Focused tests: `175/175` across 8 suites.
- TypeScript: clean.
- Focused ESLint: clean.
- Diff check: clean.
- Service boundary: 0 active violations.
- Purchasing/AP: 11/11 ready, including `goods_receipt_atomic_stock_posting`.
- Report trust: 35/35 ready.
- Offline POS: 16/16 ready.
- Workflow assurance static release: 38/38 ready.
- Payroll presence: 14/14 ready.
- CI release configuration: 11/11 ready.

## Honest limits

The whole policy chain remains conditional for reasons outside WP5: qualified country-pack expert approval, managed/local database protocol evidence, inherited raw-error findings, exact-hash approval for an old destructive migration, production secrets/database evidence, and dirty-tree provenance. Production promotion remains prohibited.

Canonical evidence: `docs/HRIS-Payroll/payroll-trust-spine-execution/evidence/WP-05/`.

Next authorized package: WP6 — service-owned lifecycle capabilities and minimal operator UX. WP7 and WP8 remain unauthorized.
