# Runtime Boundary Card

Skill: `010-aqstoqflow-inventory-boundary-gate`

Version/date: 2026-06-15

## Trigger Boundary

Use when direct stock mutations outside `services/inventory/*` must be found, reported, migrated, warned, or hard-failed.

Do not use for general inventory feature design unless the task concerns the boundary gate or migration of direct stock writers.

## Input Boundary

Must read:

- `scripts/inventory-boundary-gate.js`
- current inventory boundary report in `what-next/` when present
- changed stock producer files

May read:

- 010 technical spec
- 010 adjustment/write-off/count report
- graph reports
- focused POS, purchasing, item, and inventory tests

## Edit Boundary

May edit:

- `scripts/inventory-boundary-gate.js`
- `package.json` inventory gate scripts
- `services/inventory/*`
- one migrated producer class at a time
- focused tests for the migrated producer
- `what-next/*INVENTORY_BOUNDARY_GATE*`

Must not edit:

- unrelated UI modernization surfaces
- unrelated accounting/compliance/payment modules
- unrelated dirty worktree files

## Tool Boundary

Preferred tools:

- `rg` for stock mutation discovery
- `node scripts/inventory-boundary-gate.js`
- focused `npm test` commands
- `npm run prisma:validate`
- `npm run typecheck`

Escalation needed for:

- installing the skill under `C:\Users\J COMPUTER\.codex\skills`
- running commands when the sandbox blocks normal npm or node execution

Avoid:

- immediate hard-fail gate activation while known legacy producers remain
- broad refactors unrelated to the current migration class

## Gate Boundary

Must pass:

- report-mode scanner runs
- every active violation has a classification
- migrated producer tests pass
- inventory tests pass after kernel changes
- typecheck passes after API/schema changes

Known blockers:

- POS, purchasing, item initial stock, manual updates, legacy helpers, and scripts can still contain direct stock writes until migrated.

## Stop Boundary

Stop when:

- a migration would change stock semantics without a regression test
- a stock effect cannot be mapped to an event contract
- ledger posting or explicit blocker cannot be preserved
- a hard-fail gate would break current known workflows

Ask user when:

- a runtime script must be deleted or converted to seed-only behavior
- a public action or UI contract must change

## Output Boundary

Final answer must include:

- scanner mode
- active violation count
- classification summary
- files changed
- verification evidence
- next migration class

Evidence required:

- saved Markdown report in `what-next`
- command output summary
