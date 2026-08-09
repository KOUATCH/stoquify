# Phase 5 Slice 435 Handoff Report

Date: 2026-08-08
From: `stoquify-referral-war-room-orchestrator`
To: `stoquify-statement-proof-network`

## Selected Work

Implement the Customer Settlement And Invoice Allocation Source Foundation defined in the Slice 435 selection report.

## Expected Files

- `prisma/schema.prisma`
- `prisma/migrations/20260808120000_customer_settlement_allocation_foundation/migration.sql`
- `services/accounting/customer-settlement.schemas.ts`
- `services/accounting/customer-settlement.service.ts`
- focused service tests under `services/accounting/__tests__/`
- `services/accounting/default-posting-rules.ts`
- `services/controls/sensitive-action.service.ts`
- `lib/security/rbac-permissions.ts`
- focused RBAC/control tests
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- Phase 5 status and evidence reports

## Safety Constraints

- Keep the customer ledger and journal service-owned.
- Do not derive open balances from caller input or mutable `SalesOrder.paymentStatus`.
- Do not reuse the POS `Payment` record as a multi-invoice settlement aggregate.
- Do not persist a settlement if posting, event, audit, or allocation evidence fails.
- Do not add a reversal mutation, statement surface, public route, or delivery channel in this slice.
- Keep all caller-facing data internal; no external statement disclosure is authorized.

## Exit Evidence

The handoff returns to the war room only after focused tests, Prisma checks, TypeScript, lint, the release ratchet, static scans, and scoped diff review pass or are recorded as explicit blockers.
