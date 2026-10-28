# Stoquify Agent Runtime Phase 2A Command Agent Execution Report

Date: 2026-07-22
Selected skill: `016-aqstoqflow-ai-copilot-guardrails`
Execution state: Engineering implementation complete; rollout remains disabled

## Executive Result

Stoquify now has a provider-free, deterministic, read-only Command Agent vertical slice embedded in Daily Digest. It builds one role-specific brief from the existing permission-filtered digest, ranks no more than five priorities, binds every priority to evidence, validates citations, applies output redaction, persists governed run metadata and bounded feedback, and exposes safe UI states.

No model SDK, external trace exporter, durable workflow engine, MCP server, free-form prompt, generic tool selector, business mutation, ledger posting, payment, filing, payroll action, stock adjustment, cash adjustment, approval, or permission-changing path was added.

The feature is fail-closed. The environment default is `off`, the pilot organization and role allowlists default to empty, the kill switch has precedence, and the provisioned PostgreSQL definitions are `DRAFT` with `SHADOW` rollout metadata.

## Implemented Controls

### Authorization And Rollout

- Added a documented role, field, evidence, redaction, and prohibited-output matrix.
- Added server-only `off -> shadow -> internal` resolution.
- Requires `dashboard.read`, an explicitly allowlisted organization, and an explicitly allowlisted role.
- Enforces the dashboard module again at the protected action boundary.
- Accepts no browser-supplied organization ID.
- Supports an immediate server-side kill switch.

### Narrow Data Projection

- Added only `readRoleDailyDigest` to the executable Command Agent registry.
- Reuses the existing Daily Digest service and its role/permission filtering.
- Rechecks each priority's required permission before projection.
- Projects only fixed titles, details, severity, safe route, evidence identity, grade, freshness, blockers, and redaction notices.
- Does not expose `TenantOperatingMetrics` or raw payment, payroll, bank, provider, inventory, close, fiscal, or database payloads.

### Deterministic Skill And Guardrails

- Added versioned `role-daily-brief` skill version `1`.
- Added a fixed prompt/template hash even though Phase 2A uses no model.
- Added strict Zod request, feedback, projection, and output schemas.
- Rejects unknown evidence citations.
- Applies canonical field-policy redaction to evidence identifiers and sensitive domain details.
- Recursively scans final output for credential, bearer token, provider reference, bank account, payroll person, IBAN, and email canaries.
- Rejects free-form prompts, arbitrary tool names, arbitrary tool arguments, and client tenant identity structurally.

### Persistence And Observability

- Added run provenance fields for agent definition, skill key/version, prompt hash, duration, tool count, evidence count, and redaction count.
- Added one-feedback-per-run-and-actor uniqueness.
- Added tenant-and-actor-scoped replay lookup.
- Added an abandoned-run reconciliation service.
- Added safe structured run metrics with no raw input, tool payload, or generated output.
- Added bounded feedback classifications: helpful, not helpful, stale, wrong, and unsafe. Correction prose is not accepted.

### User Experience

- Embedded a compact Command Agent panel in Daily Digest.
- Added disabled, shadow, role-unavailable, loading, failed, running, replayed, empty, stale/partial, limitations, evidence, and feedback states.
- Added French and English copy.
- Added accessible labels for icon-only feedback controls.
- Kept every source interaction as a read-only navigation link.

## Database Deployment

Migration `20260722160000_agent_runtime_phase_2a_provenance` was safety-reviewed and deployed to local PostgreSQL `dbakesman/public`.

- Migration count: 28
- Migration status: up to date
- Destructive migration findings: 0
- Command Agent definition: `DRAFT`, `SHADOW`, `READ_ONLY`
- Role Daily Brief skill: `DRAFT`
- Read Role Daily Digest tool: `DRAFT`, `READ_ONLY`

PostgreSQL smoke verification passed:

- provenance round-trip;
- duplicate actor/run feedback rejected with `P2002`;
- cross-tenant feedback rejected with `P2003`; and
- automatic fixture cleanup.

## Verification

| Gate | Result |
| --- | --- |
| Prisma schema validation | Passed |
| Migration safety gate | Passed, 8/8 ready, 0 blockers |
| Migration deploy/status | Passed, 28 migrations current |
| TypeScript | Passed |
| Focused ESLint | Passed |
| Phase 2A static gate | Passed |
| Existing agent runtime gates | Passed |
| Prohibited business-action scan | Passed |
| Service boundary gate | Passed, 0 active violations |
| Workflow assurance runtime gate | Passed, 7/7 tables and 3/3 migrations |
| Report trust/export gate | Passed, 9/9 checks |
| Focused service and UI tests | Passed, 14 suites and 36 tests |
| Phase 2A PostgreSQL smoke | Passed |
| Diff whitespace check | Passed |

## Files Changed

### Runtime And Contracts

- `services/agents/command-agent-contracts.ts`
- `services/agents/agent-rollout.service.ts`
- `services/agents/agent-definition.service.ts`
- `services/agents/agent-run-governance.service.ts`
- `services/agents/agent-output-validator.service.ts`
- `services/agents/agent-feedback.service.ts`
- `services/agents/agent-metrics.service.ts`
- `services/agents/command-agent.service.ts`
- `services/agents/tools/command-tool-adapters.ts`
- `services/agents/skills/role-daily-brief.skill.ts`
- `services/agents/agent-contracts.ts`

### Protected Actions And UI

- `actions/agents/command-agent.actions.ts`
- `components/agents/AgentCommandPanel.tsx`
- `components/daily-habit/DailyHabitDigestDashboard.tsx`
- `app/[locale]/(dashboard)/dashboard/daily-digest/page.tsx`

### Persistence, Gates, Tests, And Documentation

- `prisma/schema.prisma`
- `prisma/migrations/20260722160000_agent_runtime_phase_2a_provenance/migration.sql`
- `scripts/agent-phase2a-command-gate.js`
- `scripts/agent-phase2a-postgres-smoke.js`
- `scripts/agent-runtime-phase-2a-provision.js`
- `scripts/agent-prohibited-action-gate.js`
- `package.json`
- focused tests under `services/agents/__tests__` and `components/agents/__tests__`
- `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2A_COMMAND_AGENT_DESIGN_FREEZE_2026-07-22.md`

## Gates Blocked

The engineering slice is complete, but internal promotion remains blocked by:

1. product and security approval of the Phase 2A design freeze;
2. a named pilot organization, roles, rollout owner, and rollback owner;
3. activation of matching database definitions only after approval;
4. moving definition/skill provenance into initial run creation so it cannot be lost during a process interruption;
5. atomic concurrent duplicate-request handling;
6. a production logger/metrics sink and scheduled abandoned-run reconciler;
7. explicit execution timeout behavior; and
8. authenticated Playwright coverage across desktop/mobile, entitlement denial, stale/partial evidence, and kill-switch rollback.

## Rollback

Keep `STOQUIFY_COMMAND_AGENT_ROLLOUT` unset or set to `off`, or set `STOQUIFY_COMMAND_AGENT_KILL_SWITCH=1`. Do not delete audit records or roll back the additive migration. Definitions remain `DRAFT` until a separately reviewed activation.

## Next Recommended Numbered Skill

Apply `017-aqstoqflow-enterprise-release-gate` before any internal activation.
