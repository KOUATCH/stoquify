# Business event source references — v151

Evidence date: 15 September 2026. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`, with preserved working-tree changes. Selected skill: `004-aqstoqflow-business-event-gateway`.

## Correction and user benefit

The v150 accountant-access investigation exposed a shared mismatch: `BusinessEvent.sourceType` is an optional accounting enum in PostgreSQL, but the gateway accepted any string. Seventeen other direct calls supplied domain names outside that enum; the compensation helper did the same for seven calls. These operations could roll back when their event was persisted, even when their domain rules permitted them.

The gateway now accepts only actual accounting values in `sourceType`. Non-accounting producers use `sourceEntityType`, persisted in `metadata.sourceEntityType` alongside unchanged `sourceId`. Existing metadata, payloads, hashes, audits and outbox instructions are retained. Conflicting metadata or non-object metadata that would be lost during merging is rejected before database access. Metadata without the new domain input is unchanged. Accounting values are exact, without trimming or fallback conversion.

Corrected producers cover country-adapter configuration/review/rotation/disable, HRIS document evidence, AI proposal creation/decision and command receipts, finance statement and accountant trust exports, payroll contracts, compensation, payment destinations, declarations, authority execution, payslip exports and register exports. Persistence does not establish authority approval, statutory correctness, AI execution or delivery.

## Verification

- 162 tests in 16 suites passed (`8c1b87`). Three initial assertions (`2e8f39`) expected invalid accounting values; they now check the domain reference. Initial JSON receipt writing was denied by filesystem permissions; the tool receipt preserves that result.
- Changed-file lint: 19 files passed (`4ea49e`). Final typecheck passed (`0840c7`). No schema change or migration.
- Owned PostgreSQL runtime passed (`fcafe3`): 14 domain reference values, all 37 accounting values, unchanged metadata, invalid/conflicting input rejection, concurrent identical submission, independent tenant keys, changed-payload rejection and forced rollback of a domain edit/event/audit/outbox.
- Actual AI proposal services passed creation, creation replay, acceptance, no-permission denial, foreign-tenant denial and repeated-decision rejection. Two events retained audit/outbox evidence. Execution authority stayed `NONE`; tenant journal, payment and posting-batch counts were unchanged.
- Failed runtime attempts retained: `09964f1a...` used lowercase freshness in a synthetic fixture; `29f8271d...` used an incorrect posting-batch delegate in the verifier. Earlier gateway checks passed in both. Only fixtures were corrected.

Runtime: `lanes/environment/event-sources-v151-82cc8181-61de-4a03-be28-e4372b23fc02.json`. Baseline: `evidence/source-baseline-v151.json` (`747c56`). Publisher checks current/baseline/runtime hashes.

Publication passed (`26dd37`). Its first attempt (`db6550`) stopped before register changes because a substring check also matched `resourceType`; the check now matches only the `sourceType` property. Coverage is 269 provisional workflows, zero fully verified, and 193 unmapped entry sources. This remains progress within the larger assignment.

## Operator and developer instructions

No new form or setting is needed. Reopen a previously failing operation, inspect its current state, and use its existing recovery procedure. Do not manufacture completion records or issue a second financial operation to work around an error. Queued evidence is not delivered output.

Developers: use generated `AccountingSourceType` for accounting classification. Use `sourceEntityType` for another domain record name and its actual ID in `sourceId`; preserve metadata. No migration or historical rewrite is required. Existing v150 accountant-access metadata remains readable.

Release owner: release the gateway and producers together under ordinary controls. Monitor validation errors and failed operations by correlation ID; retain outbox retry controls. Reverting the producer correction restores the known defect. Do not delete event/queue records as rollback. No production deployment or live dispatch occurred.

## Review accountability and limitations

| Responsibility | Result and limits |
| --- | --- |
| Architecture/backend/database/API/events | Explicit contract, direct-call inventory, no migration. Indirect/aliased producers still need review. Historical graph node `moat_skills_ledger_first_business_events` expresses intended boundaries, not current proof. |
| Security/IAM/privacy | Validation and representative tenant/permission denials. Complete action/API/fresh-auth review remains open. |
| Finance/accounting/controls | Valid references retained; sampled AI financial counts unchanged. No accounting certification. |
| HRIS/payroll/compliance/audit | Persistence correction and focused producer tests. Full lifecycles and expert evidence review remain open. |
| AI safety | Proposal decisions retain no execution authority. Stored evidence freshness/grade comparison needs separate review. |
| Quality/SRE/rollout/support | Unit, lint, typecheck and owned-database receipts, including failures. No browser, full-build or production performance claim. |
| Frontend/design/accessibility/localization | Not applicable to this patch: no UI or wording changes. Full workflow browser verification stays open. |
| Product/SaaS packaging | Existing operations benefit from persistence repair. Pricing/entitlements not applicable: unchanged. |
| POS/offline/purchasing/AP/providers | Gateway accounting values checked; no transport/provider behavior changes. Complete consumer regression remains open. |
| Analytics/data governance | Domain/accounting identity separated with IDs retained. No analytics changes. |

Replay currently compares payload hashes, not every envelope field; source identity mismatches are not newly detected. Full domain/browser verification, indirect discovery and remaining workflow inventory continue. Next recommended numbered skill: `005-aqstoqflow-accounting-control-center` when that boundary is selected. Overall assignment remains active and incomplete.
