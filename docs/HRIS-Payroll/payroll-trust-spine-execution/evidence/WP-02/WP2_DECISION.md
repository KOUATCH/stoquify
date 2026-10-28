# WP2 additive persistence decision

- Decision: `APPROVED_FOR_WP3_INTERNAL_ENGINEERING_ONLY`
- Migration: `20260821210000_payroll_trust_spine_transition_ledger`
- Migration SHA-256: `98A4907BB72CBB99C2919DF3EF975C3C5924E70B19C9B34A536C9B3A77915A52`
- Runtime scope: isolated local PostgreSQL test database
- Production migration/release authorized: no

## Acceptance evidence

- Prisma schema validates with the tenant-owned `PayrollRunTransition` model and nullable source evidence links.
- A fresh 76-migration replay applied successfully to `localhost/stockflow_immutability_test`.
- Focused migration, immutability, and proof-harness tests pass: 3 suites, 24 tests.
- The isolated runtime proof passes 10/10 checks:
  - migration and columns present;
  - compound tenant/evidence constraints validated;
  - runtime-validation and append-only triggers present;
  - legacy backfill inserts once and replays as a no-op;
  - legacy evidence remains explicitly partial;
  - a complete runtime transition is accepted;
  - missing source actor evidence fails closed;
  - a cross-tenant event fails closed;
  - transition update and delete fail with SQLSTATE `23514`.
- Existing payroll immutability runtime proof remains ready: 9/9 triggers, 14/14 forbidden mutations blocked, and 3/3 allowed lifecycle mutations accepted.
- Payroll presence remains ready 14/14; the service boundary remains at zero active violations; typecheck passes.

## Non-WP2 release blockers retained

- The full policy chain stops at qualified statutory source-artifact expert approval (11/12). This is an external production authority gate and is not converted into internal engineering evidence.
- The global migration-safety aggregate remains 8/9 because 13 destructive statements in the inherited 2026-06-11 baseline bridge lack exact-hash approvals. The new Payroll Trust Spine migration contributes zero destructive findings.
- The broad inherited dirty tree still prevents a clean-candidate or production claim.
- Standard Prisma engine regeneration remains subject to a Windows DLL lock; `--no-engine` generation succeeded and the existing engine completed the isolated runtime proof.

WP3 may implement the four internal transition commands against this additive boundary. No production migration, statutory support, or activation claim is authorized.

