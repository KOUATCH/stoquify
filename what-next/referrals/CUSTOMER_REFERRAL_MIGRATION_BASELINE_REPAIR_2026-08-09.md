# Customer Referral Migration Baseline Repair — 2026-08-09

## Outcome

The repository migration catalog can now initialize a blank PostgreSQL database and carry the complete customer referral workflow. A dedicated local database replayed all 62 migrations, passed exact migration-history checks, accepted the comprehensive seed, and passed the referral PostgreSQL smoke.

Fresh replay certification: `READY_WITH_INTENTIONAL_RESIDUAL_DRIFT` with 62/62 migrations, zero missing/unknown/unfinished migrations, zero checksum mismatches, and zero unexpected structural drift.

## Recovered history

Two deleted migrations were restored byte-for-byte from Git history:

- `20260528124341_refine_item_barcode` — the original core schema baseline from commit `2b4441ce8e2b1f05fdd915eb211e46dee708ce02`.
- `20260611120000_payment_provider_reference_uniqueness` — the original electronic-payment uniqueness migration from commit `90a67f57ecae252d1f0424f0e43102be45eb9b46`.

The June 18 checkpoint had deleted both migrations while introducing a repair migration that assumed the missing core and accounting tables already existed.

## Reconstructed baseline bridges

- `20260611130000_accounting_auth_baseline_bridge` — guarded, transaction-wrapped accounting backbone and Better Auth transition reconstructed from the schema at commit `90a67f57ecae252d1f0424f0e43102be45eb9b46`.
- `20260618160000_payroll_foundation_bridge` — guarded, non-destructive payroll foundation reconstructed from commit `1b83ef12c792e1956f1108962ec9634257f55feb`.
- `20260618161000_ap_stock_count_foundation_bridge` — guarded, non-destructive supplier/AP and stock-count foundation from the same historical schema.
- `20260726140000_business_event_foundation_bridge` — guarded, non-destructive durable business-event/outbox foundation.
- `20260730150000_organization_onboarding_entitlement_bridge` — guarded organization onboarding and `requestedModules` columns required by the POS/Sales entitlement backfill.
- `20260809180000_accounting_enum_completion` — forward-only completion of accounting enum values already required by the current schema.

Every baseline bridge refuses execution when its target schema already exists. Existing databases must verify the objects and mark the applicable baseline migrations as already applied; fresh databases execute the full catalog normally.

## Fresh-database evidence

- Database: dedicated local `stoquify_referral_baseline_rebuild_20260809`.
- Migration deploy: 62/62 applied successfully from blank.
- Migration checksums: 62/62 exact; no unfinished, rolled-back, unknown, or duplicate successful rows.
- Schema completion: no missing table, enum, column, or index drift.
- Intentional residual drift: 164 statements, all allowlisted by the fail-closed certification gate:
  - 12 stronger database foreign keys retained;
  - 7 database-side `updatedAt` defaults retained;
  - 3 legacy production evidence tables and their enum retained;
  - 30 foreign-key and 111 index name-only differences.
- Comprehensive seed: passed, including supplier/AP, payroll, stock count, accounting, payment reconciliation, close, offline POS, compliance, and assurance models.
- Referral PostgreSQL smoke: passed with one immutable receivable, one `66,630.00 XAF` statement, redacted public access, revocation denial, dispute, promise-to-pay, four referral events, wrong-token denial, and successful net-new accountant invite acceptance.

Evidence files:

- `what-next/prisma-fresh-replay-certification-referral.md`
- `what-next/prisma-fresh-replay-certification-referral.json`
- `what-next/prisma-migration-deployment-readiness-referral.md`
- `what-next/prisma-migration-history-health-referral.md`

## Existing-database adoption sequence

Do not run the restored baseline migrations against an existing populated database. On an isolated clone of the target database:

1. Confirm the target schema contains the core, payment uniqueness, accounting/auth, payroll, AP/stock-count, business-event, and organization-entitlement objects represented by the seven baseline migrations below.
2. Confirm the target data remains readable and the current application can complete login, accounting, inventory, payroll, purchasing/AP, and referral smoke checks.
3. With DBA/release approval, mark only these baseline migrations as applied:
   - `20260528124341_refine_item_barcode`
   - `20260611120000_payment_provider_reference_uniqueness`
   - `20260611130000_accounting_auth_baseline_bridge`
   - `20260618160000_payroll_foundation_bridge`
   - `20260618161000_ap_stock_count_foundation_bridge`
   - `20260726140000_business_event_foundation_bridge`
   - `20260730150000_organization_onboarding_entitlement_bridge`
4. Do not mark the six referral migrations or `20260809180000_accounting_enum_completion` as applied. Deploy them normally after the baseline adoption is recorded.
5. Re-run migration history, schema drift, referral PostgreSQL smoke, production secret, build, and release gates against the exact candidate revision.

## Remaining external production decisions

- The applied database checksum for `20260619120000_backfill_purchase_receive_permission` does not match the repository file or any tracked LF/CRLF/no-final-newline form. Its original bytes are not recoverable from Git. A DBA/release owner must add an exact database-and-repository hash approval to `prisma/migration-history-checksum-approvals.json`; the registry is intentionally empty until that approval exists, and migration history must not be rewritten silently.
- The accounting/auth baseline bridge contains 13 destructive statements that are safe only on a fresh empty database and protected by an execution guard. The production migration gate correctly requires exact-hash risk approval even though existing databases will adopt rather than execute it.
- A real production database URL/target, production secrets, HTTPS origin, provider credentials, pilot Accounting entitlement, and real-user cohort remain external deployment inputs.
