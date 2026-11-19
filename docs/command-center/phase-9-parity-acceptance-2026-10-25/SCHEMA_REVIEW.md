# Phase 9 schema-parity review

The application schema now describes the database's existing relationships. No migration SQL was rewritten, generated diff executed, production database accessed or shared Prisma client regenerated.

## Corrections

| Model | Correction |
| --- | --- |
| FirmObligationRevision | Preserve `NO ACTION` updates on organization; model the existing accounting-period FK with `RESTRICT` delete and `NO ACTION` update. |
| FirmAdvisoryRevision | Model existing actor, engagement identity and client-period relationships, preserving their composite fields, explicit database names and `RESTRICT` actions. |
| HrisLifecycleTask | Preserve `NO ACTION` employee updates and the existing named constraint. |
| HrisSetupReviewerGrant | Preserve `NO ACTION` updates for organization, reviewer, employee and grantor; retain existing delete actions and the three composite constraint names. |
| HrisPayrollHandoffPackage | Preserve `NO ACTION` updates on organization and payroll period. Leave the already-correct replacement relationship unchanged. |
| HrisPayrollHandoffReceipt | Preserve `NO ACTION` updates on organization and package. |

Four corresponding back-relations make the newly represented relationships navigable in Prisma. No extra tenant or actor constraint was invented under this parity repair.

## Fresh replay result

The repository's existing `scripts/prisma-fresh-replay-certification.js` reports `READY_WITH_INTENTIONAL_RESIDUAL_DRIFT` against the newly created disposable replay database. All 118 migrations applied and matched their raw source checksums. The separate history-health gate passed 9/9, including its stricter history checks. A repeated deployment had no pending migrations.

| Difference | Before | After | Treatment |
| --- | ---: | ---: | --- |
| Unexpected FK drops/replacements | 24 | 0 | Corrected application schema to match existing database behavior |
| Index renames | 153 | 153 | Existing naming policy; no SQL executed |
| FK renames | 64 | 64 | Existing naming policy; no SQL executed |
| Retained database-only FKs | 12 | 12 | Existing retention policy |
| Retained timestamp defaults | 7 | 7 | Existing database-default policy |
| Retained legacy tables | 3 | 3 | Historical evidence retained |
| Retained legacy enum | 1 | 1 | Historical evidence retained |
| Total statements | 264 | 240 | Zero unexpected structural statements; not a zero-diff claim |

The existing classifier and its exception sets were not changed. Historical evidence retention is established by `20260726190000_retire_production_bom_capability`. These residual statements must not be automatically applied as cleanup.

Direct PostgreSQL inspection independently confirmed all 15 FKs across the six models, including the unchanged handoff replacement FK. Six all-scalar-field Prisma reads succeeded. The new client was generated privately and compared with a separately formatted temporary schema copy; shared client hashes remained unchanged at generation.

Evidence: [parity report](schema-parity.md), [history](history.md), [gate results](parity-gates.json), [constraint checks](constraint-results.json), [private client](private-client-result.json). These are disposable-environment results and do not authorize schema promotion or production release.
