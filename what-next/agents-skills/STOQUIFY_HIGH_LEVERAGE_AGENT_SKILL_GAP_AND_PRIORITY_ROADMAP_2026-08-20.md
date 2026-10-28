# Stoquify High-Leverage Agent and Skill Gap & Priority Roadmap

**Audit date:** 2026-08-20  
**Decision type:** evidence-backed capability audit; no implementation or installation  
**Overall decision:** **CONDITIONAL GO — close and qualify the existing governed execution spine before adding product agents.**

## Executive verdict

Stoquify does not have a shortage of agent names or prompt assets. It has a conversion problem: a large, structurally valid portfolio of definitions and controls has not yet been converted into one production-qualified, measured, repeatable outcome loop.

The highest-leverage sequence is therefore:

1. qualify the existing runtime through behavioral evaluation and a narrow read-only pilot;
2. turn onboarding, connector trust, and current-truth control into deterministic foundations;
3. add document intake to accelerate those foundations;
4. only then introduce the two genuine specialist-agent gaps: receivables/collections and advisor collaboration.

The shortlist is capped at seven. It deliberately excludes a new general orchestrator, a second evaluation framework, autonomous accounting, payment, payroll, filing, access-control, or release agents.

## Stoquify north star

> Become the trusted, evidence-backed operating and financial control system and copilot for OHADA-region SMBs, turning tenant-scoped business truth into repeated daily outcomes, decisions, compliant proof, and permissioned collaboration—without autonomous regulated or financial action.

The best measurable expression already present in the repository is: monthly organizations completing at least three evidence-backed business outcomes across at least two Stoquify workflows, with no material trust-policy violation.

**Confidence: high.** The explicit strategy and agent-programme documents converge on controlled, evidence-backed operating outcomes. The root `README.md` is a stale generic RBAC description and is not treated as current product truth. The existing module catalog and application code support the broader accounting, inventory, POS, payroll, compliance, reconciliation, and operating-control interpretation.

## Evidence status vocabulary

- **Implemented and evidenced:** code or installed artifact exists and a bounded verification record supports the claim.
- **Implemented but not production-evidenced:** code or definition exists, but behavioral, operational, or release qualification is missing.
- **Partially implemented:** important substrate exists, but the end-to-end capability contract is not closed.
- **Designed only:** roadmap or definition exists without a qualified runtime outcome.
- **Duplicative/overlapping:** multiple assets claim materially similar orchestration or assurance responsibility.
- **Missing:** no adequate existing owner or implementation was found.

An installed skill or agent definition is a development-time capability. It is not proof that a corresponding in-product runtime is active, safe, or production-ready.

## Current capability inventory

| Layer | Evidence-backed state | Audit classification | Reuse decision |
|---|---|---|---|
| Global skill library | 441 global skill directories were inventoried; 111 are named `stoquify-*`, 110 `aqstoqflow-*`, and 38 use numbered programme naming | Large development-time portfolio; substantial overlap | Freeze broad expansion; rationalize and compose |
| Definition suite | 28 skills and 9 agent definitions; 37 capabilities and 22 contracts; installation validation reports 28/28 skills, 9/9 agents, and 70/70 schemas valid | Implemented as definitions; not production-evidenced | Reuse as the canonical role/control vocabulary |
| Evaluation catalog | 999 cases, 27 for each of 37 capabilities | Designed only: all cases are `NOT_TESTED` | Extend the existing harness to execute behavior; do not build another catalog |
| Evaluation harness | Existing harness deterministically selects the highest-risk 150 cases | Partially implemented: `PRIORITIZATION_READY_NOT_EXECUTED` | Improve it into a no-side-effect behavioral runner and evidence recorder |
| In-product agent runtime | Context, policy, tool registry, evidence, redaction, validation, runner, metrics, feedback, rollout, release-control, reconciler, governance, command, adapters, and Prisma run/evidence/cost/incident records exist | Partially implemented | Qualify this runtime; do not replace it |
| Command Agent | Narrow, read-only, provider-free Phase 2A boundary has prior passing evidence | Implemented but inactive/not production-evidenced | Use it as the first pilot slice |
| Phase 2B / Phase 3 | Latest decisions report Phase 2B `BLOCKED` at 2/23 checks and Phase 3 `BLOCKED` at 0/34 | Blocked | No promotion until human-controlled gates pass |
| External runtime readiness | 2026-08-16 snapshot reports 1/13 external inputs ready and 102 blockers | Blocked by authority, identities, secrets, owners, collectors, and statutory review | Resolve as a named human/operations prerequisite, not an agent |
| Top-12 candidate programme | C01/C02/C03 design-authorized; C08 has bounded development evidence; other candidates are prepare/delayed | Designed/partial; status register is dated 2026-08-03 | Reconcile into this seven-item shortlist |
| Application substrate | 19 product modules include accounting, close assurance, compliance, purchasing, payroll, finance, reconciliation, inventory, POS, analytics, and reports | Implemented substrate, not proof of each new capability | Build on domain services and source-linked controls |
| Architecture graph | Dated 2026-08-09 graphs show broad workflow substrate but a thin Agent Command UI community and no broad agent hook/route topology | Useful architectural aid, not current release truth | Direct source and newer status records take precedence |
| Programme truth | Recovery assessment found high artifact volume, overlapping workstreams, and a poor activity-to-release ratio | Duplicative/fragmented | Enforce one superseding status and WIP limit of two |

