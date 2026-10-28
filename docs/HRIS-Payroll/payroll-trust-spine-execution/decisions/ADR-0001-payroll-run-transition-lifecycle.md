# ADR-0001: Payroll run transition lifecycle

- Status: Accepted
- Architecture state: REPAIR
- Work package: WP1
- Scope: Payroll Trust Spine only

## Context

The current payroll acceptance path combines approval, payslip emission, ledger posting, final status persistence, and event publication in one `approveAndPostPayrollRun` operation. A run can therefore move from `CALCULATED` or `REVIEWED` directly to `POSTED`, with one actor recorded as approver, emitter, and poster. The current readiness gate does not reject that collapsed lifecycle.

The repair must preserve tenant isolation, immutable posted payroll evidence, existing accounting source links, statutory calculations, and unrelated dirty-worktree changes.

## Decision

The only permitted forward lifecycle is:

| From         | Command               | To         | Permission              | Canonical event        |
| ------------ | --------------------- | ---------- | ----------------------- | ---------------------- |
| `CALCULATED` | `reviewPayrollRun`    | `REVIEWED` | `payroll.runs.review`   | `PAYROLL_RUN_REVIEWED` |
| `REVIEWED`   | `approvePayrollRun`   | `APPROVED` | `payroll.runs.approve`  | `PAYROLL_RUN_APPROVED` |
| `APPROVED`   | `emitPayrollPayslips` | `EMITTED`  | `payroll.payslips.emit` | `PAYSLIP_EMITTED`      |
| `EMITTED`    | `postPayrollRun`      | `POSTED`   | `payroll.runs.post`     | `PAYROLL_POSTED`       |

Every command is tenant-scoped, fresh-authenticated, idempotent, and committed in a serializable transaction. It reads the exact source status and expected version, persists the stage evidence and canonical business event/outbox record, appends one transition record, performs a compare-and-set version increment, invalidates affected certified close evidence, and marks the idempotency record applied last. Any failed invariant rolls back the entire command.

### Separation of duties

The baseline requires three human actors:

- A prepares/calculates the run.
- B reviews it and may later post it.
- C approves it and may emit an unchanged payslip batch.

The enforced inequalities are:

- reviewer is not preparer;
- approver is not preparer or reviewer;
- poster is not preparer or approver.

An attested service worker may emit an already approved, unchanged batch but may not review, approve, or post. There is no small-tenant self-approval override. A tenant that lacks sufficient internal actors must use a properly authorized external accountant or remain blocked.

### Trust boundary

The client may supply only the run identifier, expected version, idempotency key, and optional correlation or document/evidence hashes. Organization, actor, permissions, module access, current time, fresh-auth evidence, and worker attestation are derived and verified by the server. A missing fresh-auth timestamp fails closed; it is never replaced with the current time.

### Canonical events

The following are first-class business events, not audit-label substitutes or nested notifications:

- `LEAVE_APPROVED`
- `PAYROLL_RUN_REVIEWED`
- `PAYROLL_RUN_APPROVED`
- `PAYSLIP_EMITTED`
- `PAYROLL_POSTED`

Each event is written through the existing transactional business-event gateway with audit/outbox evidence and tenant-scoped uniqueness.

### Transition persistence

`PayrollRunTransition` is an append-only, tenant-scoped ledger. Runtime entries require a source status, actor, canonical business-event link, verified evidence, version pair, sequence, and idempotency key. Historical combined posted runs receive one explicitly partial `LEGACY_BACKFILL` snapshot; the backfill must not invent actors, intermediate stages, event IDs, timestamps, or ordering evidence.

## Rollout and rollback

The schema migration is additive. Lifecycle writes remain disabled unless `PAYROLL_TRUST_SPINE_WRITES_ENABLED=true`. Cutover removes the combined external action only after migration/backfill and focused proof pass. Incident rollback disables the new write switch and retains all additive evidence; it does not restore the unsafe combined command or delete transition history.

## Rejected alternatives

- Keeping the combined command and adding more audit labels: it does not create independently authorized transitions.
- Allowing the same actor to approve and post: it defeats the material SoD boundary.
- Trusting client-supplied actor, tenant, permissions, or fresh-auth facts: it weakens the server trust boundary.
- Fabricating complete historical transitions: it would turn absence of evidence into false assurance.
- Restoring the combined command during rollback: it reintroduces the defect the control is intended to remove.
