# WP1 architecture and policy review

- Decision: `APPROVED_FOR_WP2`
- Architecture classification: `REPAIR`
- Reviewed: `2026-08-21`
- Scope: Payroll Trust Spine lifecycle boundary

## Live source findings

- The current `approveAndPostPayrollRun` accepts `CALCULATED` or `REVIEWED` and combines approval, payslip emission, accounting posting, event publication, and final `POSTED` persistence.
- The combined flow records one actor across approval, emission, and posting, so the desired separation of duties is not structurally enforced.
- The existing transactional business-event gateway can persist business event, audit, and outbox evidence inside a caller-owned transaction.
- Current payroll models already carry version and stage actor/time evidence, but no append-only transition ledger or stage-specific business-event links exist.
- Existing posted payroll and emitted payslip immutability controls must remain in force.
- Declaration preparation currently lacks the required fresh-auth boundary, and fresh-auth timestamps must never be fabricated with a current-time fallback.
- The live purchasing/AP prerequisite gate is `READY 11/11`, including `goods_receipt_atomic_stock_posting`.

## Frozen decisions

- Exact lifecycle: `CALCULATED → REVIEWED → APPROVED → EMITTED → POSTED`.
- Four independent commands and protected actions; the combined external action is removed at cutover.
- Three-person SoD baseline with no self-approval or small-tenant bypass.
- Tenant, actor, permission, module-access, fresh-auth, time, and worker-attestation facts are server-derived.
- Every transition uses serializable bounded retry, payload-hashed idempotency, tenant/status/version compare-and-set, canonical event/outbox/audit evidence, append-only transition evidence, and atomic close invalidation.
- Historical evidence is explicitly partial and never fabricated.
- Writes fail closed unless `PAYROLL_TRUST_SPINE_WRITES_ENABLED=true`.
- Operational rollback disables writes and preserves evidence; it does not restore the collapsed command.

## Machine-readable contract assertions

| Assertion                                              | Result |
| ------------------------------------------------------ | ------ |
| Exact four transitions                                 | PASS   |
| Unique transition events                               | PASS   |
| Fresh auth on every transition                         | PASS   |
| Identity and authority server-derived                  | PASS   |
| Identity and authority excluded from client fields     | PASS   |
| Serializable transaction and tenant/status/version CAS | PASS   |
| No self-approval or small-tenant override              | PASS   |
| Five canonical business-event contracts present        | PASS   |
| Business-event, outbox, and audit evidence required    | PASS   |

## Independent-gate boundary

WP1 approves implementation of the additive persistence layer only. It does not certify the migration, runtime kernel, concurrency behavior, rollback behavior, or release readiness. WP2 must prove the schema and backfill contract before WP3 is authorized.
