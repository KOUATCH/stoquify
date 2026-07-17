# AqStoqFlow Module Package Strategy

Date: 2026-07-12
Lane: Package-to-module dependency and pricing model
Mode: observe/report only; no hard enforcement enabled
Skill: `aqstoqflow-module-package-strategy`

## Executive Verdict

AqStoqFlow should package modules as a coherent SaaS control plane, not as a list of sidebar links. The platform needs a small number of understandable packages, a controlled set of add-ons, explicit dependency rules, safe trials, reversible upgrades/downgrades, and read-only retention for customer trust.

This strategy uses the frozen 20-slug vocabulary and the entitlement schema plan as inputs. It does not change code, schema, billing, runtime access, or enforcement behavior.

## Source Evidence

- The current catalog has 20 modules.
- Current core/system modules are `dashboard`, `settings`, and `administration`.
- Sellable or likely sellable modules are `inventory`, `production`, `sales`, `pos`, `cash_drawer`, `accounting`, `close_assurance`, `compliance`, `purchasing`, `presence`, `payroll`, `finance`, `payment_reconciliation`, `analytics`, and `commercial_agents`.
- `reports` is a bundle/tier capability and must remain source-module-aware.
- `content` is a support/growth domain unless product later promotes it.
- Current module inventory remains report-only: 306 surfaces, 266 mapped, 34 unmapped, 16 missing permission, and 300 enforcement candidates.
- `Organization.requestedModules` remains onboarding/migration evidence only.
- Billing-provider state must feed internal subscription/package state; it must not directly control runtime access.

## Product Packaging Principles

1. Every tenant keeps platform safety modules: `dashboard`, `settings`, and `administration`.
2. Packages grant tenant module entitlements; they do not grant user RBAC permissions.
3. Add-ons are allowed only when their required dependencies are already present or bundled.
4. High-risk modules need stronger dependency and retention policy than low-risk modules.
5. Reports and analytics never become a bypass around source-module entitlement.
6. Downgrades should stop new writes first and preserve auditable history where safe.
7. Trials must be explicit, time-bound, auditable, and reversible.
8. Suspensions should be professional and tenant-safe: owner/admins see remediation paths; normal users see clean unavailable/read-only states.

## Package Catalog

| Package code | Name | Purpose | Included modules | Commercial posture |
|---|---|---|---|---|
| `PLATFORM_BASE` | Platform Base | Identity, tenant administration, basic dashboard, module workbench foundation | `dashboard`, `settings`, `administration` | Mandatory platform foundation, not sold as a standalone operating package |
| `STARTER_OPERATIONS` | Starter Operations | Small business stock, customer, order, and basic reporting workflow | `inventory`, `sales`, `reports` | Entry package for SMB operations |
| `RETAIL_POS` | Retail POS | Counter sales, receipts, sessions, cash drawer, and daily cash controls | `inventory`, `sales`, `pos`, `cash_drawer`, `reports` | Retail/restaurant front-office package |
| `PURCHASING_CONTROL` | Purchasing Control | Procurement, supplier workflow, receiving, AP visibility | `inventory`, `purchasing`, `finance`, `reports` | Operations/AP package; finance may be limited until Finance Core is active |
| `FINANCE_CORE` | Finance Core | OHADA accounting, finance visibility, financial reports | `accounting`, `finance`, `reports` | Core finance/accounting package |
| `ASSURANCE_PRO` | Assurance Pro | Close readiness, reconciliation evidence, compliance control layer | `accounting`, `finance`, `payment_reconciliation`, `close_assurance`, `compliance`, `reports` | Premium assurance and statutory control package |
| `PAYROLL_PRO` | Payroll Pro | Payroll operations, presence link, statutory payroll evidence | `payroll`, `presence`, `compliance`, `reports` | People/payroll package; accounting/payment evidence can be bundled or required by tier |
| `PRODUCTION_OPS` | Production Ops | Production planning, costing, recipes, and operational yield control | `inventory`, `production`, `reports` | Manufacturing/production add-on package |
| `EXECUTIVE_INTELLIGENCE` | Executive Intelligence | Owner analytics, operational dashboards, and cross-module intelligence | `analytics`, `reports` | Executive add-on; must inherit all source-module limits |
| `GROWTH_CHANNELS` | Growth Channels | Commercial agents and channel workflow | `sales`, `commercial_agents`, `reports` | Sales/channel add-on package |

## Add-On Policy

