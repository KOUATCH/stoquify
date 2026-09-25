# Inventory transfers page remediation

Date: 2026-09-12

## Outcome

Implemented full-page creation at `/en/dashboard/inventory/transfers/create` (and the French equivalent). `/en/dashboard/inventory/transfers` remains the history page and its Create Transfer action is now a route link. Creation no longer mounts a dialog, overlay, focus trap, or constrained modal viewport.

Source items now come from the tenant-scoped inventory read service, with positive availability and active, non-discontinued item filters. The entire source result is searchable by name/SKU, without the former ten-item cutoff. Source changes clear incompatible lines and selections. Loading, missing-source, empty-stock, no-search-results, and retryable failure states are distinct. Rejected quantity increases no longer mutate existing lines. Module-stop denials retain the draft and localized feedback.

## Verified causes and boundaries

- `TransferDashboard` mounted `CreateTransferModal` using local open state; its creation content used `DialogContent`, `max-w-5xl`, and `max-h-[92vh]`.
- The old item selector sliced the organization catalog to ten results and separately joined it to source inventory. Eligible source items outside that subset were inaccessible without the right search. Catalog permission/fetch failures could produce an empty picker independently of stock availability.
- The inventory query previously returned unsuccessful server-action envelopes as query successes, rendering failures as empty stock. The service itself did not impose a ten-row stock limit.
- The source selection handler did not clear lines or item selection. A shallow-copy update also mutated a line before rejecting excessive cumulative quantity.
- Fixed dark RGBA surfaces and modal portal composition diverged from the page's dashboard styling context. Creation now stays inside the shared dashboard theme and uses its semantic surface, control, button, status, and text tokens.
- The exact original live failure was not captured before editing because initial access redirected to sign-in. These causes are established from source and regression tests; the corrected behavior was then verified with the signed-in session.

## Files changed

- `components/inventory/transfers/CreateTransferModal.tsx`: page-flow form, stock-derived options, draft state handling, accessibility labels, translated creation copy. Retains a compatibility export for existing callers, without dialog behavior.
- `components/inventory/transfers/CreateTransferPage.tsx`: full-page shell and localized return navigation.
- `components/inventory/transfers/TransferDashboard.tsx`: route link and semantic surfaces.
- `app/[locale]/(dashboard)/dashboard/inventory/transfers/create/page.tsx`: guarded server route.
- `app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts`: creation surface, transfer permissions, enforced inventory module gate.
- `hooks/useTransferSourceInventory.ts`: tenant/source cache keys, unsuccessful action handling, retry support, inventory cache invalidation compatibility.
- `services/inventory/inventory-read.service.ts` and `types/inventoryTypes.ts`: optional transfer eligibility filter, preserving general inventory reads.
- `messages/en.json` and `messages/fr.json`: creation labels and state messages.
- `components/inventory/transfers/__tests__/CreateTransferModal.module-stop.test.tsx` and `services/inventory/__tests__/transfer-source-inventory.test.ts`: form and read-contract regressions.

The workspace was already extensively modified. Existing unrelated work was preserved, including prior mutation-hook changes and inline module-stop handling. No migration, posting rule, accounting logic, or stock-write service was changed.

## Design and architecture evidence

References: inventory item creation (`CreateItemWizard`) for page composition and dashboard controls; inventory movements (`InventoryMovementHistoryWorkbench` / shared history shell) for full-width workflow presentation and semantic states. Reviewed the inventory items and movements normalization reports under `what-next/ui-ux/`.

Existing graph references: app transfer route community 119; creation component community 35; transfer dashboard community 120; transfer hooks community 24. Current source was used to confirm the historical graph relationships.

Architecture/backend/data/security/frontend/workflow/localization/product/quality/platform lenses applied to this slice. Tenant scoping, existing server-owned quantity validation, audit behavior, and module-stop handling remain intact. Statutory rules, country packs, payroll, payments, AI, offline protocols, packaging and pricing changes are not applicable because those boundaries were not changed. No certification is claimed.

## Automated verification

PASS: 5 suites, 21 tests, including both English/French stopped-work draft retention, source changes, more than ten items, SKU search, loading/empty/error/retry states, excessive cumulative quantity rejection, successful mocked submission, existing mutation handling, transfer service controls, and inventory route catalog coverage.

Exact final command:

```powershell
node node_modules/jest/bin/jest.js --config .codex-tmp/transfer-jest.config.cjs --runInBand --testTimeout=30000 --runTestsByPath components/inventory/transfers/__tests__/CreateTransferModal.module-stop.test.tsx services/inventory/__tests__/transfer-source-inventory.test.ts hooks/__tests__/useTransferQueries.module-stop.test.tsx services/inventory/__tests__/inventory-transfer.service.test.ts 'app/[locale]/(dashboard)/dashboard/inventory/__tests__/route-audit.test.ts' --json --outputFile .codex-tmp/transfer-jest-results.json
```

The focused config uses the existing Next/Jest transform, root `jest.setup.ts`, and alias mapping, with bounded roots and a workspace cache. Earlier runs exceeded Jest's five-second interaction timeout; the final 30-second timeout run passed all assertions in 51.785 seconds.

PASS: focused lint, exit 0:

```powershell
node node_modules/eslint/bin/eslint.js components/inventory/transfers/CreateTransferModal.tsx components/inventory/transfers/CreateTransferPage.tsx components/inventory/transfers/TransferDashboard.tsx hooks/useTransferSourceInventory.ts 'app/[locale]/(dashboard)/dashboard/inventory/transfers/create/page.tsx' 'app/[locale]/(dashboard)/dashboard/inventory/inventory-route-data-access.ts' services/inventory/inventory-read.service.ts types/inventoryTypes.ts
```

PASS: `git diff --check` for the modified tracked transfer, route-catalog, translation, service and type files.

INCOMPLETE: `npm run typecheck -- --incremental false` was stopped after several minutes without diagnostic results to free resources for browser verification. This is not a passing repository typecheck. Initial output is retained in `.codex-tmp/transfer-typecheck.log`.

## Authenticated browser verification

- Direct creation route: full dashboard shell, page heading, ordinary page content, zero `role=dialog` elements.
- History page: 12 existing transfers visible; Create Transfer links to the new route.
- Internal link, refresh, browser back and forward: verified correct history/create routes and headings.
- French route: localized heading, fields, placeholders, feedback, actions and return URL verified.
- Central Warehouse: 20 selectable stock items displayed with name, SKU and available quantity. The eleventh item, Toothpaste 125 ml / RDS001-SKU-010, showed 135 available and was added with quantity 2.
- Changing source to Bassa Distribution Center cleared that line, cleared item/quantity input and disabled submission until a new line was added.
- SKU search at Bassa returned the matching item with its source-specific availability of 136.
- Mobile viewport 390 x 844: document width and scroll width both 390, no dialog, stacked controls and transfer lines. Temporary viewport override was reset.
- Desktop and mobile screenshots were inspected inline during the session. The browser content-export command is unsupported, so no exported before/after screenshot files are claimed.

## Remaining approval and limits

The prepared verification draft would request 1 Toothpaste 125 ml / RDS001-SKU-010 from Bassa Distribution Center to Akwa Flagship Store in the signed-in organization. Notes explicitly identify it as a UI test and say not to approve or post it. The action only creates a DRAFT and audit entry; stock posting remains a separate existing operation.

Automatic approval review rejected clicking Create Transfer because the exact persistent submission payload had not been specifically approved. Specific user approval was requested. No live submission or stock posting has been performed by this run; submission is verified through automated mocked tests only until that approval is supplied.