### Existing suite coverage by responsibility

- **Foundational controls S01–S12:** trusted context, permission/entitlement, evidence retrieval, safe planning, approval/step-up, idempotent execution, evidence recording, redaction, freshness/trust, exception priority, notification/escalation, and run state. Definitions are installed; end-to-end production qualification is not established.
- **Cross-cutting controls S13–S16:** model-cost routing, preference memory, offline awareness, and country-pack provenance. Definitions exist; active model-provider/cost routing and country-pack authority remain unresolved.
- **Read/analysis skills S17–S28:** daily brief, root cause, cash triage, reconciliation match, inventory, AP, close/compliance, payroll variance, and adoption. Definitions exist; they must inherit the qualified runtime and evidence boundary.
- **Nine installed agent roles:** Command; Exception and Action Orchestrator; Cash and Reconciliation; Inventory and Replenishment; Purchasing and AP; Close and Compliance; Platform Assurance; Customer Success and Adoption; Payroll and Workforce. They are definitions and responsibility boundaries, not evidence of production activation.
- **Top-12 candidates:** Collections, Document Intake, Advisor Collaboration, Forecasting, Omnichannel Communications, Controls/Fraud, Profitability/Pricing, Connector Health, Supplier Collaboration, Financing Readiness, Pipeline-to-Cash, and Job/Project Margin. Only the candidates retained below should consume near-term capacity.

## Capability taxonomy and authority boundary

| Type | Correct responsibility | Must not own |
|---|---|---|
| Development-time skill | Repeatable engineering/audit procedure, evidence collection, or bounded reasoning protocol | Product truth, production credentials, or release authority |
| In-product agent | Role-scoped analysis, prioritization, explanation, and approval-ready drafts over authorized evidence | Ledger posting, payment release, payroll approval, statutory filing, RBAC/entitlement change, or certification |
| Deterministic service | Identity, validation, policy enforcement, idempotency, reconciliation, execution, evidence retention, and immutable state transitions | Discretionary regulated judgment |
| Human process | Ownership, exception acceptance, segregation of duties, regulated review, financial approval, and release authorization | Unlogged side-channel changes |

## Ranked shortlist — maximum seven

The score is an equal-weight sum of ten dimensions, each scored 1–5. `normalized_score = sum(dimensions) / 50 × 100`. Dimensions are north-star impact, user value, dependency unlock, recurrence, risk reduction, time to value, feasibility, reuse, evidence readiness, and differentiation. Scores compare this shortlist; they are not financial forecasts.

| Rank | Capability | Correct form | Change type | Score | Why now |
|---:|---|---|---|---:|---|
| 1 | Runtime Qualification, Behavioral Evaluation & Read-Only Pilot Closure | Deterministic evaluation/evidence service + improved Platform Assurance role + human release process | Improve/compose existing | 46/50 | Unlocks every agent safely; converts 999 unexecuted cases and blocked promotion into evidence |
| 2 | Governed Onboarding, Migration & Adoption Control Plane | Deterministic import/reconciliation service + improved S28/Customer Success guidance | Improve/compose existing | 45/50 | Highest immediate commercial unlock identified by prior strategy; shortens time to trusted value |
| 3 | Connector Health & Data-Trust Control Plane | Deterministic connector registry/health service + Platform Assurance/Command presentation | Improve C08 | 45/50 | Prevents silent stale or incomplete evidence and is a prerequisite for onboarding and downstream agents |
| 4 | Canonical Current Truth & Outcome-Closure Discipline | Development skill + deterministic supersession index + human WIP/release process | Consolidate overlapping assets | 44/50 | Stops repeated rediscovery, stale claims, and broad unfinished workstreams |
| 5 | Mobile Document Intake & Evidence Capture | Deterministic ingestion pipeline + bounded extraction/classification skill | New bounded capability; not a new agent initially | 43/50 | Converts receipts, invoices, statements, and migration documents into governed evidence |
| 6 | Receivables & Collections Copilot | New specialist in-product agent over deterministic AR/communications services | New agent after foundations | 42/50 | Genuine daily cash-outcome gap not owned by the Cash/Reconciliation agent |
| 7 | Advisor Collaboration & Review Workspace | New role-scoped agent/workspace over deterministic sharing, comment, and approval services | New agent/workspace after foundations | 41/50 | Extends evidence-backed control to accountants/advisors without surrendering approval authority |

