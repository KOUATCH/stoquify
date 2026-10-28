# Stage 01 Architecture Gate: Foundation Inventory

## Verdict

**PASS** for architecture mapping and downstream handoff. This is not a product-readiness verdict. The current inventory movement surface has security, accounting-semantic, read-model, and UX defects, but every in-scope boundary and owner is identifiable and each defect has an exact downstream gate.

- Run: `th-foundation-inventory-20260714-001`
- Mode: `implement`
- Active lanes: `workbench`, `inventory`
- Commit baseline: `5cf02043eed4fbfb7e6e1bb3b1a4c87683965e2d`
- Graph provenance: `graphify-out` is dated 2026-06-14 and its manifest references an older checkout; it was used only for navigation. Current source is authoritative.
- Product edits: none

## Boundary Map

| Boundary | Current owner and evidence | Truth classification | Gate |
|---|---|---|---|
| Route | `app/[locale]/(dashboard)/dashboard/inventory/movements/page.tsx:5` checks `inventory.levels.read` and renders the workbench | Access shell only | 02 |
| Workbench | `components/inventory/movements/StockMovementDashboard.tsx:205` owns filters and display; line 225 hard-caps the query at 100 | `DERIVED_PARTIAL` presented without a complete-history contract | 05, 06 |
| Query hook | `hooks/useInventoryMovementQueries.ts:38` calls the movement action; line 64 defines a summary filter that omits transaction type | Transport/cache layer; not business truth | 04, 06 |
| Server action | `actions/inventory/inventoryMovementActions.ts:154` and `:267` trust session organization but do not enforce the route's read permission | Tenant-scoped but RBAC-incomplete | 02 |
| Read service | `services/inventory/inventory-read.service.ts:384` owns row projection; `:424` caps results, `:430` aliases `updatedAt` to `createdAt`, and `:441` fabricates reserved quantity as zero | `DERIVED_PARTIAL` | 03, 04 |
| Summary service | `services/inventory/inventory-read.service.ts:512` owns aggregate KPIs over the shared tenant/date/item/location predicate | Server-derived, but row/summary filter parity is incomplete | 03, 04 |
| Source model | `prisma/schema.prisma:737` defines `InventoryTransaction`; `:756` stores `balanceAfter`; indexes include organization/time | `SYSTEM_OF_RECORD` for recorded movements, not a complete bitemporal history | 03, 04 |
| Type contract | `types/inventoryMovementTypes.ts:49` diverges from Prisma `TransactionType` at `prisma/schema.prisma:777`; service casts conceal the mismatch | `UNKNOWN` until canonical mapping is explicit | 03, 04 |
| Audit/proof | No inventory transaction subject exists in `services/evidence/evidence-contracts.ts`; generic audit writes are not immutable proof | No evidence-grade subject | 02, 03 |
| Tests | `actions/inventory/__tests__/inventoryMovementActions.test.ts` covers transfer writes but not history-read denial or foreign-tenant invocation | Coverage gap | 02, 07 |

## Canonical Contract

The domain service remains the owner of transaction-history truth. Downstream work must provide:

1. explicit trusted tenant, read permission, module entitlement, redaction, export, audit, and proof rules;
2. separate non-null `effectiveAt` and immutable `recordedAt`, or an explicit block where the source cannot support them;
3. traversal frozen by `recordedThrough` and ordered by `(effectiveAt DESC, recordedAt DESC, id DESC)`;
4. one normalized filter contract shared by rows, summary, detail, and server export;
5. explicit completeness metadata; bounded rows must be labelled recent/partial and cannot source complete totals or exports;
6. signed quantity, valuation, `balanceAfter`, reversal/correction, source-posting, and OHADA control semantics owned by Stage 03;
7. no client-derived balances, certification, reconciliation, risk, or proof.

## Findings And Ownership

| ID | Severity | Finding | Required owner |
|---|---|---|---|
| TH01-SEC-01 | High | Direct invocation of movement and summary actions bypasses `inventory.levels.read`. | Stage 02; exact action and focused test allowlist |
| TH01-DATA-01 | High | Fixed `take` and UI limit create a recent preview, not complete history; ordering lacks a full stable cursor. | Stage 04 |
| TH01-ACC-01 | High | One timestamp is used as both effective and recorded time; `balanceAfter` and reversal semantics are not certified. | Stage 03 |
| TH01-CONTRACT-01 | Medium | Prisma and UI transaction enums diverge and are hidden by casts. | Stages 03 and 04 |
| TH01-PARITY-01 | Medium | Selected transaction type filters rows but not summary KPIs. | Stage 04 |
| TH01-UX-01 | Medium | The page does not disclose recent/partial completeness and browser-local dates can change organization-day boundaries. | Stages 05 and 06 |

## Handoffs

**Stage 02 security/proof:** enforce `inventory.levels.read` and the `inventory` entitlement at each history read action, preserve session-derived tenant scope, add negative direct-action tests, define redaction/export/audit/proof policy, and do not claim proof support until an inventory subject is registered.

**Stage 03 accounting/control:** classify sign and valuation semantics, test roll-forward behavior, define effective-versus-recorded time and immutable correction/reversal behavior, and block any statement or as-of claim unsupported by the current model.

Stage 04 is ineligible until both Stage 02 and Stage 03 return exact `PASS`. The current run allows no Stage 01 product edit and observed no overlap on the Stage 02 action/test paths.

## Verification

- Installed skill validation: passed.
- Installed orchestrator tests: 13/13 passed after adding the partial-prerequisite regression.
- Initial run artifact validation: passed with zero stage artifacts and the expected missing-evidence-directory warning.
- Orchestrator selection: Stage 01 selected, no blockers or overlapping dirty files.

Residual risk remains high until Stages 02-04 execute. This gate certifies ownership and an executable boundary, not transaction-history correctness or release readiness.
