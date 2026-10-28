# Workflow Assurance Stable Case Identity Report

Generated: 2026-07-20  
Program: Stoquify Referral-Worthy Execution Program  
Phase: Phase 3 / Slice 3  
Operating skill: `stoquify-cash-leakage-radar` through `/stoquify-leakage-radar`

## Executive Outcome

Phase 3 / Slice 3 is **certified complete** at the product-capability level.

Workflow Assurance now has one database-enforced logical case identity that remains stable when source evidence changes:

```text
organizationId + checkKey + definitionVersion + sourceType + sourceId
```

The deterministic version-1 fingerprint hashes exactly that logical identity plus `identityVersion`. Mutable observations such as `sourceHash`, status, severity, evidence, evidence grade, and recommended action no longer participate in identity.

This closes the identity prerequisite identified by the war room. It does not authorize or implement a POS shortage detector, Leakage Radar case creation, a dashboard, inventory-loss behavior, generic resolution-policy hardening, AI authority, or WhatsApp authority.

## Scope Boundary

Implemented:

- a stable, versioned Workflow Assurance case fingerprint;
- server ownership of the definition version used by every registry result path;
- database uniqueness over inspectable logical identity columns;
- explicit `SOURCE_CHANGED` incident history;
- bounded Serializable convergence for unique and serialization races;
- lifecycle handling for unchanged evidence, active drift, finalized drift, suppression, and definition-version changes;
- focused unit, migration-contract, release-gate, and real-PostgreSQL certification.

Not implemented:

- a shortage rule or any POS-to-assurance detector;
- new public or protected routes, actions, dashboards, or product controls;
- changes to POS, inventory, accounting, AI, copilot, or WhatsApp behavior;
- historical incident rewriting, merging, deletion, or synthetic backfill;
- wider assignee, source-recheck, maker-checker, or generic transition-policy changes.

## Before And After

### Before

- The result fingerprint included mutable observations, including source evidence.
- Incident lookup combined fingerprint and source hash.
- A changed observation for one logical source could miss the existing row and create a second case.
- Normalized evidence could not reliably reopen a finalized case because its fingerprint changed with `sourceHash`.
- Concurrent first detection had no database-enforced stable logical identity on which to converge.
- Runner output could provide a definition version without the registry rebinding it to the server-owned definition.

### After

- `WORKFLOW_ASSURANCE_CASE_IDENTITY_VERSION` explicitly versions the identity algorithm.
- `createWorkflowAssuranceCaseFingerprint` hashes only identity version, tenant, check key, definition version, source type, and source ID.
- Default source identity remains canonical: `workflow_assurance_check` plus the check key.
- The registry re-normalizes permission, missing-runner, success, and error results with its server-owned definition version.
- The incident service rejects tenant, check, definition-version, or fingerprint mismatches before persistence.
- Prisma uniqueness directly enforces the five logical identity columns.
- `sourceHash` now represents the changing evidence version within one stable case.

## Lifecycle Contract

| Existing case | Incoming evidence | Result | History and alert behavior |
| --- | --- | --- | --- |
| None | First detection | Create one `OPEN` case | `CREATED`, one creation alert, one audit record |
| Active | Same source hash | Update same row and increment occurrence count | Existing duplicate or severity history; no creation alert |
| Active | Changed source hash | Update same row and preserve active status | `SOURCE_CHANGED` plus audit; no new-case alert |
| `RESOLVED`, `WAIVED`, or `CLOSED` | Changed source hash | Reopen same row and clear terminal fields | `REOPENED` plus audit; one reopen alert |
| `SUPPRESSED` | Changed source hash | Update evidence and preserve suppression | `SOURCE_CHANGED` plus audit; no alert |
| Any prior version | Changed definition version | Use a distinct logical identity | New case may be created for the new rule semantics |

The service runs incident upsert in a Serializable transaction and retries at most once for Prisma `P2002` or `P2034`. Unknown database failures fail through a safe typed business error rather than being swallowed.

## Migration Safety

Migration: `prisma/migrations/20260719203000_workflow_assurance_stable_case_identity/migration.sql`

The migration:

1. checks for duplicate groups over the proposed logical identity;
2. raises SQLSTATE `23505` before enum or index changes when duplicates exist;
3. adds `SOURCE_CHANGED` to `WorkflowAssuranceIncidentEventType`;
4. drops the old mutable-evidence dedupe index;
5. creates `workflow_assurance_incident_identity_key` over the five logical columns.

It contains no incident `UPDATE`, `DELETE`, merge, or backfill.

The selection-time read-only database preflight found:

| Preflight | Count |
| --- | ---: |
| Existing Workflow Assurance incidents | 0 |
| Duplicate logical-identity groups | 0 |
| Duplicate stable-fingerprint groups | 0 |

Direct disposable PostgreSQL certification then proved:

- the exact migration SQL installs successfully over a clean minimal old-state schema;
- duplicate logical identities block installation before the old index, enum, or rows are changed;
- the current schema can be installed in a disposable runtime schema;
- all temporary certification schemas were removed.

## Verification Evidence

### Tests

- Focused final regression: **5 suites, 69 tests passed**.
- Expanded Workflow Assurance regression: **7 suites passed, 73 tests passed, 5 gated PostgreSQL tests skipped without the certification environment**.
- Main generated Prisma client against a fresh disposable PostgreSQL schema: **5 of 5 identity/concurrency scenarios passed**.
- Migration contract: duplicate preflight ordering, direct logical uniqueness, no row rewrite, and `SOURCE_CHANGED` all passed.

The real-PostgreSQL scenarios proved:

- simultaneous first detection converges on one case and one creation alert;
- active evidence drift updates one row without another alert;
- finalized evidence drift reopens the same row;
- suppression remains in force across evidence drift;
- changed definition versions remain distinct identities.

### Static And Release Gates

| Check | Outcome |
| --- | --- |
| `npm run typecheck` | Passed repository-wide |
| Focused ESLint over touched source, scripts, and tests | Passed |
| `npx prisma validate` | Passed |
| Workflow Assurance release gate | Ready, 37/37 checks, 7/7 indexes, 2/2 engine-health checks, 0 blockers |
| Workflow Assurance runtime check | Ready, 6/6 tables, 2/2 historical migration rows, 0 blockers |
| Service-boundary fail gate | Passed, 0 active violations |
| Module-surface fail gate | Passed, 367 records, 0 new gaps; current gaps 48 versus baseline 55 |
| Role-cockpit gate | Ready, 9/9 |
| Prisma migration-safety gate | Ready, 8/8 across 21 migrations, 0 findings or blockers |
| Scoped `git diff --check` | Passed for every tracked Slice 3 file |

The final focused migration and identity command passed 69 tests after the permanent migration-contract test was added.

## Repository-Level Constraints

These conditions are outside Slice 3 and are not waived:

- The full `npm run policy:gates` chain passes inventory, service, API guard, public identity, ledger, payment, purchasing, and offline-POS checks, then holds at the pre-existing statutory country-pack gate. Its two blockers are `source_artifact_hash_verification` and `source_artifact_expert_approval`.
- A clean empty-database `prisma migrate deploy` cannot currently bootstrap the repository migration history because the earlier `20260618154500_repair_accounting_source_links` migration assumes `AccountingSourceType` already exists. The new migration was therefore certified directly against representative old state and the current schema was certified with `db push`; this does not claim the older bootstrap defect is fixed.
- `npx prisma generate` refreshed generated TypeScript and JavaScript, including `SOURCE_CHANGED` and `workflow_assurance_incident_identity_key`, but its final Windows query-engine DLL rename was blocked by the existing Next development process on port 3000. Full TypeScript and the normal application-client PostgreSQL certification pass. The existing development process was deliberately not terminated and must restart normally before it loads the refreshed client code.
- Repository-wide `git diff --check` is currently red only on unrelated pre-existing blank lines at EOF in `.env.example`, `playwright.config.ts`, `services/pos/pos.service.ts`, and `services/reconciliation/payment-reconciliation-certification.service.ts`. The scoped Slice 3 diff check is green; those unrelated files were not modified for this slice.
- `prisma/schema.prisma` already contained a large unrelated worktree diff before this slice. The Slice 3 schema edit is limited to the Workflow Assurance logical-identity unique declaration and the `SOURCE_CHANGED` event value; no unrelated schema work was rewritten or reverted.

## Files In This Slice

- `services/assurance/assurance-registry-contracts.ts`
- `services/assurance/assurance-registry.service.ts`
- `services/assurance/assurance-incident-contracts.ts`
- `services/assurance/assurance-incident.service.ts`
- `services/assurance/__tests__/assurance-registry-contracts.test.ts`
- `services/assurance/__tests__/assurance-registry.service.test.ts`
- `services/assurance/__tests__/assurance-incident.service.test.ts`
- `services/assurance/__tests__/assurance-incident-identity.postgres.test.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260719203000_workflow_assurance_stable_case_identity/migration.sql`
- `scripts/workflow-assurance-release-gate.js`
- `scripts/__tests__/workflow-assurance-release-gate.test.js`
- `scripts/__tests__/workflow-assurance-stable-case-identity-migration.test.js`

## Certification Decision

The Stable Workflow Assurance Case Identity Foundation is certified complete. The original identity contradiction is closed, server-owned definition identity is enforced, expected races converge safely, and evidence drift has explicit durable history.

Control now returns to `/stoquify-referral-war-room`. The war room must review this evidence and select at most one next narrow slice. No shortage detector or other downstream Phase 3 implementation is implicitly authorized by this certification.
