# Stoquify Customer Experience Completion Report

Date: 2026-08-10  
Scope: Customer list, create, profile/analytics, edit, orders, statement, and customer quick-action surfaces  
Verdict: BLOCKED FOR FULL ACCEPTANCE

## Executive outcome

The customer implementation was updated without creating a duplicate customer-detail route, weakening access controls, changing financial history, adding a database migration, or rewriting the global design system.

The code-level implementation is green: 47 targeted tests pass, the full TypeScript check passes, scoped ESLint passes, the regulatory hardcode gate reports zero findings, and the customer patch passes whitespace validation.

Full acceptance is not declared. Browser initialization failed in the Windows sandbox before a session could be created, so desktop, tablet, mobile, and visual-regression evidence could not be captured. The repository-wide report/export trust gate is also blocked at 32 of 35 checks by three accountant missing-proof workflow gaps outside the customer statement implementation.

This report is implementation evidence, not accessibility, legal, security, accounting, tax, OHADA, privacy, or release certification.

## Implemented changes

### Route and navigation integrity

- Preserved the canonical customer profile route at /{locale}/dashboard/customers/{customerId}.
- Did not create /customers/[id]/details.
- Removed customer action links to the nonexistent /dashboard/sales/new route; supported sales navigation now targets /{locale}/dashboard/sales.
- All changed navigation uses the active locale and the real customer identifier.
- Removed page-level forced dark mode from the customer list, create, profile, edit, and statement entry pages so the dashboard shell controls theme semantics.

### Semantic UI convergence

- Reworked CustomerQuickActions and the customer orders presentation to use approved dashboard semantic tokens and existing dashboard primitives.
- Added explicit text and icons to status presentation so color is not the only signal.
- Added a static ratchet covering customer routes and components. It rejects raw Tailwind palette classes, forced page-level dark mode, the nonexistent customer details route, and the dead sales/new route.
- Preserved the existing global dashboard design system and avoided a global token rewrite.

### Capability and tenant boundaries

- The customer orders server page continues to require customer read and customer-order read access.
- Export, sales, update, and receivables capabilities are derived on the server from existing RBAC permissions and passed as booleans to the client.
- Unauthorized action controls fail closed by being hidden or disabled; server actions remain the enforcement boundary.
- The statement route preserves customer-read, accounting-export, accounting-module entitlement, organization, and fresh-auth boundaries.
- No client-provided organization or tenant identifier was introduced.

### Metric and currency ownership

- Orders and statement pages resolve currency from organization settings and fail closed when currency is unavailable or invalid.
- The statement currency is read-only in the UI and is passed from the server-owned organization configuration.
- Total orders, total revenue, average order value, and delivered orders now come from the server-owned customer-order summary contract.
- The browser no longer calculates the displayed delivered-order statistic.
- No hardcoded currency was added and no authoritative financial total is calculated from client-side pagination.

### Statement truth and auditability

- Statement periods are controlled form values and inverted periods are rejected before fresh authentication.
- Statement generation retains the immutable service boundary, fresh-auth challenge, idempotency key, and correlation identifier.
- The UI exposes the snapshot as-of time, recorded-through time, truncation warning, content hash, and delivery expiry/revocation state.
- Delivery remains consented and uses the existing service/provider contract; no provider, successful delivery, payment evidence, export, or value is simulated.
- Missing currency, entitlement, permission, customer, or delivery capability is exposed as unavailable or denied instead of being cosmetically concealed.

### Localization and customer editing

- Changed customer orders and statement copy is available in English and French.
- Locale-aware date and number/currency formatting is retained.
- Customer editing remains limited to customer profile/master-data fields. It does not mutate sales orders, ledger entries, payments, immutable statements, or other financial history.

## Route and capability matrix

| Surface | Canonical route | Server/access boundary | Outcome |
|---|---|---|---|
| Customer list | /{locale}/dashboard/customers | Existing customer-management read model and server actions | Theme follows shell; no route duplication |
| Create customer | /{locale}/dashboard/customers/new | Existing create action and permissions | Theme follows shell; no speculative fields |
| Customer profile/analytics | /{locale}/dashboard/customers/{id} | Existing tenant-scoped customer management actions | Canonical detail surface retained |
| Edit customer | /{locale}/dashboard/customers/{id}/edit | Existing update action; financial history excluded | Canonical ID and locale preserved |
| Customer orders | /{locale}/dashboard/customers/{id}/orders | customers.read plus customers.orders.read; action capabilities derived server-side | Semantic UI, authoritative stats, capability-aware actions |
| Customer statement | /{locale}/dashboard/customers/{id}/statement | customers.read, accounting.exports.create, accounting entitlement, organization scope, fresh auth | Immutable snapshot and truthful delivery states |
| Customer details alias | Not present | Not applicable | No duplicate /details route created |

## Acceptance-criteria evidence map

