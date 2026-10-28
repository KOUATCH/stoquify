# Stoquify Supplier Surface Presentation Remediation

Date: 2026-08-10

Workspace: E:/ohada saas/Focused projects/stoquify

Status: IMPLEMENTED AND BROWSER-VERIFIED FOR THE TESTED ENGLISH SUPPLIER SLICE.
NOT PRODUCTION-RELEASE-CERTIFIED.

## Executive outcome

The supplier create, edit, and detail URLs now render as first-class
authenticated product pages instead of URL-controlled dialogs displayed over
the complete supplier directory. Directory quick-create and quick-edit remain
focus-managed dialogs and reuse the same form, validation, mutation, cache,
and navigation behavior.

Supplier details now lead with supplier identity, lifecycle, credit exposure,
open payable, ledger blockers, allowed actions, source freshness, and AP proof
state before the existing Overview, Purchases, Invoices and AP, Payments, and
Linked items workspace.

Supplier AP history now has an explicit dashboard theme shell, visible
supplier scope, a stable back-to-supplier action, no misleading empty action
queue, localized control-state labels, and semantic state tones derived from
the server-owned AP control-state union.

No supplier service, AP service, action, schema, migration, accounting rule,
export authorization, or lifecycle policy was changed.

## Before and after matrix

| Surface | Before | After |
| --- | --- | --- |
| Create | Direct URL opened a modal over the full supplier dashboard. | Direct URL presents a command brief and inline page form. Successful creation still lands on the stable supplier detail URL. |
| Edit | Direct URL opened a modal over directory analytics and tables. Cancel returned to the directory. | Direct URL presents supplier identity, lifecycle context, update metadata, and the shared inline form. Cancel returns to the stable supplier detail URL. |
| Details | Direct URL opened an analytics dialog over the directory. State, risk, actions, and proof were secondary. | First-class record workspace ordered as identity, state, risk, action, proof, status strip, and domain tabs. |
| AP history | Shared workbench had no explicit route theme wrapper, supplier back action, localized state tones, or supplier-context metadata. An empty action queue was rendered. | Canonical dashboard shell, supplier scope, back navigation, localized semantic badges, and optional empty-queue suppression are active. |
| Compatibility routes | Legacy suppliersSystem routes delegated to the shared dashboard. | They still delegate to the same shared implementation and inherit route-first presentation without creating a second form or detail workspace. |

## Semantic color decisions

- Active supplier: spruce, because it is a current operational state.
- Inactive or cancelled: muted, with visible text and icon.
- Within-limit credit exposure: info.
- Over-limit exposure or ledger blockers: danger.
- Open payable and payment pending: gold, because they need attention or
  review without implying failure.
- Paid: success.
- Released payment: spruce.
- Matched: info.
- Posted: brand.
- AP exception: danger.
- Complete operational history: success or operational proof depending on
  the surface.
- Partial history: gold, not danger.

All status badges retain textual labels. Color is not the sole state signal.

## Files changed and why

| File or group | Reason |
| --- | --- |
| components/suppliers/SupplierManagementDashboard.tsx | Added route-first create, edit, and detail presentation; preserved shared form/detail logic; normalized semantic tones and scoped surfaces; fixed edit cancel destination. |
| components/ui/dialog.tsx | Added an explicit inline content mode so the same dialog body can serve a first-class route without duplicate forms or details markup. Existing modal behavior remains the default. |
| components/purchasing/APHistoryWorkbench.tsx | Added supplier scope, back navigation, localized control-state labels, semantic AP state tones, and supplier metadata. |
| components/dashboard/history/TransactionHistoryWorkbenchShell.tsx | Added optional header actions and narrowly scoped empty-action-queue suppression. Defaults preserve other history workbenches. |
| app/[locale]/(dashboard)/dashboard/purchases/payables/history/page.tsx | Added the canonical authenticated dashboard shell. |
| app/[locale]/(dashboard)/dashboard/purchases/suppliers/[id]/page.tsx | Passed permission-aware edit capability to the detail workspace. |
| app/[locale]/(dashboard)/dashboard/suppliersSystem/[id]/page.tsx | Kept the compatibility detail route on the same permission-aware presentation contract. |
| messages/en.json and messages/fr.json | Added supplier-scoped AP history, back-navigation, snapshot, and localized AP control-state copy. |
| focused Jest tests | Prove first-class route presentation, stable navigation, canonical history shell, supplier context, empty-queue suppression, and semantic payment-pending tone. |
| tests/e2e/supplier-authenticated-release.spec.ts | Replaced dialog-only deep-link assertions, added create/edit/detail/history screenshots, and retained directory dialog, export, lifecycle, focus, and layout checks. |

## Security and control preservation

- Canonical supplier page guards remain:
  purchases.suppliers.read, purchases.suppliers.create, and
  purchases.suppliers.update.
- Purchasing module observation or enforcement remains unchanged.
- Supplier and AP reads remain organization-scoped and server-owned.
- No client-derived supplier, monetary, ledger, allocation, or proof truth was
  introduced.
