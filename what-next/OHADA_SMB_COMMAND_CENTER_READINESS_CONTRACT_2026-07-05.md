# OHADA SMB Command-Center Readiness Contract

Date: 2026-07-05
Source roadmap: `what-next/OHADA_SMB_HIDDEN_INSIGHTS_EXECUTION_ROADMAP_2026-06-28.md`
Sprint: 1 / Phase 0 - Command-Center Readiness Contract

## Pilot Prerequisite

Pilot tenant/environment is not yet production-confirmed in this checkout. Until a named tenant, environment, and date range are recorded, dashboard cards must stay in honest placeholder states: `partial`, `blocked`, or `module_unavailable`. No card may claim certified production truth from seed, demo, or unconfirmed data.

Required pilot note before Phase 1 release:

- Environment: pending confirmation.
- Tenant/organization id: pending confirmation.
- Date range: pending confirmation.
- Unavailable source list: payment provider statements, AP invoice/match proof, close certification coverage, compliance adapter production state, payroll declaration/payment proof, security audit-log mini-brief.

## Shared Command-Card Contract

Each first-viewport command card now has a small service-owned contract:

- `id`: one of payment, ap, close, stock, compliance, payroll, security.
- `label` and `detail`: operator-facing card copy.
- `metricLabel`, `value`, and optional `valueFormat`: what is being shown without client-side business joins.
- `scope`: tenant, location, period, or tenant_period.
- `uiState`: fresh, partial, blocked, stale, module_unavailable, or another safe snapshot UI state.
- `evidenceGrade`: raw, operational, posted, reconciled, certified, or blocked.
- `freshness`: generated time, source max update time, max age, and stale reason.
- `blockerState` and `blockerCount`: whether the card is actionable, partial, unavailable, or blocked.
- `actionRoute`: where the operator should go next.
- `proofRoute`: where proof or drill-through evidence belongs.
- `requiredPermission`: the permission needed before a future role filter shows or enables the card.
- `sourceModules`: the modules that own the data.

## Current Routes

- Payment reconciliation: `/dashboard/finance/reconciliation`
- AP exposure: `/dashboard/purchases/payables`
- Close confidence: `/dashboard/accounting/close`
- Stock-to-cash: `/dashboard/finance/stock-to-cash`
- Compliance pressure: `/dashboard/compliance`
- Payroll pressure: `/dashboard/payroll`
- Security posture: `/dashboard/settings/security`
- Assurance proof route: `/dashboard/assurance/control-tower`

## Non-Bloat Guardrails

- No new dashboard shell was introduced.
- The main dashboard consumes command-card states through `Today's Operating Truth`.
- Placeholder cards do not compute business truth in React; they consume read-model and snapshot contracts.
- Payment, AP, close, stock, compliance, payroll, and security can be promoted independently as their service-owned evidence matures.
- Employee-level payroll data stays off the owner first viewport.
- Unavailable modules show explicit unavailable states rather than empty green cards.

## Done Criteria For This Phase

- `services/snapshots/snapshot-contracts.ts` defines the reusable command-card contract.
- `services/snapshots/tenant-operating-snapshot.service.ts` emits command cards from tenant operating evidence.
- `services/dashboard/dashboard-read-model.service.ts` emits honest dashboard placeholders for the first viewport.
- `components/dashboard/todays-operating-truth.ts` renders contract cards when present and falls back to the legacy status strip when absent.
- Focused tests cover blocked, partial, and unavailable states.

## Next Route After This Phase

Move to Phase 1 only after pilot tenant/environment is named. The next code slice should promote the command-card placeholders into the compact Daily Business Confidence Brief, keeping the first viewport to five elements: confidence header, KPI strip, urgent action queue, evidence timeline, and trust-state row.
