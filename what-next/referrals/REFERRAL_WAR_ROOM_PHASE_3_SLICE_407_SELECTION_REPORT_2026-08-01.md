# Referral War Room Phase 3 / Slice 407 Selection Report

Date: 2026-08-01
Slice: 407
Name: Inventory Loss Analytics Read Model
Operating skills: `stoquify-referral-war-room-orchestrator`, `stoquify-inventory-loss-control`, `aqstoqflow-release-verification-foundation`, `stoquify-release-evidence-ratchet`

## Selection Decision

Slice 407 is selected after Slice 406 certified the protected stock-count and adjustment command boundary.

The live inventory services already create, evidence, approve, post, audit, and account for cycle-count variances and sensitive adjustments. The roadmap still requires a service-owned loss summary grouped by product, location, actor, and period. No such read model or product surface exists in the live inventory code.

## Scope

Selected files:

- `services/inventory/inventory-loss-read.service.ts`
- `services/inventory/__tests__/inventory-loss-read.service.test.ts`
- `what-next/referrals/INVENTORY_LOSS_CONTROL_SLICE_407_REPORT_2026-08-01.md`
- `what-next/skills-life-cycle/STOQUIFY_SLICE_407_RELEASE_EVIDENCE_REPORT_2026-08-01.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

Selected implementation:

- Read only completed, non-deleted stock adjustments for the trusted organization and requested half-open date range.
- Treat negative lines from physical/cycle counts, damage, expiry, recorded theft, and write-offs as loss-bearing evidence.
- Exclude positive count corrections and generic adjustment categories from loss totals.
- Group loss value by product, location, approving actor, category, and organization-local month.
- Label actor attribution as approval responsibility, not proof that the actor caused the loss.
- Return evidence coverage, valuation coverage, attribution coverage, source truncation, and snapshot metadata.
- Bound source and detail rows to prevent an unbounded operational query.

## Evidence Inputs

- `prisma/schema.prisma` stock adjustment, count, and inventory transaction models.
- `services/inventory/inventory-count.service.ts` variance-to-adjustment workflow.
- `services/inventory/inventory-adjustment.service.ts` maker-checker, evidence, movement, audit, and ledger behavior.
- `services/inventory/inventory-read.service.ts` read-model conventions.
- Referral roadmap Pillar 6, Phase 2, and Inventory Loss epic acceptance criteria.

## Explicit Non-Authority

Slice 407 does not create or post counts, adjustments, write-offs, movements, ledger entries, alerts, or exceptions. It adds no action, route, UI, schema, migration, permission, AI/copilot, WhatsApp, or external-sharing behavior.

The read model reports recorded operational evidence. It must not infer theft, fraud, employee fault, or causal responsibility.

## Expected Verification

- Focused Jest for tenant/date/type/status filters and all required groupings.
- Tests for positive-line exclusion, incomplete evidence/valuation/actor attribution, source truncation, invalid periods, and missing organizations.
- Existing stock-count and stock-adjustment service suites.
- `npm run typecheck`.
- Scoped ESLint, direct-write scan, tenant-filter scan, and whitespace/diff hygiene.

## Success Criteria

Slice 407 is certified when the read model:

- derives every row from completed tenant-owned adjustment evidence;
- counts only negative loss-bearing lines;
- returns exact decimal-string values in the organization currency;
- groups by product, location, approving actor, category, and local month;
- exposes evidence and completeness limitations without unsupported accusations;
- remains bounded, deterministic, serialization-safe, and read-only.

## Next Skill

Execute with `stoquify-inventory-loss-control`. Return to `stoquify-referral-war-room-orchestrator` after certification before selecting a protected query action or product surface.