- Controlled exports retain reports.export, sensitive-field opt-in,
  superuser restriction, fresh authentication, redaction, watermark, and
  durable audit behavior.
- Archive-versus-deactivate behavior and historical preservation remain
  unchanged.
- Supplier AP history retains supplierId, lane, selected, cursor, dates, page
  size, exact monetary strings, currency, effective time, recorded time,
  redacted destinations, and accounting evidence.
- Compatibility routes were not deleted.

## Verification ledger

| Verification | Result |
| --- | --- |
| npm run typecheck | PASS, exit 0 |
| Focused ESLint on changed supplier presentation files | PASS, exit 0 |
| Full npm run lint | PASS with three unrelated warnings and zero errors |
| Focused Jest route and presentation suites | PASS, 4 suites and 15 tests |
| npm run purchasing:ap:gate | PASS, ready, 11 of 11 checks, zero blockers |
| npm run service:boundary:fail | PASS, zero active violations |
| git diff --check | PASS, line-ending notices only |
| npm run test:e2e:supplier | PASS, 24 of 24 Playwright tests |
| Desktop evidence | PASS at 1280px; zero serious violations, overflow, clipped actions, or overlapping actions |
| Tablet evidence | PASS at 834px; zero serious violations, overflow, clipped actions, or overlapping actions |
| Mobile evidence | PASS at 412px; zero serious violations, overflow, clipped actions, or overlapping actions |
| Restricted-role browser path | PASS; supplier reads and mutations remained inaccessible |
| Fixture cleanup | PASS |
| French authenticated browser screenshots | SKIPPED; not configured in the supplier E2E project |
| Separate manual screenshot inspection | BLOCKED by local Windows sandbox helper initialization failure |
| npm run build:app | SKIPPED; authenticated browser route rendering provided stronger focused route evidence for this slice |
| Full policy chain | SKIPPED; no policy or statutory boundary changed |

The three unrelated full-lint warnings remain in:

- components/frontend/custom-carousel.tsx
- components/ui/groups/inventory/ItemManagement.tsx
- config/permissions.ts

They were not changed.

## Screenshot and browser evidence index

Evidence root:

what-next/evidence/supplier-surface-presentation-2026-08-10/

The evidence contains create, edit, detail, history, directory, quick-create
dialog, and denied-role screenshots plus desktop, tablet, mobile, RBAC, and
certification JSON summaries.

## Scope disposition

| Review lens | Disposition |
| --- | --- |
| Enterprise and platform architecture | Applied: canonical and compatibility route ownership preserved. |
| Backend and integration | Applied proportionally: existing actions, hooks, and services preserved. |
| Database and migration | Not applicable: no schema, migration, backfill, or production data mutation. |
| Security, IAM, privacy, and abuse resistance | Applied: RBAC, tenancy, entitlement, export, redaction, and audit boundaries preserved and browser-tested. |
| Frontend and design system | Applied: route anatomy, dashboard tokens, shared surfaces, and semantic tones normalized. |
| Workflow, accessibility, localization, and content | Applied: route flow, keyboard/focus, responsive layout, and English/French copy contracts updated. French runtime proof remains outstanding. |
| Product and business process | Applied: directory to create to detail to edit to history continuity verified. |
| Finance, accounting, and reconciliation | Applied: AP proof, completeness, currency, blocker, and history semantics preserved. |
| OHADA and SYSCOHADA statutory review | Not applicable: no statutory rule or accounting mapping changed. |
| SRE and DevSecOps | Applied proportionally through typecheck, lint, gates, authenticated browser runs, error monitoring, and cleanup. |
| Offline, edge, and provider boundary | Not applicable: no offline or provider mutation path changed. |
| Analytics and data governance | Applied: existing authoritative read models retained; no unsupported metrics added. |
| AI and agent governance | Not applicable: no AI feature or autonomous decision introduced. |
| Packaging, billing, and growth | Not applicable: purchasing entitlement was preserved; packages and billing were unchanged. |
| Change management and support | Applied through focused tests, evidence, and this implementation report. |

## Remaining limitations

1. The configured authenticated supplier browser suite exercises English
   routes only. French messages compile, but French desktop and mobile
   screenshots remain a separate verification task.
2. The local image viewer failed before loading screenshots because the
   Windows sandbox helper could not initialize. The screenshots were produced
   successfully and passed automated axe and layout checks, but no additional
   manual visual certification is claimed.
3. Existing supplier analytics DTO limitations remain: per-order currency,
   receipt state, delivery performance, invoice allocation, and a supplier
   default currency were not invented.
4. This result does not certify legal, accounting, privacy, security,
   accessibility, or production release readiness.

## Conclusion

The tested supplier UI slice now follows Stoquify's authenticated design
semantics and workflow-first presentation contract. The implementation is
ready for stakeholder visual review and an optional French authenticated
browser pass. It is not a production-release certification.
