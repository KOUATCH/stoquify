# Payroll Trust Spine WP2 transition-ledger run report

Selected skill: `aqstoqflow-payroll-kernel-hardener`

Selected phase and executable slice: Phase 0, additive tenant-scoped transition persistence, honest historical bridge, and isolated migration proof.

## Files changed

- `prisma/schema.prisma`
- `prisma/migrations/20260821210000_payroll_trust_spine_transition_ledger/migration.sql`
- `services/payroll/__tests__/payroll-trust-spine-transition-migration.test.ts`
- `scripts/payroll-trust-spine-migration-runtime-check.js`
- `scripts/__tests__/payroll-trust-spine-migration-runtime-check.test.js`
- WP1/WP2 contracts, decisions, register, and redacted evidence under `docs/HRIS-Payroll/payroll-trust-spine-execution/`

## Implemented controls

- Added an append-only `PayrollRunTransition` ledger with compound tenant/run and tenant/event foreign keys.
- Added stage evidence links for leave decisions, payroll review/approval/emission/posting, and payslip emission.
- Required complete runtime evidence, consecutive versions, exact lifecycle pairs, unique tenant idempotency, and one canonical event per transition.
- Added a database runtime guard that locks the tenant-scoped source run, verifies status/version/sequence, rejects missing source actors and SoD violations, and validates canonical event type.
- Added an idempotent legacy bridge that records one partial snapshot without inventing intermediate transitions, identities, timestamps, idempotency keys, or payload hashes.
- Preserved existing `PAID` and `ARCHIVED` payment/reconciliation semantics by bridging only their last provable Trust Spine stage, `POSTED`.
- Kept all changes additive; runtime command implementation remains in WP3.

## Gates passed

- `npm run prisma:validate`: pass.
- `npx prisma generate --no-engine`: pass.
- Focused Jest: 3 suites, 24 tests pass.
- Fresh migration replay: 76/76 migrations apply on the dedicated local test database.
- WP2 runtime proof: 10/10 pass.
- Existing payroll immutability runtime proof: ready, 9/9 triggers, 14/14 forbidden mutations, 3/3 allowed lifecycle mutations.
- `npm run payroll:presence:gate`: ready 14/14.
- `npm run service:boundary:fail`: pass, zero active violations.
- `npm run typecheck`: pass.
- Focused Prettier check and schema diff whitespace check: pass.

## Gates blocked

- Full `policy:gates`: stops at `source_artifact_expert_approval`, an existing external statutory production gate.
- Global Prisma migration deployment aggregate: 8/9 because 13 inherited destructive baseline clauses have no exact-hash approval; this migration contributes none.
- Standard Prisma engine regeneration: Windows DLL rename lock; no-engine generation and runtime use of the existing engine succeeded.

## Verification result

`WP2_READY_FOR_WP3_INTERNAL_ENGINEERING_ONLY`

This result certifies the isolated additive persistence boundary. It does not certify a production database, country-pack legal support, release readiness, or activation.

## Next recommended skill or slice

Use `012-aqstoqflow-payroll-presence-engine` for WP3: implement `reviewPayrollRun`, `approvePayrollRun`, `emitPayrollPayslips`, and `postPayrollRun` as independent atomic commands using the frozen manifest and new transition ledger.

