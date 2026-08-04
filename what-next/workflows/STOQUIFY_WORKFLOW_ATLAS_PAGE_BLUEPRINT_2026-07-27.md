# Stoquify Workflow Atlas Page Blueprint

Date: 2026-07-27
Mode: architecture blueprint only
Requested prompt: use `aqstoqflow-prompt-architect` and `architect` to design a new page where every major Stoquify workflow is vivid enough for any user or role to understand what the system offers and how work should move through it.

## Skill Use

- Used `aqstoqflow-prompt-architect` to preserve the refined prompt intent, execution framing, evidence discipline, and `what-next/` artifact requirement.
- Used `architect` to inspect the existing system first, lock vocabulary, define the technical spine, pressure-test the design, and stop at blueprint before production code.
- No subagent was necessary for this pass because the route, landing, permission, and prior HR/payroll evidence could be inspected directly in the current workspace.

## Evidence Inspected

- Existing public landing composition in `app/[locale]/(home)/page.tsx`: `ConnectedWorkflow`, `OperationsMap`, `PeopleToPay`, `ModuleGrid`, `UseCases`, and surrounding landing sections.
- Landing shell and tokens in `app/[locale]/(home)/layout.tsx` and `app/[locale]/(home)/landing.css`: `section-shell`, `glass-panel`, `workflow-card`, `surface-grid`, `section-divider`, `eyebrow`, `display`, `body-text`, and `data-text`.
- Landing copy in `messages/en.json` and `messages/fr.json`, including existing `landing.workflow`, `landing.modules`, `landing.useCases`, and `landing.peopleToPay`.
- Dashboard route inventory under `app/[locale]/(dashboard)/dashboard`, including POS, people, payroll, inventory, purchasing, finance, accounting, assurance, compliance, analytics, daily digest, manager action center, owner war room, and settings.
- Module and permission evidence in `config/sidebar.ts`, `config/permissions.ts`, and `what-next/module-surface-inventory.md`, especially HRIS/payroll, payment reconciliation, purchasing/AP, and close assurance surfaces.

## Locked Vocabulary

- `Workflow Atlas`: the new page. It explains how Stoquify work moves from source activity to evidence, review, and close.
- `Workflow Section`: one full-width landing-style section for one operating journey.
- `Role Lens`: a compact filter/view cue for Owner, Cashier, Stock Manager, Purchasing/AP, HR/Payroll, Accountant, Compliance, and Admin.
- `Control Point`: the visible approval, evidence, reconciliation, or readiness gate that prevents the workflow from becoming a vague module tour.
- `People to Pay`: the HRIS-to-payroll spine: approved people facts, contracts, attendance, compensation, payroll runs, payslips, payments, declarations, and ledger references.

## Recommended Page

Create a public localized page at:

- `app/[locale]/(home)/workflows/page.tsx`
- URL: `/en/workflows` and `/fr/workflows`

Reason: the page is an education and adoption surface, not an authenticated command surface. It should reuse the current landing layout, header, footer, CSS tokens, and localized message structure. Dashboard links inside the page may point users to protected routes, but the page itself must not query protected data or imply access without permission.

## Technical Spine

- State: static typed workflow definitions, owned by the landing layer.
- API contract: no server action, no live Prisma query, no tenant data.
- Component contract: each workflow record includes `key`, `title`, `roleLens`, `promise`, `steps`, `controlPoints`, `evidenceOut`, `sourceRoutes`, `handoffs`, `modules`, and `primaryDashboardLinks`.
- Sync model: server-rendered localized page with optional client-side role filtering only if needed for interaction.
- Auth boundary: dashboard links remain links; RBAC stays enforced by dashboard routes and existing permission guards.
- Failure posture: missing route links are caught in tests; missing translation keys fail at render/test time; unknown role filter falls back to all workflows.

## Proposed Files

- `app/[locale]/(home)/workflows/page.tsx`: metadata and page composition.
- `components/landing/workflow-atlas.tsx`: page-level public experience.
- `components/landing/workflow-atlas-data.ts`: typed workflow definitions and route references.
- Optional `components/landing/workflow-atlas-section.tsx`: only if the section rendering becomes large enough to justify splitting.
- `messages/en.json` and `messages/fr.json`: add `landing.workflowAtlas`.
- Optional `components/landing/landing-header.tsx`: add a compact `Workflows` nav item only if it does not crowd the existing header.

## Workflow Inventory

