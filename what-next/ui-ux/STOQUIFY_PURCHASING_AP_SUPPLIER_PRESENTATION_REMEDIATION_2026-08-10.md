# Stoquify Purchasing, AP, and Supplier Presentation Remediation

Date: 2026-08-10

Workspace: `E:/ohada saas/Focused projects/stoquify`

Status: IMPLEMENTED, BUILD-VERIFIED, AND AUTHENTICATED-BROWSER-VERIFIED FOR THE TESTED ENGLISH SLICE. NOT PRODUCTION-RELEASE-CERTIFIED.

## Executive outcome

The purchasing AP workbench, AP history, canonical and compatibility supplier routes, supplier create/edit/detail workflow, and related finance payables surface now follow the authenticated Stoquify presentation flow and reuse the existing dashboard semantic tokens and command-center primitives.

The AP workbench now presents tenant scope, source model, snapshot freshness, business KPIs, blocker/readiness status, and ranked follow-up work before record tables. Raw identifiers, raw provider/database errors, and misleading danger styling for normal payment activity are no longer presented as operator truth. Supplier and AP history retain visible supplier scope and stable navigation context.

The browser pass found and closed two additional accessibility defects: finance payables filter comboboxes now have localized accessible names, and supplier archive-dialog focus restoration is synchronous and reliable across responsive viewports.

No schema, migration, accounting rule, payment rule, reconciliation rule, supplier service, AP read model, or tenant boundary was changed.

## Route and surface inventory

| Route or surface | Ownership | Disposition |
| --- | --- | --- |
| `/{locale}/dashboard/purchases/payables` | Canonical purchasing AP workbench | Remediated: command brief, scoped context, semantic KPIs, status strip, ranked review queue, robust states, safe errors, localized presentation, and workflow links. |
| `/{locale}/dashboard/purchases/payables/history` | Canonical AP evidence history | Remediated: localized route states, permission-aware denial, canonical back navigation, visible supplier scope, semantic AP state labels, and stable dashboard shell. |
| `/{locale}/dashboard/purchases/suppliers` | Canonical supplier directory and integrated analytics entry | Normalized in the supplier remediation and retained: shared directory presentation, filters, analytics, quick-create, export, lifecycle actions, and canonical loading state. |
| `/{locale}/dashboard/purchases/suppliers/create` | Canonical supplier creation | Retained as a first-class route using the shared supplier form and canonical workflow context. |
| `/{locale}/dashboard/purchases/suppliers/[id]` | Canonical supplier detail and integrated supplier analytics | Retained as a first-class permission-aware record workspace with lifecycle, credit, AP, proof, and analytics context. |
| `/{locale}/dashboard/purchases/suppliers/[id]/edit` | Canonical supplier edit | Retained as a first-class route using the shared form, supplier context, and stable return path. |
| `/{locale}/dashboard/suppliersSystem` | Compatibility supplier directory | Delegates to the shared implementation and receives the same loading and presentation contract; no duplicate design system introduced. |
| `/{locale}/dashboard/suppliersSystem/new` | Compatibility supplier creation | Delegates to the shared route-first form contract. |
| `/{locale}/dashboard/suppliersSystem/[id]` | Compatibility supplier detail | Delegates to the shared permission-aware detail workspace. |
| `/{locale}/dashboard/suppliersSystem/[id]/edit` | Compatibility supplier edit | Delegates to the shared edit workspace. |
| `/{locale}/dashboard/finance/payables` | Related finance payables analytics | Remediated: normal recent disbursement semantics use success, filters have localized accessible names, and authenticated responsive evidence is captured. |
| Separate supplier analytics route | None in current route graph | No route invented. Supplier analytics remain integrated into the supplier workspace. |
| Separate purchasing payables analytics route | None in current route graph | No route invented. The related analytics surface remains finance payables. |

The inventory was derived from the route graph and source tree before editing. `graphify-out/graph_app.json`, `graphify-out/graph_components.json`, `graphify-out/graph_actions.json`, and `graphify-out/graph_hooks.json` were inspected. The requested root `GRAPH_REPORT_app.md` and `GRAPH_REPORT_components.md` files were not present; no substitute report was fabricated.

## Canonical semantic-state mapping

