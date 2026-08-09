# Phase 5 Slice 437 Selection Report

Date: 2026-08-08
Selected slice: Protected Customer Settlement Reversal Action Boundary
Status: certified complete at current-worktree protected-action-boundary level

## Why This Slice

Slice 436 provides a source-owned compensating reversal service but no authenticated product boundary. A direct server caller can construct the service control object, so service validation alone does not prove that permission, tenant, actor, fresh-auth, and module-entitlement evidence came from the live session.

Statement generation remains premature because no canonical immutable SalesInvoice or posted receivable-document lifecycle exists. Slice 437 therefore closes the narrow authenticated-execution dependency first.

## In Scope

1. Add one protected finance-owned server action for customer-settlement reversal.
2. Require exact `finance.receivables.reverse` permission.
3. Require five-minute fresh authentication.
4. Enforce and audit the `finance` commercial-module write entitlement.
5. Verify that fresh-auth user, tenant, assurance organization, assurance level, and timestamp match the protected action context.
6. Parse only the bounded reversal command schema.
7. Derive organization, actor, permissions, and bounded authentication evidence exclusively from `ProtectedActionContext`.
8. Return only the service's bounded result through the standard protected-action response.
9. Revalidate only the existing finance receivables and accounting surfaces after success.
10. Add focused action tests and a fail-closed report-trust ratchet.

## Acceptance Criteria

1. The action is immutable after module initialization and can only execute through `protect(...)`.
2. Permission, audit, fresh-auth, and module options are exact and covered by tests.
3. Caller-supplied tenant, actor, permissions, or authentication fields cannot influence the service control context.
4. Missing or mismatched user, tenant, assurance organization, assurance level, or timestamp evidence fails before the service call.
5. Malformed command input fails before the service call.
6. The service is called exactly once with the parsed command and bounded context-derived control evidence.
7. Cache revalidation occurs only after a successful reversal.
8. No route, UI, statement, token, delivery, provider refund, or reversal-accounting change is introduced.
9. The release ratchet fails when any protected-boundary invariant is weakened.

## Expected Files

- `actions/finance/customer-settlement.actions.ts`
- `actions/finance/__tests__/customer-settlement.actions.test.ts`
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- Phase 5 Slice 437 reports under `what-next/referrals/`

## Verification Plan

- focused customer-settlement action Jest;
- existing customer-settlement reversal service Jest;
- focused `protect` and sensitive-action regressions;
- report-trust mutation suite and live fail-mode generation;
- TypeScript, scoped ESLint, JavaScript syntax, exposure scan, and scoped diff hygiene.

## Certified Outcome

All Slice 437 acceptance criteria passed. The finance action derives organization, actor, permissions, and bounded fresh-auth evidence from the protected context; verifies a real finite timestamp, matching user and tenant claims, and finite password-level assurance; parses only the canonical command; and revalidates existing surfaces only after service success.

The fail-closed release ratchet is registered as `customer_settlement_reversal_protected_action_boundary`. Its mutation matrix includes a concrete dead-code denial-guard bypass, and an independent constrained re-review found no remaining issue.

Verification passed:

- protected action: 1 suite / 14 tests;
- focused runtime/security bundle: 8 suites / 86 tests;
- report-trust mutations: 1 suite / 290 tests;
- live report-trust gate: 31/31 ready, zero blockers;
- TypeScript, scoped ESLint, syntax, diff hygiene, exposure, and temporary-file checks.

No route, UI, API, or product caller exists. Public reversal execution and production release remain unauthorized.

## Non-Goals

- collection action, reversal UI, API route, public access, or external delivery;
- partial reversal, provider refund, or changed reversal accounting semantics;
- SalesInvoice or posted receivable-document persistence;
- statement generation, snapshots, tokens, disputes, promise-to-pay, AI, copilot, or WhatsApp;
- migration deployment, PostgreSQL concurrency certification, or production release.