### Score detail

| ID | NS | User | Unlock | Repeat | Risk | TTV | Feasible | Reuse | Evidence | Diff | Total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| HC-01 | 5 | 4 | 5 | 5 | 5 | 4 | 4 | 5 | 5 | 4 | 46 |
| HC-02 | 5 | 5 | 5 | 5 | 5 | 4 | 3 | 5 | 4 | 4 | 45 |
| HC-03 | 5 | 4 | 5 | 5 | 5 | 4 | 4 | 5 | 4 | 4 | 45 |
| HC-04 | 5 | 3 | 5 | 5 | 4 | 5 | 5 | 5 | 4 | 3 | 44 |
| HC-05 | 5 | 5 | 4 | 5 | 4 | 4 | 3 | 5 | 4 | 4 | 43 |
| HC-06 | 5 | 5 | 3 | 5 | 4 | 4 | 3 | 4 | 4 | 5 | 42 |
| HC-07 | 5 | 5 | 4 | 4 | 5 | 3 | 3 | 4 | 3 | 5 | 41 |

## Top-three executable capability contracts

### HC-01 — Runtime Qualification, Behavioral Evaluation & Read-Only Pilot Closure

**Decision:** improve the current runtime, Top-12 harness, Platform Assurance responsibility, and human release process. Do not create another agent, agent framework, or evaluation catalog.

**Target users:** platform engineering, security, product owner, finance-control owner, SRE/operations, and designated pilot reviewers.

**Problem and north-star link:** Stoquify has definitions, cases, controls, and a read-only command slice, but no current behavioral proof across the 999-case catalog and no production authority. Closing this gap is the shortest defensible path from assets to repeated evidence-backed outcomes.

**Capability contract:** `stoquify.capability.runtime-qualification.v1`

- **Trigger:** a frozen candidate is proposed; a skill/agent/policy/tool/model/registry version changes; a scheduled assurance run is due; or a pilot incident invalidates evidence.
- **Required inputs:** `candidate_id`, immutable commit/release identity, environment identity, suite/registry/catalog hashes, policy and redaction versions, approved tool allowlist, tenant-safe fixtures, expected allow/deny outcome, and owner/approver identities.
- **Permitted tools:** read-only repository/runtime metadata, isolated evaluation executor, stubbed or sandboxed tool adapters, policy/redaction/output validators, run/evidence/cost stores, and existing release-gate readers.
- **Outputs:** immutable qualification bundle; per-case observed result; expected-versus-observed decision; evidence/provenance links; redaction and tenant-boundary findings; latency/cost totals; unresolved blockers; and one of `BLOCKED`, `QUALIFIED_FOR_READ_ONLY_PILOT`, or `PILOT_EVIDENCE_READY_FOR_HUMAN_RELEASE_REVIEW`.
- **Actions that always require humans:** production activation, Phase 2B/3 promotion, production credential or identity provisioning, exception/waiver acceptance, write-tool activation, release sign-off, and any regulated or financial action.
- **Trust boundary:** synthetic fixtures never become production evidence; retrieved content is untrusted; tenant, RBAC, entitlement, redaction, purpose, and freshness checks precede tool use; the evaluator cannot mutate product records or release state.
- **Audit requirements:** candidate and case IDs, hashes, timestamps, policy/model/tool versions, authorization context, tool trace, denial reason, evidence lineage, redaction outcome, latency/cost, reviewer identity, and supersession/invalidation record.
- **Failure modes:** selection mistaken for execution; stale candidate identity; hidden tool side effects; fixture leakage; cross-tenant access; redaction failure; flaky/non-repeatable outcomes; missing provenance; unbounded model cost; or release wording that implies certification.

**Acceptance gates:**

1. **RQ-1 behavioral slice:** the existing highest-risk 150 cases execute in an isolated no-side-effect environment; every case has expected and observed results, evidence, and deterministic pass/fail; zero unauthorized actions, cross-tenant disclosures, secret disclosures, or unredacted restricted evidence.
2. **RQ-2 full catalog:** all 999 cases move from `NOT_TESTED` to a dated observed status; every failure is owned, risk-ranked, and blocks or is explicitly human-waived; no aggregate-only pass claim.
3. **RQ-3 pilot:** the existing read-only Command Agent runs only for an explicitly approved cohort with kill switch, cost/latency telemetry, feedback, incident capture, and no mutation tools. Production activation remains a separate human decision.
4. **Release wording:** outputs state “qualified for [scope]” and never claim accounting, legal, tax, payroll, privacy, statutory, or release certification.

