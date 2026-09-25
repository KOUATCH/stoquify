# AQSTOQFLOW UI/UX Phase 06 Finance and Accounting Normalization Report

Date: 2026-08-31

## Decision

- X1 technical contract readiness: PASS.
- Product performance-budget approval: PENDING.
- Current authenticated EN/FR desktop, tablet, and mobile evidence: PENDING.
- Release certification: NOT CLAIMED.
- Database reseed or mutation in this increment: NONE.

The finance and accounting table contract may continue through implementation and focused contract testing. Production acceptance and authenticated UI evidence remain gated until traceable approvals and current artifacts are supplied.

## Scope

This increment covers only the X1 finance and accounting archetype and preserves the existing TanStack-based shared table stack. It does not migrate unrelated tables or replace service-owned accounting, payment, close, authorization, redaction, export, or tenant truth.

The canonical registry contains 13 finance and accounting table contracts:

1. Receivables.
2. Receivables history.
3. Payables.
4. Payables history.
5. Cash history.
6. Posted journal entries.
7. Draft journal entries.
8. Trial balance.
9. Profit and loss.
10. Balance sheet.
11. Cash flow.
12. Close evidence.
13. Close findings.

The contracts cover frozen identity columns, numeric alignment, entity/period/currency context, per-currency totals, drill-to-evidence behavior, separation of editable draft journals from posted evidence, and server-finalized export requests.

## Evidence and approval intake

The X1 evidence binding now has three strict pre-certification states:

| State | Meaning |
| --- | --- |
| `blocked-awaiting-approval` | A product budget approval or non-production evidence authorization is absent. |
| `approved-awaiting-evidence` | Traceable approvals exist, but current authenticated artifacts have not been bound. |
| `evidence-collected-awaiting-review` | A complete authenticated evidence matrix is present and awaits human review. |

The contract deliberately has no `certified` state. Certification cannot be created from repository claims.

Traceable product approval requires an approval reference, approving user ID, `product_approver` role, timestamp, scope, and budget-contract version. Evidence authorization requires non-production scope, credential approval reference, seeded-data approval reference, approving user ID, and timestamp.

Every evidence artifact must identify its artifact path, run ID, fixture organization, persona role, locale, viewport, route, browser, capture time, authenticated status, authorization checks, tenant-isolation check, redaction check, layout check, and accessibility review. Measurements are optional, but a measurement claim is rejected unless measurements are actually bound.

The collected-evidence state requires coverage for all six locale and viewport combinations on each of seven canonical X1 routes:

- English desktop.
- English tablet.
- English mobile.
- French desktop.
- French tablet.
- French mobile.

The required routes cover receivables history, payables, cash flow, journals, trial balance, financial statements, and the accountant evidence portal. The minimum complete run therefore contains 42 authenticated screenshots.

Artifact IDs and paths must be unique. Artifact-path lists, screenshot claims, measurement claims, approval claims, and workflow state must agree with the actual records.

## Current binding status

The live binding remains `blocked-awaiting-approval` with:

- Product budget approval set to `pending`.
- Evidence authorization set to `pending`.
- No evidence artifacts.
- No screenshot or measurement claims.
- No production budget approval claim.

This is intentional. No approval reference or currently valid authenticated X1 evidence was supplied.

Older browser evidence under `what-next/evidence/finance-final-two-section-normalization-2026-08-13` was not promoted into the X1 binding. It lacks the complete English/French and desktop/tablet/mobile matrix and predates the current X1 contract.

## Architecture and control preservation

- Finance routes retain permission and module-entitlement guards.
- Tenant-scoped finance read models remain the source for command-center data.
- Specialized close-assurance and finance command-center workbenches remain separate where their workflows differ.
- Posted journal and evidence surfaces remain separate from editable journal drafts.
- Export execution remains server-authorized and server-finalized.
- Multi-currency totals remain currency-partitioned rather than silently netted.
- No second grid library was introduced.
- No unrelated table was migrated.

