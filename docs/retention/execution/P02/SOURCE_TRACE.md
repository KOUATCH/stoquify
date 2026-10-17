# P02 — Source trace and reuse decision

13 October 2026. P01 baseline revalidation: [evidence/BASELINE_REVALIDATION.json](evidence/BASELINE_REVALIDATION.json). HEAD `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`; all 81 selected P01 raw-byte fingerprints matched at start. Initial tree: 400 modified tracked files and 14,662 untracked entries. Fifteen untracked entries added since P01's original capture are its delivered documents/evidence. Nothing was reset, staged or committed.

ECC search-first and security-review were read from the installed ECC 2.2.3 skill directory. Search-first's researcher instruction was fulfilled with one read-only explorer. It inspected POS evidence and authorization and edited no files. Repository search and existing graphs were sufficient: no package installation, registry/GitHub lookup, external analytics query or web comparison was needed or claimed. Graphify/test-gen were not invoked; no graph was regenerated.

## Graph-guided discovery, validated against source

Existing graph reports are dated 9 August 2026, 65 days before this run. In `services/graphify-out/graph.json`, `pos_pos_service_commitpossale` (community 20, graph line 44183) points to historical line 1725; current function starts at `services/pos/pos.service.ts:2210`. `pos_pos_service_refundpossale` (community 9, graph line 44282) moved from historical 2657 to current 3439. `pos_pos_service_voidpossale` (community 9, graph line 44291) moved from historical 2864 to current 3653. Those relationships guided discovery; current source controls the implementation.

## Representative source path

| Step | Source reference | Observed behavior / consequence |
|---|---|---|
| Server permissions | `lib/security/rbac.ts:329` (`requireAllPermissions`), `:364` (`assertCanUseOrganization`); session path `:91` disables cookie-cache authorization | Reuse current context and tenant denial; mock tests do not prove deployed revocation. |
| Existing report convention | `actions/analytics/daily-sales.actions.ts:13` | Requires reports.read and sales.read; supplies context organization. New internal reader preserves both, enforces sales module and checks tenant. |
| POS financial transaction | `services/pos/pos.service.ts:2210`, `:2396`, `:2458`, `:2790`, `:2898` | Registry claim; application occurrence timestamp; same transaction writes finalized event, financial effects and COMMITTED result. Stable sale ID is outcome identity. |
| Receipt repair | `services/pos/pos.service.ts:3023`, `:3056` | COMPLETED is post-financial receipt work. Receipt failure does not erase durable COMMITTED sale. |
| Refund | `services/pos/pos.service.ts:3439`, `:3537`, `:3600` | Refund records and `pos.refund.issued` retain source sale ID, POS_REFUND classification and explicit correction. |
| Void | `services/pos/pos.service.ts:3653`, `:3809` | `pos.sale.voided` / POS_VOID event references original sale. |
| Durable schema | `prisma/schema.prisma:4947`, `:4985`, `:8134`, `:8184` | Registry and event identities/unique keys; no persisted historical role or reliable demo/job classification. |
| Business event writer | `services/events/business-event.service.ts:180`, `:215` | Tenant/source/idempotency lookup; event occurrence defaults to application recording time. Full payload is unsuitable for analytics copying. |
| Source to new report | `services/analytics/retention-outcomes.service.ts`, `retention-outcomes.ts` | Bounded scalar reads, tenant validation, pure idempotent projection and explicit UNKNOWN attribution. |
| Cohort boundary | `services/analytics/retention-cohorts.ts` | Separately qualified observations only; missing/immature states visible. No fabricated connection from current POS source to certified human adoption. |

## Alternatives considered

`services/analytics/daily-sales-read.service.ts:23` includes CONFIRMED/PROCESSING/SHIPPED in fallback totals; not a finalized-outcome denominator. `completed-sales-evidence.ts:33` reads current COMPLETED/DELIVERED orders for reports, but does not preserve the original finalized/correction history needed here. Both remain unchanged.

`services/onboarding/master-data-import.service.ts:1158` reports recent 12 import batches. It cannot stand in for an activated-organization cohort. `services/daily-habit/daily-habit-digest.service.ts` composes operating snapshots and actions; queue presentation is not evidence of completed human work. No dashboard rewrite or new event emission was needed.

Direct business-event projection alone would require careful interpretation of event processing state versus financial completion. The commit registry is clearer for finalized sales. Business events are reused for explicit corrections, where scalar source identity avoids copying sensitive payload. Neither source proves actor role or customer adoption.

## Verification boundary

Three focused test suites exercise pure projection, cohort decisions and the server reader with mocked persistence/auth/module dependencies. PostgreSQL query results and unique constraints were not exercised; the reader must not yet be advertised as runtime-verified. No UI changed. D04/D12 and other P01 owner decisions remain open. See [RESULT.md](RESULT.md) for acceptance and exact continuation.
