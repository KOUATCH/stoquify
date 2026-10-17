# Purchasing access and finance acceptance — 2026-10-13

Local target: `stoquify_replay_next_20260830`, organization `rds_org_001` (Wilkinson - Feeney 001). The user explicitly authorized enabling Purchasing locally. This is local fixture authority, not a subscription purchase or production entitlement.

## Applied access change

- Added exactly one active Purchasing grant, source `manual_override`, ID `rds_org_001_purchasing_local_audit_20261013`.
- Retained provenance in metadata and audit ID `rds_org_001_purchasing_local_audit_20261013_provisioned`. The audit identifies a local operator, not an impersonated application user.
- Serialized against the organization's module lock, checked configuration revision 0, exactly 11 existing grants and no lifecycle operation. All other grants and configuration were compared before/after and remained identical.
- [Before snapshot](purchasing-before.json) uses native PostgreSQL JSON timestamps. [Applied evidence](purchasing-grant-applied.json) identifies the committed grant.
- Runner: `scripts/provision-rds-purchasing-local.cjs --apply-approved-local-grant`. It refuses another host/database, production environment markers, changed preconditions and a second snapshot write. Do not rerun a successful provision.

The normal Modules UI now shows Purchasing access as Granted. Review proposed Purchasing joining, 11 modules staying and none leaving. Applying reached the application's fresh-password check; the user was asked to complete it themselves. The configuration request is not claimed active. The preview also reports existing accounting, reconciliation-provider, payroll and compliance setup requirements. Those requirements were not bypassed or changed.

## Browser evidence

Signed-in account: Amina Ngono, Super Admin, same organization. Payables now renders in English and French. Twelve fixture invoices have unverified evidence and unknown due dates; affected totals remain unavailable. No verified invoice exists in this visible fixture population.

Verified: 10-row selection, page 2 with invoices 011–012 and disabled Next; exact reference search returns one invoice while all-invoice count remains 12; overdue queue yields an empty state; clearing filters restores 12 rows. Keyboard Enter opens details, Shift+Tab from Close wraps to history, Escape returns focus to the invoice trigger. French detail displays Brouillon, original amount `2 492,70 XAF`, and unavailable allocated/credit/remaining/due values. Workflow counts and independently scoped period payment evidence rendered, and history links preserve invoice/supplier/return scope. Financial workflow links were inspected, not submitted.

[French invoice detail](payables-fr-detail.jpg) is verified rendered evidence. `payables-en.jpg` was captured during an unstable loading transition and is not used to certify the ready layout. The requested 390×844 override did not change the effective viewport (1542 inner / 1523 client width); it was reset. This is **not** a narrow-layout pass. Repeated CDP timeouts and permission revalidation loading interrupted browser automation.

## Rollback

Do not delete configuration/history or restore the entire snapshot over newer work. If the user later asks to withdraw this local grant, lock the organization and this exact grant in one transaction, compare its current row with `purchasing-grant-applied.json`, set only its status to `suspended` with incremented revision and an updated timestamp, and append an audit containing before/after and the new authorization. Retain the grant and original provisioning audit. Reverse any subsequently activated workspace selection through a fresh application configuration review. No rollback was executed.

No sale, payment, approval, posting, export, shift closure, migration, seed reset, role change or session fabrication was performed for these checks.