| Business meaning | Canonical tone | Representative states |
| --- | --- | --- |
| Primary system/posted truth | Brand | Posted invoice or journal-backed state. |
| Released/current operational state | Spruce | Released payment, active supplier. |
| Completed/confirmed outcome | Success | Paid, reconciled, resolved, normal completed disbursement. |
| Informational proof or relationship | Info | Matched, within-limit exposure, scoped metadata. |
| Attention/review without confirmed failure | Gold | Draft review, pending, payment pending, open payable, stale snapshot, partial evidence. |
| Confirmed blocker/failure/risk | Danger | Failed, unresolved, reconciliation blocker, missing required country context, match exception, over-limit exposure. |
| Neutral/inactive/unknown | Muted | Cancelled, inactive, not posted, unavailable or unknown state. |

Every state retains a textual label and supporting context; color is never the sole status signal. The remediation reuses `dashboardToneClass`, `dashboardPanelClass`, `dashboardRowClass`, and the existing command-center primitives. It does not add an alternate palette.

## Presentation and workflow changes

- Rebuilt the AP presentation around `CommandBriefHeader`, `KpiTile`, `StatusStrip`, `ActionQueue`, and `RouteStatePanel`.
- Added visible current-tenant scope, source-model disclosure, snapshot timestamp, freshness state, and record-coverage context.
- Ranked ledger blockers, reconciliation blockers, bank-detail changes, operator review, and payment-pending work by business urgency.
- Added explicit loading, empty, partial, stale, error, denied, no-organization, and success presentation paths where the route read models support them.
- Kept safe operator messages at route boundaries and removed raw backend/provider error leakage from AP presentation.
- Removed raw organization, requester, payment transaction, exception, and source identifiers from the normal AP operator view while preserving server-owned evidence internally.
- Preserved AP-to-history, AP-to-suppliers, supplier-to-history, detail-to-edit, and edit-to-detail navigation continuity.
- Added localized loading states to canonical AP, canonical supplier, and compatibility supplier route groups.
- Added localized accessible names to finance location, period, start-date, and end-date controls.
- Made archive confirmation return focus directly through the alert-dialog close lifecycle.

## Security, accounting, and control preservation

- Organization and tenant scoping remains server-owned on reads and mutations.
- Supplier permissions remain `purchases.suppliers.read`, `purchases.suppliers.create`, `purchases.suppliers.update`, and `purchases.suppliers.delete` as applicable.
- AP access retains `purchasing.ap.invoice.view`; finance payables retains `finance.payables.read`.
- Purchasing module observation/enforcement behavior remains unchanged.
- Controlled export behavior retains `reports.export`, sensitive-field restriction, fresh-auth assurance, redaction, watermarking, and durable audit behavior.
- Maker-checker, invoice matching, supplier destination controls, reconciliation controls, close invalidation, and audit provenance remain unchanged.
- Monetary values continue to use exact server data and explicit currency context. Presentation code does not infer payment, accounting, matching, or reconciliation truth.
- No schema, migration, seed reset, production backfill, or destructive data operation was introduced. Browser fixtures were isolated and cleanup was verified.

## Files and shared primitives

| File or group | Purpose |
| --- | --- |
| `components/purchasing/APControlWorkbench.tsx` | Canonical AP command-center hierarchy, semantic mapping, safe presentation, workflow context, and robust states. |
| `components/purchasing/APHistoryWorkbench.tsx` | Supplier-aware AP history scope and semantic history state treatment. |
| `components/dashboard/history/TransactionHistoryWorkbenchShell.tsx` | Narrow shared support for header actions and meaningful empty action-queue behavior. |
| `components/dashboard/primitives/command-center-primitives.tsx` | Added the canonical stale-data route state. |
| `components/suppliers/SupplierManagementDashboard.tsx` | Route-first supplier workflow, normalized tones, analytics context, and reliable archive focus restoration. |
| `components/finance/FinanceSpecializedLedgerSurfaces.tsx` | Correct completed-disbursement semantics and accessible localized filters. |
| Payables route pages and loading files | Localized permission/no-org/error states, stable snapshot evaluation, history navigation, and loading presentation. |
| Supplier canonical/compatibility route loading files | Coherent loading presentation for direct URLs. |
| `messages/en.json` and `messages/fr.json` | AP history/state copy and localized finance filter labels. |
| Focused Jest and Playwright files | Component, route, permission, workflow, responsive, accessibility, and evidence coverage. |

## Verification ledger

