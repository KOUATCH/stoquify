# Country-Pack Regulatory Isolation — Implementation Record

Date: 2026-07-26  
Status: Implemented for development and sandbox integration  
Production statutory authority: Not granted

## Outcome

Country-pack approval is no longer on the critical path for ordinary feature integration or POS sale completion.

The implementation preserves the country-pack system as an isolated regulatory capability. Feature modules consume a stable boundary, POS fiscalization runs after the accounting transaction through a durable outbox, and production continues to fail closed unless authoritative country-pack evidence is approved.

## Target behavior

| Concern | Development / sandbox | Production |
|---|---|---|
| Feature integration | Allowed through deterministic integration gates | Subject to full release gates |
| Country-pack value | Non-authoritative and watermarked | Authoritative only when capability and evidence are approved |
| Missing or pending pack | Returns or records `PENDING_COUNTRY_PACK` / `DEFERRED` | Fails closed |
| POS sale completion | Commits ledger, stock, payment, audit, event, and fiscalization request | Same accounting guarantees |
| Fiscalization | Asynchronous, idempotent, retryable | Cannot claim certification without authoritative evidence and an approved adapter |
| Receipt wording | Pending regulatory processing; not statutory certification | Never claims certification until certified |

## Architecture implemented

### Regulatory capability boundary

Feature code now routes runtime resolution through:

`services/regulatory/regulatory-capability.service.ts`

The boundary provides three explicit decisions:

- `AUTHORITATIVE`
- `NON_AUTHORITATIVE`
- `PENDING_COUNTRY_PACK`

Production deployment classification overrides a caller's requested sandbox mode. There is no general-purpose environment switch that can disable production controls.

The published country-pack implementation is hidden behind:

`services/regulatory/adapters/published-country-pack.adapter.ts`

A static import gate blocks feature modules from importing the country-pack resolver or registry directly.

### Integration and release gates

`policy:gates:integration` is the default repository integration chain. It uses the country-pack development gate and excludes legal approval, live authority, promotion, and release-certification gates.

`policy:gates` remains the production policy chain. `verify:release` explicitly runs it after repository integration verification.

This separation allows code integration without representing development evidence as statutory approval.

### Transactional POS fiscalization outbox

The POS commit transaction now records a `FISCALIZATION` outbox message together with:

- the completed sale;
- inventory postings;
- payment capture;
- ledger posting and posting-batch identity;
- audit records; and
- the final business event.

The transaction no longer calls country-pack resolution, fiscal-document creation, or an authority adapter.

The request includes tenant, sale, actor, location, terminal, posting batch, issue time, and an immutable source fingerprint. Reusing an event idempotency key with different content remains a conflict.

### Worker and state model

The fiscalization worker supports:

- tenant-scoped claiming;
- compare-and-set leases;
- stale-lease recovery;
- bounded batches;
- exponential retry scheduling;
- maximum-attempt dead lettering;
- immutable source verification;
- idempotent fiscal-document creation;
- `DEFERRED` processing when a country pack is pending;
- reconciliation that requeues deferred requests;
- completion events and notifications; and
- queue health summaries.

Outbox states used:

`PENDING → LOCKED → SENT`

Retry path:

`LOCKED → FAILED → LOCKED`

Regulatory wait path:

`LOCKED → DEFERRED → PENDING`

Terminal technical failure:

`LOCKED → DEAD_LETTER`

### Receipt truth

When a fiscal document has not yet been created but a durable fiscalization request exists, receipt data reports:

- `fiscalDocumentStatus: PENDING_REGULATORY_PROCESSING`;
- the fiscalization request ID;
- the actual queue state; and
- no legal certification claim.

Operational receipt handling can continue while statutory certification remains pending.

### Observability

The Compliance Center snapshot now exposes:

- pending requests;
- active leases;
- deferred requests;
- failed requests;
- dead-letter requests; and
- the oldest actionable request time.

## Database change

Migration:

`prisma/migrations/20260726143000_regulatory_isolation_outbox/migration.sql`

The migration is additive:

- adds `FISCALIZATION` to `BusinessOutboxChannel`;
- adds `DEFERRED` to `BusinessOutboxStatus`.

It reuses the existing tenant-scoped business-event outbox and does not introduce a parallel delivery mechanism.

## Worker operation

One bounded tenant-scoped run:

```powershell
npm run worker:fiscalization -- --organization-id <organization-id> --worker-id <stable-worker-id> --limit 25
```

Equivalent environment variables:

- `STOQUIFY_FISCALIZATION_ORGANIZATION_ID`
- `STOQUIFY_FISCALIZATION_WORKER_ID`

The command is one-shot by design. A scheduler should invoke it at the required cadence. Worker identity must be stable per running worker instance.

## Deployment sequence

1. Deploy the additive Prisma migration.
2. Deploy the application and worker code.
3. Start the tenant-scoped worker schedule.
4. Monitor Compliance Center queue counts and oldest actionable age.
5. Confirm that new POS sales create `FISCALIZATION` outbox records.
6. Confirm deferred requests remain visible and do not block operational transactions.
7. Requeue deferred requests after the relevant country pack is published and approved.
8. Run the full production policy chain before enabling any live statutory or authority behavior.

## Verification evidence

Passed:

- Prisma schema validation.
- Prisma migration safety gate: 8/8 checks, zero risk findings.
- TypeScript repository typecheck.
- Regulatory import boundary: 1,382 files checked, zero violations.
- Country-pack development readiness: 11/11 checks.
- POS accounting and outbox tests: 13/13.
- Regulatory boundary, runtime classification, worker lease/defer/tenant, worker CLI, receipt truth, Compliance Center, payroll, purchasing, and migration-focused tests.

Production remains intentionally blocked:

- `source_artifact_hash_verification`
- `source_artifact_expert_approval`

These blockers are not defects in the isolation implementation. They are the preserved human/legal authorization boundary.

## Non-claims

This implementation does not:

- certify a country pack as legally correct;
- enable live tax-authority submission;
- treat sandbox output as statutory output;
- bypass tenant, role, ledger, audit, evidence, or idempotency controls; or
- authorize production payroll, declarations, payments, or fiscal certification.
