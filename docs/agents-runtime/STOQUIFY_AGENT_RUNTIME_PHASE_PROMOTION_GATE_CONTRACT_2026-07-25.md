# Stoquify Agent Runtime Phase Promotion Gate Contract

**Date:** 2026-07-25  
**Activation authority:** None  
**Phase 3 authority:** None

## Purpose

The promotion gate turns the Phase 2B and Phase 3 dependency order into an
executable, read-only decision. It composes existing evidence and reports
eligibility; it does not create approval, activate a package, update a
definition, mutate business data, or authorize a later phase.

## Phase 2B Entry

`agent:phase2b:entry:gate` requires:

- all authorized repository requirements passing;
- a verified and clean Phase 2A release commit;
- global release evidence ready with no release blockers;
- production-purpose secret readiness;
- a safe migration/deployment target;
- statutory source hash and expert approval;
- credential rotation ready;
- operational evidence ready for independent review;
- product and security approval represented by the operational gate;
- promotion points 1 through 10 completed and point 11 approved GO; and
- activation still false/false/null.

A passing result means eligible for a separate Phase 2B activation review. It
does not activate the package.

## Phase 2B Exit Register

`STOQUIFY_AGENT_RUNTIME_PHASE_2B_PILOT_EXIT_REGISTER_2026-07-25.json` is a
value-free template. It records immutable release binding, hashed pilot scope,
observation duration, run outcomes, safety outcomes, monitoring, support,
rollback, incidents, and four distinct approvals.

The register remains `NOT_STARTED` until real pilot evidence exists. Null,
pending, local, invented, duplicate-approver, or unbound evidence fails closed.

## Phase 3 Entry

`agent:phase3:entry:gate` requires:

- all Phase 2B upstream authorities still ready;
- the pilot exit register declared `READY_FOR_PHASE3_REVIEW`;
- immutable release and evidence-bundle binding;
- a completed observation window with successful runs;
- zero business-write authority, tenant violations, prohibited executions,
  secret exposures, critical incidents, high incidents, or unresolved
  incidents;
- monitoring, support, rollback, and incident evidence references;
- distinct product, security, finance-domain, and release approvals;
- a positive Phase 3 recommendation;
- promotion point 12 completed, point 13 approved GO; and
- `phase3Authorized: true` in the authoritative promotion ledger.

A passing result means the recorded authorities make Phase 3 implementation
eligible to begin in read-and-draft mode. The gate itself grants no authority.

## Permanent Boundaries

- No direct agent Prisma business writes.
- No posting, payment, filing, payroll, stock, close, approval, or permission
  execution authority.
- No self-approval, self-activation, or self-promotion.
- A Phase 3 draft remains non-executing.
- Secret values and direct pilot tenant identities must not be written into
  evidence.
