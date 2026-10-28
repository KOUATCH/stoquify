# Inventory item create/edit browser matrix — 2026-08-07

## Outcome

- Status: **PASS**
- Playwright projects: fixture setup -> authenticated release matrix -> cleanup teardown
- Browser matrix: desktop `1440x1100`, tablet `834x1112`, mobile `390x844`
- Evidence records: `10/10`
- Serious/critical Axe violations: `0`
- Document overflow findings: `0`
- Horizontally clipped controls: `0`
- Cleanup residue: `0` organizations, `0` users, `0` items

## Deterministic fixture

- Source: `scripts/inventory-items-e2e-fixture.js`
- Primary organization: `org_inventory_items_e2e_local`
- Foreign organization: `org_inventory_items_e2e_foreign`
- User: `inventory.items@stockflow.test`
- Role: `INVENTORY_ITEMS_E2E`
- Seeded item: `item_inventory_items_e2e_editable`
- Foreign item: `item_inventory_items_e2e_foreign`
- Required item permissions: `inventory.items.read`, `inventory.items.create`, `inventory.items.update`
- Supporting read permissions cover dashboard, category, brand, unit, location, and tax references used by the real forms.
- The fixture refuses production-like environment markers, deletes only its fixed organization IDs before reseeding, and asserts zero residual fixture rows during cleanup.

## Browser coverage

- Create page renders with real organization-scoped reference data at all three viewports.
- Edit page loads the real seeded item at all three viewports.
- Each viewport saves a distinct description, redirects to the item list, reloads the edit route, and verifies persisted data.
- A foreign-organization item ID returns the same not-found surface as a missing item and does not disclose the foreign item name.
- Every evidence capture runs serious/critical Axe checks and document/control overflow checks.

## Evidence-backed corrections

1. Added an accessible name to the create wizard progress indicator after Axe reported `aria-progressbar-name`.
2. Removed the immediate `router.refresh()` following successful edit navigation after the browser showed a completed save whose redirect was cancelled.
3. Changed only the edit section selector's responsive classes from a horizontally clipped mobile strip to a two-column wrapping grid after the 390 px matrix identified all five controls as clipped.

No submission, validation, tenant-scoping, or inventory mutation behavior was otherwise changed.

## Commands

CI entry point:

```powershell
node scripts/run-inventory-items-e2e.js
```

Direct matrix command when migrations are managed by the CI job:

```powershell
npx playwright test --config=playwright.inventory-items.config.ts
```

The CI entry point runs `prisma migrate deploy` before Playwright. On this developer database that preflight is currently blocked by the pre-existing failed migration `20260727110000_offline_pos_sync_foundation` (`P3009`); the final direct Playwright run on port `3113` passed all nine tests and cleanup.

## Verification

- Playwright: `9 passed`
- Deterministic fixture Jest suite: `5 passed`
- Inventory boundary gate (`fail` mode): `0` active violations; `27` allowed kernel/test findings
- TypeScript: passed
- Focused ESLint: passed
- Prisma schema validation: passed

Artifacts are in `what-next/evidence/inventory-item-create-edit-2026-08-07/`.
