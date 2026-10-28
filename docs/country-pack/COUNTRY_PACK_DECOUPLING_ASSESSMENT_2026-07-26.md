# Country-Pack Decoupling Assessment

**Project:** Stoquify
**Assessment date:** 26 July 2026
**Decision:** Proceed with controlled country-pack decoupling for development and integration.

## Executive conclusion

Country-pack production readiness can be removed from the ordinary feature-integration path. The application cannot safely behave as though country packs do not exist everywhere, because payroll, tax, accounts payable, fiscal documents, and certified accounting close depend on their regulatory data.

The recommended operating principle is:

> Develop independently of country-pack approval while preserving country-pack contracts and blocking authoritative regulatory outcomes.

The country-pack module, database structures, regulatory contracts, provenance fields, and production gates should remain intact.

## Current gate assessment

Stoquify already has separate country-pack gates:

- Development gate: `READY_FOR_DEVELOPMENT_TESTING`, with 11 of 11 checks passing.
- Production gate: blocked, with 10 of 12 checks passing.
- Remaining production blockers: source-artifact hash verification and independent expert approval.

The principal problem is gate composition. The default `policy:gates` command invokes the production country-pack gate. `verify:repo` and `verify:ci` inherit it, and pull-request CI runs `verify:ci`. Normal integration work is therefore treated partly like a production-promotion ceremony.

## Dependency classification

| Country-pack dependency | Development treatment | Production treatment |
|---|---|---|
| Production artifact hashes | Exclude from integration gates | Required |
| Expert legal or statutory approval | Exclude from integration gates | Required |
| Authority adapters and credentials | Fake or sandbox adapter | Approved adapter required |
| Fiscal certification | Deferred or sandbox-only | Required |
| Payroll tax calculation | Versioned fixtures and non-authoritative previews | Verified rules required |
| Payroll declarations and payments | Simulate only | Remain blocked until approved |
| AP VAT and withholding resolution | Record unresolved or review-required state | Verified pack required |
| Accounting close | Draft preview permitted | Certified close remains blocked |
| Compliance dashboard | Optional during unrelated development | Enabled normally |
| Authentication and tenant controls | Never bypass | Never bypass |
| Ledger, payment, and inventory controls | Never bypass | Never bypass |

## Recommended architecture

### 1. Separate integration verification from release verification

Introduce four explicit commands:

```text
policy:gates:integration
policy:gates:release
verify:integration
verify:release
```

The integration profile should use the development country-pack gate. The release profile should retain the production gate. Pull-request CI should run `verify:integration`; only protected release or production-promotion workflows should run `verify:release`.

Security, ledger, payment, inventory, migration-safety, tenant-boundary, and hard-delete gates must remain in both profiles.

### 2. Add an explicit country-pack execution boundary

Use explicit execution modes:

- `SANDBOX`
- `DEFERRED`
- `PRODUCTION`

Regulatory results should expose one of these authority states:

- `AUTHORITATIVE`
- `NON_AUTHORITATIVE`
- `PENDING_COUNTRY_PACK`

Do not add a generic `COUNTRY_PACK_DISABLED=true` switch. It could leak into production and would discard useful regulatory provenance.

### 3. Decouple POS fiscalization

POS currently creates its fiscal document inside the sale transaction. A country-pack or fiscalization exception can therefore roll back an otherwise valid sale.

The revised sale transaction should commit:

- The sale.
- Payment effects.
- Inventory movements.
- Balanced ledger postings.
- Audit evidence.
- A durable `FISCALIZATION_REQUESTED` outbox event.

A separate worker should then create the fiscal document. In development, the worker may create a sandbox document or leave the request as `PENDING_COUNTRY_PACK`. This preserves the fiscalization obligation without blocking the sale or silently losing work.

### 4. Preserve fail-closed regulatory outcomes

Country-pack absence must never produce invented regulatory values. Payroll currently returns `BLOCKED_REQUIRES_EXPERT_REVIEW` for unsupported tax rules. That behavior must remain for authoritative payroll.

