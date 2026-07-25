# Stoquify Agent Runtime Phase 2A Command Agent Design Freeze

Date: 2026-07-22
Status: Engineering baseline; internal rollout remains disabled pending product and security approval

## Boundary

Phase 2A adds one deterministic, read-only Command Agent to Daily Digest. It accepts a period, a digest identifier, and a request identifier. It does not accept free-form instructions, tool names, organization identifiers, or arbitrary tool arguments.

The code-backed manifest is the security authority. Database definitions are governed activation records and must match the manifest before a run can start.

## Authorization Matrix

| Surface | Pilot roles | Permission | Module | Allowed fields | Explicitly excluded |
| --- | --- | --- | --- | --- | --- |
| Daily Brief | owner, manager, admin variants | `dashboard.read` | `dashboard` | digest title, fixed summary, state, period, evidence grade, freshness, ranked signal title/detail/severity, safe source route, source module, source hash, blocker count, redaction notices | full tenant snapshot, payroll or employee values, provider references, bank details, suspense payloads, fiscal payloads, credentials, raw database records |
| Evidence citation | same as Daily Brief | inherited from selected digest | `dashboard` | evidence ID, source module, source hash, evidence grade, freshness, availability | hidden identifiers, raw source payloads, SQL, audit security context |
| Feedback | actor who ran the brief | `dashboard.read` | `dashboard` | helpful, wrong, stale, unsafe classification | correction prose, attachments, raw prompt or output |

Finance, accounting, stockkeeper, cashier, payroll, HR, and other specialist roles remain outside the Phase 2A internal pilot unless they also hold an approved pilot role and `dashboard.read`. Their later tools require separate field matrices.

## Rollout Contract

Rollout is fail-closed and server-only.

- `STOQUIFY_COMMAND_AGENT_KILL_SWITCH=1` disables every run.
- `STOQUIFY_COMMAND_AGENT_ROLLOUT` accepts `off`, `shadow`, or `internal`; missing or invalid values mean `off`.
- `STOQUIFY_COMMAND_AGENT_PILOT_ORG_IDS` is a comma-separated organization allowlist.
- `STOQUIFY_COMMAND_AGENT_PILOT_ROLE_CODES` is a comma-separated role allowlist and defaults to no roles.
- `shadow` may persist evaluation runs but must not render output.
- `internal` may render only when organization, role, permission, module, active definition, active skill, and active tool checks all pass.

## Evidence And Output Contract

Every priority item references at least one evidence record. Evidence records include tenant-safe subject identity, source module, optional source hash, grade, freshness, availability, blocker count, and redaction count. Missing or blocked evidence produces an explicit limitation.

Only allowlisted fields can enter the deterministic skill. Output is schema-validated, citation-validated, recursively scanned for sensitive canaries, and redacted before hashing, persistence, or rendering.

## Prohibited Authority

The Command Agent cannot post, pay, approve, assign, resolve, reverse, certify, submit, file, change credentials, change permissions, mutate inventory, adjust cash, change payroll, or write business records. It cannot call Prisma business delegates or write through a generic action executor.

## Promotion Conditions

Internal rollout remains blocked until:

1. product and security approve this matrix;
2. a pilot organization and rollback owner are named;
3. the code-backed definitions are provisioned and activated;
4. tenant, RBAC, entitlement, idempotency, citation, redaction, feedback, and UI-state tests pass;
5. the repository release gates pass; and
6. the kill switch is exercised successfully.