| Acceptance criterion | Status | Evidence |
|---|---|---|
| No unintended links to a missing /details route | PASS | Customer semantic/route ratchet and source review |
| Routes preserve locale and real customer IDs | PASS | Localized path construction; customer route tests |
| Scoped pages use approved semantic dashboard tokens | PASS | Static semantic-color ratchet; scoped ESLint |
| Raw palette classes eliminated except justified exceptions | PASS | Static ratchet passes across scoped app/components |
| Status is not communicated by color alone | PASS | Status labels plus icons in orders and explicit statement state text |
| Metrics and amounts have authoritative ownership and correct currency | PASS | Organization-owned currency; server-owned order summary including delivered count |
| Statement generation and delivery expose truthful, auditable states | PASS | Snapshot timing, hash, truncation, consent, expiry/revocation, error/denied states |
| Customer edits cannot rewrite financial history | PASS | Existing profile-only update boundary retained; no financial mutation added |
| Permission, entitlement, and tenant negative paths pass | PASS | Orders and statement route/action tests included in 47 passing tests |
| English and French contain no unintended changed-surface fallback copy | PASS | Changed orders/statement copy is explicitly bilingual |
| Desktop, tablet, and mobile workflows verified | BLOCKED | Browser runtime failed before session creation; no claim made |
| Loading, empty, denied, locked, error, degraded, and success states verified | PARTIAL | Code/unit coverage passes; browser-state evidence remains blocked |
| Targeted type, lint, unit, integration, and browser checks pass | PARTIAL | Type/lint/unit/integration green; browser unavailable |
| Visual evidence demonstrates convergence | BLOCKED | No screenshots were captured because the browser could not initialize |
| Final report maps every criterion to evidence | PASS | This table |
| No unrelated code or documentation changed | PASS FOR IMPLEMENTATION SCOPE | Existing unrelated dirty worktree was preserved; standard gate artifacts were refreshed by their validation commands |

## Validation results

| Check | Result |
|---|---|
| Targeted Jest: 7 suites | PASS — 47/47 tests |
| Full npm run typecheck | PASS |
| Scoped ESLint | PASS |
| Customer git diff --check | PASS; only existing CRLF normalization warnings |
| npm run regulatory:hardcode:fail | PASS — 0 active findings |
| npm run module:surface:ratchet | COMPLETED IN WARN MODE — 13 repository-wide gaps |
| npm run report:trust:export:gate | BLOCKED — 32/35 ready |
| Browser responsive/visual verification | BLOCKED — browser runtime sandbox initialization failure |

The report/export trust gate blockers are:

1. missing_proof_request_service_owned_command_evidence
2. missing_proof_response_service_owned_command_evidence
3. accountant_missing_proof_response_acceptance_resolution

The same gate marks the customer-relevant immutable statement snapshot, signed external access, customer-ledger balance integrity, permission/fresh-auth, audit/hash, and service-owned currency checks ready. The three blockers are not masked or reclassified as customer success.

## Files changed for the customer implementation

- app/[locale]/(dashboard)/dashboard/customers/page.tsx
- app/[locale]/(dashboard)/dashboard/customers/new/page.tsx
- app/[locale]/(dashboard)/dashboard/customers/[id]/page.tsx
- app/[locale]/(dashboard)/dashboard/customers/[id]/edit/page.tsx
- app/[locale]/(dashboard)/dashboard/customers/[id]/orders/page.tsx
- app/[locale]/(dashboard)/dashboard/customers/[id]/orders/CustomerOrdersClientPage.tsx
- app/[locale]/(dashboard)/dashboard/customers/[id]/orders/__tests__/page.test.tsx
- app/[locale]/(dashboard)/dashboard/customers/[id]/statement/page.tsx
- app/[locale]/(dashboard)/dashboard/customers/[id]/statement/__tests__/page.test.tsx
- components/customers/CustomerQuickActions.tsx
- components/customers/CustomerStatementWorkflow.tsx
- components/customers/__tests__/CustomerStatementWorkflow.test.tsx
- components/customers/__tests__/customer-semantic-colors.test.ts
- actions/customers/customerActions.ts
- types/customerTypes.ts

Standard validation commands also refreshed the existing report-trust and module-surface inventory artifacts under what-next. They remain repository-wide evidence and do not represent customer-only certification.

## Non-goals preserved

- No supplier, purchasing, inventory, payroll, or unrelated accounting feature was rewritten.
- No global design-system replacement was performed.
- No duplicate customer details page was created.
- No speculative provider, analytics, statement history, export, payment evidence, or fake data was added.
- No database migration was introduced.
- CustomerManagementDashboard was not rewritten wholesale.
- No statutory, accessibility, privacy, security, accounting, OHADA, or release certification is claimed.

## Remaining release blockers

1. Restore a working authenticated localhost browser session.
2. Verify English and French customer list, create, profile/analytics, edit, orders, and statement surfaces at desktop, tablet, and mobile widths.
3. Capture visual evidence for loading, empty, denied, locked, error, degraded, and success states.
4. Resolve or explicitly waive through the proper owner the three repository-wide report/export trust blockers.
5. Rerun the 35-check trust gate and release evidence review.

## Follow-up prompt decision

No broad customer follow-up prompt was generated because the current evidence does not justify expanding scope. The next justified activity is a narrow customer browser and visual-evidence verification run after the local authenticated runtime is available. Separate accounts-receivable, analytics-governance, lifecycle/privacy, or identity-resolution prompts should be created only when concrete domain evidence identifies a gap.
