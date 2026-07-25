# Stoquify Agent Runtime Phase 2A Release-Control Hardening Execution Report

**Execution date:** 2026-07-24  
**Governing prompt:** `docs/agents-runtime/STOQUIFY_INTERNAL_ACTIVATION_GATE_REMEDIATION_AND_CONTROLLED_PILOT_READINESS_EXECUTION_PROMPT_2026-07-23.md`  
**Authoritative phased plan:** `docs/agents-runtime/STOQUIFY_AGENT_RUNTIME_PRACTICAL_EXECUTION_PLAN_2026-07-22.md`  
**Active phase:** Phase 2A, deterministic read-only Command Agent  
**Phase result:** Repository hardening complete for this slice; Phase 2 remains partially blocked  
**Final decision:** **READY FOR REMEDIATION VERIFICATION**  
**Internal activation:** **BLOCKED and not attempted**  
**Phase 3:** **NOT AUTHORIZED**

## 1. Executive Decision

This execution closed three material technical gaps in the Phase 2A release-control plane:

1. Approval and certification commands are now idempotent, replay-safe, and payload-bound.
2. Global agent, skill, and tool definitions are independent of tenant rollout state.
3. Blocking drift on an active tenant release now causes an automatic guarded suspension with immutable evidence.

The controlled PostgreSQL migration and persistence smoke passed. The enabled Command Agent passed authenticated desktop and mobile Playwright certification, remained `PILOT_CERTIFIED`, and retained `activatedAt: null`.

During final evidence review, the raw Playwright JSON reporter was found to retain its web-server environment block. That block can contain configured credentials. The unsafe local artifact was replaced, the runner was changed to create a bounded credential-free report, the raw report is now deleted before certification, a static gate enforces the behavior, and browser certification was rerun so the database certificate is bound to the sanitized report hash.

Stoquify is not ready for a real controlled internal pilot. Real approvals and owners, a deployed scheduler and managed identity or secret, production-like alert delivery and acknowledgement, clean-commit CI evidence, and the full negative/degradation browser matrix remain incomplete. The correct next state is remediation verification in a production-like non-production environment.

## 2. What Was Executed

### 2.1 Release-command idempotency

The approval and pilot-certification commands now require an idempotency key. Each command:

- calculates a stable request hash;
- executes in a serializable transaction;
- looks up the package-scoped idempotency key before changing state;
- returns the original record with `replayed: true` for an identical retry;
- rejects reuse with different content as `RELEASE_IDEMPOTENCY_CONFLICT`;
- handles a concurrent unique-key race without duplicating evidence;
- records the key and request hash in audit evidence.

Nullable database columns preserve compatibility with historical rows. New service contracts require the values.

### 2.2 Tenant rollout and global registry separation

The global definition registry now remains:

- Agent definition: `ACTIVE`
- Agent rollout mode: `SHADOW`
- Skill definition: `ACTIVE`
- Tool definition: `ACTIVE`

Tenant pilot state is owned exclusively by `AgentActivationPackage`. Provisioning, activation, suspension, or rollback of one tenant can no longer change the global registry to `INTERNAL` or `PAUSED`.

This removes cross-tenant coupling and makes the release package the authoritative tenant rollout control.

### 2.3 Automatic drift suspension

The control-plane reconciler now evaluates release blockers independently from finding presentation. If an `ACTIVE_INTERNAL` package develops a blocking condition, it calls the canonical suspension command.

The suspension:

- is tenant-scoped;
- is concurrency-safe;
- is non-destructive;
- records a bounded reason;
- writes immutable audit evidence;
- leaves the global registry `ACTIVE/SHADOW`;
- reports the suspension count in reconciliation output.

### 2.4 Credential-free browser evidence

The browser runner now:

1. writes Playwright's raw JSON to a temporary file under `test-results`;
2. extracts only version, project identity, test identity, status, duration, retry, and aggregate statistics;
3. fails if forbidden environment or credential keys survive;
4. writes the bounded durable artifact;
5. deletes the raw report;
6. records certification only after sanitization.

The rerun produced a 2.8 KB artifact with zero forbidden-key matches. No raw reporter file remained.

## 3. Architecture and Ownership

The existing graph at `graphify-out/ordered-code-graph.json` was inspected. It contains the daily-digest route and `DailyHabitDigestDashboard` nodes, but it predates the agent-runtime work completed on 2026-07-22 through 2026-07-24. The current source tree was therefore treated as authoritative for new release-control dependencies.

The resulting ownership path is:

`Daily digest UI -> protected agent action -> Command Agent service -> release authorization -> definition resolution -> read-only tool adapter -> evidence-backed output`