Development previews may use controlled fixtures only when the results are marked:

- `NON_AUTHORITATIVE`
- `SIMULATION_ONLY`
- `NOT_PAYABLE`
- `NOT_DECLARABLE`
- `NOT_CLOSE_CERTIFIABLE`

## Controls that may be deferred in development

- External tax-authority communication.
- Production adapter credentials.
- Expert-approval and regulatory-promotion gates.
- Final fiscal certification.
- Live declarations and statutory payments.
- Certified close-pack export.
- Country-pack production evidence collection.

## Controls that must remain

- Tenant isolation, authentication, and permissions.
- Input validation.
- Payment idempotency and duplicate-capture prevention.
- Balanced ledger enforcement.
- Accounting-period controls.
- Inventory invariants.
- Transactional integrity.
- Audit events and immutable evidence.
- Payroll rule provenance.
- Prevention of unsupported tax calculations.
- Production authority-call prohibition.
- Separation between draft and certified accounting close.

## Phased implementation plan

### Phase 1: Verification split

- Add integration and release gate profiles.
- Change pull-request CI to use `verify:integration`.
- Preserve `verify:release` as fail-closed.
- Update gate tests that currently require the production country-pack gate inside the shared policy chain.

Completion criteria:

- Ordinary pull requests are no longer blocked by expert approval.
- The integration profile passes with the current repository.
- The release profile still fails on the two existing production blockers.

### Phase 2: Country-pack boundary

- Centralize execution-mode resolution.
- Reject `SANDBOX` and `DEFERRED` modes in production.
- Add authority status to all regulatory results.
- Preserve pack version, resolution hash, and provenance whenever available.

Completion criteria:

- No module reads an unrestricted bypass environment variable.
- Every simulated result is visibly non-authoritative.
- Production defaults to fail-closed.

### Phase 3: POS deferred fiscalization

- Add a durable fiscalization-request event.
- Move fiscal-document processing outside sale completion.
- Add retry and dead-letter handling.
- Display pending fiscalization status in operational views.

Completion criteria:

- POS sales complete when the country-pack worker is unavailable.
- Every sale requiring fiscalization has exactly one durable request.
- Worker retries cannot create duplicate documents.
- Production certification remains prohibited without an approved adapter.

### Phase 4: Payroll, AP, and close previews

- Support fixture-backed payroll previews.
- Retain AP review-required metadata when VAT cannot be resolved.
- Permit draft accounting-close packs.
- Prevent payment, declaration, certified export, or close certification from consuming simulated results.

Completion criteria:

- Teams can integrate complete user journeys.
- No simulated value reaches a production financial effect.
- Authoritative actions continue to expose clear blockers.

### Phase 5: Restore production country-pack enforcement

1. Verify source artifacts and hashes.
2. Record independent expert approval.
3. Publish the approved pack version.
4. Certify and register the production adapter.
5. Process or reconcile deferred fiscalization requests.
6. Run regression and golden-fixture tests.
7. Run `verify:release`.
8. Obtain independent promotion approval.

## Risks and safeguards

| Risk | Required safeguard |
|---|---|
| Sandbox behavior reaches production | Reject non-production execution modes at startup and at the service boundary |
| Simulated tax is treated as authoritative | Persist and display authority status with every result |
| Deferred fiscalization work is lost | Write the outbox event in the same transaction as the sale |
| Duplicate fiscal documents | Preserve source and idempotency keys |
| Integration profile becomes a weak release profile | Keep release verification separate, protected, and mandatory for promotion |
| Country-pack reintegration requires major rework | Preserve interfaces, schemas, provenance, and pending-work records |

## Final decision

Proceed with controlled country-pack decoupling for development and integration.

The smallest effective first change is the verification-profile split. Runtime decoupling should initially be limited to POS fiscalization and explicitly non-authoritative payroll, AP, and accounting-close previews. Production country-pack enforcement must remain fail-closed throughout.
