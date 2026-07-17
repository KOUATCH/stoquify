# Module Program Stage Contract

## Required Fields

Every stage record must include:

- `id`, `name`, `skill`, `status`, and `owner`
- prerequisite stage identifiers
- owned repository paths
- implementation objective and non-goals
- security and data invariants
- focused verification commands
- evidence artifact paths
- rollback or recovery procedure
- residual risks and unblock conditions

## Gate Semantics

- `planned`: sequencing is known but prerequisites are incomplete.
- `ready`: prerequisites and evidence inputs exist; no implementation has started.
- `in_progress`: bounded implementation or verification is active.
- `blocked`: a named condition prevents safe progress and has an owner or external dependency.
- `complete`: implementation and every exit gate are verified with current evidence.

Never infer completion from a merged document, generated UI, passing inventory ratchet, or a successful happy-path test alone.

## Evidence Quality

Prefer service tests, negative tenant tests, migration dry runs, policy output, browser evidence, and rollback smoke results. Label design documents and agent analyses as proposal evidence, not runtime proof.
