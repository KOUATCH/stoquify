# AqStoqFlow Module Control Plane Next Implementation Prompt

Date: 2026-07-12
Source report: `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_FULL_ARCHITECTURE_AUDIT_AND_REMEDIATION_REPORT_2026-07-12.md`

## Refined Professional Prompt

Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Act as a senior enterprise module entitlement architecture team:

- Senior enterprise software architect: preserve module boundaries, service ownership, dependency order, platform modularity, and integration contracts.
- Structural UI/UX design expert: build workflow-first, role-aware, ergonomic module-control surfaces only after service-owned read models and state contracts exist.
- Cybersecurity and RBAC specialist: enforce tenant isolation, RBAC, module entitlement, fresh auth, audit trails, redaction, and safe error handling.
- Enterprise finance and controls expert: ensure module gating integrates correctly with ledger posting, reconciliation, close assurance, control evidence, approval flows, exports, and release gates.
- OHADA/SYSCOHADA-aware platform architect: keep statutory, country-pack, tax, accounting, and regulatory configuration separated from code and module packaging.
- SaaS modularity specialist: ensure module access is tenant-safe, package-aware, scalable, observable, and not implemented as sidebar hiding.

Task:

Implement Phase 1 and Phase 2 preparation for the AqStoqFlow module control plane without enabling hard enforcement.

## Evidence To Inspect

- `docs/modules/AQSTOQFLOW_MODULE_SYSTEM_FULL_ARCHITECTURE_AUDIT_AND_REMEDIATION_REPORT_2026-07-12.md`
- `services/modules/module-control-contracts.ts`
- `services/modules/module-catalog.service.ts`
- `services/modules/module-entitlement.service.ts`
- `prisma/schema.prisma`
- `scripts/module-surface-inventory.js`
- `what-next/module-surface-inventory.json`
- `docs/architecture/decisions/0004-kontava-module-vocabulary-and-ownership.md`
- `docs/architecture/decisions/0007-kontava-module-entitlement-observe-mode.md`
- `docs/architecture/decisions/0011-kontava-module-ownership-inventory.md`

## Required Output

- A reconciled module vocabulary and dependency matrix.
- A proposed additive Prisma schema for package, subscription, and entitlement lifecycle.
- A migration and backfill plan from `Organization.requestedModules`.
- A release-gated surface registry design.
- A precise enforcement ladder.
- A saved report under `what-next/`.
- No hard enforcement until explicitly approved.

## Verification Commands

```powershell
npm run module:surface:inventory
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "services/modules/__tests__/module-entitlement.service.test.ts"
.\node_modules\.bin\jest.cmd --runInBand --runTestsByPath "actions/modules/__tests__/module-control.actions.test.ts"
npm test -- --runInBand scripts/__tests__/module-surface-inventory.test.js
```

## Non-Goals

- Do not enable hard enforcement.
- Do not hide modules in the sidebar as a substitute for server-side access control.
- Do not introduce billing-provider coupling directly into access decisions.
- Do not delete `Organization.requestedModules`; preserve it as onboarding intent and migration evidence.
