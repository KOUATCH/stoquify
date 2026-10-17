# P02 — Outcome and retention metric contract

13 October 2026. Implementation: `pos-outcome-v1`; proposed activation contract: `activation-v1`; cohort contract: `core-work-week-v1`. These are local definitions and synthetic verification, not measured customer retention. Product/data ownership, external analytics arrangements and retention policy remain P01 decision D12, unresolved.

## What is implemented

The server-only [read model](../../../../services/analytics/retention-outcomes.service.ts) reads existing POS commit records and refund/void business events. The [projection](../../../../services/analytics/retention-outcomes.ts) emits scalar outcomes. The [cohort evaluator](../../../../services/analytics/retention-cohorts.ts) evaluates already-qualified, synthetic human observations. There is deliberately no automatic connection from unclassified sales to human cohorts.

No schema, migration, checkout writer, analytics warehouse, external export, scheduler, action endpoint or dashboard changed. Existing authorization/module denial auditing can still run when the read-model entry point is invoked; there are no new analytics/business writes. No live read was performed here.

## Durable source and query contract

| Boundary | Contract |
|---|---|
| Entry | `getRetentionOutcomeReadModel({ start: Date, endExclusive: Date, organizationId?, locationId? })`; internal server call only. No caller-supplied role, user, traffic or as-of authority. |
| Authorization | Fresh `requireAllPermissions(["reports.read", "sales.read"])`; `assertCanUseOrganization` denies foreign organizations including superuser cross-tenant attempts. Organization in every query comes from current context. Sales module uses enforce mode for this new report. Existing reporting's observe mode is not weakened or modified. |
| Scope | Active, non-deleted organization; optional location must belong to it. Organization-wide read follows existing reports/sales permission convention. No new location-role authority is invented. |
| Window | Half-open `[start, endExclusive)`, elapsed, positive and at most 31 elapsed days. `asOf` is server time captured before reads. Caller resolves organization-calendar boundaries; splitting a longer window preserves half-open boundaries. |
| Snapshot | One Prisma `RepeatableRead` transaction for organization/location validation, commit and correction reads. Auth and entitlement checks precede it. Snapshot and real query behavior require V3. |
| Bounds | At most 1,000 commit rows and 1,000 correction rows. Read one extra to detect overflow and fail explicitly; never silently truncate or publish partial counts. Narrow the window on overflow. |
| Completion | `POSCommitResult` with `COMMITTED` or `COMPLETED`, valid `committedAt`, organization, location and sale ID. `COMMITTED` already includes financial commit; receipt completion is not another sale. `CLAIMED` is unresolved and excluded. |
| Stable key | Completion key `(organizationId, salesOrderId)`. Source registry has unique `(organizationId, terminalId, clientCommitId)`; pure projection also deduplicates repeated rows. Conflicting locations/times for one sale exclude that operation and raise a diagnostic. |
| Corrections | `BusinessEvent` event/source pairs `pos.refund.issued` / `POS_REFUND` and `pos.sale.voided` / `POS_VOID`; eventSource `POS`, schemaVersion 1, status `RECORDED` or `APPLIED`. Correction key `(organizationId, event.id)`. Other statuses/versions are excluded with diagnostics. |
| History | Keep original completion and separate reversal observation. A correction to an older sale can appear without an in-window completion. Do not subtract correction-event count from sale count or call it net sales/revenue; partial/full value is not inferred from scalar headers. |
| Failure | Read/authorization/module errors propagate; they do not become empty success. Invalid/unsupported source rows appear in diagnostics. Failed attempts without durable registry rows are not counted or assumed observed. No success-rate denominator is supplied by this slice. |
| Recovery | Re-read the durable source after a read failure. Nothing is written into the financial transaction; no instrumentation failure path can roll back, repeat or change a sale. Source retention/deletion and legacy coverage still affect what can be reconstructed. |

`committedAt` is an application timestamp set in the financial transaction, not the database wall-clock commit instant. Completion `recordedAt` is registry `createdAt` (claim creation), not independent analytics ingestion time. Correction `occurredAt` defaults to the application's event recording time; its `recordedAt` is the database-created value, which may reflect transaction-start time. Do not require those clocks to have a strict ordering. Offline local trading time and late ingestion are not reconstructed. The reader is a current-state snapshot, not a historical time-travel query: later receipt state can change; missing historical rows cannot be recovered by supplying an earlier as-of.

## Output allowlist and evidence quality

Each outcome contains only definition version, organization ID, stable sale operation ID, source record ID, location ID, `COMPLETED`/`REVERSED`, optional `REFUND`/`VOID`, occurrence/recording timestamps, role, traffic and evidence quality. `DURABLE_COMMIT` and `DURABLE_CORRECTION` describe source semantics, not accounting or production certification.

No actor ID, customer identity, order number, amount, payroll data, provider data, payload, metadata blob, result envelope or free-text reason is selected/emitted. Raw business event payloads contain sensitive financial/provider references and must not be reused as analytics payloads.

Current records lack historical role and reliable demo/test/job classification. Therefore every real-source outcome currently returns `role: UNKNOWN` and `traffic: UNKNOWN`; `humanAdoption.eligibleCompletedOperations` is **null**, not zero, with the unclassified completion count separately reported. Actor existence, current role membership, organization name, onboarding source and eventSource `POS` are insufficient proof of human/live activity. Do not classify offline replay as an extra human action or infer its role from the worker.

`coverage: SOURCE_ROWS_ONLY` means the source was read, not that all expected business work or telemetry exists. Diagnostics count duplicate rows, unresolved rows, invalid evidence and conflicting operations. Consumers must show these and the source/attribution limitations. A zero completed-source count is not inactivity or churn.

