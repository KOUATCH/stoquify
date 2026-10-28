# Bulk Category Inventory Command Follow-up

Date: 2026-07-22

Skill: aqstoqflow-module-surface-inventory-gate

Status: complete

## Scope and decision

Resolve the focused actions/categories/createBulkCategories.ts handoff from the
2026-07-20 reference-data ownership follow-up without enabling broad entitlement
enforcement.

The real production caller is the client-side Excel import in
components/dashboard/Tables/TableHeader.tsx. The only other caller-shaped
reference in ModalTableheader.tsx is commented out. Existing category tests
covered the canonical single-row command but did not cover the bulk boundary.
The saved actions graph places createBulkCategories() in the category action
community (community 11), but its inferred logging edge is stale; current source
and direct repository search were treated as authoritative.

Because an active client component invokes this function, classifying it as an
internal orchestrator would not preserve behavior. It is now a protected
Inventory bulk server command.

## Changes

- Added the canonical inventory.categories.create guard with allowed-decision
  audit evidence.
- Bound all writes to the authenticated organization and verify the one optional
  explicit organization before mutation.
- Kept Inventory module access in observe mode.
- Limited each request to 100 rows.
- Continued valid rows after row-level failures and returned at most 20
  sanitized, 200-character failure entries plus truncation evidence.
- Revalidated the category list once after any successful writes.
- Removed the obsolete exact-file not-applicable inventory exemption.
- Added focused allowed, denied, bounded-failure, and inventory-classification
  tests.
- Regenerated what-next/module-surface-inventory.json and
  what-next/module-surface-inventory.md in warn/ratchet mode.

## Gap delta

- Focused bulk-category finding from the original reference-data handoff:
  2 active gaps (unmapped, missing permission) -> 0.
- Immediately preceding generated artifact: 20 active gaps -> 10.
- Saved baseline: 55 active gaps -> 10, aggregate delta **-45**.
- New findings: 0.
- Resolved findings against baseline: 45.
- Ratchet status: passed.

The immediately preceding artifact already excluded this action as a client
helper, so this implementation changes its classification from not applicable
to an evidence-backed mapped command without claiming the concurrent aggregate
10-gap reduction as work from this slice.

## Controls

- Service ownership: category writes remain in
  services/category/category.service.ts.
- Tenant isolation: the action writes only with ctx.orgId; mixed explicit
  organization batches are rejected before mutation.
- RBAC and audit: one inventory.categories.create decision is required with
  resource CategoryBulkImport and auditAllowed true.
- Module entitlement: observeModuleAccess remains in observe mode; no broad
  enforcement was enabled.
- Failure evidence: batch size, returned failure count, and failure-message
  length are bounded.
- Redaction: unexpected errors pass through the canonical safe-action error
  mapper before inclusion in response evidence.
- Release gate: the regenerated inventory reports zero new findings.

## Verification

- Focused Jest command for the bulk action and inventory classification:
  passed, 2 suites / 8 tests.
- npm run module:surface:ratchet:
  passed, 367 records, 10 current active gaps, zero new findings.
- git diff --check on the touched slice:
  passed.
- npm run typecheck:
  passed.

## Remaining notes

- TableHeader.tsx currently ignores the structured bulk result, preserving its
  existing UI behavior. Surfacing partial-failure details in that import dialog
  is a separate UX change.
- The saved graph should be regenerated in a future graph-maintenance tranche;
  it still describes the pre-change logging helper edge.