**Measurable outcome:** 999/999 cases have observed status; 100% of high-risk cases have evidence and allow/deny agreement or a named blocker; zero unauthorized side effects; zero critical tenant/redaction/secret failures; pilot cost, latency, helpfulness, abstention, and incident metrics are captured per run.

**Effort/cost:** planning estimate 4–7 engineering person-weeks plus external owner/credential/collector lead time; medium variable evaluation cost. This is not a commitment and must be re-estimated after RQ-1. Use deterministic validators before model-based grading and run the 150-case risk slice before the full catalog.

**Implementation start packet:**

- Existing entry points: `scripts/top12-evaluation-harness.js`, `scripts/__tests__/top12-evaluation-harness.test.js`, `docs/copilot/stoquify-agent-skill-definition-suite/evaluations/evaluation-catalog.json`, `services/agents/`, `actions/agents/`, the agent Prisma records, and the current phase/release status artifacts.
- First bounded issue: change the current harness contract from prioritization-only to isolated observed execution for the selected 150 cases. Preserve its deterministic selector and output paths, but add per-case observation, evidence, policy trace, side-effect assertion, and resumable run state.
- Done evidence: one immutable run manifest, one per-case result set, one human-readable exception report, tests for isolation/resume/tamper detection, and a human gate record. No new skill, TOML agent, or production activation is part of this issue.
- Stop conditions: absent immutable candidate identity; absent approved fixture boundary; any real write-capable adapter; any secret or employee/bank/provider-sensitive value in outputs; or unresolved P0/P1 tenant/RBAC/redaction failure.

### HC-02 — Governed Onboarding, Migration & Adoption Control Plane

**Decision:** implement the missing deterministic import/reconciliation lifecycle and improve the existing Adoption skill and Customer Success agent to guide it. Do not let an LLM write source-of-truth records directly.

**Target users:** SMB owner/administrator, implementation operator, accountant/advisor, data steward, and support/customer-success reviewer.

**Problem and north-star link:** prior strategy identifies onboarding and migration as the highest immediate commercial priority. Stoquify cannot compound daily outcomes if a tenant cannot reach trusted, reconciled starting data quickly.

**Capability contract:** `stoquify.capability.governed-onboarding.v1`

- **Trigger:** tenant creation, module enablement, legacy migration, bulk master-data import, opening-balance import, or a data-quality regression that requires a repair batch.
- **Required inputs:** tenant and module scope, actor/role/purpose, source manifest, schema/encoding, declared system of record, field mappings, country-pack/version where relevant, reconciliation controls, and approval policy. Source files are untrusted.
- **Permitted tools:** isolated parsers, malware/type/size checks, schema profiler, deterministic mapper, identity/deduplication service, validation and reconciliation engine, encrypted staging, exception queue, redaction, provenance store, and existing S01/S02/S03/S05/S06/S07/S08/S09/S12/S28 controls.
- **Outputs:** immutable source manifest; mapping confidence; draft import plan; row/value/count reconciliation; duplicates and exceptions; approval-ready batch; idempotency key; reversible commit reference; adoption checklist; and first-outcome evidence.
- **Actions that always require humans:** tenant/module/RBAC changes, ambiguous entity merge, opening-balance acceptance, GL/account mapping acceptance, destructive replacement, commit to source-of-truth records, exception waiver, and go-live approval.
- **Trust boundary:** staging is tenant-isolated; raw employee, bank, credential, and provider-sensitive values are not copied into prompts or reports; only least-privilege slices reach model-assisted classification; deterministic validation controls the write boundary.
- **Audit requirements:** source hash and custody, parser/mapping versions, actor and purpose, before/after counts and values, row-level disposition, approvals, idempotency/replay record, rollback reference, evidence links, and redacted error logs.
- **Failure modes:** cross-tenant staging, silent truncation, encoding/rounding drift, duplicate identity, stale country pack, model-suggested mapping treated as truth, partial commit, non-idempotent replay, or unowned exceptions.

**Acceptance gates:** tenant-isolation and malicious-file tests; deterministic replay produces the same result; repeated commit is idempotent; every source row is imported, rejected, or held with a reason; opening balances/counts reconcile exactly within declared currency/rounding policy; rollback is demonstrated; accessibility checks cover mapping, exception, and approval workflows; no raw restricted evidence appears in agent/model logs.

**Measurable outcome:** pilot tenants reach one reconciled source-of-truth dataset and one evidence-backed operating outcome within one business day of accepted source delivery; at least 80% of clean, supported-format rows are mapped without manual field editing; 100% of rows and control totals are accounted for; zero cross-tenant or unapproved commits.

**Effort/cost:** planning estimate 6–10 engineering person-weeks for a deliberately narrow first adapter and entity set; low-to-medium operating cost. Cost and schedule expand materially with each format, country, and domain, so the first pilot must freeze one source and one outcome.

