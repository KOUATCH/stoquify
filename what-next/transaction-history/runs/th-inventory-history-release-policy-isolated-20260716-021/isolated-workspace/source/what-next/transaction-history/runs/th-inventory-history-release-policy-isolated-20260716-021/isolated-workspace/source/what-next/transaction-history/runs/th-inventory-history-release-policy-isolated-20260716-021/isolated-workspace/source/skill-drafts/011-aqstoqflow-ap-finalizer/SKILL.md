---
name: 011-aqstoqflow-ap-finalizer
description: Close the remaining AqStoqFlow 011 purchasing/AP gates after the backend AP kernel and action/RBAC slice exist. Use when finishing AP workbench UI, balanced SYSCOHADA supplier invoice and supplier payment posting recipes, outbound supplier payment reconciliation, country-pack VAT/input VAT/withholding validation, typed errors, notifications, idempotency, rollback tests, release evidence, and the decision on whether 011 can advance to 012.
---

# AqStoqFlow 011 AP Finalizer

## Purpose

Use this skill to finish the last 011 purchasing/AP release gates without hiding unfinished finance, reconciliation, tax, RBAC, or UI work. It complements `011-aqstoqflow-purchasing-ap-controls` and `011-aqstoqflow-ap-gate-closer`; it does not replace them.

## Companion Skills

Load these when their trigger applies:

- `011-aqstoqflow-purchasing-ap-controls`
- `011-aqstoqflow-ap-gate-closer`
- `ledger-first-business-events`
- `payment-reconciliation-moat`
- `regulatory-country-pack-factory`
- `build-enterprise-dashboard`
- `rbac`
- `enterprise-error-handling`
- `ohada-compliance-oracle`
- `stockflow-ohada-saas-backbone`

## Required Context

Read these repo files when present:

- `what-next/AQSTOQFLOW_011_PURCHASING_AP_CONTROLS_EXECUTION_REPORT_2026-06-15.md`
- `what-next/AQSTOQFLOW_011_AP_ACTION_RBAC_GATE_CLOSURE_REPORT_2026-06-15.md`
- `what-next/AQSTOQFLOW_011_AP_GATE_CLOSURE_ARCHITECTURE_AND_SKILL_2026-06-15.md`
- `graphify-out/GRAPH_REPORT.md`
- `prisma/schema.prisma`
- `services/purchasing/ap-control.service.ts`
- `services/purchasing/ap-control.schemas.ts`
- `services/purchasing/__tests__/ap-control.service.test.ts`
- `actions/purchasing/ap-control.actions.ts`
- `actions/purchasing/__tests__/ap-control.actions.test.ts`
- `services/accounting/posting-rules.service.ts`
- `services/accounting/default-posting-rules.service.ts`
- `services/accounting/posting.service.ts`
- `services/payments/*`
- `services/reconciliation/*`
- `services/regulatory/country-packs/*`
- existing dashboard routes and components under `app/[locale]/(dashboard)/dashboard` and `components/*`

For architecture options and acceptance details, read `references/ap-finalizer-blueprint.md`.

## Operating Rules

1. Use Option 2 from the blueprint by default: vertical gate closure in thin slices.
2. Keep AP ledger-first. A finalized supplier invoice or supplier payment must create event evidence, source links, audit, outbox work, and either a balanced posting or an explicit visible blocker.
3. Derive tenant and actor from the authenticated session and trusted server context only. Never trust client `organizationId`, actor IDs, permissions, totals, tax values, or approval state.
4. Enforce RBAC, module gates, fresh auth, and segregation of duties before AP service mutation.
5. Keep UI thin. Workbench components consume server DTOs and actions; they must not import Prisma, posting services, country-pack engines, or payment adapters.
6. Resolve VAT, deductible input VAT, withholding, and payment/country capability through country-pack APIs by country, entity profile, date, and purpose. Store or expose provenance when material.
7. Do not hardcode legal rates, provider legality, country branches, SYSCOHADA account strings, or statutory labels in AP engines.
8. Supplier payment release must create outbound reconciliation evidence, a match/suspense path, or an explicit reconciliation blocker. No final invisible payment state.
9. External effects use transactional outbox after commit.
10. Stop before advancing to 012 if any CRITICAL or HIGH AP gate remains open.

## Build Sequence

### 1. Workbench UI Gate

Build or complete a professional purchasing/payables workbench with tabs for:

- invoices
- match exceptions
- bank changes
- payments
- ledger and reconciliation blockers

The workbench must show loading, empty, permission-denied, validation-error, degraded setup, stale/as-of, retry, bilingual French-first, light/dark, and mobile states.

### 2. Balanced SYSCOHADA Posting Gate

Implement or verify configured posting recipes for:

- supplier invoice: debit purchase/asset or inventory clearing, debit deductible input VAT when country pack allows, credit supplier AP
- supplier payment: debit supplier AP, credit bank/mobile/cash clearing, credit withholding liability when configured

Validate fiscal period, active leaf accounts, tenant account maps, source links, partner subledger, balance, audit, and rollback.

### 3. Outbound Reconciliation Gate

On supplier payment release, create outbound `PaymentTransaction` or equivalent evidence linked to:

- `SupplierPayment.id`
- payment allocations
- payment method and rail
- provider, bank, or manual reference when available
- ledger posting batch
- business event/source link

If external evidence is missing, create a typed exception, suspense path, or reconciliation blocker visible to operators and close controls.

### 4. Country-Pack VAT And Withholding Gate

Extend or consume country-pack schema/resolution for AP input VAT and withholding. Unsupported, draft, uncited, missing, or expert-review-only capability must block or degrade with typed status fields. Never silently default to zero or another country.

### 5. Verification Gate

Run focused verification adjusted to the repo scripts:

```powershell
npm run prisma:validate
npm run prisma:generate
npm test -- services/purchasing --runInBand
npm test -- actions/purchasing --runInBand
npm test -- services/accounting --runInBand
npm test -- services/payments --runInBand
npm test -- services/reconciliation --runInBand
npm test -- services/regulatory --runInBand
npm run typecheck
npm run inventory:boundary:fail
```

At minimum, add or update tests for tenant scope, RBAC denial, fresh-auth denial, SoD denial, idempotency, duplicate invoices, balanced posting, missing account-map blocker, rollback, outbound reconciliation evidence/blocker, and country-pack VAT/withholding miss behavior.

## Stop Conditions

Stop and report instead of advancing if:

- a client can supply tenant, actor, totals, tax values, or approval state
- UI imports Prisma or calls AP services directly from client components
- ledger blockers are removed before balanced recipes and tests pass
- supplier payment is final without reconciliation evidence, suspense, or blocker
- VAT/input VAT/withholding is hardcoded or falls back to another country
- sensitive AP approval permits self-approval or stale auth
- tests cannot prove idempotency and rollback for the touched money path

## Output Contract

End with:

- selected skill: `011-aqstoqflow-ap-finalizer`
- companion skills used
- files changed
- AP workbench UI gate
- ledger gate
- outbound reconciliation gate
- country-pack VAT/withholding gate
- RBAC/error/notification gates
- verification commands and results
- remaining blockers
- whether `011-aqstoqflow-purchasing-ap-controls` may advance to `012-aqstoqflow-payroll-presence-engine`