## Proposed organization-level activation definitions

These definitions are versioned proposals for D12/D01/D05 review. This slice documents their input contracts; it does not implement cutover, shift reconciliation, accountant review or their activation-event producers.

| Segment / version | Required evidence, all for the same organization | Activation time and eligibility |
|---|---|---|
| Retailer / `activation-v1:retailer` | Accepted opening/setup controls; first durable sale; first reconciled cashier shift, with assistance recorded. Sale alone is insufficient. | Latest prerequisite completion. Measure onboarding-start to activation and data-ready to activation separately; proposed seven-calendar-day target remains unmeasured. |
| Multi-location / `activation-v1:multi-location` | Accepted opening positions for every explicitly enrolled pilot site; scoped cashier and manager outcomes; first retained cross-location review. | Latest required site/role/review completion. Show site blockers; do not average them away. Proposed 14-calendar-day target remains unmeasured. |
| Finance/accountant / `activation-v1:finance` | Authorized accountant invitation accepted; accepted opening controls; first eligible period reviewed with a retained evidence pack. | Eligible period review/acceptance time. Waiting for period end is not failure. Weekly sale activity is not finance retention. |

Keep registration/organization `createdAt`, onboarding start, data-ready acceptance, activation, trading calendar effective version and first eligible period distinct. Missing milestone evidence is unknown/not activated, never replaced by registration time or a successful import. Recent-12-import-batch metrics are operational evidence, not an organization cohort. Current numerical baselines and customer outcomes are **unknown**.

## Repeated-work and cohort contract

Retail repeat-work v1: at least one qualified human completed sale in the target eligible window; separately expose correction observations. This measures use of the workflow, not net economic success or absence of returns. Multi-location repeat-work ultimately also requires meaningful site/manager review; finance repeat-work follows eligible close periods. Those outcomes remain uninstrumented. Do not apply retailer sales logic to other segments and call their retention proved.

Week 1 is local calendar days `[activation, activation + 7 days)`, Week 4 `[+21, +28)`, Week 8 `[+49, +56)`, Week 12 `[+77, +84)`. These are target-week windows, not cumulative activity since activation. Group organizations by segment, activation-definition version and activation week/month. A reviewed calendar adapter must supply the matching start/end instants and scheduled trading days, including local timezone, closures and DST where applicable. The evaluator accepts those resolved bounds; it does not calculate or certify that calendar, or regroup arbitrary organizations into a cohort.

The internal observation contract requires organization ID, activatedAt or null, target week, resolved bounds, asOf, trusted traffic classification, scheduled trading days (0–7 or unknown), COMPLETE/PARTIAL/MISSING coverage, and distinct eligible operation IDs within that exact window. A future collector must filter scope/time, establish completeness and classify provenance before setting COMPLETE/HUMAN. These are server-owned evidence, never client flags. Source-only output from this P02 reader does **not** satisfy them.

| State | Meaning / denominator treatment |
|---|---|
| EXCLUDED | Proven demo, test or automated organization/observation; excluded from human denominator. |
| NOT_ACTIVATED | Required activation evidence absent; excluded from activated cohort eligibility. |
| IMMATURE | As-of precedes exclusive window end; excluded from observed/eligible denominator even if an event already exists. |
| NOT_SCHEDULED | Mature window with zero scheduled trading days; reported separately. |
| UNKNOWN | Mature, otherwise eligible observation with missing/partial coverage, unknown provenance or unknown calendar; retained in eligible denominator, excluded from observed denominator. |
| OBSERVED_REPEAT | Mature scheduled HUMAN observation, COMPLETE coverage, at least one distinct eligible operation. |
| NO_OBSERVED_REPEAT | Same evidence conditions, zero eligible operations. This is not cancellation or churn. |

Publish cohort size, eligible count, observed count, unknown count, immature count, exclusions, not-activated count and not-scheduled count. `observedRepeatRate = repeated / observed`, null when observed is zero. It is explicitly conditional on observed organizations, not a whole-cohort retention estimate. `missingObservationRate = unknown / eligible`, null when eligible is zero. Show counts with rates. No churn, MRR or NRR calculations exist here.

## Remaining instrumentation and decisions

1. D12: identify actual external analytics, accountable metric owner, purpose/access/retention policy and calendar/version definitions; no external tools or customer records were queried here.
2. Retain source-time actor-role and live/demo/test/automation provenance through a reviewed server-owned producer/adapter. Unknown must stay excluded until this exists. Do not reconstruct historical roles from current membership or accept browser labels.
3. Record assisted/offline/imported/replayed classifications and trustworthy event-to-workflow correlation where justified; current source lacks enough evidence. These are not invented fields in the output.
4. Add activation milestone, site/manager review, shift reconciliation and eligible-close instrumentation under their owning prompts; preserve their dependencies. Add workflow failure/uncertainty/recovery denominators separately.
5. Define source/telemetry availability and completeness watermarks, bounded replay and retention. Only then can a collector feed COMPLETE cohort observations. No customer backfill is authorized or performed.
6. Verify new queries and isolation on an explicitly disposable synthetic PostgreSQL target. There is no migration or uniqueness change; source uniqueness and read correctness still require real fixtures before runtime acceptance.

Data stewardship: retain customer business records under existing controls; no new analytics persistence, customer export, cancellation change or data deletion is introduced. D10/D12 remain unresolved for any future analytics store. Removing this read-side slice requires no financial rollback or customer-record cleanup.