**Sequencing:** HC-01 qualification boundary and HC-03 connector contract first; HC-04 current-truth discipline in parallel; begin with one structured source. HC-05 may later add unstructured documents without blocking the structured pilot.

### HC-03 — Connector Health & Data-Trust Control Plane

**Decision:** complete and operationalize C08 as a deterministic service surfaced through existing Platform Assurance and Command roles. Do not create a separate conversational connector agent.

**Target users:** operations/SRE, data owner, implementation operator, security, product owner, and downstream agent reviewers.

**Problem and north-star link:** every explanation, recommendation, migration, and collaboration flow fails if source data is stale, incomplete, duplicated, unauthorized, or silently disconnected.

**Capability contract:** `stoquify.capability.connector-data-trust.v1`

- **Trigger:** connector registration/change, scheduled heartbeat, credential expiry warning, schema drift, freshness/completeness threshold breach, failed replay, or a downstream evidence request.
- **Required inputs:** tenant-scoped connector ID, owner, source/purpose, data classification, credential reference (never value), schema/version, expected cadence, freshness and completeness SLAs, retry/replay policy, and dependent capability list.
- **Permitted tools:** connector inventory, health/freshness checks, schema diff, volume/control-total comparison, idempotent checkpoint/replay service, redacted telemetry, alert router, and existing evidence/run-state/release-control services.
- **Outputs:** trust state `TRUSTED`, `DEGRADED`, `STALE`, `BLOCKED`, or `UNKNOWN`; reason/evidence; last good checkpoint; impacted tenants/capabilities without restricted payload; recovery proposal; owner/SLA; and invalidation events for downstream evidence.
- **Actions that always require humans:** credential provisioning/rotation approval, connector enable/disable, destructive replay, source-of-record change, threshold waiver, failover promotion, and release acceptance.
- **Trust boundary:** agents receive credential references and redacted health facts only; connector data remains tenant-scoped; external payloads are untrusted; health success does not certify semantic correctness or statutory compliance.
- **Audit requirements:** connector/config versions, owner, credential-reference age, heartbeat/schema/freshness/control-total outcomes, checkpoint/replay IDs, alerts/acknowledgements, downstream invalidations, approvals, and recovery evidence.
- **Failure modes:** false-green heartbeat, silent partial ingestion, schema drift, credential leakage, retry storm, duplicate replay, missing invalidation, tenant mix-up, or stale trust state reused downstream.

**Acceptance gates:** 100% of pilot-critical connectors registered with owner/classification/SLA; deterministic tests cover heartbeat, schema drift, freshness, completeness, credential-expiry reference, retry, idempotent replay, and downstream invalidation; zero credentials or provider-sensitive payloads in evidence; every degraded state reaches an owner and prevents unsupported downstream claims.

**Measurable outcome:** all pilot evidence links resolve to a connector trust state and last-good checkpoint; silent test failures are detected within the declared SLA; recovery replay has zero duplicates; degraded/stale inputs cause abstention or qualification in every dependent agent output.

**Effort/cost:** planning estimate 4–7 engineering person-weeks to operationalize the existing C08 service for the pilot connector set; low steady-state compute, with telemetry/storage cost measured before expansion.

**Sequencing:** HC-01 first. HC-03 and HC-04 are the maximum two active foundation streams after the behavioral slice. HC-02, HC-05, HC-06, and HC-07 consume the trust state rather than inventing their own freshness logic.

## Remaining four capability briefs

### HC-04 — Canonical Current Truth & Outcome-Closure Discipline

- **Form:** development-time skill plus deterministic supersession/index file and a human WIP/release process; no in-product agent.
- **Reuse:** consolidate the execution-suite/program-orchestrator variants, release evidence, status registers, S03/S07/S09/S12/S18, and the existing recovery-roadmap rules.
- **Users/triggers:** programme owner and implementation agent whenever work starts, evidence changes, a gate runs, or a new report would be created.
- **Inputs/outputs:** immutable candidate and evidence IDs in; one current status, superseded-artifact links, open blockers, next executable issue, acceptance evidence, and stop decision out.
- **Human gates:** priority change, waiver, release decision, WIP-limit exception, and archival/supersession policy.
- **Acceptance:** one canonical current record per programme; every older record is linked or explicitly unresolved; WIP never exceeds two without named approval; a recommendation cannot be marked done without referenced evidence.
- **Metric/cost:** reduce strategy rediscovery and contradictory active reports to zero in the pilot programme; 2–4 person-weeks; low operating cost.

### HC-05 — Mobile Document Intake & Evidence Capture