| Workflow | Roles | Main Routes | Control Points | Evidence Out |
|---|---|---|---|---|
| Sell to cash | Cashier, Owner, Accountant | `/dashboard/pos`, `/dashboard/sales`, `/dashboard/finance/cash-drawer`, `/dashboard/finance/reconciliation` | session, receipt, payment method, drawer state, settlement review | sale, receipt, drawer movement, payment proof |
| Stock to sale | Stock Manager, Cashier, Owner | `/dashboard/inventory`, `/dashboard/inventory/items`, `/dashboard/inventory/movements`, `/dashboard/inventory/transfers`, `/dashboard/finance/stock-to-cash` | item setup, branch/location, transfer acceptance, variance review, valuation state | movement source, location, actor, quantity, variance |
| Procure to pay | Purchasing/AP, Owner, Accountant | `/dashboard/purchases`, `/dashboard/purchase-orders`, `/dashboard/purchases/payables`, `/dashboard/purchases/suppliers` | supplier identity, purchase order, receiving, payable approval, payment readiness | order, receipt, supplier balance, payable proof |
| Customer to collection | Sales, Owner, Accountant | `/dashboard/customers`, `/dashboard/sales`, `/dashboard/finance/receivables`, `/dashboard/finance/reconciliation` | customer record, invoice/order, collection follow-up, reconciliation | customer trail, due position, receipt, ledger reference |
| People to pay | HR/Payroll, Employee, Owner, Accountant | `/dashboard/people`, `/dashboard/people/team`, `/dashboard/people/me`, `/dashboard/payroll`, `/dashboard/payroll/runs`, `/dashboard/payroll/payslips` | identity, contract, attendance, compensation, input readiness, run approval | approved HR fact, run result, payslip, payment proof |
| Payroll to statutory proof | HR/Payroll, Compliance, Accountant | `/dashboard/payroll/declarations`, `/dashboard/payroll/payments`, `/dashboard/payroll/register`, `/dashboard/compliance` | declaration readiness, authority evidence, payment evidence, correction state | declaration packet, payment trace, payroll register |
| Payment reconciliation | Accountant, Owner | `/dashboard/finance/payments`, `/dashboard/finance/reconciliation`, `/dashboard/payroll/payments` | provider evidence, statement import, matching, suspense assignment, review | match decision, suspense item, provider proof |
| Accounting close assurance | Accountant, Owner | `/dashboard/accounting`, `/dashboard/accounting/journals`, `/dashboard/accounting/close`, `/dashboard/accounting/control-center`, `/dashboard/assurance/control-tower` | source-linked posting, reconciliation, blocker review, certification | journal source, close blocker state, review history |
| Compliance and country evidence | Compliance, Accountant, Owner | `/dashboard/compliance`, `/dashboard/payroll/setup`, `/dashboard/settings/tax-rates` | rule provenance, adapter state, fiscal document status, unresolved uncertainty | compliance evidence, country-pack status, authority proof |
| Owner command and daily control | Owner, Manager | `/dashboard/daily-digest`, `/dashboard/manager-action-center`, `/dashboard/owner-war-room`, `/dashboard/assurance/control-tower` | exception queue, branch signal, approval queue, stale evidence, daily close | decision queue, source workflow link, assurance state |
| Admin and access control | Admin, Owner | `/dashboard/settings/users`, `/dashboard/settings/roles`, `/dashboard/settings/modules`, `/dashboard/settings/locations`, `/dashboard/settings/security` | user invitation, role boundary, module access, location scope, security policy | actor scope, effective access, audit trail |
| Workflow assurance and release gates | Owner, Admin, Engineering/Operations | `/dashboard/assurance/control-tower`, `/dashboard/accounting/control-center`, `/dashboard/settings/modules` | incident routing, module enforcement, release gate, rollback readiness | incident record, gate decision, affected workflow |

## Page Experience

- First viewport: title the page `Workflow Atlas`, with a direct promise: understand how Stoquify connects work, evidence, roles, and close.
- Add a horizontal role lens control below the hero: All, Owner, Cashier, Stock, Purchasing/AP, HR/Payroll, Accountant, Compliance, Admin.
- Use a sticky or compact in-page workflow index so the user can jump to a section without a long scroll hunt.
- Each workflow section should show:
  - the operating job in plain language;
  - the people involved;
  - a 4-6 step flow from source action to review/close;
  - control points as small badges;
  - evidence out as a short proof list;
  - dashboard links as protected destinations, never as public promises.
- Keep the existing landing design language: full-width section bands, restrained `glass-panel` use, compact `workflow-card` style for repeated items, and no card-within-card nesting.
- The `People to Pay` section should be the most explicit HRIS/payroll story: approved HRIS facts move into payroll, but payroll outputs, payments, declarations, and accounting references remain distinct and reviewable.

## Implementation Order

1. Add the static workflow data file with route references and role tags.
2. Add `landing.workflowAtlas` keys in English and French.
3. Build the page route under `(home)/workflows`.
4. Build `WorkflowAtlas` using the current landing CSS classes and lucide icons.
5. Add a compact header nav link only if it remains clean on mobile.
6. Add focused tests that render the page and assert the key workflows, role lenses, and critical protected route links.
7. Run targeted page tests, lint/typecheck if practical, and a browser smoke pass at `/en/workflows` for desktop and mobile layout.

## Tests To Add

- Render test for `/[locale]/(home)/workflows/page.tsx` or the `WorkflowAtlas` component.
- Data contract test that every workflow has at least one role, one step, one control point, one evidence output, and no duplicate keys.
- Route reference test that important dashboard links exist in the current app route inventory.
- Translation test for the key English and French page labels if the existing test harness supports message validation.

## Risks And Controls

- Risk: the page becomes another marketing module grid. Control: each section must be a workflow with source action, handoff, control, evidence, and destination.
- Risk: public links imply access. Control: label dashboard links as protected and rely on existing RBAC guards.
- Risk: HRIS/payroll gets flattened into a payroll-only story. Control: keep HRIS facts, payroll runs, payments, declarations, and ledger references separate in the section model.
- Risk: route drift breaks the atlas. Control: keep dashboard route references in typed data and cover them with a focused route inventory test.
- Risk: the page becomes too tall. Control: add role filtering and in-page navigation, while preserving full sections for comprehension.

## Verification For This Architecture Pass

- Confirmed existing landing page already has a connected workflow section and a people-to-pay section.
- Confirmed localized copy exists in `messages/en.json` and `messages/fr.json`.
- Confirmed relevant dashboard destinations exist for POS, inventory, purchasing/AP, finance, people, payroll, accounting, assurance, compliance, analytics, and settings.
- Confirmed `what-next/module-surface-inventory.md` records HRIS/payroll, payment reconciliation, purchasing/AP, and protected dashboard route permissions.
- No production page code was changed in this pass.

## Decision Needed Before Coding

Default implementation should use `/[locale]/workflows` as the public workflow atlas page and add only a compact landing header link if it fits the current responsive header. If you want the page embedded into the existing home page instead, that is the one decision to change before implementation.

Blueprint ready.
