# AqStoqFlow 004 Business Event Gateway Run Report

Generated: 2026-08-23T08:15:57.4226069Z  
Source revision: `7736416bd57fc45d3b618ba397850d39320ac3e1`  
Status: `READY_FOR_REVIEW`

## Outcome

The universal event gateway now has durable correlation, event-scoped audit
evidence, operator-visible anomaly records, canonical idempotency errors,
concurrent P2002 replay resolution, and a tenant-scoped outbox worker with
bounded retries and dead-letter handling.

Successful event capture creates the event, initial audit, and outbox messages
through one nested transaction write. A different-payload replay is handled
differently by design: its audit and deduplicated anomaly evidence commit in an
independent transaction before the typed conflict is thrown, so the rejected
domain transaction cannot roll that evidence back.

The existing HR/payroll UI worktree and external-release configuration were not
changed.

## Gates passed

- Architecture/context: canonical `services/events` and shared error foundations reused.
- Tenant isolation: every event replay, anomaly queue, lease, worker transition,
  and readiness query is organization-scoped; cross-tenant completion is tested.
- Event integrity: same-key/same-payload replay returns the original event;
  same-key/different-payload replay rejects with `IDEMPOTENCY_CONFLICT` and
  persists audit/anomaly evidence.
- Concurrent replay: a P2002 insert race re-reads the tenant-scoped event and
  returns the original result when the payload hash matches.
- Atomicity: event, initial audit, and outbox creation remain inside the caller's
  domain transaction through `recordBusinessEventInTx`.
- Retry/visibility: leases are compare-and-set, attempts are bounded, unknown
  failure details are redacted, terminal attempts dead-letter, and readiness is
  queryable by tenant.
- Error gate: zero active unsafe raw-error findings.
- Schema/type/tests: all fresh verification commands below passed.

RBAC/module and UX gates are not applicable to this internal-only service slice;
no action, route, hook, or UI surface was introduced.

## Fresh verification

| Command | Result |
| --- | --- |
| Focused event-gateway Jest run | 3 suites, 14 tests passed |
| POS/provider/fiscal/reconciliation consumer Jest run | 4 suites, 49 tests passed |
| `npm run prisma:validate` | Passed |
| `prisma generate --no-engine` | Passed; generated types without replacing the Windows-locked engine DLL |
| `npm run typecheck` | Passed |
| `npm run error:boundary:fail` | Passed; 0 active findings, 129 allowed classified findings |

The normal Prisma generator was attempted first and failed because the Windows
query-engine DLL was locked. Direct no-engine generation then completed
successfully; no runtime or release configuration was changed.

## Gates blocked / not run

- Live PostgreSQL migration deployment and database-level integration proof were
  not run.
- External-release preflight/configuration remains out of scope and untouched.
- Country-specific legal, tax, fiscal-device, and authority behavior remains
  subject to expert validation and was not claimed by this run.

## Next recommended numbered skill

`005-aqstoqflow-accounting-control-center`