- **Form:** deterministic ingestion/quarantine pipeline with a bounded OCR/extraction/classification skill; no autonomous posting agent.
- **Reuse:** S02/S03/S05/S07/S08/S09/S12, onboarding staging, AP/reconciliation/close evidence models, and existing source-linked controls.
- **Users/triggers:** owner, cashier, purchaser, employee, accountant, or advisor submits a receipt, invoice, statement, contract, or migration document from an authorized channel.
- **Outputs:** quarantined object, content hash, safe preview, extracted draft fields with confidence, classification, duplicate signal, tenant/purpose metadata, exception queue, and evidence link.
- **Human gates:** classification/field correction for low confidence, link to business record, accounting/tax treatment, employee/bank-data disclosure, retention exception, and deletion.
- **Acceptance:** malicious and unsupported files fail safely; duplicate detection and tenant isolation pass; restricted fields are redacted from model/log views; extraction never posts or certifies; provenance survives every transformation.
- **Metric/cost:** supported pilot documents become review-ready within two minutes at the declared service level, with 100% custody/provenance coverage and zero unauthorized writes; 6–10 person-weeks; medium OCR/model/storage cost.

### HC-06 — Receivables & Collections Copilot

- **Form:** genuine new specialist in-product agent over deterministic receivables, consent, template, delivery, and payment-status services.
- **Reuse:** Cash/Reconciliation agent, S01–S13, customer master data, invoice/payment evidence, approval/notification controls, and connector trust.
- **Users/triggers:** owner, finance operator, or collections reviewer requests a daily queue; invoice ages or a promise/payment status changes.
- **Outputs:** evidence-backed priority queue, reason, customer context, dispute/consent status, cash-impact range, and human-editable outreach draft. It may record an approved task, never release payment or post accounting.
- **Human gates:** customer contact, settlement/discount, legal escalation, write-off, credit hold, ledger posting, and any communication using sensitive data.
- **Acceptance:** every item ties to source invoice/payment evidence; disputed or consent-blocked accounts are excluded or flagged; no harassment or unsupported legal language; action and approver are logged; tenant/RBAC/entitlement tests pass.
- **Metric/cost:** improve time-to-first-follow-up and overdue-cash conversion in a controlled pilot without increased dispute/complaint rate; 8–12 person-weeks after foundations; medium communication/model cost. Baseline and target require pilot data.

### HC-07 — Advisor Collaboration & Review Workspace

- **Form:** genuine new role-scoped agent/workspace over deterministic invitation, disclosure, comment, task, approval, and evidence-sharing services.
- **Reuse:** accountant portal/data-trust assets, S01–S12/S16/S18/S25/S26, Command and Close/Compliance agents, RBAC/module entitlement, redaction, and audit logs.
- **Users/triggers:** tenant invites an accountant/advisor for a purpose-limited period; a close, compliance, migration, or exception pack is ready for review.
- **Outputs:** scoped review pack, evidence-linked questions, comments, requested corrections, approval-ready response, expiry, and full disclosure log. Advice is labelled as advice, not certification.
- **Human gates:** invitation/role/scope, sensitive disclosure, correction approval, close/sign-off, filing, access revocation, and acceptance of advisor conclusions.
- **Acceptance:** purpose/expiry/tenant/role boundaries pass; segregation of duties prevents self-approval; every disclosure and review action is logged and redactable; revoked access stops immediately; inaccessible chat-only flows are rejected.
- **Metric/cost:** reduce review turnaround and evidence-chasing while preserving zero unauthorized disclosure or self-approval; 8–12 person-weeks after foundations; medium collaboration/storage/model cost. Targets require baseline measurement.

## Rationalization decisions

1. **No new general orchestrator.** Existing execution-suite, programme-orchestrator, exception/action, leadership, and release-gate assets overlap. HC-04 must give them one responsibility map and current-truth record.
2. **No second evaluation catalog or harness.** Extend `scripts/top12-evaluation-harness.js` and its 999-case source; its present result is prioritization, not behavioral qualification.
3. **No standalone connector-health chat agent.** Health, replay, invalidation, and trust state are deterministic service concerns. Existing Platform Assurance and Command roles can present them.
4. **No autonomous document agent.** Ingestion, custody, quarantine, redaction, and linking require deterministic controls; model extraction remains a draft.
5. **No new close, compliance, payroll, AP, inventory, reconciliation, or command agent.** Those responsibility boundaries already exist in the installed nine-agent suite.
6. **Delay forecasting, omnichannel communications, continuous-controls/fraud, pricing, supplier collaboration, financing readiness, pipeline-to-cash, and project margin.** They remain plausible later candidates but do not outrank runtime closure, onboarding, connector trust, evidence intake, collections, or advisor review now.
7. **Do not encode country-pack authority as an agent.** Named qualified reviewers, provenance, effective dates, and human approvals are a governance process and deterministic policy boundary.

## Dependency DAG and sequencing

