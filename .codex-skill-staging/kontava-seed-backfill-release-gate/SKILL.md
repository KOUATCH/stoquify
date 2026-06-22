---
name: kontava-seed-backfill-release-gate
description: Build Kontava demo seed, migration, backfill, validation, release-gate, rollback, and QA foundations for moat execution. Use for comprehensive seed tenants, evidence-chain scenarios, cash leakage scenarios, limited-module tenants, read-only/suspended tenants, accountant/partner scenarios, backfill idempotency, validation reports, migration safety, and production release gates.
---

# Kontava Seed Backfill Release Gate

## Purpose

Use this skill to prove the moat foundation with realistic tenants, safe migrations, idempotent backfills, validation reports, rollback plans, and release gates.

## Upgraded Mission

Make Kontava's moat foundations provable before production rollout. This skill must create realistic seed scenarios, safe migration/backfill patterns, validation reports, rollback notes, and release gates that show whether evidence, snapshots, entitlements, redaction, signals, and owner surfaces work across real SMB cases.

This is the quality gate that prevents a beautiful cross-module vision from becoming fragile demo-only code.

## Stakeholder Value

- Owners and sales teams get believable demos with real SMB pain: leakage, suspense, stock cash pressure, payroll exposure, and close blockers.
- Accountants get seeded tenants that prove proof trails, close readiness, and reconciliation evidence.
- QA gets repeatable scenarios for positive, negative, legacy, suspended, read-only, limited-module, and partner-consent paths.
- Engineering gets idempotent backfills and rollback rules instead of risky one-time scripts.

## Release Philosophy

No moat foundation should graduate because it compiles. It should graduate because seeded and migrated data prove:

- Tenant isolation.
- RBAC and module entitlement behavior.
- Evidence-grade transitions.
- Proof-trail redaction.
- Snapshot freshness and rebuild safety.
- Business signal dedupe and usefulness.
- Export, consent, fresh-auth, and maker-checker protection.
- No regression in accounting, POS, inventory, purchasing, payroll, reconciliation, close, compliance, or finance workflows.

## Inspect First

Inspect:

- `moat proposals/KONTAVA_MOAT_EXECUTION_SKILL_PROMPTS_UPGRADED_2026-06-19.md`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `prisma/comprehensive-seed.ts`
- Existing Prisma migrations.
- Existing test seed utilities.
- `package.json` verification scripts.
- Release gate scripts under `scripts/`.
- Existing close, reconciliation, inventory, POS, payroll, and RBAC tests.

## Seed Data Quality

Seed data must be realistic and explainable. Avoid toy records that do not exercise cross-module edges. Every seeded scenario should state:

- Business story.
- Modules involved.
- Expected evidence grade.
- Expected redactions.
- Expected actions/signals.
- Expected module access.
- Expected release-gate checks.

## Seed Scenarios

Create or extend seeds for:

- Full evidence chain: sale to payment to ledger to reconciliation to close to trust pack.
- Cash leakage: drawer variance, duplicate provider reference, refund spike, open suspense.
- Inventory cash risk: dead stock, low stock, supplier obligation, reorder affordability.
- Payroll exposure: payroll approved/posted but unreconciled or unpaid.
- Accountant multi-client: accountant sees several tenants with trust grades and close blockers.
- Limited modules: POS plus inventory only, finance/payroll hidden.
- Suspended/read-only: allowed history visible, mutations denied.
- Partner consent: future lender/fintech export consent and revocation.

## Backfill Work

Backfills must be idempotent and tenant-scoped:

- Classify existing records by evidence grade.
- Summarize source-link coverage.
- Identify posted ledger entries missing source links.
- Identify failed/rejected business events.
- Identify payments without provider/statement/reconciliation evidence.
- Identify close evidence coverage.
- Produce tenant-level data quality report.
- Mark old unsupported records Operational or Blocked, never Certified.

## Migration Rules

- Add nullable foundation tables first.
- Avoid destructive resets outside dev/test unless explicitly asked.
- Batch backfills.
- Generate validation reports before enforcement.
- Keep observe mode enabled while data quality is unknown.
- Add rollback notes for every migration.

## Release Gate Checklist

Do not promote if any fail:

- Tenant isolation.
- RBAC.
- Entitlement observe/enforce behavior.
- Evidence-grade transitions.
- Proof-trail redaction.
- Snapshot freshness.
- Business signal dedupe.
- Export/fresh-auth behavior.
- Existing accounting close, reconciliation, POS, inventory, payroll, and compliance regressions.

## Must Not Do

- Do not reset or reseed production.
- Do not mark legacy data Certified by default.
- Do not hide migration risk behind green typecheck only.
- Do not introduce seed data that mixes tenant ownership.
- Do not run destructive reset/reseed outside dev/test unless the user explicitly asks.
- Do not use demo shortcuts that bypass ledger-first posting, audit, or reconciliation rules.

## Validation

Run as relevant:

- `npx prisma validate`
- `npm run typecheck`
- `npm run lint`
- `npm test -- --runInBand`
- Focused seed/backfill idempotency tests.
- Existing policy gates when touching release scripts.

## Report Requirements

For each seed/backfill/release change, save or update a report that lists:

- Scenarios covered.
- Validation commands and results.
- Backfill idempotency proof.
- Known data-quality gaps.
- Rollback plan.
- Release gate status.

## Completion Criteria

Finish when demo tenants prove the moat story, backfills are idempotent, migration risk is named, rollback is documented, and release gates are executable.