| Verification | Final result |
| --- | --- |
| `npm run typecheck` | PASS, exit 0. |
| Focused ESLint on affected runtime, test, and E2E files | PASS, exit 0. |
| `npm run lint` | PASS, exit 0; three unrelated warnings, zero errors. |
| Focused Jest | PASS: 6 suites, 20 tests. |
| `npm run purchasing:ap:gate` | PASS: ready, 11/11 checks, zero blockers. |
| `npm run service:boundary:fail` | PASS: zero active violations. |
| Translation JSON parse | PASS for English and French. |
| `npm run test:e2e:supplier` | PASS: 30/30 Playwright tests in the final authoritative run. |
| Desktop evidence | PASS at 1280px for eight authenticated surfaces; zero serious violations, overflow, clipped actions, or overlapping actions. |
| Tablet evidence | PASS at 834px for eight authenticated surfaces; zero serious violations, overflow, clipped actions, or overlapping actions. |
| Mobile evidence | PASS at 412px for eight authenticated surfaces; zero serious violations, overflow, clipped actions, or overlapping actions. |
| Restricted-role evidence | PASS: permission denial, no supplier data disclosure, no export/lifecycle controls, zero serious violations, and no document overflow. |
| Fixture cleanup | PASS: zero fixture organizations, users, or suppliers remained. |
| `npm run build:app` | PASS: optimized production build completed and affected routes were emitted. |
| `git diff --check` | PASS, exit 0. |

The full lint warnings are pre-existing and out of scope:

- `components/frontend/custom-carousel.tsx`: `@next/next/no-img-element`
- `components/ui/groups/inventory/ItemManagement.tsx`: `@next/next/no-img-element`
- `config/permissions.ts`: `import/no-anonymous-default-export`

The successful Playwright run emitted local development-server shutdown `ECONNRESET` messages and a future `allowedDevOrigins` warning after all tests passed. The successful build emitted a `next-intl` webpack cache-invalidation warning. These did not alter test or build outcomes and were not changed outside scope.

## Evidence index

Evidence root: `what-next/evidence/purchasing-ap-supplier-presentation-2026-08-10/`

The directory contains:

- `certification-summary.json` with overall PASS, all nine scenarios, layout data, accessibility data, RBAC result, and cleanup result.
- Three viewport result ledgers: desktop, tablet, and mobile.
- One restricted-role result ledger and screenshot.
- Desktop, tablet, and mobile screenshots for supplier list, quick-create dialog, create page, detail page, edit page, supplier-scoped AP history, AP workbench, and finance payables.
- `README.md` with the concise evidence map and limitations.

## Unresolved-risk ledger

1. Authenticated browser screenshots exercise English routes only. French copy and component behavior are typechecked and covered by focused route/component assertions, but no French authenticated screenshot certification is claimed.
2. The local image viewer could not initialize because of the Windows sandbox helper. Automated screenshot generation, Axe checks, and geometric layout checks passed, but no separate manual pixel-level visual certification is claimed.
3. The finance payables fixture represents a valid low/empty-data state; browser evidence proves route presentation and accessibility in that state. The completed-disbursement success semantic is also enforced in source, but a populated disbursement fixture was not invented.
4. Existing supplier analytics data-contract limits remain. Currency, receipt, delivery, allocation, and provider evidence not present in authoritative read models were not inferred in presentation code.
5. This remediation does not certify legal, statutory, accounting, security, privacy, accessibility, or production release readiness beyond the explicit automated evidence above.

## Scope disposition

| Review lens | Disposition |
| --- | --- |
| Enterprise/platform architecture | Applied: canonical and compatibility route ownership preserved. |
| Backend/integration | Applied proportionally: existing actions, hooks, services, and data contracts preserved. |
| Database/migration | Not applicable: no schema or migration change. |
| Security/IAM/privacy | Applied: RBAC, tenant isolation, entitlement, fresh auth, redaction, and audit boundaries retained and tested. |
| Frontend/design system | Applied: route hierarchy, tokens, shared primitives, semantic tones, and robust states normalized. |
| Workflow/accessibility/localization | Applied: cross-route context, focus, accessible controls, EN/FR copy contracts, and responsive automated checks. French browser evidence remains open. |
| Product/business process | Applied: supplier lifecycle and AP review flow preserved. |
| Finance/accounting/reconciliation | Applied: server-owned proof and controls preserved; no presentation inference. |
| OHADA/SYSCOHADA statutory | Not applicable: no statutory mapping or policy changed. |
| SRE/DevSecOps | Applied proportionally: type, lint, focused tests, gates, browser evidence, build, and cleanup. |
| Offline/provider boundary | Not applicable: no offline or provider mutation path changed. |
| Analytics/data governance | Applied: definitions, scope, filters, source model, and freshness are visible without inventing metrics. |

## Conclusion

The tested purchasing AP, AP history, supplier, and related finance payables slice now follows Stoquify's authenticated semantic and workflow presentation contract. The implementation is ready for stakeholder review, with French authenticated screenshots and manual pixel-level review clearly identified as remaining evidence rather than silently claimed.
