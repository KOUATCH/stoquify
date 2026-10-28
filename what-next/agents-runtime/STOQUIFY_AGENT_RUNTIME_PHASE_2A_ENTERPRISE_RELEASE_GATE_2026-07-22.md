# Stoquify Agent Runtime Phase 2A Enterprise Release Gate

Date: 2026-07-22
Selected skill: `017-aqstoqflow-enterprise-release-gate`
Decision: **APPROVED WITH REQUIRED FIXES**
Promotion state: **Internal activation blocked**

## Decision

The Phase 2A Command Agent is approved as a completed engineering baseline and database deployment. It is not approved for internal user activation yet.

The implementation has the correct product boundary: deterministic, evidence-cited, provider-free, read-only, tenant-scoped, permission-filtered, module-gated, fail-closed, and structurally unable to perform a business action. All executable verification gates passed.

Internal activation remains blocked because several operational controls are not yet complete. The current `off` default and `DRAFT` database definitions keep those gaps from becoming user-facing exposure.

## Findings

### High: Run Provenance Is Finalized After Execution

`command-agent.service.ts` runs the deterministic agent before `recordAgentRunGovernance` writes definition ID, skill version, prompt hash, duration, and counters. A process failure after run completion but before this update can leave an otherwise completed run without its exact governed provenance.

Required fix: pass the already validated definition and skill identity into the runner's initial `AgentRun` creation. Keep the post-run update only for completion metrics. Add a process-interruption test proving the run can always be attributed to its definition and skill.

### High: Internal Governance Approval Is Not Recorded

The design freeze explicitly remains an engineering baseline. No product/security approval, pilot organization, rollout owner, rollback owner, or activation window is recorded. Definitions are correctly `DRAFT`.

Required fix: record stakeholder approval and pilot ownership, then activate only the matching code manifest and only for the approved organization and roles.

### Medium: Concurrent Replay Is Not Fully Atomic

Sequential repeated request IDs return a tenant-and-actor-scoped receipt. Two concurrent first requests can still race between replay lookup and run insertion, causing one request to receive a database uniqueness conflict rather than the scoped receipt.

Required fix: catch the correlation uniqueness conflict inside the governed run boundary and load the same scoped receipt, or introduce an atomic create-or-read operation. Add a concurrent PostgreSQL test.

### Medium: Timeout And Reconciliation Are Not Operationally Wired

An abandoned-run reconciler exists, but no scheduler invokes it. The synchronous command path also lacks an explicit execution timeout.

Required fix: add a bounded server-side timeout, safe timeout code, schedule/operations owner for reconciliation, and tests for timeout plus abandoned-run recovery. A durable workflow vendor is still unnecessary for this read-only synchronous slice.

### Medium: Metrics Currently Depend On A No-Op Sink

The Command Agent emits structured safe metrics, but the default logger sink remains a no-op. Therefore production latency, denial, redaction, stale, and failure monitoring is not yet observable.

Required fix: configure the existing logger sink for the internal environment, verify raw inputs/outputs remain absent, and define alert ownership for repeated policy denials and unsafe feedback.

### Medium: Browser Release Coverage Is Incomplete

Component tests cover disabled and successful evidence-backed panel behavior, but there is no authenticated Playwright suite for Daily Digest desktop/mobile rendering, entitlement denial, stale/partial data, kill-switch rollback, keyboard operation, or source navigation.

Required fix: add and pass the authenticated browser matrix before activation.

### Low: Evidence Drill-Through Is Route-Based Only

The panel cites evidence IDs and links to protected source surfaces. It does not yet open a subject-specific proof trail inside the panel.

Required fix: after subject-permission validation exists, reuse the existing proof drawer for evidence records that have a supported proof subject. This does not block the deterministic internal brief if protected source navigation remains available.

## Gate Matrix

| Gate | Decision | Evidence |
| --- | --- | --- |
| Architecture and context | Passed | Reuses Daily Digest, agent runtime, module control, evidence, redaction, and protected actions |
| Tenant scope | Passed | Browser supplies no organization ID; context and feedback use trusted tenant/actor; PostgreSQL cross-tenant rejection passed |
| RBAC | Passed | `dashboard.read` enforced in rollout, projection, protected action, and priority filtering |
| Module control | Passed | Dashboard module enforced at action and trusted context boundaries |
| Ledger/event integrity | Passed / not applicable | No money, stock, payroll, tax, close, filing, or ledger mutation exists |
| Idempotency | Conditional | Scoped sequential receipt passes; concurrent race remains |
| Error safety | Passed with operational follow-up | Protected typed errors and safe runner summaries; timeout code remains |
| Notifications | Conditional | UI states and policy incidents exist; production operator sink remains |
| UX completeness | Conditional | Component states and bilingual copy pass; authenticated browser matrix remains |
| Evidence | Passed | Every priority cites validated evidence or explicit limitation |
| Redaction | Passed | Canonical policy boundary and adversarial canary tests pass |
| Observability | Conditional | Safe metrics emitted; sink and alert ownership remain |
| Database | Passed | Migration deployed; schema current; provenance/P2002/P2003 smoke passed |
| Verification | Passed | Typecheck, focused lint, 14 suites/36 tests, static gates, service boundary, workflow assurance, report trust |

## Passed Verification

- `npm run prisma:validate`
- `npm run prisma:migration:safety:gate`
- `npm run prisma:migrate:deploy`
- `npm run prisma:migrate:status`
- `npm run typecheck`
- focused ESLint over the changed runtime, action, and UI files
- `npm run agent:phase2a:gate`
- `npm run agent:runtime:gates`
- `npm run service:boundary:fail`
- `npm run workflow:assurance:runtime-check`
- `npm run report:trust:export:gate`
- focused Jest: 14 suites and 36 tests passed
- `npm run agent:phase2a:postgres-smoke`
- `git diff --check`

## Activation Gate

Do not run provisioning with `--activate` and do not set the environment rollout to `internal` until every High finding is closed and the Medium timeout, monitoring, replay, and browser items are accepted by the release owner.

After fixes, rerun this skill. Activation should begin with one organization, owner/manager roles only, an exercised kill switch, and no model provider.

## Files Changed By This Review

- `what-next/agents-runtime/STOQUIFY_AGENT_RUNTIME_PHASE_2A_ENTERPRISE_RELEASE_GATE_2026-07-22.md`

The review also validated the Phase 2A implementation files listed in the companion execution report. Unrelated pre-existing worktree changes were not modified or reverted.

## Gates Passed

Architecture, tenant scope, RBAC, module control, read-only integrity, typed errors, evidence validation, redaction, schema, migration, focused lint, focused tests, service boundary, workflow assurance, report trust, and PostgreSQL constraints.

## Gates Blocked

Internal activation, stakeholder approval, atomic initial provenance, concurrent replay, timeout/reconciler operations, production metric sink, and authenticated browser release coverage.

## Verification Result

**APPROVED WITH REQUIRED FIXES** as an engineering baseline. **Not approved for internal activation.**

## Next Recommended Numbered Skill

Return to `016-aqstoqflow-ai-copilot-guardrails` for the narrow promotion fixes above, then rerun `017-aqstoqflow-enterprise-release-gate`. Do not advance to model-backed Phase 2B yet.