Release governance follows:

`protected release action -> canonical release-control service -> tenant-scoped PostgreSQL state -> append-oriented audit evidence`

Operational assurance follows:

`authenticated scheduler boundary -> control-plane reconciler -> Workflow Assurance check run/finding/incident -> alert delivery -> guarded suspension`

No agent receives release-control permissions. No agent service gains direct ledger, filing, payment, inventory, payroll, close, approval, or permission-changing authority.

## 4. Files and Components Changed

### Database

- `prisma/schema.prisma`
- `prisma/migrations/20260724100000_agent_runtime_release_hardening/migration.sql`

The migration adds nullable idempotency and request-hash columns plus package-scoped unique indexes for approval and certification commands. It is additive.

### Runtime and governance services

- `services/agents/agent-release-contracts.ts`
- `services/agents/agent-release-control.service.ts`
- `services/agents/agent-definition.service.ts`
- `services/agents/agent-control-plane-reconciliation.service.ts`
- `actions/agents/agent-release-control.actions.ts`

### Provisioning, certification, smoke, and gates

- `scripts/agent-enabled-pilot-e2e-bootstrap.ts`
- `scripts/run-agent-enabled-pilot-e2e.js`
- `scripts/agent-release-control-postgres-smoke.ts`
- `scripts/agent-release-control-gate.js`

### Tests

- `services/agents/__tests__/agent-release-control.service.test.ts`
- `services/agents/__tests__/agent-definition.service.test.ts`
- `services/agents/__tests__/agent-control-plane-reconciliation.service.test.ts`
- existing agent and component suites

## 5. PostgreSQL Evidence

### Migration

- Migrations discovered: 32
- Database state: up to date
- Migration safety checks: 8/8 ready
- Destructive SQL findings: 0
- Blockers: 0
- Secret values written to migration evidence: no

### Final certified local package

- Package ID: `cmryrcs790003ma10ivkyrim7`
- Release version: `e2e-ac30ee75314a-1784886529173`
- Base commit recorded: `ac30ee75314a0a2a2fcd6bd2ed65afb280aa0d5e`
- Manifest hash: `sha256:f6d5f1049e0baff64bb42503077f3fe801bd214bcf265289308f7db56f51c28a`
- Certification ID: `cmryrimlo0001map4fazfj3nm`
- State: `PILOT_CERTIFIED`
- Activated at: `null`

The base commit does not include the dirty working-tree implementation. This makes the local certificate provisional until the same suite passes on a clean committed revision in CI.

### Final browser evidence

- Playwright evidence SHA-256: `17ce50099a0ed64dc86c16b4ce41d10d047ed5f7210964995f217b033612272f`
- Expected tests: 4
- Unexpected tests: 0
- Flaky tests: 0
- Forbidden evidence-key matches: 0
- Raw report retained: no

### Final release-control smoke

- Package state: `PILOT_CERTIFIED`
- Product/security approvals: 2 from 2 distinct users
- Owner responsibilities: 6
- Certification records: 1
- Audit records: 18
- Approval replay: passed
- Certification replay: passed
- Conflicting payload: rejected as `RELEASE_IDEMPOTENCY_CONFLICT`
- Automatic suspension fixture: `SUSPENDED`
- Suspension audit: present
- Global registry after tenant suspension: `ACTIVE/SHADOW`
- Activation blocker: `RELEASE_RECONCILIATION_STALE`
- Alert transport: not ready because no webhook is configured

The smoke intentionally retains immutable assurance evidence. PostgreSQL correctly rejected an attempted cleanup of an immutable finding; the test was corrected to preserve the evidence instead of bypassing the control.

## 6. Verification Results

| Verification | Result |
|---|---|
| `npm run prisma:validate` | Passed |
| `npx prisma migrate status` | Passed; 32 migrations, database current |
| `npm run prisma:migration:safety:gate` | Passed; 8/8, zero destructive risks |
| Controlled local migration deployment | Passed |
| `npm run agent:release-control:postgres-smoke` | Passed |
| Focused ESLint | Passed |
| `npm run typecheck` with 8 GB Node heap | Passed, no diagnostics |
| `npx jest services/agents components/agents --runInBand` | Passed; 18 suites, 54 tests |
| `npm run agent:runtime:gates` | Passed |
| Enabled-pilot desktop Playwright | Passed |
| Enabled-pilot mobile Playwright | Passed |
| Evidence redaction scan | Passed; zero forbidden-key matches |
| `git diff --check` | Passed; line-ending warnings only |

The browser rerun emitted a Next.js development warning about future `allowedDevOrigins` behavior. It did not affect certification and should be addressed before relying on the same development-server topology long term.