```text
Human prerequisites: candidate identity, owners, identities/secrets, collectors,
                     pilot authority, statutory reviewers
                                  |
                                HC-01
                         /          |          \
                      HC-03       HC-04      read-only pilot
                       |  \        / |
                       |   \      /  |
                       |    HC-05   |
                       |      \     |
                       +-------HC-02
                              /    \
                           HC-06  HC-07
```

Machine-readable edges are in the companion JSON. HC-05 is optional for the first structured-source HC-02 pilot, but becomes a prerequisite when onboarding uses unstructured documents.

### Staged roadmap

| Stage | WIP | Deliverable | Entry gate | Exit/production gate |
|---|---:|---|---|---|
| 0 — authority and freeze | 1 | Immutable candidate, owners, fixture boundary, current evidence set | Named human owners and safe test scope | No unresolved candidate identity or fixture-boundary blocker |
| 1 — prove the spine | 1 | HC-01 RQ-1 highest-risk 150 observed cases | Stage 0 complete | Zero unauthorized side effects or critical tenant/redaction/secret failures |
| 2 — trust foundations | 2 | HC-03 pilot connector set and HC-04 canonical current truth | RQ-1 passes | Every downstream claim consumes current trust state; one active status per programme |
| 3 — reach first value | 2 | HC-02 one-source/one-outcome pilot; HC-05 bounded intake if needed | Stages 1–2 pass; human pilot authority | Exact reconciliation, reversible/idempotent commit, safe custody, accessible review |
| 4 — add outcome agents | 1, then 1 | HC-06 controlled collections pilot, then HC-07 advisor review | Runtime, connectors, current truth, consent/RBAC/evidence gates pass | Human approvals, metrics, incident/kill-switch evidence, no prohibited action |
| 5 — broaden only from evidence | ≤2 | Full 999 execution and evidence-led expansion | Pilot metrics and risk review | Separate human production decision for each scope |

## Shared controls and production gates

Every retained capability must inherit the same contracts rather than duplicating them:

- tenant, actor, role, purpose, module-entitlement, and data-classification context;
- least-privilege tool registry and explicit prohibited-action rules;
- evidence freshness, provenance, supersession, and downstream invalidation;
- redaction before prompts, logs, notifications, exports, and reviewer views;
- idempotency, replay, retry budgets, partial-failure handling, and durable run state;
- model/provider/version, token/cost/latency, abstention, and fallback telemetry;
- maker-checker separation and step-up approval where impact warrants it;
- accessible non-chat review, exception, correction, and approval surfaces;
- scoped release candidate, rollback/kill switch, incident owner, and human activation decision.

Passing technical tests is necessary but insufficient. Regulated decisions, financial approvals, production release, access changes, statutory review, and sensitive disclosure remain human-controlled.

## Costs, risks, and stop conditions

Person-week estimates are low-confidence planning ranges derived from scope, not measured velocity or commercial quotes. The repository has no reliable current cost ledger or team-capacity baseline, so monetary estimates would be false precision.

Programme stop conditions:

- a new broad agent/skill catalog is proposed before HC-01 closure;
- a recommendation requires bypassing tenant/RBAC/entitlement/redaction controls;
- production credentials, employee/bank/provider-sensitive evidence, or secrets would enter prompts or reports;
- a model output would post, pay, approve payroll, file, change access, or certify;
- an older report is cited as current without candidate/date/supersession checks;
- WIP exceeds two or an initiative lacks an owner, acceptance evidence, rollback, and measurable outcome;
- behavioral evaluation is represented as complete when only selection, schema validation, mocks, or fixture generation ran.

## Skeptical reviewer findings

These are reviewer lenses applied during this audit, not independent professional certifications.

- **Release/security lens:** disagrees with starting a new product agent first. The latest evidence still lacks candidate identity, production environment/identity/secrets, operational owners, collectors, and human activation authority. Recommendation: HC-01 first and remain blocked by default.
- **Product/commercial lens:** would put HC-02 first because onboarding is the largest immediate user-value unlock. Reconciliation: HC-02 is the first product capability, but HC-01 is the first implementation sequence because it supplies the safe execution and proof boundary.
- **Controller/accounting lens:** accepts HC-06 only as prioritization and draft outreach. Settlement, write-off, posting, cash application, payment release, and accounting/tax conclusions stay outside the agent boundary.
- **Platform lens:** rejects a new orchestrator and a second evaluator because both duplicate strong existing assets. Consolidation and behavioral execution have higher leverage.
- **Operations/cost lens:** rejects running all 999 cases through expensive model grading immediately. Use deterministic checks first, execute the risk-ranked 150, measure unit cost, then complete the catalog.
- **UX/accessibility lens:** rejects chat-only onboarding, document review, exceptions, and approvals. Every material workflow needs a structured, keyboard/screen-reader-usable surface and clear empty/loading/error/denied/stale states.