## Verification

Focused command:

```powershell
npx jest --runTestsByPath scripts/__tests__/finance-x1-evidence-preflight.test.ts scripts/__tests__/validate-finance-x1-evidence.test.ts components/DataTableComponents/__tests__/FinanceX1EvidenceBinding.test.ts components/DataTableComponents/__tests__/NextPhaseContracts.test.ts components/DataTableComponents/__tests__/FinanceAccountingContract.test.ts --runInBand
```

Result:

- Test suites: 5 passed, 5 total.
- Tests: 22 passed, 22 total.
- Snapshots: 0.

The focused tests verify the 13-contract registry, proposed-not-measured performance budgets, pending live evidence state, acceptance of traceable approvals with a complete 42-artifact route/locale/viewport matrix, rejection of incomplete coverage, and rejection of a certification claim.

Earlier non-mutating readiness checks for this execution also established that the isolated local fixture target had current migrations, all required personas including `external_accountant`, at least 20 stocked items per active location, and finance fixtures for draft/posted/reversed/voided journals, multiple currencies, open/closed periods, AR/AP, payments, reconciliation, cash history, close evidence, and statement derivation. Those database facts do not substitute for product approval or authenticated browser evidence.

## Remaining external gates

| Gate | Required input | Safe next action |
| --- | --- | --- |
| Product performance budgets | Traceable approval reference, approver user ID and role, approval timestamp, X1 scope, and contract version | Product approver reviews the proposed budgets and records the decision. |
| Evidence authorization | Approved non-production credential reference, seeded-data approval reference, security/control approver user ID, and timestamp | Security/control owner authorizes the specific fixture tenant and personas without disclosing secrets in reports. |
| Authenticated UI evidence | Current run ID and 42 authenticated route/EN-FR/desktop-tablet-mobile artifacts with tenant, persona, browser, checks, and timestamps | Run the approved browser evidence flow and bind only real artifacts. |
| Human review | Reviewer identity, review reference, scope, timestamp, and disposition | Review collected artifacts; certification remains outside this repository-only increment. |

## Safe continuation

Engineering may continue with repository-level X1 normalization and focused non-mutating checks. Do not claim budget acceptance, authenticated evidence, accessibility certification, security approval, or release certification until the corresponding traceable records are supplied.

## Deterministic external handoff

The approval and authenticated-evidence intake is now documented in `what-next/evidence/finance-x1/FINANCE_X1_APPROVAL_AND_EVIDENCE_HANDOFF_2026-08-31.md`. The pending machine-readable manifest is `what-next/evidence/finance-x1/finance-x1-evidence-manifest.pending.json`.

Use `npm run table:x1:finance:evidence:report` for a non-failing structural report and `npm run table:x1:finance:evidence:gate` only after real approvals and file-backed artifacts are supplied. The validator can advance a complete packet only to `ready-for-human-review`; it cannot produce certification.

The current report-mode result is `blocked` with exactly three findings: product budget approval, non-production evidence authorization, and the authenticated EN/FR desktop/tablet/mobile evidence matrix. It reports zero artifacts and `certificationClaimed: false`.

An executable, read-only Playwright harness now exists in `playwright.finance-x1-evidence.config.ts`. It has desktop, tablet, and mobile external-accountant projects plus an aggregation project that runs only after all capture projects pass. `npm run table:x1:finance:evidence:preflight` must pass before `npm run table:x1:finance:evidence:capture`; no seed or migration command is part of that chain.

`npm run table:x1:finance:evidence:list` compiled and listed 43 tests: 42 authenticated route/locale/viewport checks and one dependency-gated aggregator. No browser session was opened by the list command.

The live preflight stopped as designed with `status: blocked`, three findings, no configured storage state, and `certificationClaimed: false`. Its findings are traceable approvals, an approved run ID, and an approved external-accountant storage-state path. The browser capture was not started.
