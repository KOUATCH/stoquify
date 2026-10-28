# Anti-Pattern Register

## Anti-Pattern: Direct Stock Mutation Outside Kernel

Failure signature:

- Code outside `services/inventory/*` calls `inventoryLevel.create`, `inventoryLevel.update`, `inventoryLevel.updateMany`, `inventoryLevel.upsert`, `inventoryTransaction.create`, or equivalent final stock mutation APIs.

Where it appears:

- POS sale/refund/void stock effects
- purchasing goods receipt stock effects
- item initial stock and manual stock update actions
- legacy inventory action helpers
- runtime-like stock demo scripts

Root cause:

- Stock truth evolved inside operational workflows before the valuation kernel existed.

Why it matters:

- Direct writes can bypass idempotency, ledger blockers, audit evidence, count/write-off controls, projection rebuild assumptions, and SYSCOHADA class 3 reconciliation.

Veto rule:

- Do not introduce new final stock mutation callsites outside `services/inventory/*`.

Repair pattern:

- Add or reuse a service-owned inventory event API.
- Keep the legacy caller shape stable where practical.
- Route stock changes through the kernel.
- Add event, audit, outbox, idempotency, evidence, and ledger posting/blocker behavior.
- Add focused regression tests.
- Re-run the boundary scanner.

Verification:

- `npm run inventory:boundary`
- focused producer tests
- `npm test -- services/inventory --runInBand`
- `npm run typecheck`

Status:

- Active until the report-mode scanner reaches zero active violations and the gate can move to fail mode.
