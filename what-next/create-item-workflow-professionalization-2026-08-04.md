# Create Item Workflow Professionalization

Date: 2026-08-04
Domain: Inventory item creation
Route: `/en/dashboard/inventory/items/create`
Workspace: `E:\ohada saas\Focused projects\stoquify`

## Refined Professional Prompt

```md
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Project:
AqStoqFlow / Stoquify platform.

Workspace:
`E:\ohada saas\Focused projects\stoquify`

Domain:
Inventory item creation and optional opening stock.

Mission:
Inspect the complete Create Item workflow at `/en/dashboard/inventory/items/create`, from route authorization and organization-scoped reference data through client validation, submission, server-action authorization, service-owned persistence, optional opening-stock posting, feedback, and navigation. Implement the smallest coherent set of changes that makes the workflow professional, modern, efficient, robust, secure, accessible, and fully functional while preserving existing inventory boundaries and item-list behavior.

Domain lens:
Act as a senior enterprise inventory architecture team:
- Senior enterprise software architect: preserve inventory service ownership, transaction boundaries, dependency order, and integration contracts.
- Structural UI/UX design expert: deliver a calm, workflow-first, responsive form with clear progress, contextual validation, optional-data recovery, and loss prevention.
- Cybersecurity and RBAC specialist: enforce tenant isolation, explicit item-create permission, server-owned actor identity, safe action errors, and organization-scoped relation data.
- Inventory business logic expert: protect SKU and barcode uniqueness, stock-policy consistency, opening-stock traceability, item lifecycle flags, and source-of-truth records.
- Enterprise finance and controls expert: preserve opening-stock transaction evidence and unit-cost integrity without inventing ledger behavior.
- OHADA/SYSCOHADA-aware platform architect: keep tax, currency, accounting, and country policy configuration outside hard-coded workflow assumptions.
- SaaS modularity specialist: keep the workflow tenant-safe, observable, permission-aware, and integrated with existing services rather than dashboard-only persistence.

Tasks:
1. Inspect the route, form component, canonical schema, server action, item service, location read action, authentication/RBAC helpers, safe error helpers, focused tests, and graph references.
2. Trace every submitted field and identify unused, lossy, client-trusted, inaccessible, or inconsistent behavior.
3. Preserve the item service as the persistence owner and opening-stock transaction boundary.
4. Improve step validation, invalid-field navigation, optional-selector clearing, image-upload feedback, unsaved-change protection, responsive presentation, and final navigation.
5. Activate optional opening stock only through organization-scoped active locations; require a positive integer quantity and non-negative unit cost.
6. Prevent opening stock for serial-tracked items until serial-aware receiving can capture each serial number.
7. Authorize before parsing in the public action, reject tenant mismatch, derive actor identity from authenticated context, and sanitize/log errors.
8. Preserve server-side item-list sorting and do not change table behavior, schema migrations, unrelated modules, or unrelated lint findings.
9. Add focused regression coverage and run TypeScript, focused lint, and item tests.
10. Save implementation evidence, verification results, risks, and deferred boundaries under `what-next/`.

Success criteria:
- Unauthorized or cross-tenant create requests cannot persist an item.
- Unexpected server failures do not expose internal error details.
- Required fields are trimmed and validated on both client and server boundaries.
- Maximum stock cannot be lower than minimum stock.
- Optional category, brand, unit, and tax selections can be cleared.
- Invalid final submission returns the user to the relevant step.
- Server action errors are shown to the user without allowing duplicate creation during delayed navigation.
- Unsaved Back navigation asks for confirmation.
- Opening stock posts in the existing item transaction with the authenticated actor and an active organization-scoped location.
- Serial-tracked items do not post opening stock without serial evidence.
- Reference-data failures degrade visibly without blocking unrelated item creation.
- Focused lint, TypeScript, and item tests pass.

Non-goals:
- Do not change the Items table, backend sorting, toolbar, filters, or pagination.
- Do not redesign unrelated inventory pages.
- Do not add database migrations.
- Do not implement serial-number receiving inside item creation.
- Do not hard-code country, tax, ledger, or currency policy.
- Do not touch unrelated lint warnings or refactor unrelated services.
```