## 7. Gate Matrix

| Gate | Status | Evidence or blocker |
|---|---|---|
| Canonical release-control service | PASSED locally | Protected transitions and static gate |
| Direct activation bypass removal | PASSED | Provisioner remains draft/shadow only |
| Approval/certification idempotency | PASSED | Replay and conflict smoke assertions |
| Tenant/global rollout separation | PASSED | Global definitions remain `ACTIVE/SHADOW` |
| Blocking-drift suspension | PASSED | PostgreSQL suspension fixture and audit |
| Additive migration safety | PASSED | 8/8 checks, no destructive findings |
| PostgreSQL persistence | PASSED locally | Final smoke `ok: true` |
| Credential-free Playwright evidence | PASSED | Distilled report, raw report deleted |
| Enabled desktop/mobile happy path | PASSED locally | 4/4 including auth setup |
| Real product and security approval | BLOCKED | Authorized identities and decisions absent |
| Named operational owners | BLOCKED | Real roster, coverage, and acknowledgement absent |
| Five-minute deployed reconciliation | BLOCKED | Deployment adapter, schedule, and managed identity/secret absent |
| Production-like alert delivery | BLOCKED | Webhook, owner acknowledgement, and escalation proof absent |
| Clean-commit CI certification | BLOCKED | Current worktree is uncommitted |
| Negative/degradation browser matrix | PARTIAL | Unauthorized tenant/role, stale/partial/empty, timeout/retry/replay, accessibility, rollback, and DB non-mutation assertions remain |
| Retirement and long-term retention | PARTIAL | `RETIRED` state exists; dedicated command and retention operation remain |

## 8. Security Finding and Required Response

The first local Playwright JSON artifact contained the web-server environment supplied by the reporter. It was untracked and was replaced before this report was published. The durable runner no longer retains that structure, and the rerun certificate is bound to the sanitized report.

Because credential values were present in a local evidence file, the security owner must rotate any non-test credentials that were loaded into that browser run before production-like certification. The repository does not prove whether local backup, indexing, or endpoint tooling copied the earlier artifact. Rotation is the conservative closure action.

No credential value is reproduced in this report.

## 9. Remaining Work to Unblock the Pilot

1. Commit the implementation and rerun all mandatory CI jobs from that exact commit.
2. Record real product and security approval using distinct authorized users.
3. Assign and acknowledge all six operational responsibilities with valid coverage and escalation references.
4. Deploy the five-minute reconciler with workload identity where available, otherwise a managed rotatable secret.
5. Configure production-like alert transport, deliver a test incident, obtain owner acknowledgement, and prove escalation.
6. Complete the negative and degradation Playwright matrix, including tenant isolation and prohibited-business-table non-mutation assertions.
7. Rotate any non-test credentials present during the earlier local raw-report generation.
8. Rerun the enterprise release gate and issue a new go/no-go decision.

Phase 3 must not begin until these Phase 2 controlled-pilot trust gates pass.

## 10. Rollback and Emergency Behavior

- Keep all tenant packages below `ACTIVE_INTERNAL`.
- The current certified package remains inactive and can be suspended without changing global definitions.
- If an active internal package later develops blocking drift, reconciliation suspends it through the canonical command.
- The kill switch remains an independent emergency deny.
- The additive migration should remain in place; rollback is application-level because removing idempotency evidence would reduce assurance.
- Immutable Workflow Assurance findings and release audit evidence must not be deleted.

## 11. Execution Notes

An existing local development process held the Prisma query-engine file open. A temporary generated-client directory was used to complete local validation without replacing the locked same-version engine. The temporary schema and client directory were verified as workspace-local and removed after use. No workaround artifact remains.

The dedicated patch tool also failed repeatedly because of a Windows sandbox helper error. Narrow assertion-guarded edits were used as the fallback and were then validated by lint, typecheck, tests, runtime gates, PostgreSQL smoke, browser certification, and `git diff --check`.

## 12. Final Decision

The Phase 2A release-control hardening slice is technically complete and verified locally. Stoquify now has materially stronger replay safety, tenant isolation, drift response, and evidence hygiene.

The overall Phase 2 controlled pilot is still **BLOCKED** on real governance, deployment, alert acknowledgement, clean-commit certification, credential rotation, and the complete negative/degradation matrix.

**Current authorized status:** `READY FOR REMEDIATION VERIFICATION`  
**Not authorized:** internal activation or Phase 3 execution  
**Active numbered skill:** `016-aqstoqflow-ai-copilot-guardrails`  
**Next numbered skill after remaining evidence is supplied:** `017-aqstoqflow-enterprise-release-gate`