| Add-on | Requires | Recommended bundle | Trial eligible | Downgrade behavior |
|---|---|---|---|---|
| `pos` | `sales` and `inventory` | `RETAIL_POS` | Yes, short operational trial | Stop new POS sessions and writes; retain receipts/reports read-only |
| `cash_drawer` | `pos` | `RETAIL_POS` | No for live cash controls; demo-only trial is acceptable | Stop cash operations; retain daily cash evidence read-only |
| `payment_reconciliation` | `finance` and `accounting` | `ASSURANCE_PRO` | Yes for observe-only import/review | Stop new matching/posting; retain reconciliation proof read-only |
| `close_assurance` | `accounting` | `ASSURANCE_PRO` | Yes for read/check mode | Keep prior close packs read-only; block certification writes |
| `compliance` | `accounting` for enterprise use | `ASSURANCE_PRO` or `PAYROLL_PRO` | Yes for document/workflow preview | Retain submitted evidence read-only; block new statutory submissions |
| `payroll` | Platform base; accounting/payment evidence recommended | `PAYROLL_PRO` | Yes with demo or limited production scope | Retain payslips/registers read-only; block payroll run calculation and payments |
| `presence` | None; payroll recommended | `PAYROLL_PRO` | Yes | Retain attendance history read-only; block new approvals if suspended |
| `production` | `inventory` | `PRODUCTION_OPS` | Yes | Retain batches/costing read-only; block new production runs |
| `analytics` | Source-module entitlements | `EXECUTIVE_INTELLIGENCE` | Yes | Hide inactive-source metrics; retain safe aggregate history if policy allows |
| `commercial_agents` | `sales` | `GROWTH_CHANNELS` | Yes | Retain agent history read-only; block commissions/assignments |

## Dependency Pricing Rules

| Dependency type | Pricing behavior | Provisioning behavior |
|---|---|---|
| `required_runtime` | Cannot be sold alone unless dependency is already active | Provisioning must fail or include dependency |
| `required_commercial` | Dependency must appear in the package quote | Package validation must show the dependency to product/support |
| `recommended_bundle` | May be omitted, but owner/admin UX should explain weaker value | Provisioning allowed with warnings |
| `source_evidence` | Priced by source package; dependent package may show degraded assurance | Do not grant source data access implicitly |
| `reporting_source` | Analytics/reports price does not include source modules | Filter/redact missing-source data |
| `write_posting` | Usually requires both writer and posting target packages | Block write/posting workflows when target is absent after enforcement approval |
| `read_only_retention` | Retention may be included in base or sold as archive retention | Writes stop; safe historical reads continue |
| `platform_support` | Not sold separately | Always present for tenant safety |

## Package-To-Module Matrix

| Module | Platform Base | Starter Ops | Retail POS | Purchasing Control | Finance Core | Assurance Pro | Payroll Pro | Production Ops | Executive Intelligence | Growth Channels |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `dashboard` | included | included | included | included | included | included | included | included | included | included |
| `settings` | included | included | included | included | included | included | included | included | included | included |
| `administration` | included | included | included | included | included | included | included | included | included | included |
| `inventory` |  | included | included | included |  |  |  | included | source-aware |  |
| `sales` |  | included | included |  |  |  |  |  | source-aware | included |
| `reports` | lite | included | included | included | included | included | included | included | included | included |
| `pos` |  | add-on | included |  |  | evidence |  |  | source-aware |  |
| `cash_drawer` |  |  | included |  |  | evidence |  |  | source-aware |  |
| `purchasing` |  | add-on |  | included | evidence | evidence |  | source | source-aware |  |
| `finance` |  |  | evidence | limited/included | included | included | evidence |  | source-aware |  |
| `accounting` |  |  | evidence | evidence | included | included | evidence | evidence | source-aware |  |
| `payment_reconciliation` |  |  | evidence | evidence | add-on | included | evidence |  | source-aware |  |
| `close_assurance` |  |  |  |  | add-on | included | evidence |  | source-aware |  |
| `compliance` |  |  |  |  | add-on | included | included |  | source-aware |  |
| `payroll` |  |  |  |  | evidence | evidence | included |  | source-aware |  |
| `presence` |  |  |  |  |  |  | included |  | source-aware |  |
| `production` |  | add-on |  |  | evidence | evidence |  | included | source-aware |  |
| `analytics` |  |  |  |  | add-on | add-on | add-on | add-on | included | add-on |
| `commercial_agents` |  |  |  |  |  |  |  |  | source-aware | included |
| `content` | optional | optional | optional | optional | optional | optional | optional | optional | optional | optional |

Legend:

- `included`: grants a tenant entitlement when the package is active.
- `lite`: limited read/report capability; not a broad report bypass.
- `limited/included`: included with AP-specific scope until package strategy decides if full finance is required.
- `evidence`: relationship exists for posting, proof, close, or audit; it does not grant source access by itself.
- `source-aware`: analytics/reporting can show only allowed source-module data.
- `add-on`: sellable on top of the package when dependencies are satisfied.
- `source`: operational source dependency used by the package.
- `optional`: not part of the commercial control plane until product promotes it.

## Trial Policy

Trial-eligible modules:

- `inventory`
- `sales`
- `pos`
- `payment_reconciliation`
- `close_assurance`
- `compliance`
- `presence`
- `payroll`
- `production`
- `analytics`
- `commercial_agents`

Trial restrictions:

- Cash-control trials for `cash_drawer` should be demo-only unless finance/admin approval exists.
- Payroll trials should support demo or limited production scope with privacy controls.
- Analytics trials must not reveal inactive-source data.
- Trials must have explicit `startsAt`, `endsAt`, source, actor, and event evidence.
- Expired trials should become `expired` or `read_only`, never silent `active`.

## Upgrade Flow

Owner/admin upgrade workflow:

1. User requests module/package.
2. System checks required dependencies.
3. System shows package source, dependency gaps, data impact, trial eligibility, and read-only consequences.
4. Owner/admin confirms or requests support-assisted provisioning.
5. Internal package/subscription state is updated.
6. Tenant entitlements are provisioned internally.
7. Entitlement event and audit records are written.
8. UI state refreshes from the entitlement read model.

Normal users should not see billing internals. They should see plain unavailable or request-access states.

## Downgrade And Read-Only Retention

| Module | Downgrade default | Read-only retention | Block immediately |
|---|---|---|---|
| `inventory` | Retain stock history | Items, stock ledger, valuation history | New stock movements and adjustments |
| `sales` | Retain orders/customers | Historical orders, invoices, customer summaries | New order creation and edits |
| `pos` | Retain receipts and session history | Receipts, closed sessions, daily summaries | New sessions, sales, refunds, drawer writes |
| `cash_drawer` | Retain cash evidence | Closed drawers, cash transactions, reconciliations | Opening drawers and cash movements |
| `purchasing` | Retain PO/AP history | POs, receipts, supplier AP history | New POs, approvals, invoices |
| `finance` | Retain finance history | Cashflow, AP/AR, finance reports | New finance actions/posting workflows |
| `accounting` | Retain ledger/audit history | Journals, periods, chart, reports | New postings unless legal retention requires correction flow |
| `payment_reconciliation` | Retain proof | Matched history, exceptions, provider evidence | New imports, matching, posting |
| `close_assurance` | Retain certified packs | Close packs, check history | New close certification and overrides |
| `compliance` | Retain statutory evidence | Submitted docs, proof chains | New submissions and approvals |
| `payroll` | Retain employee/payroll proof carefully | Payslips, registers, declarations with redaction | New run calculation, payslip issuance, payments |
| `presence` | Retain attendance history | Attendance records and approvals | New attendance approvals if suspended |
| `production` | Retain production history | Batches, recipes, costing snapshots | New production runs |
| `analytics` | Retain safe aggregates | Aggregates only when source access policy allows | Source data drilldown for inactive modules |
| `commercial_agents` | Retain channel history | Agent assignments and commissions history | New assignments, commissions, payouts |

Retention must be service-owned and redacted. It cannot be implemented only by hiding navigation.

## Billing Boundary

The package strategy assumes this boundary:

1. Billing provider sends event.
2. Billing adapter validates, stores, and idempotently normalizes the event.
3. Internal subscription/package state changes.
4. Internal entitlement provisioning derives module entitlements.
5. Runtime guards read internal entitlement truth only.

Do not couple provider webhooks directly to access decisions.

## Module Workbench Requirements

Module Workbench should expose, for owners/admins:

- package name and source;
- active, trial, read-only, suspended, expired, unavailable, and dependency-missing state;
- dependency gaps;
- upgrade/downgrade impact;
- read-only retention policy;
- audit/event history;
- safe support handoff;
- observe-mode diagnostics while rollout is in progress.

Normal users should see only task-relevant state, not billing internals or package mechanics.

## Release Gates For Implementation

When this package strategy becomes code, add gates for:

- package contains only canonical module slugs;
- package contains all required dependencies;
- package does not grant platform/internal modules as paid add-ons;
- reports/analytics packages preserve source-module filtering;
- downgrades create expected read-only entitlements;
- expired trials do not remain active;
- billing-provider events do not directly write runtime access truth;
- wildcard/admin RBAC cannot bypass tenant entitlement;
- package changes write entitlement events.

Suggested commands after implementation:

```powershell
npm run module:surface:inventory
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "services/modules/__tests__/module-entitlement.service.test.ts"
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "actions/modules/__tests__/module-control.actions.test.ts"
npm test -- --runInBand scripts/__tests__/module-surface-inventory.test.js
```

## Current Blockers Before Product Launch

1. Durable package and entitlement tables are not implemented.
2. Package pricing is not approved by product/business owners.
3. Dependency semantics are not yet enforced by service-owned provisioning.
4. Surface inventory still has unmapped and missing-permission records.
5. Module Workbench does not yet expose full package, dependency, audit, and lifecycle state.
6. Billing-provider adapter boundary is not implemented.
7. Read-only retention is not yet service-owned across reports, exports, jobs, and proof surfaces.

## Verification Result

Baseline verification after saving this report passed:

```powershell
npm run module:surface:inventory
```

The command refreshed `what-next/module-surface-inventory.md` and `what-next/module-surface-inventory.json` at `2026-07-12T05:30:36.281Z` with 20 catalog modules, 306 inventoried surfaces, 266 mapped records, 34 unmapped records, 16 missing-permission records, and 300 enforcement candidates.

Focused Jest and broader gates are not required for this planning artifact because no application code, schema file, module service, guard, inventory logic, or release-gate code changed.

## Next Handoff

Run `aqstoqflow-module-surface-registry-ratchet` next. It should turn the current report-mode inventory into a fuller surface registry and ratchet design for pages, actions, APIs, reports, exports, jobs, webhooks, proof surfaces, BI surfaces, and navigation without enabling broad hard enforcement.

