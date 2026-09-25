# Stoquify Development Progression Agent

Run from `E:\ohada saas\Focused projects\stoquify`:

```powershell
node scripts/development-progression-agent.js --mode inspect
node scripts/development-progression-agent.js --mode run
node scripts/development-progression-agent.js --mode resume
```

`inspect` evaluates the existing X1 validator, reconstructs the enterprise aggregate from saved sources, and writes a dated report. It does not query the database or run tests. `run` and `resume` execute eligible actions in dependency order and reuse verified results for unchanged inputs. An optional `--run-id` names a new immutable output directory. An optional `--manifest` selects a workspace-contained evidence manifest. Existing run directories are never overwritten.

The first implementation has four fixed actions:

| Action | Actual work | Authority and result |
|---|---|---|
| `x1-local-integrity` | Verify 42 image hashes, distinct cells, recorded checks, tenant/persona/run identity and local classification | File integrity and historical local coverage only; never release evidence |
| `x1-contract-tests` | Run seven coordinator, X1 contract and approval suites using the repository's bounded Jest configuration | Current repository engineering proof |
| `x1-matrix-list` | Compile/list the 42 authenticated browser checks and aggregator | Requires passing contracts; opens no browser |
| `x1-readiness` | Run the existing X1 orchestrator with `--mode report --no-write` | Read-only disposable-database identity retrieval, current integration gaps and artifact hashes; no external records |

The bounded Jest configuration is the existing `jest.payroll-trust-spine.config.cjs`, with roots explicitly narrowed to the selected X1 test folders. Its transforms and setup apply to these contract suites; no payroll runtime work is invoked. This avoids the repository-level Next wrapper's documented indexing of archived evidence trees.

Each subprocess has a three-minute timeout. A failed action is not retried automatically on unchanged inputs. `--retry` permits one additional attempt, with a maximum of two per input fingerprint. Source/configuration changes reopen affected observations. The current implementation conservatively hashes executable source across the repository, so unrelated source changes can invalidate the local verification cache. This favors correctness over minimal reruns. External/database observations also expire after one hour. Saved result files are hash-checked before reuse.

Expected external blockers produce `OBSERVED_BLOCKED`; they are not test failures and are never treated as passed gates. A failing engineering check or inconsistent dependency graph returns exit code 1. Exit zero means the coordinator completed its work, not that X1, pilot, or production was approved. Inspect the register's individual states.

`state.json` stores action receipts and history. Each dated run contains `blocker-register.json`, `input-binding.json`, `run.json`, `next-step.json`, `external-decisions.md`, `report.md`, and enterprise source snapshots. Source files and environment inputs affect the fingerprint, but environment values and auth storage contents are never printed or persisted. Original evidence reports, pending approval manifests, signed documents and database records are preserved.

Concurrent runs are blocked by `runner.lock`. The lock contains the runner PID and start time. After an interrupted process, verify that the named process has ended before deleting only that lock file. Do not delete the state or evidence to make a gate pass.

## Architecture and reuse

This is an internal repository CLI with a deterministic action registry. It adds no runtime service, database schema, application dashboard, scheduler, provider subscription, or general shell executor. Reports and provider payloads never supply executable commands.

The coordinator reuses `validateFinanceX1EvidenceManifest`, `buildEnterpriseBlockerStatus`, the existing X1 report orchestrator, existing contract tests, and the Playwright listing harness. The orchestrator gained a report-only `--no-write` option so fresh observations do not overwrite historical canonical reports, and an import guard so tests can inspect its pure approval validation without database access.

The existing graph `graphify-out/graph_actions.json`, community 9, contains `agents_agent_release_control_actions_preparecommandagentreleaseaction`, `agents_agent_release_control_actions_reviewcommandagentreleaseaction`, and `agents_agent_release_control_actions_activatecommandagentreleaseaction`. Current `services/agents/agent-release-control.service.ts` confirms distinct preparation, approval, provisioning, certification and activation operations. This development CLI does not invoke those operations; it remains usable while the production runtime is gated. The graph is a navigation aid dated August 9, not current execution evidence.

