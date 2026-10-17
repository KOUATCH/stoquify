# Payroll forecast source separation for Cash Command

2026-09-28T09:55:30.915Z. FA-CASH-COMMAND remains In progress. Previous turn was progress: drawer and module diagnostics admission was implemented and verified.

The mixed tenant snapshot contained the complete payroll forecast algorithm alongside unrelated domain queries. Its forecast calculation and blocker presentation now live in services/payroll/payroll-finance-forecast.service.ts. The existing tenant snapshot imports that service. This is the prerequisite for Cash Command to request payroll proof without invoking sales, purchasing, inventory or close reads; current Cash Command orchestration still invokes the mixed snapshot.

## Preservation and verification

All forecast executable logic and constants are byte-identical after removing export modifiers. Remaining tenant source is exactly reconstructed by removing those blocks and adjusting imports. Three existing test suites pass, including the completed Daily Digest consumer. Actual PostgreSQL complete aggregate equality and independent forecast equality pass for proof-incomplete and empty sources. Existing UI and permission gates are unchanged; no browser rerun claimed.

- evidence/payroll-extraction-checks-26ffacbc-79a6-40ee-aadb-465474c76d2f.json: 147 tests/three suites, changed-file lint and full TypeScript passed. Existing tests cover currency mismatch, decimal totals, missing declaration/provider/posting/certified-input/register proof and successful source contracts.
- lanes/environment/payroll-extraction-53ed0d2e-d2e4-47a4-ae15-c95240cbc37e.json: read-only PostgreSQL verification reuses existing synthetic organizations. The retained original source was transpiled only in the verifier process, without replacing repository files. Its complete aggregate equals the current integrated result, including metrics, hashes, freshness and blockers. Calling the new payroll service independently produces the same forecast and executes only PayrollPeriod, PayrollRun and (where needed) AccountingSourceLink reads, all scoped to the selected organization.
- Incomplete proof stays non-authoritative with null totals and all six missing-proof reasons. A successful query with no upcoming periods remains an empty zero forecast. Every model mutation was refused by the verification client. These synthetic records do not establish genuine posting or approval.
- Exact moved algorithm/constants and reconstructed remaining-source hashes are retained with the before-source text. This supports proportionate reuse of the unchanged completed Daily Digest behavior, with the newly extracted dependency now included in the source binding.

## Remaining implementation and operation

Wire independent authorized Cash Command source reads; extraction alone does not prevent existing broad tenant queries. Provider evidence remains an input and still needs current source admission. Complete scope/provenance, payroll/inventory handoffs, full EN/FR, remaining proofs and genuinely posted payroll lifecycle.

Routes and user inputs are unchanged: /en/dashboard/finance/cash-command and /fr/dashboard/finance/cash-command. No new approval, migration or configuration is needed. The payroll service is an internal calculation, not a public action or authorization boundary. Callers must authorize its source scope; do not expose it as an action without current identity, tenant, role and module checks. Continue preserving existing source-link, provider, certified-input, declaration and currency requirements.

No production deployment, live activation, payroll posting, payment or external message occurred. Recovery can restore the retained original source and remove the extracted module together; do not change proof logic to obtain a numeric forecast. Current isolated evidence is not a release or accounting certification.

## Review accountability

Architecture/backend: payroll-owned calculation separated from mixed orchestration. Finance/audit/data: exact algorithm, nullable and currency semantics preserved. Security: read scope traced; broad Cash Command admission remains explicitly unfinished. Quality/SRE: existing consumer tests and actual database equivalence; no latency claim. Frontend/product/operations: no visual or employee process change. Country packs, providers, offline, agents and migrations: not applicable to this extraction; no policy or lifecycle behavior changed.