## Execution Checklist

- [x] Inspect route, form, schema, action, service, location reader, error helpers, and graph references.
- [x] Preserve item-service persistence and transaction ownership.
- [x] Enforce permission and tenant scope before persistence.
- [x] Replace raw exception exposure with safe logged action errors.
- [x] Align client and canonical stock-range rules.
- [x] Make optional reference selectors clearable.
- [x] Route invalid submissions to the relevant form step.
- [x] Remove duplicate hidden registrations and delayed post-create navigation.
- [x] Add unsaved-change confirmation.
- [x] Surface partial reference-data loading failures.
- [x] Wire optional opening stock to active organization locations.
- [x] Prevent client-controlled opening-stock actor attribution.
- [x] Block non-serial-aware opening stock for serial-tracked items.
- [x] Add focused schema regression coverage.
- [x] Run focused lint, TypeScript, and focused tests.

## Evidence Inspected

- `app/[locale]/(dashboard)/dashboard/inventory/items/create/page.tsx`
- `components/inventory/ModernCreateItemForm.tsx`
- `actions/item/items.ts`
- `actions/locations/getOrgLocations.ts`
- `actions/_shared/safe-action-responses.ts`
- `lib/item/schemas.ts`
- `services/item/item.service.ts`
- `services/location/location.service.ts`
- `services/_shared/action-errors.ts`
- `types/location.ts`
- `services/item/__tests__/item.service.test.ts`
- `graphify-out/graph.json` nodes for the Create Item route, `ModernCreateItemForm`, `createItemAction`, and form navigation/submission handlers.

## Implemented Artifacts

- Hardened Create Item server action authorization, tenant checks, safe error logging, and error responses.
- Canonical schema rules for trimmed names/SKUs, coherent stock limits, positive opening quantity, and no client actor field.
- Server-owned opening-stock actor attribution in the item transaction.
- Organization-scoped active-location loading with graceful reference-data warnings.
- Nested opening-stock FormData parsing and canonical validation.
- Clearable optional relation selectors.
- Step-aware final validation and focus recovery.
- Immediate successful navigation to avoid a duplicate-submit window.
- Unsaved-change confirmation on Back.
- Reduced notification noise while retaining actionable success, warning, and failure messages.
- Optional opening-stock UI with location, quantity, unit cost, reference, and audit note.
- Focused Create Item schema regression tests.

## Verification Results

- `npm run typecheck`: passed. The first 120-second attempt timed out without diagnostics; a bounded rerun completed successfully in 116.5 seconds.
- Focused ESLint for the five changed workflow files: passed with no findings.
- `npm test -- --runInBand lib/item/__tests__/create-item-schema.test.ts services/item/__tests__/item.service.test.ts`: passed, 2 suites and 9 tests.
- Focused ESLint for the canonical schema and new regression test: passed with no findings.

## Risk Controls

- Tenant isolation: location reads and item writes remain organization-scoped.
- RBAC: `inventory.items.create` is required at route and action boundaries; location options require the existing `locations.read` action.
- Actor integrity: opening-stock `createdById` is always the authenticated user ID.
- Error safety: public action errors use the canonical safe logging and redaction path.
- Transaction integrity: item creation and opening stock remain inside the existing item-service transaction.
- Serial integrity: opening stock is disabled for serial-tracked items until the serial-aware receiving workflow can collect evidence.
- Dirty worktree: no unrelated files or lint findings were changed.

## Success Criteria Status

All code-level success criteria are met and verified.

A browser-authenticated route smoke was not run in this pass. The remaining manual check is to load `/en/dashboard/inventory/items/create` with a user who has both item-create and location-read permissions, create one item without opening stock, then create one non-serial item with opening stock and confirm redirect plus resulting inventory evidence.

## Deferred Boundaries

- Organization currency is not currently provided to this form, so the existing USD preview formatter was preserved rather than inventing a currency source.
- Serial-number entry and serial-aware opening receiving remain in the dedicated receiving workflow.
- No schema migration, table redesign, item-list behavior, or unrelated inventory workflow was changed.