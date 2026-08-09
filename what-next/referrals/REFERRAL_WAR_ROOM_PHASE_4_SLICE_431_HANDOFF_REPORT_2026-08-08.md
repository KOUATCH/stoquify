# Referral War Room Phase 4 Slice 431 Handoff Report

Date: 2026-08-08

## Handoff

Execute **Accountant Missing-Proof Response Review Queue Foundation** with `stoquify-accountant-close-portal`.

## Inspect First

- `services/accounting/missing-close-evidence-request-queue-contracts.ts`
- `services/accounting/missing-close-evidence-request-queue.service.ts`
- `services/accounting/close-assurance.service.ts`
- `services/accounting/accountant-access.service.ts`
- `services/accounting/data-trust.service.ts`
- `actions/accounting/data-trust.actions.ts`
- `services/accounting/__tests__/close-assurance.service.test.ts`
- `services/accounting/__tests__/missing-close-evidence-request-queue.service.test.ts`
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`

## Implementation Boundary

Build one new accountant-authorized service read model and its contracts/tests. Reuse shared request/response constants and delegated access resolution. Do not refactor the broad close dashboard or implement a consumer UI.

## Security Gates

- Home actor active and authenticated.
- Home permission `accounting.close.accountant.review`.
- Target client organization resolved by tenant membership or active `REVIEW` grant.
- No `READ_ONLY` delegated review.
- Exact typed request/response and relationship validation.
- Bounded reads and fail-closed truncation/corruption behavior.
- Explicit response-text exposure only for this accountant review contract.
- No raw metadata or broad comment stream.

## Verification

Run the new service suite first, then the existing client queue, close service, manager action-center, and report-trust suites. Run typecheck and scoped ESLint after contracts are touched. Refresh the live report-trust outputs and run scoped diff hygiene.

Baseline before implementation: 5 suites / 233 tests passed; report trust 25/25 ready.

## Stop Conditions

Stop and report rather than widening scope if delegated access cannot be proven, response text cannot be isolated from unrelated comments, a schema migration becomes necessary, or implementation would require an acceptance/resolution command in the same slice.

## After Certification

Return to the referral war room. The leading dependent candidate is a fresh-authenticated accountant acceptance command that resolves only the exact validated response/finding relationship.
