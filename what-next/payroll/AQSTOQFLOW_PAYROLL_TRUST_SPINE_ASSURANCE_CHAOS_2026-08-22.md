# Payroll Trust Spine — WP7 assurance, chaos, and release ratchet

Date: `2026-08-22`  
Outcome: `APPROVED_FOR_WP8_INTERNAL_RATIFICATION_ONLY`

## Selected skills and executable slice

- Selected skill: `aqstoqflow-payroll-assurance-chaos`.
- Companion release skill: `aqstoqflow-hrpayroll-19-assurance-release-gates`.
- Phase: `Phase 9` assurance and release gates.
- Slice: mutation-proof lifecycle gate plus disposable-PostgreSQL approval concurrency and failure injection.

## What changed

- Added `scripts/payroll-trust-spine-readiness-gate.js` and policy wiring.
- Added `scripts/payroll-trust-spine-postgres-certification.js` with guarded local/test database targeting.
- Added mutation/safety tests for both harnesses.
- Added no payroll, HRIS, accounting, purchasing/AP, or offline-POS product behavior.

## Gates passed

- Payroll Trust Spine gate: `6/6`.
- Gate/safety fixtures: `13/13` across the two new suites, including eight negative mutations.
- Full focused WP7 matrix: `69/69` across six suites.
- Disposable PostgreSQL certificate: `3/3`.
- Migration replay: `76/76`.
- Typecheck, Prisma validation, focused lint, and focused diff check.
- Service boundary `0`, payroll presence `14/14`, purchasing/AP `11/11`, report trust `35/35`, offline POS `16/16`, workflow assurance `38/38`, CI release `11/11`, and policy-wiring tests `11/11`.

## Gates blocked

- The monolithic policy runner encountered a Windows lock on an unrelated generated AI-copilot report path before reaching the statutory gate.
- Production remains independently blocked by missing qualified statutory source-artifact expert approval (`11/12` on the latest completed full policy replay), inherited dirty-tree provenance, inherited migration approvals, raw-error findings, and external production/provider evidence.

## Verification result

`TECHNICALLY_READY_FOR_WP8_INTERNAL_RATIFICATION`

The database race produced exactly one atomic winner. The loser rolled back all its evidence. An injected failure after compare-and-set but before commit restored the run and left no approval event, outbox, audit, or transition row. The static gate is backed by mutations for lifecycle collapse, final events, fresh authentication, server-derived tenant context, CAS rollback, and PostgreSQL certification wiring.

## Run report path

`what-next/payroll/AQSTOQFLOW_PAYROLL_TRUST_SPINE_ASSURANCE_CHAOS_2026-08-22.md`

## Next recommended slice

Run WP8 only: replay skills/gates 012, 013, and 014 against the current live repository and saved evidence, replace stale sequencing statements, and preserve production/statutory limitations. No new feature implementation is authorized by this decision.
