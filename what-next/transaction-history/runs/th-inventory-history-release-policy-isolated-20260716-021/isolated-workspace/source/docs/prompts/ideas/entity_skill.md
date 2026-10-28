Professional Create Entity Workflow
Overview
Build the complete workflow for creating or updating an entity, not just a pretty form. The finished result must feel native to StockFlow: professional, real-data-backed, bilingual, locale-aware, theme-aware, permission-aware, and wired through the existing app architecture from database fields to server actions, hooks, forms, cache invalidation, navigation, and notifications.

Do not create mock-only forms, detached templates, decorative steppers, duplicate mutation paths, or UI that bypasses the system's existing data boundaries.

StockFlow Rules
Follow AGENTS.md and local project instructions first.
Inspect the actual route, schema, actions, hooks, components, and translations before editing.
Preserve [locale] routing. Never hardcode /en, /dashboard, or post-auth/create-success destinations when a locale-aware route helper or route param is available.
Use the existing notification/toast provider. Do not add a parallel toast system.
Do not introduce a new services layer for StockFlow create-entity workflows unless the target domain already uses one. Prefer existing server actions, domain helpers, validation schemas, and TanStack Query hooks.
Do not call Prisma from client components.
Do not duplicate server actions or hooks when an existing mutation path can be corrected.
Keep server actions responsible for auth, permission checks, validation, database writes, revalidation, and typed results.
Keep forms responsible for user interaction, field state, client-side ergonomics, and calling the existing mutation/action boundary.
Use locale-sensitive database fields directly where the schema supports them: nameEn/nameFr, titleEn/titleFr, descriptionEn/descriptionFr.
Do not revive legacy name, title, or description writes unless the schema still requires them. If compatibility display values are needed, derive them from bilingual fields at the boundary.
Keep changes scoped to the requested entity workflow and the necessary shared integration files.
Excluded Domains
Do not redesign these areas unless the user explicitly asks or the target entity workflow cannot function without a small integration fix:

Authentication and session architecture.
Cash drawer settlement and POS session accounting.
Ledger posting, financial closing, payroll, and tax calculations.
Manufacturing execution, production costing, and recipe costing.
Delivery dispatch, tracking, and route optimization.
Reporting dashboards and analytics strategy.
Global schema migrations outside the requested entity contract.
Broad design-system rewrites.
Phase 0: Hard-Blocking Research
Before design or implementation, review at least seven credible references when internet access is available. Prefer official product documentation, product pages, help centers, or screenshots from mature systems.

For StockFlow entity workflows, useful references include:

Shopify product/customer/admin creation flows.
Square item library, customer directory, and inventory flows.
Lightspeed product, supplier, and purchase order flows.
Clover inventory and customer management flows.
Zoho Inventory item, vendor, and purchase order flows.
Odoo inventory, contacts, suppliers, and purchase flows.
QuickBooks product/service, customer, and vendor flows.
Toast inventory or menu management when POS context matters.
Extract principles, not visuals: field order, progressive disclosure, dependent selects, required data, stock/price/tax handling, supplier/customer identity, duplicate prevention, bulk or advanced options, mobile constraints, and post-create navigation.

If browsing is unavailable, say so and use existing project examples plus any local docs or reports, including docs/, graphify-out/, and related skill references.

Acceptance:

Seven references or a clear browsing-unavailable note are recorded in the work report.
The design direction is based on practical product principles, not copied UI.
Phase 1: Codebase Discovery
Find the actual implementation path before editing.

Inspect:

[locale] route, page, layout, modal, drawer, or dashboard entry point.
Existing entity list, detail, create, edit, and success navigation.
Prisma model and required fields.
Bilingual fields and display fallback conventions.
Existing server actions and validation schemas.
Existing TanStack Query query keys, query hooks, mutation hooks, and invalidation.
Existing form components, UI primitives, comboboxes, steppers, dialogs, date pickers, number inputs, and file inputs.
Existing notification provider and error/result conventions.
Existing permission, organization, branch, location, and tenant scoping.
Existing translations and locale utilities.
Existing tests, seeds, factories, and fixtures.
If graphify-out/ exists, read relevant graph reports or graph JSON for route/action/hook/component relationships before making architecture claims.

Acceptance:

The workflow map is known from route -> form -> schema -> action/hook -> Prisma -> cache -> navigation.
No duplicate implementation is created because the existing path was missed.
Phase 2: Design Contract From The Landing Page
Match the product's visual and semantic language.

Derive:

Density, rhythm, typography, color, radius, borders, and surfaces from the surrounding app and landing/product pages.
Whether the create workflow should be a single form, drawer, modal, stepper, or guided wizard.
Which information belongs in the first viewport.
Which fields are advanced, optional, or dependent.
How the success state returns the user to their next real task.
Acceptance:

The workflow feels like part of StockFlow, not a generic template.
The UI remains operational and compact where enterprise users need speed.
The design works in light and dark themes.
Phase 3: Data Contract From Existing Actions And Hooks
Define the data contract before changing the UI.

For each field, identify:

Prisma field name and type.
Whether the field is required, optional, defaulted, derived, or server-controlled.
Validation rule and error message.
Locale behavior and bilingual pair behavior.
Source query for select/combobox options.
Mutation payload shape.
Server action or hook that owns the write.
Cache keys and route revalidation after success.
StockFlow bilingual rule:

Items/products/units/customers/suppliers/categories and similar entities must persist locale-aware fields directly when available.
Use nameEn/nameFr, titleEn/titleFr, and descriptionEn/descriptionFr consistently from form values through validation, server actions, hooks, tests, seeds, and Prisma writes.
Display labels may use the active locale with fallback, but persistence must not collapse bilingual data into a single legacy field.
Acceptance:

The form payload matches server validation.
The server action writes the current Prisma fields.
Hooks and tests use the same typed contract.
Create and update paths behave consistently.
Phase 4: Step Decomposition By User Mental Model
Structure the workflow around how the user thinks, not how the database is ordered.

Common step groups:

Identity: name/title, code/SKU/reference, category/type, status.
Classification: category, unit, tags, supplier/customer segment, tax or accounting group.
Operational details: stock, reorder rules, price, cost, location, branch, purchase/sale behavior.
Relationships: supplier, customer, contact, default unit, purchase order lines.
Review: summary, warnings, duplicate detection, missing optional data, create/update action.
Prefer a single well-grouped form for simple entities. Use a stepper only when the task naturally has phases or many dependent fields.

Acceptance:

Required fields are easy to complete without hunting.
Advanced fields are discoverable without dominating the primary task.
The user can recover from validation errors without losing context.
Phase 5: Ergonomics, I18n, And Theme
Use the existing form, translation, and theme systems.

Form ergonomics checklist:

Required fields are visible before submit.
Optional fields are clearly marked or visually secondary.
Field order follows the user's task flow.
Inputs use the correct control type, mask, step, min/max, and autocomplete.
Dependent selects load real data and handle empty states.
Locale-aware numbers, dates, currency, and units are formatted correctly.
Validation appears at field level and form level where appropriate.
Server errors are visible, recoverable, and also sent through the notification provider when useful.
Submitting, disabled, retry, success, and duplicate-submit states are handled.
Keyboard navigation, labels, descriptions, focus rings, and screen reader names are correct.
Mobile layout remains usable without cramped action bars or hidden required fields.
Success navigation preserves locale and lands on the entity detail/list or next task.
Query invalidation or cache updates refresh every affected list, detail, search, and dashboard surface.
I18n checklist:

All user-facing labels, help text, placeholders, buttons, errors, empty states, and notifications use project translation conventions.
Bilingual model fields are captured and persisted as bilingual fields, not collapsed into a single display string.
Active-locale display uses the correct fallback order.
Links and redirects preserve [locale] and do not hardcode /en.
Dates, numbers, currency, percentages, and pluralization use locale-aware formatting.
Acceptance:

The workflow is usable in English and French.
The layout survives longer translated strings.
Dark and light themes both have accessible contrast and polished states.
Phase 6: Review And Success
Implement a real completion path.

After create/update success:

Show success feedback through the existing notification system.
Invalidate or update all relevant TanStack Query keys.
Revalidate server-rendered routes where the app uses revalidation.
Preserve locale in every redirect and link.
Navigate to the appropriate detail, list, next-create, or source context page.
Surface partial-success or background-processing states if the domain uses them.
Acceptance:

The newly created or updated entity appears immediately in relevant lists and selects.
The user is not sent to a hardcoded locale or stale dashboard route.
Post-auth and post-create navigation preserve context.
Phase 7: Quality Gates And Commits
Before finishing:

Run the smallest meaningful verification first, then broaden if the workflow touches shared contracts.
Prefer typecheck, lint, affected tests, and browser inspection for known local routes.
Check for hardcoded /en, /dashboard, legacy name/title/description writes, duplicate actions, direct Prisma in client components, and unlocalized copy.
Review tests, seeds, factories, and fixtures for bilingual field drift.
Report any command that could not be run.
Commit only when the user asks and the worktree scope is clean enough to review safely. Use focused commits such as:

feat(item): wire bilingual create workflow
feat(customer): modernize guided create form
fix(supplier): preserve locale in create navigation
test(inventory): cover bilingual entity mutations
Acceptance:

Verification results are reported.
Remaining risks are explicit.
Commits, when made, are reviewable and grouped by contract, UI, and tests.
Pre-Flight Checklist
Before using this skill on a task, confirm:

The target entity and action are clear: create, update, duplicate, import, or guided onboarding.
The route is under the current locale-aware app structure or has an intentional legacy path.
The Prisma model fields match the intended bilingual contract.
The existing mutation path is known.
The notification provider is known.
The translation files or translation helper are known.
The affected query keys and invalidation path are known.
The relevant tests, seeds, and fixtures are known or confirmed absent.
If one of these cannot be discovered and the decision would affect data shape, permissions, or navigation, ask the user before inventing a contract.

Final Report
Report:

Files changed.
References reviewed or browsing-unavailable fallback used.
Workflow route and data flow.
Prisma fields and bilingual contract used.
Server actions, hooks, query keys, and invalidation touched.
UI and form ergonomics improvements.
I18n and locale-preserving navigation behavior.
Dark/light theme handling.
Notification provider integration.
Tests, lint, typecheck, and browser checks performed.
Remaining gaps, assumptions, or follow-up tasks.