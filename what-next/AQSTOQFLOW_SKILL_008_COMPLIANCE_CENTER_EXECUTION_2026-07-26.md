# AqStoqFlow Skill 008 — Compliance Center Execution

Generated: 2026-07-26

## Decision

**PARTIAL PASS / RELEASE BLOCKED**

The repository has a substantial compliance-center kernel: posted-source fiscal documents, evidence hashes, adapter contracts, sandbox adapters, certification outbox processing, retries, rejection queues, tenant-scoped dashboards, RBAC actions, notifications, and fiscalization workers.

This run repaired the legal-sequence concurrency control. Skill 008 cannot yet be marked fully complete because deployable database and production-authority invariants remain unresolved.

This is an engineering assessment. It is not legal advice, statutory certification, regulator approval, or authorization to submit to a live authority.

## Selected skill

- `008-aqstoqflow-compliance-center`
- Previous required skill: `007-aqstoqflow-pos-ledger-controls`
- Next recommended numbered skill: `009-aqstoqflow-payment-reconciliation-moat`
- Advancement recommendation: do not treat skill 008 as production-complete until the blocked gates below are closed.

## Implemented in this run

### Serialized fiscal sequence allocation

The fiscal sequence allocator now:

- creates or resolves the sequence through the tenant-and-legal-scope composite key;
- executes standalone allocation in a serializable transaction;
- uses a compare-and-swap transition on sequence ID, tenant, active status, and expected next number;
- retries one database serialization or uniqueness conflict;
- returns a typed conflict when concurrent state changes cannot be safely resolved;
- maps unexpected failures to a non-exposed typed application error;
- records allocation audit evidence only after the transition succeeds.

### Added verification

Focused tests now prove:

- tenant-scoped serialized sequence allocation;
- deterministic formatted number output;
- one retry after Prisma `P2034`;
- fail-closed behavior when an enclosing transaction loses the sequence transition;
- no allocation audit entry after a failed transition.

## Existing control path verified

### Fiscal documents

- Require a posted tenant-scoped ledger posting batch.
- Bind the source, posting batch, optional journal/source link, country-pack provenance, canonical payload, and SHA-256 hash.
- Reject idempotency or source-key reuse with a different payload hash.
- Create lines, evidence, audit record, business event, notification outbox, and optional certification submission in the same transaction.
- Block production certification before an official adapter is reviewed and registered.

### Authority submissions

- Use tenant, authority channel, operation, and idempotency key uniqueness.
- Bind payload hashes and reject conflicting replay.
- Require tenant adapter configuration and credential references outside country packs and logs.
- Lease due work, track attempts, retry outages and rate limits, and persist safe error evidence.
- Surface terminal rejections in fiscal-document state and the compliance dashboard.
- Record submitted payload, authority response, authority reference, and adapter artifacts.
- Emit notification and business-event evidence for queued, accepted, failed, rejected, and retry-scheduled outcomes.

### Compliance dashboard and UX

- Enforces `compliance.documents.read` before data access.
- Uses tenant-scoped read models.
- Includes loading, empty, denied, error, retry, degraded, stale/as-of, document, submission, rejection, and adapter-health states.
- Uses English and French translation catalogs.
- Displays country-pack provenance and evidence hashes without exposing credential values.

## Files changed

- `services/compliance/fiscal-document.service.ts`
- `services/compliance/__tests__/fiscal-sequence.service.test.ts`
- `what-next/statutory-country-pack-integration-readiness.md`
- `what-next/statutory-country-pack-integration-readiness.json`
- `what-next/prisma-migration-deployment-readiness.md`
- `what-next/prisma-migration-deployment-readiness.json`
- `what-next/AQSTOQFLOW_SKILL_008_COMPLIANCE_CENTER_EXECUTION_2026-07-26.md`

Other pre-existing dirty worktree files were not reverted or claimed by this run.

## Gates passed

| Gate | Result |
| --- | --- |
| Prisma schema validation | PASS |
| TypeScript typecheck | PASS |
| Focused compliance services | PASS — 8 suites, 27 tests |
| Compliance page permission/error states | PASS — 1 suite, 3 tests |
| Raw error boundary | PASS — 0 active unsafe findings |
| Regulatory import boundary | PASS |
| Country-pack core integration | PASS — 8/8, production activation remains prohibited |
| Migration SQL destructive-pattern safety | PASS — 0 risk findings |
| Diff formatting | PASS |

## Gates blocked

### 1. Deployable compliance schema migration

`prisma/schema.prisma` defines:

- `BusinessEvent` and `BusinessEventOutbox`;
- `FiscalDocument` and `FiscalDocumentLine`;
- `FiscalSequence`;
- `ComplianceSubmission`;
- `ComplianceAdapterConfig`;
- `ComplianceEvidence`;
- their enums, relations, constraints, and indexes.

No repository migration was found that creates the corresponding mapped tables, including:

- `business_events`;
- `business_event_outbox`;
- `fiscal_documents`;
- `fiscal_document_lines`;
- `fiscal_sequences`;
- `compliance_submissions`;
- `compliance_adapter_configs`;
- `compliance_evidence`.

The migration-safety command passed because it checks existing migration files for deployment risk and skips local database execution. It does not prove that every schema model has migration coverage.

Before generating a migration, reconcile the actual target database baseline. Creating a blind migration against an unknown database could duplicate tables or conflict with prior `db push` state.

### 2. Certified-document database immutability

The service layer does not expose a general mutation path for certified fiscal documents, but no migration-level trigger or equivalent database control was found that prevents protected certified fields from being updated by another runtime path.

A reviewed migration should prohibit changes to canonical payloads, hashes, source links, totals, lines, provenance, authority references, legal numbers, and certification evidence after certification. Corrections must create reversal or compensating documents.

### 3. Production authority and legal-number contract

Current adapters are fake or sandbox-only and correctly carry no production statutory effect. The production path remains blocked pending:

- an authentically approved country pack;
- a reviewed production adapter;
- approved tenant adapter configuration and credentials;
- an explicit decision on whether the authority or the platform sequence supplies the legal number;
- immutable binding of that number to the certified artifact;
- live authority conformance and failure-recovery certification.

The repaired sequence allocator must not be presented as an authority-approved numbering method by itself.

### 4. Compliance obligations and reminders

The dashboard exposes fiscal queues and aggregate payroll declaration readiness, but the blueprint's general compliance obligation/reminder lifecycle is not implemented as a dedicated tenant-scoped evidence model and workflow. Its legal calendar must come from approved country-pack data rather than hard-coded dates.

## Verification result

The implemented compliance-center application logic is internally coherent and its focused verification passes. Production completion remains fail-closed because schema deployment coverage, certified-record immutability, authentic production authority integration, legal-number ownership, and the general obligation/reminder lifecycle are not yet proven.

## Required next actions

1. Reconcile the deployed database baseline against `prisma/schema.prisma`.
2. Generate and review a forward-only compliance-kernel migration.
3. Add database-level certified fiscal-document and line immutability controls with migration tests.
4. Obtain authentic country-pack approval and define the legal-number authority contract.
5. Register and certify a production adapter without weakening the sandbox/production boundary.
6. Implement country-pack-driven compliance obligations and reminders.
7. Rerun skill 008 verification before advancing to production use or treating skill 009 as a release progression.