## Unsupported assumptions, disagreements, and evidence gaps

1. The north-star wording is synthesized; the measurable outcome sentence is explicit in the Top-12 roadmap, but no single current canonical product charter was found.
2. The root `README.md` conflicts with later strategy/module evidence and appears stale. This audit does not modify it.
3. The definition-suite manifest says source candidate/not production-certified, while a later installation report proves local installation. Installation does not resolve production qualification.
4. The Top-12 programme status is dated 2026-08-03; it is used as candidate history, not current release truth.
5. Architecture graphs are dated 2026-08-09 and the worktree has changed since; graph claims are structural hints only.
6. Current team capacity, model vendors, token/unit economics, supported migration formats, target countries, named statutory reviewers, pilot tenants, and outcome baselines are unresolved.
7. The 80% onboarding mapping and one-business-day target are proposed pilot targets, not observed performance.
8. Collections and advisor-collaboration outcome improvements require baselines before numeric targets can be committed.
9. Existing local worktree changes are extensive and may contain newer unfinished implementations. This audit did not treat unverified dirty changes as production evidence and did not overwrite them.

## Verification record for this audit

| Check | Result | Reason/evidence |
|---|---|---|
| Repository and capability evidence inventory | PASS | Direct source/status/report inspection; global and local skill/agent counts reconciled |
| Shortlist limit | PASS | Exactly seven retained capabilities |
| Type/authority distinction | PASS | Each recommendation is explicitly a skill, agent, deterministic service, human process, or composition |
| Top-three executable contracts | PASS | Trigger, inputs, tools, outputs, human gates, trust/audit/failure/acceptance/metrics/effort are stated |
| Reuse-before-new | PASS | Four improve/consolidate existing assets; one new bounded service/skill reuses the control spine; only two are genuine future specialist agents |
| Risk-control coverage | PASS by design | Contracts preserve tenant isolation, RBAC, entitlement, audit, redaction, SoD, and human regulated authority |
| Source-suite validator | SKIPPED | Its script rewrites validation/completion reports; this audit is non-mutating and the worktree is dirty |
| `npm run policy:gates` / release gates | SKIPPED | No runtime code changed; several gates write canonical reports and require external runtime inputs |
| `npm run workflow:assurance:runtime-check` | SKIPPED | No workflow-assurance runtime change; audit relies on recorded status and does not claim live deployment readiness |
| JSON parse, score arithmetic, DAG acyclicity, artifact paths, and diff scope | Recorded in companion JSON | Performed after artifact creation |

## Primary evidence map

- `services/modules/module-catalog.service.ts`
- `services/agents/`, `actions/agents/`, and agent-related Prisma models
- `docs/copilot/stoquify-agent-skill-definition-suite/manifest.md`
- `docs/copilot/stoquify-agent-skill-definition-suite/reports/installation-validation-report.md`
- `docs/copilot/stoquify-agent-skill-definition-suite/reports/validation-report.md`
- `docs/copilot/stoquify-agent-skill-definition-suite/reports/post-installation-next-steps.md`
- `docs/copilot/stoquify-agent-skill-definition-suite/reports/unresolved-questions.md`
- `docs/copilot/stoquify-agent-skill-definition-suite/evaluations/evaluation-catalog.json`
- `docs/stoquify-skills-agents/STOQUIFY_TOP_12_ADDITIVE_AGENTS_AND_SKILLS_RESEARCH_REPORT_2026-08-02.md`
- `docs/stoquify-skills-agents/STOQUIFY_TOP_12_AGENTS_SKILLS_COMPLETE_EXECUTION_ROADMAP_2026-08-02.md`
- `docs/stoquify-skills-agents/execution/top12-programme-status.json`
- `docs/stoquify-skills-agents/execution/top12-evaluation-harness-report-2026-08-02.md`
- `what-next/stoquify-five-vital-capabilities-strategy-review-2026-08-14.md`
- `what-next/platform-progress-recovery-assessment-2026-08-10.md`
- `what-next/enterprise-release-blocker-status.json`
- `what-next/STOQUIFY_AGENT_RUNTIME_EXTERNAL_INPUT_READINESS_LIVE.json`
- `graphify-out/GRAPH_REPORT_components.md`, `GRAPH_REPORT_actions.md`, `GRAPH_REPORT_app.md`, `GRAPH_REPORT_hooks.md`, and `GRAPH_REPORT_types.md`

## Final recommendation

Start HC-01 with the bounded RQ-1 issue above. Do not spend the next implementation run naming or installing another agent. Convert the existing highest-risk 150 cases from prioritized fixtures into isolated observed behavior, publish the immutable evidence bundle, and let its failures determine the next code changes. In parallel only after that gate, permit at most two foundation streams: HC-03 connector trust and HC-04 current-truth closure. HC-02 is the first product pilot those foundations should serve.
