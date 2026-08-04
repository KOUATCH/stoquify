# Stoquify Slice 425 Release Evidence Report

Generated: 2026-08-02
Skill: `013-aqstoqflow-data-trust-accountant-portal`
Orchestrator: `stoquify-referral-war-room-orchestrator`
Slice: Close-Waiver Service-Owned Verified Fresh-Authentication Evidence

## Release Decision

Current-worktree certification: GO.
Repository, migration, and production deployment: NO-GO.

## Certified Contract

- Public waiver approval requires `accounting.close.waiver.approve` and fresh authentication no older than 300 seconds.
- Claims must match the active user, tenant, assurance organization, password assurance, and protected-context timestamp before input parsing.
- Service input binds the exact session timestamp to the protected actor and organization.
- The waiver service contract excludes caller-provided time, constructs its own clock, and fails before database work for missing actor/evidence, identity mismatch, invalid/nonpositive/future/stale time, or invalid policy structure.
- The returned verified actor owns segregation-of-duties checks and every approval attribution.
- The AST gate fails closed for structural bypasses and post-validation clock aliasing, reassignment, or mutation.

## Evidence

- Action boundary and tests: `actions/accounting/close-assurance.actions.ts`, `actions/accounting/__tests__/close-assurance.actions.test.ts`.
- Service boundary and tests: `services/accounting/close-assurance.service.ts`, `services/accounting/__tests__/close-assurance.service.test.ts`.
- Static release control and mutation tests: `scripts/report-trust-export-gate.js`, `scripts/__tests__/report-trust-export-gate.test.js`.
- Generated evidence: `what-next/report-trust-export-readiness.md`, `what-next/report-trust-export-readiness.json`.
- Product report: `what-next/referrals/ACCOUNTANT_CLOSE_PORTAL_WAIVER_FRESH_AUTH_SLICE_425_REPORT_2026-08-02.md`.

## Gate Results

- Focused: 3 suites / 93 tests passed.
- Expanded: 9 suites / 153 tests passed.
- Typecheck, scoped ESLint, Prisma validation, JavaScript syntax, scoped diff hygiene, and rejected-patch checks passed.
- Report-trust gate: 20/20 ready; zero blockers.
- Initial independent review raised two P2 findings. Both were remediated; final narrow recheck: `closed`.

## Residual Risks

- Accountant-access repository ownership, identity foreign keys, retention, lifecycle constraints, and exact PostgreSQL deployment evidence remain unresolved.
- Portfolio/register pagination, organization-timezone policy, and missing-proof requests remain open.
- External sharing, AI/WhatsApp authority, and POS cash-shortage production activation remain unauthorized.

## Next Gate

Fresh Phase 4 war-room audit required before selecting Slice 426.
