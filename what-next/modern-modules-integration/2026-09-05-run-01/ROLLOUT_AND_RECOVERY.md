# Rollout and recovery

## Additive migrations

Apply through the existing migration-control process, in order:

1. 20260905170000_add_tenant_module_composition — configuration, separate grants, immutable command/review evidence and constraints.
2. 20260905173000_protect_module_configuration_authority — configuration/grant/history foreign keys preventing authority fallback through orphan records.
3. 20260905200000_add_module_lifecycle_command_state — REQUESTED command enum. Its separate migration commits the enum before use.
4. 20260905200100_add_module_lifecycle — activeRevision, explicit stop policy/timestamps, lifecycle operations, steps and append-only events. Existing activeRevision is backfilled from revision; no domain readiness is fabricated.

The catalogue has 84 migrations with no new name/hash inconsistency. New schema relation/index maps match the SQL, including PostgreSQL's 63-byte index-name limit. Existing applied SQL has not been rewritten. None of these migrations issues a grant, changes requestedModules, modifies statutory records or activates a customer. The first reviewed configuration write snapshots legacy grants transactionally.

## Target rollout sequence

1. Identify exact environment, backup/restore evidence, operator authority and release window through the repository migration-control process. Do not reuse local fixture credentials, permissions or test approvals.
2. Inspect deployment status and pending migration names. Apply all four integration migrations before starting code that reads their authority/lifecycle fields.
3. Generate the matching Prisma client and restart the selected application cohort. Local verification retained an identical loaded engine DLL while updating generated code; this was a Windows test-environment workaround, not a general deployment procedure.
4. Verify authenticated EN/FR settings entry, denied users, existing effective grants, last active workspace and database health. Start with an authorized internal cohort and existing eligible grants.
5. Review real setup requirements and the supported operation scopes. Any stop requires an explicit fresh-authenticated consequence review. POS/Sales/accounting/reconciliation stops remain unavailable.
6. Observe failed readiness reads, waiting inputs, lease retries, stale authority, audit/event writes, route duration and denied new-work attempts. Investigate abnormal failures before widening the cohort.

## Recovery

- Unsaved local draft is convenience state; it cannot establish authority. A saved draft/history item reopens as a new draft under current permission checks.
- Missing setup leaves desired revision ahead of active revision. Complete inputs in the indicated domain workflow, then check inputs/resume. Previously successful unchanged steps remain recorded; no external provider effects are repeated.
- If a stop was accepted, new work remains stopped while existing obligations are being resolved. A failed preparation does not silently restart admissions. The previous workspace and role-appropriate record access remain available.
- Stale revision, changed permission/grant/catalogue/declared scope requires a fresh review. Do not overwrite another administrator's request.
- Unknown submission outcome: retry the same request/idempotency key. Do not create another business effect. A new deliberate recovery attempt uses a new attempt key on the same operation.
- Interrupted preparation: the durable 60-second lease prevents simultaneous processing; after expiry, the current authorized request owner can resume. Another administrator creates a fresh reviewed request, preserving the old evidence.
- Actual database/query failure is unavailable/failed evidence, never a successful zero count or legacy entitlement fallback.
- Reactivation requires current grants, permission, dependencies and setup. Stop cutoffs are removed only on verified activation; history remains immutable.

## Rollback boundary

Prefer a forward correction or presentation rollback that retains the durable grant reader, all four migrations and active admission policy. Old code that ignores managed grants can restore excessive legacy access; old code that ignores accepted stops can restart new work. Do not drop module tables, erase stop timestamps, disable append-only triggers or mutate historical commands/events to make a rollout look complete. Restore a known-consistent database/application pair only through the authorized recovery process, with reconciliation of requests accepted after the restore point.

## Isolated verification targets

- Browser: stoquify_local_modern_modules_20260905_01 and http://127.0.0.1:3107. Private random credentials remain in ignored playwright/.auth/modern-modules-local.json.
- Controls: stoquify_local_modern_modules_controls_20260905_01. Real service/constraint tests use explicitly synthetic owned organizations. Aggregate SQL tests use rollback-only transaction-local tables.
- Helpers reject remote/production targets, unexpected database identities and unowned organizations. Existing databases are never reset. Setup fixtures are explicitly synthetic and do not certify accounting policies, provider approvals or signer identity.
- Default build invokes migrations and was not used. Actual route compilation uses the isolated Next development app. Existing port3000 application and the standalone prototype are not test targets.

The exact offline patch approval boundary is recorded in evidence/lifecycle-continuation/OFFLINE_CONTINUATION_APPROVAL.md. Its unapplied proposal lacks complete ingestion serialization and must not be enabled alone.

Before a real cohort rollout, verify the transfer page in a production bundle: the isolated development server logged a shared-auth useRef render warning after the missing read-permission mapping was corrected. The browser recovered and the protected stopped-transfer action passed, but clean server rendering was not established. The default migration-bearing build was not used to obscure this limitation.