The source evaluation matrix maps X01/X02/X03/X04 and B01–B12 to Gate 017 and phase progression. Those source IDs remain intact. Finance X1 has its own product, authorization, provider, capture and review items. The provider integration is one automation path; existing direct human approval intake does not require a new provider subscription.

## Concrete engineering remediation

`validateApprovedPackage` previously compared expiry only with the decision timestamp. An already expired approval, a future decision, or an unparseable date could pass that comparison. Synchronization now rejects each of those cases against the current time. Eight focused tests cover the valid case, six invalid windows, and missing approval fields. Existing authority and three-record requirements remain enforced.

This correction does not claim that structural approval validation authenticates an external signer. Provider verification, revocation, authority scope, independent review, and real credentials remain outside what this local run proves.

## Scope of the first increment

The runner resolves missing local verification, stale observations, and decision-packet preparation through fixed actions. It does not autonomously patch arbitrary application defects, create provider records, send messages, capture authenticated release evidence, or perform production operations. It produces a concrete next engineering prompt where further work exceeds those actions. Once real approvals are supplied, the existing preflight/capture/gate commands remain the execution path after their external authority is verified.

The next development recommendation is selected only after current contracts pass and the browser matrix compiles. It proposes local X1 route/row-state and performance characterization before another normalization wave. Proposed budgets remain unapproved; historical timings are not p75 measurements. A fresh authenticated run still requires applicable fixture and browser authorization.

## Review lenses

| Lens | Finding |
|---|---|
| Platform architecture | Standalone repository CLI avoids a dependency on the gated production runtime. |
| Backend/integration | Fixed actions, bounded subprocesses, serialized ownership and persisted receipts prevent uncontrolled dispatch. |
| Data/migrations | No schema, seed, migration or business-data mutation. Read-only database observations expire. |
| Security/IAM/privacy | No inferred authority, secret values or external writes. Local simulation cannot become release evidence. |
| Frontend/design system | No UI changes; existing finance contract suites and capture harness are reused. |
| Workflow/accessibility/localization | Seven-route EN/FR desktop/tablet/mobile coverage is preserved; no accessibility certification claimed. |
| Product/business process | Development, evidence collection, pilot and production restrictions are recorded separately. |
| QA/release assurance | File hashes, source fingerprints, real test results and separate external review prevent status-only closure. |
| SRE/operations/cost | No new service or subscription; bounded retries and conservative cache invalidation. |
| SaaS packaging/customer operations | No module, entitlement, billing or customer-facing workflow changes. |
| Finance/OHADA/compliance | Existing approvals and accounting truth remain unchanged; expert sign-off stays external. |
| Audit/evidence governance | Historical source readiness is labeled and cannot authorize promotion. |
| AI/agent safety | Deterministic allowlist; report content is data, not executable instructions. |
| POS/inventory/offline | Not applicable to code changes; related release gates remain represented by source dependencies. |
| Purchasing/AP/payments | No business mutations; finance evidence coverage remains subject to existing service controls. |
| HRIS/payroll | Runtime proof is imported as historical source evidence; no payroll implementation changes. |
| Analytics | No metric or performance-budget acceptance inferred from local observations. |
| Change management/support | Repeatable CLI, run receipts and one consolidated external-decision handoff. |

## Focused verification

```powershell
node node_modules/jest/bin/jest.js --config=jest.payroll-trust-spine.config.cjs --roots scripts/__tests__ --runTestsByPath scripts/__tests__/development-progression-agent.test.js scripts/__tests__/x1-approval-automation-orchestrator.test.js --runInBand
```

Broader application build and production gates are not claimed by this CLI-only increment. See the dated execution report for actual command outcomes and outstanding restrictions.
