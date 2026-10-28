# M0/G0 and M1/G1 Approval Packet

Status: **ACTION REQUIRED**  
Program: `STOQUIFY-POS-SALES-TO-CASH`  
Date: 2026-08-17

This packet records accountable decisions; it is not itself an approval. Each accepted decision must identify the approver, role, rationale, effective version/date, review or expiry date, evidence links, affected capabilities and rollback/disable policy.

## Immediate migration-safety decision

The local migration safety gate found 13 destructive clauses in `20260611130000_accounting_auth_baseline_bridge/migration.sql`. The registry is deliberately empty and the existing evidence says a named human checker must manually author one entry per exact finding hash after an `APPROVE_EXACT_HASH` decision.

The migration is already applied to the configured local development database, which reports 67/67 migrations. Do not edit or replace this historical file: that would create checksum drift. Select the target-specific adoption path instead:

1. `EMPTY_TARGET_EXECUTE` — only for a verified empty target after a named checker approves all 13 exact finding hashes and confirms the migration guard, authentication compatibility and recovery plan.
2. `EXISTING_TARGET_RESOLVE_ONLY` — for an existing compatible database only after clone/profile/reconciliation, backup and tested restore prove that executing the bridge would be destructive and that `prisma migrate resolve --applied` changes migration history only.
3. `ALREADY_APPLIED_VERIFY` — when authoritative migration history proves this exact checksum already succeeded; retain exact-hash review for future release-gate safety and verify authentication continuity.
4. `REJECT_TARGET` — do not deploy to the target when the required profile, backup/restore, compatibility or checker evidence cannot be produced.

Current production disposition is `REJECT_TARGET`: no authoritative target, backup identifier, restore test, production-like data profile or checker decision is present. Do not copy a generated template into the approval registry and do not approve by migration-file hash alone.

## Product and control decisions

| ID | Recommended selection | Required accountable roles |
| --- | --- | --- |
| D-01 | Disable/hide/reject store credit until a governed liability ledger exists | Product, controller, payments |
| D-02 | Physical terminal/register and drawer claim is the active-session lock | Retail operations, architecture, security |
| D-03 | Select one named provider/country sandbox; otherwise electronic tender remains disabled | Payments, treasury, security |
| D-04 | Bounded cash-only offline after device/replay gates | Product, risk, retail operations |
| D-05 | Narrow named browser/OS/terminal/printer/scanner/drawer matrix | Retail operations, QA, support |
| D-06 | Linked compensating returns/refunds with reason, disposition, fresh auth and maker-checker | Controller, retail operations, risk |
| D-07 | Cameroon/XAF/EN-FR as development candidate; production only after qualified country review | Product, controller, country-pack reviewer |
| D-08 | Roadmap performance budgets measured against the approved D-05 matrix | SRE, product, support |
| D-09 | Invoice from accepted delivered quantity; order confirmation is non-posting | Controller, O2C product, accounting reviewer |
| D-10 | Reservation affects availability only; physical issue owns stock and COGS | Inventory controller, fulfillment, accounting |
| D-11 | Session, drawer declaration, business day, statement, reconciliation and accounting close remain separate | Controller, treasury, retail operations |

## Approval record template

```yaml
decisionId: D-XX
selectedOption: <explicit selection>
rationale: <why this is appropriate for the named pilot>
accountableApprover:
  name: <human name>
  role: <accountable role>
approvedAt: <ISO-8601 timestamp>
effectiveVersion: <policy/country/provider/product version>
reviewOrExpiryAt: <ISO-8601 timestamp>
evidenceLinks:
  - <source or evidence path>
affectedCapabilities:
  - <capability>
rollbackOrDisablePolicy: <how it is safely disabled or reversed>
```

Approval of the roadmap as a direction does not silently approve these material choices. Missing fields keep G0/G1 blocked.
