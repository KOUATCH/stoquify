# Stage 04 Inventory History Action and Export Integration

## Run identity

- Run: `th-inventory-history-action-export-20260715-008`
- Slice: `foundation-inventory`
- Mode: `implement`
- Agent: Database Optimizer
- Verdict: **PARTIAL**
- Active lane: `inventory`
- Blocked lane: `workbench`

## Executive decision

The inventory transaction-history read model now has a separate protected server-action boundary and a controlled synchronous export path. Tenant, actor, permissions, and fresh-authentication evidence are derived from trusted server context. Exports require both `reports.export` and `inventory.levels.read`, enforce the inventory module entitlement, reject client-supplied resume cursors, retain the frozen read-model cutoff, and persist an immutable manifest containing applied-filter, content, row-count, watermark, completeness, and redaction evidence.

Stage 04 remains `PARTIAL`. The direct export ceiling is deliberately fixed at 10,000 rows, but the resumable background export named by the overflow contract is not implemented. Production-like `EXPLAIN (ANALYZE, BUFFERS, SETTINGS)` evidence and authoritative historical `balanceAfter` sequencing also remain unproved. Stage 05 is therefore not eligible yet.

## Implemented controls

| Control | Evidence | Result |
| --- | --- | --- |
| Tenant-owned read action | `getInventoryMovementHistoryAction` replaces client organization identity with `ctx.orgId` | PASS |
| Read authorization | `inventory.levels.read` plus enforced inventory entitlement | PASS |
| Export authorization | `reports.export`, `inventory.levels.read`, inventory entitlement, and fresh auth within 300 seconds | PASS |
| Sensitive-action evidence | `INVENTORY_HISTORY_EXPORT_CONTROL` or explicit denied audit | PASS |
| Snapshot continuity | Every export page must retain the first page's `recordedThrough` and applied-filter hash | PASS |
| Durable export manifest | Tenant, actor, cutoff, request/applied filter hashes, content hash, bytes, row count, watermark, completeness, and redaction scope persisted in `AuditLog` | PASS |
| Direct export bound | Integer range `1..10000`; oversized or cursor-based requests fail before reading | PASS |
| Cursor secret release gate | Production release fails when `AQSTOQFLOW_HISTORY_CURSOR_SECRET` is missing, weak, reused, or equal to auth secrets | PASS |
| Background/resumable export | No durable job, checkpoint, expiry, download token, or worker exists | GAP |
| Production-like plan proof | Only run007 local structural index evidence is available | GAP |

## Trust boundary

The new action file is intentionally separate from the already-dirty legacy `inventoryMovementActions.ts`. It accepts only validated filters and an optional bounded row maximum. Client-provided `organizationId`, actor identity, or permissions are ignored. The export action requires fresh authentication before RBAC lookup and module evaluation, then passes only trusted context to the service.

The service records authorization before reading. Generic report-export authority is insufficient by itself: absence of `inventory.levels.read` creates a durable denial audit and raises a client-safe forbidden error. A successful file receives a second, exact manifest audit only after content generation and hashing complete.

## Export evidence contract

The JSON artifact contains schema version, export ID, tenant, generation time, watermark, stable snapshot, applied filters, completeness disclosure, exact row count, and rows. The persisted manifest additionally binds:

- request and applied-filter SHA-256 values;
- exact UTF-8 content SHA-256 and byte length;
- actor and organization identity;
- direct-export maximum and final row count;
- operational sensitivity and explicit redaction scope;
- source completeness and the frozen `recordedThrough` cutoff.

Actor contact and authentication fields, organization secrets, and integration credentials are absent. Operational actor display names remain because they are needed for audit traceability.

## Release-secret enforcement

`scripts/release-secret-preflight.js` now treats `AQSTOQFLOW_HISTORY_CURSOR_SECRET` as a production release requirement. The value must meet the existing 32-character and diversity policy, must be purpose-specific, and must differ from identity, receipt, `AUTH_SECRET`, and `NEXTAUTH_SECRET` values. Reports continue to expose only check IDs and remediation; secret values are never printed, hashed, or serialized.

`.env.example` was already dirty and excluded by the manifest. This run therefore adds enforcement without overwriting deployment-template work. Actual production secret registration was not observable from the repository.

## Changed files

- `actions/inventory/inventoryMovementHistoryActions.ts`
- `actions/inventory/__tests__/inventoryMovementHistoryActions.test.ts`
- `services/inventory/inventory-history-export.service.ts`
- `services/inventory/__tests__/inventory-history-export.service.test.ts`
- `services/controls/sensitive-action.service.ts`
- `services/controls/__tests__/sensitive-action.service.test.ts`
- `scripts/release-secret-preflight.js`
- `scripts/__tests__/release-secret-preflight.test.js`
- This Markdown report and its JSON evidence artifact

The dirty legacy action, hooks, components, pages, Prisma files, and `.env.example` were not edited by run008.

## Verification

| Command | Result |
| --- | --- |
| ESLint over the exact eight product/test files | PASS |
| Consolidated Jest cursor/read/export/policy/action/legacy/preflight set | PASS: 7 suites, 46 tests |
| `npm run typecheck` | PASS |
| `git diff --check` over tracked run008 files | PASS |
| Stage artifact validator | PASS: valid, 0 errors, 0 warnings, 1 evidence artifact |
| Orchestrator next-stage selector | PASS: halted with `STAGE_PARTIAL`; no next stage eligible |
| Production-like `EXPLAIN (ANALYZE, BUFFERS, SETTINGS)` | SKIPPED: approved representative environment unavailable |

The focused tests cover tenant derivation, malicious client identity fields, RBAC and module denial, fresh-auth failure, dual-permission export authorization, cursor rejection, hard row limits, stable multi-page snapshot evidence, continuity failure, manifest hashing, explicit denial audit, release failure for missing or reused cursor secrets, and evidence redaction.

## Blockers and residual risk

1. `BACKGROUND_EXPORT_EXECUTION_PENDING` (high): the synchronous 10,000-row contract is safe, but no resumable job, durable checkpoint, expiry policy, signed download, or worker exists for larger histories.
2. `PRODUCTION_LIKE_PLAN_EVIDENCE_MISSING` (medium): the existing index has structural support from run007, but representative execution time, buffers, and estimate accuracy are not certified.
3. `HISTORICAL_BALANCE_AUTHORITY_UNPROVEN` (medium): `balanceAfter` remains excluded until concurrency, backdating, reversal, and sequencing invariants are independently proved.
4. `DEPLOYED_CURSOR_SECRET_UNVERIFIED` (medium): release preflight fails closed, but this run did not inspect or change deployed secret configuration.

## Next decision

Run a focused Stage 04 background-export finalizer. Add durable job and checkpoint state, idempotent worker execution, tenant-bound signed download evidence, expiry and deletion policy, failure/retry audit, and tests proving snapshot/filter continuity across resumptions. Obtain production-like plan evidence before promoting Stage 04 to `PASS`; only then should Stage 05 define the workbench UX contract.
