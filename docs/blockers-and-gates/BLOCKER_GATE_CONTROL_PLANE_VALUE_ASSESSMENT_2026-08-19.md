# Stoquify Blocker and Gate Control Plane — value assessment

Prepared: 2026-08-19  
Assessment type: evidence-first technical, professional, operational and commercial value review  
Decision class: investment guidance, not implementation or release authorization  
Recommended decision: **BUILD_G1_PILOT_ONLY**  
Confidence: **medium-high for technical feasibility; medium for economic value**

## Executive decision

Stoquify should build a narrow G1 approval-and-evidence pilot as an additive extension of the existing Workflow Assurance module. It should **not** authorize a platform-wide control-plane rollout, a standalone microservice, or a home-grown legal e-signature platform yet.

The technical case is strong because the repository already contains most of the expensive foundations: tenant-aware authorization, fresh authentication, assurance definitions and runs, incidents, alerts, waivers, business events/outbox, evidence services, domain sign-off patterns and a control-tower UI. The missing capability is specific: authoritative governance appointments, versioned decision obligations, authenticated approvals, immutable evidence envelopes, independent verification and a verified handoff to gates.

The economic case is not yet proven. Stoquify has many gate and evidence artifacts, and the current release reports show substantial coordination and evidence friction, but the repository does not contain verified gate volumes, labor rates, approval turnaround times, audit costs, incident losses, sales impact or customer willingness to pay. A full investment would therefore be based on unverified assumptions. The G1 pilot is worthwhile because it solves a real blocked workflow while measuring whether the reusable platform value is large enough to justify expansion.

This assessment does not make G1 pass. Live checks on 2026-08-19 still show 13/13 technical checks, 0/11 approved decisions and 0/10 POS gates passed. Production authorization remains false.

## Plain-language explanation

Today Stoquify has many inspectors and checklists, but no single trusted desk that can answer all of these questions together:

- What exact file or system record is being approved?
- Has it changed since review began?
- Which formal roles must decide?
- Which real people currently hold those roles?
- Did each person deliberately approve after recently proving control of their account?
- Can another process independently verify the evidence?
- Which blocker owns the next action, and which later gates must wait?

The proposed module would become that desk. It would collect objective facts, route work, protect approvals, preserve evidence and explain blockers. It would not appoint people, make business judgments, accept risk, or sign on anyone's behalf.

## Verified current baseline

| Item | Verified state | Meaning |
| --- | --- | --- |
| G1 contract | SHA-256 `11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db` | The exact frozen content is reproducible. |
| G1 technical checks | 13/13 pass | The technical contract is ready for accountable review. |
| G1 decisions | 0/11 approved | No decision currently has authentic approval credit. |
| G1 role obligations | 33 required | Each of D-01 through D-11 requires three role decisions. |
| POS program | 0/10 gates; G1 first | Later gates are correctly dependency-blocked. |
| G1 approval register | `OPEN_NO_APPROVALS` | The detached register contains no live approvals. |
| Existing DOCX | Two handwritten-like images; zero approval credit | Images are not bound to trusted identity, authority, fresh authentication, intent or the contract hash. |
| Enterprise blockers report | 3/12 ready; 9 open | The wider platform has material external, governance and evidence work beyond G1. |
| Repository gate surface | 55 gate/readiness/preflight scripts by filename classification | There is a substantial control surface, although the count does not prove that all scripts are duplicates or frequently run. |
| Evidence/report surface | 441 JSON/SHA-256 artifacts matching gate/evidence/approval/readiness/manifest classifications | Evidence is extensive and fragmented; the count alone does not measure operational cost. |
| Schema and type safety | `prisma:validate` and `typecheck` pass | The current worktree is technically valid at these boundaries. |
| Focused G1 tests | 2 suites, 4 tests pass | Current fail-closed gate behavior is covered by the focused tests. |

Evidence date matters: the repository has unrelated, uncommitted user work. This assessment did not modify or treat that work as a release candidate.

## Exactly what would be built

### Reuse without replacement

- `requireFreshAuth()` and session-assurance claims for recent account verification.
- `protect()` for server-side permission, tenant, entitlement and fresh-auth checks.
- Workflow Assurance definitions, runs, findings, incidents, events, waivers, alerts and control-tower UI.
- Business event/outbox idempotency and payload hashing.
- Evidence grading, redaction and proof-trail services.
- Domain sign-off and maker-checker patterns, especially branch daily close.
- Existing module entitlement, audit logging, scheduler and notification infrastructure.

### Extend

- Assurance source types and evidence subjects to include artifacts, approvals, policies, verification and gates.
- Control Tower with approval inbox, authority workbench, artifact view and verification queue.
- Existing incident lifecycle with blocker owners, evidence freshness and permitted next actions.
- Existing waiver rules with artifact/policy binding and policy-specific separation of duties.
- Hashing utilities behind one versioned canonicalization contract.

### Build new

- Authority and bounded delegation registry using stable user IDs and appointment provenance.
- Artifact registry with immutable versions and canonical SHA-256 profiles.
- Versioned decision and approval-policy catalog.
- Approval requests expanded into unique role obligations.
- Explicit approve/reject actions protected by fresh authentication and authority checks.
- Authentication-attestation snapshots containing no authentication secrets.
- Append-oriented evidence envelopes bound to artifact, policy, option, actor, authority and time.
- Independent verification records and deterministic reason codes.
- Persistent gate definitions, dependency manifests, runs and invalidation after the G1 pilot proves parity.
- Provider-neutral external-signature adapter only if a policy needs portable legal-signature evidence.

### Keep domain-owned

- POS sale, tender, shift, drawer and receipt truth.
- Ledger postings, accounting periods and close certification.
- Inventory movements, valuation and write-off decisions.
- Payroll calculations, employee records and compensation logic.
- Payment-provider, bank, settlement and reconciliation truth.
- Country-pack statutory rules and qualified professional conclusions.
- CI/CD deployment and infrastructure-provider truth.

### Human governance that code cannot replace

- Appointing authority holders and validating their appointment source.
- Confirming qualifications and jurisdictional scope.
- Choosing among business options and recording deliberate approval or rejection.
- Accepting residual risk or approving a waiver.
- Performing independent human review where policy requires it.
- Determining legal enforceability or statutory sufficiency.

## Tangible technical value

| Current problem and repository evidence | Proposed capability | Measurable improvement | Dependency / downside |
| --- | --- | --- | --- |
| Gate logic and evidence formats are spread across dozens of scripts and hundreds of artifacts. | Common policy, evidence-envelope and verifier contracts while retaining domain adapters. | Fewer bespoke approval parsers; percentage of gates using the common manifest; maintenance hours per policy change. | A bad common contract can spread failure; version and stage it. |
| Paths, names and hashes are repeatedly copied into templates and reports. | Registered artifact IDs, stable actor IDs and server-computed hashes. | Manual preparation minutes per run; path/hash mismatch rate. | Registry stewardship becomes a new operational duty. |
| Hashing exists in many files under different use cases. | Versioned canonicalization profiles with golden vectors. | Independent digest match rate; drift detection latency. | Canonicalization mistakes invalidate valid work or accept ambiguous representations. |
| Detached approvals can be replayed against changed content. | Artifact, policy, option, authority and authentication binding in every envelope. | Replay attempts rejected; invalidations correctly propagated. | Reapproval is intentionally required after material change. |
| Application RBAC cannot prove governance authority. | Separate authority assignments with provenance, scope and dates. | Percentage of obligations routed to confirmed authority; authority-conflict rate. | Stale authority data can block legitimate work. |
| Fresh authentication exists but is not generalized for G1 approvals. | Reuse five-minute fresh-auth checks in protected approval actions. | Stale-auth rejection rate; successful recovery time. | Adds friction and recovery/support needs. |
| Strong sign-off patterns exist in separate domains. | Shared approval state machine and evidence contract. | Reduction in copied approval logic; consistency of SoD tests. | Premature abstraction could erase domain differences. |
| Historical reports can disagree with live checks. | Supersession and input-manifest digests. | Stale-report detection; percentage of displayed results with current inputs. | More lifecycle states and user education are required. |
| Gate dependencies are represented in scripts. | Versioned acyclic dependency graph and `NOT_EVALUATED` state. | Incorrect downstream pass count must remain zero; evaluation trace completeness. | Persistent graph errors can block several domains. |
| Blocker lists often require technical interpretation. | Structured incidents with owner, reason, source digest and next action. | Time to owner assignment; median blocker age; support explanation time. | Poorly governed routing can create notification noise. |
| Evidence producer and checker can be conflated. | Independent verifier class and policy-enforced actor separation. | Producer/verifier conflict rejection; verification lag. | Requires staffing and operational capacity for checker queues. |
| Business events/outbox already protect integrations. | Emit approval, invalidation and gate events through the same pattern. | Lost-event reconciliation count; duplicate-event rejection. | The outbox and worker become more operationally critical. |
| UI can never be the only enforcement boundary. | All decisions enforced in protected actions/services; UI is a projection. | Direct-call negative tests; cross-tenant denials. | More backend contract work than a simple workflow screen. |

### Technical-value conclusion

The strongest value is not “electronic signatures.” It is deterministic evidence binding and reuse of one control model across a fragmented gate surface. The main technical downside is concentration risk: a flawed central policy, canonicalizer or invalidation engine could affect many modules. That risk supports a G1-only observe-mode rollout with domain-owned fail-closed checks retained.

## Professional and operational value

### Daily-work impact

| Role | Better daily experience | New responsibility or cost |
| --- | --- | --- |
| Product owners | One queue shows the exact decision, consequences and missing roles. | They must make explicit decisions and keep product authority current. |
| Financial controllers | Exact-hash evidence, SoD and accounting-role obligations are visible. | More deliberate review; cannot rely on informal email or a signature image. |
| Security owners | Fresh authentication, authority provenance and denial telemetry are centralized. | Must approve assurance policy, recovery and privileged access. |
| Operations/SRE | Structured blocker queues, alerts, retry state and runbooks replace report archaeology. | Operates another critical workflow and verifier backlog. |
| Accountants/qualified reviewers | Evidence and source hashes arrive in a review-ready packet. | Qualification status and jurisdictional scope require stewardship. |
| Developers/release managers | Common manifest and reason codes reduce one-off evidence plumbing. | Must maintain adapters and preserve exact domain semantics. |
| Auditors | Reproducible evidence envelopes, supersession and verification histories improve traceability. | Must understand evidence classes and cannot treat system output as automatic certification. |
| Tenant administrators | Authority and delegations become explicit and time-bounded. | Must prevent stale or conflicting assignments. |
| Customer success/support | A plain-language next action can be explained without reading raw JSON. | Needs training, support playbooks and privacy-aware evidence access. |

### Professional outcomes and metrics

- Accountability: measure percentage of blockers with one named authority owner and an SLA.
- Approval turnaround: measure median and p95 obligation age, excluding deliberately paused work.
- Blocker resolution: measure time from evidence change to verified rerun.
- Audit preparation: measure hours to produce and independently verify a sample evidence pack.
- Evidence completeness: measure obligations passing all identity, authority, authentication, artifact, policy and SoD checks.
- Release discipline: measure prevented stale-artifact or stale-policy approvals.
- Incident investigation: measure time to reconstruct actor, source, decision and dependency history.
- Onboarding: measure time for a new operator to resolve a simulated G1 blocker using documented procedures.
- Communication: measure support contacts needed to explain a gate status.
- Management visibility: measure percentage of material gates represented with current input manifests.

These metrics describe process health. They must not become individual approver productivity rankings.

## Product and commercial value

### Plausible value propositions

- Enterprise procurement: demonstrate tenant isolation, maker-checker, fresh authentication, traceable evidence and deterministic invalidation.
- Auditability: offer verifiable evidence exports and control histories as a product differentiator.
- Regulated and multi-entity operations: apply organization-specific authorities and policy versions without merging domain truth.
- Partner workflows: give authorized accountants, reviewers and auditors bounded queues and redacted evidence access.
- AI-assisted operations: allow agents to collect and explain evidence while technically prohibiting them from satisfying human obligations.
- Implementation services: configure authority, policies, adapters and evidence retention for enterprise customers.

### Packaging alternatives

| Package | Suitable content | Caution |
| --- | --- | --- |
| Included platform control | Basic fail-closed gate state, audit receipt and read-only evidence status. | Core safety controls should not be paywalled in a way that weakens security. |
| Paid Assurance/Controls module | Authority administration, advanced workflows, evidence exports, cross-domain control tower and policy analytics. | Requires customer discovery and support maturity. |
| Enterprise-only | SSO/strong assurance, complex SoD, external auditors, retention controls and custom adapters. | May slow learning if only large customers can test it. |
| Usage/workflow pricing | External signature envelopes, high-volume evidence processing or premium storage. | Avoid charging for necessary internal safety checks or creating incentives to bypass controls. |
| Professional services | Policy mapping, adapter implementation, migration, reviewer training and control design. | Services must not claim statutory or legal certification outside qualified scope. |
| External-signature add-on | Provider envelope creation, webhook verification and signed audit artifacts. | Vendor fees, residency, lock-in and provider outage remain. |

### Commercial evidence still required

Do not book revenue or claim willingness to pay from this assessment. Before commercial packaging, obtain:

1. 8–12 interviews across target controllers, operators, auditors, implementers and buyers.
2. At least three documented procurement or assurance questionnaires where the capability changes an outcome.
3. Pricing tests for included, paid module and enterprise bundle positions.
4. Measured onboarding/support effort for one G1 pilot and one second-domain pilot.
5. Evidence of repeated customer need, not only internal release-governance need.
6. Qualified legal/privacy review for markets where external signatures or employee evidence are processed.

## Full advantages

- Reuses a substantial existing platform foundation.
- Removes repeated manual hash, path and obligation assembly.
- Makes authority distinct from ordinary application access.
- Provides a defensible fresh-authenticated internal approval record.
- Rejects stale, replayed, cross-tenant or self-certified evidence.
- Preserves history through supersession rather than destructive edits.
- Produces understandable blockers and deterministic next actions.
- Supports EN/FR accessible workflow patterns.
- Gives auditors and enterprise customers a clearer evidence model.
- Establishes a safe human-approval boundary for AI agents.
- Keeps external e-signature integration optional and provider-neutral.
- Can become a reusable Controls/Assurance capability if the pilot proves adoption.

## Full disadvantages and costs

- Requires governance ownership that software cannot supply.
- Creates new sensitive identity, authority and evidence data.
- Adds schema, service, UI, worker, retention, backup and recovery complexity.
- Concentrates risk in common policy, hashing and invalidation code.
- Fresh authentication and strict reapproval add user friction.
- Incorrect authority data can block work or route it to the wrong person.
- Evidence retention and exports increase privacy and breach impact.
- Independent verification requires real operational separation and staffing.
- Domain teams must build and maintain adapters.
- Full platform ROI is not proven by repository data.
- External signature providers add variable fees, lock-in, data-residency and outage exposure.
- A broad rollout can distract engineering from product and customer work.
- The control plane can create false confidence if users mistake a completed workflow for legal, statutory or accounting certification.

## External option evidence

External products can accelerate generic routing or legally portable signatures, but they do not eliminate Stoquify's need to bind approvals to domain-owned artifacts, tenant-safe authority, gate dependencies and invalidation rules.

- Microsoft documents generic document/process approval flows, multiple approvers and inbox/approval-center interaction. Its own tutorial states that security is outside that tutorial's scope, so Stoquify would still need its security and domain-control boundary. [Microsoft Power Automate approvals](https://learn.microsoft.com/en-us/power-automate/modern-approvals)
- Adobe describes Acrobat Sign Solutions as supporting advanced signer authentication, enterprise integration, compliance features and workflow automation; enterprise pricing requires sales contact. This is useful for an optional signature boundary, not a replacement for Stoquify gate semantics. [Adobe business e-signature plans](https://www.adobe.com/acrobat/business/pricing-plans.html)
- Docusign's current public plans include audit trails and usage limits, with enhanced organization/SSO plans and identity verification as an add-on. Public list prices and allowances change by locale and contract, so a real TCO needs a quote. [Docusign plans and pricing](https://ecom.docusign.com/plans-and-pricing/esignature)
- WebAuthn supports strong scoped public-key authentication and can require user verification for sensitive operations, but user verification still does not appoint a governance role or express approval intent. [W3C WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/)

## Multidisciplinary review board findings

| Reviewer | Material finding / recommendation |
| --- | --- |
| Enterprise/platform architecture | Build inside Workflow Assurance first; preserve ports that permit later extraction. |
| Backend/domain/integration | Use transactional approval writes, idempotency and bounded evidence adapters. |
| Data/database/migration | Add append-oriented tenant-safe models; never backfill handwriting as approval. |
| Security/IAM/privacy/abuse | Separate access from authority; require server enforcement, fresh auth, anti-replay and redaction. |
| Frontend/design systems | Extend existing Assurance and HRIS inbox patterns; UI cannot grant approval success. |
| Workflow/accessibility/localization | Model every pending, stale, expired, conflicted, rejected and superseded state in EN/FR and without color-only cues. |
| Product strategy/business process | G1 is a valid pilot problem; platform-wide demand and willingness to pay are unproven. |
| Quality/release assurance | Keep current gates fail closed; require parity, corruption and invalidation tests before enforcement. |
| SRE/DevSecOps/performance | Instrument queue age, verifier lag, outbox recovery and evidence reconciliation before setting SLOs. |
| SaaS packaging/growth/customer success | Test Assurance-module and enterprise packaging; do not monetize by weakening base controls. |
| Finance/internal controls | Policy-driven quorum and SoD are valuable; the control plane must never post or certify financial truth. |
| OHADA/SYSCOHADA/country pack | Qualification and country conclusions remain dated human evidence; legal/statutory certification is not implied. |
| Audit/records/data quality | Canonical JSON, retention, redaction, supersession and independent recomputation are prerequisites. |
| POS/inventory/offline | G1 is the correct narrow pilot; do not widen into offline/electronic tender activation. |
| Purchasing/AP | Reuse authority and maker-checker contracts through adapters; keep three-way-match and payment truth in AP. |
| HRIS/payroll/privacy | Authority lessons are reusable, but employee and qualification evidence requires restrictive access. |
| Payments/mobile money/reconciliation | Provider and settlement state stay external/domain-owned; store references and verified digests. |
| Accounting close/ledger | Existing close sign-off is a strong reference; generic verification cannot certify a close. |
| Analytics/BI/KPI | Define process-health metrics and data lineage; do not rank individual approvers. |
| AI/agent safety | Agents may gather, compare and explain evidence but cannot approve, accept risk or self-verify. |
| API/webhook/provider boundary | Use versioned events, signed webhook verification and provider-neutral contracts. |
| Change/training/operational readiness | Pilot success requires authority stewardship, reviewer training, support scripts and recovery drills. |

No requested lens is immaterial to the platform-wide investment decision. Legal enforceability is deliberately not assessed as a certification; it requires qualified jurisdiction-specific review.

## Recommendation and authorization boundary

### Decision: BUILD_G1_PILOT_ONLY

Authorize design finalization and a narrow Phase 0–2 G1 pilot only if governance first names the authority-data owner and approves authority codes, SoD rules, qualification evidence, retention and internal-versus-external signature policy.

Do not yet authorize:

- platform-wide domain migration;
- persistent composite gates beyond what the pilot needs;
- standalone-service extraction;
- a complete internal legal e-signature service;
- customer pricing or revenue claims;
- any statement that G1, POS or production release has passed.

### Why this decision is defensible

1. A real, current blocker exists: 33 authentic G1 role obligations are missing.
2. Existing foundations reduce feasibility risk and favor extension over greenfield construction.
3. A narrow pilot is reversible: the current script remains fail closed and runtime evidence can stay in observe mode.
4. A full build has material costs and concentration risk.
5. The repository does not provide the operational and commercial data required to prove platform-wide ROI.
6. The pilot can produce that data while delivering a useful control capability.

## Required pilot outcomes

- Import the exact G1 artifact and reproduce its SHA-256.
- Expand exactly 11 decisions into exactly 33 obligations.
- Demonstrate confirmed authority without inferring it from names or application roles.
- Complete fresh-authenticated approval and rejection flows in a test tenant.
- Produce immutable canonical evidence envelopes and independent verification results.
- Reject cross-tenant, stale-auth, replay, drift, wrong-option, SoD and producer-self-verification cases.
- Generate a verified manifest that the current G1 gate can compare in observe mode.
- Measure preparation time, approval age, rework, verification lag, support effort and operational cost.

## Expansion and kill conditions

Expand beyond G1 only when:

- the pilot meets all security and evidence acceptance criteria;
- a second domain demonstrates reuse without weakening domain truth;
- measured three-year value covers measured TCO under an approved risk-adjusted model; and
- at least one credible customer, procurement or audit use case validates external value.

Stop, defer or redesign when:

- authority ownership remains unresolved;
- cross-tenant or evidence-integrity defects remain open;
- the common model requires domain truth to be copied or centralized;
- median workflow effort is not materially lower than the current process;
- operational load or support complexity exceeds the approved budget;
- no second domain can reuse the contracts without substantial bespoke work; or
- customer discovery shows no material trust, procurement or willingness-to-pay benefit.

## Evidence and limitations

Primary repository evidence is listed in the companion technical-feasibility report. Live commands were non-destructive and no release-wide gate was run after G1 correctly reported ineligibility.

The supplied execution attachment ends mid-formula in Task 5. This report completes the assessment using the preceding established scope, but records the truncation rather than representing omitted text as supplied instructions.

All numerical scenarios are planning assumptions, not repository facts. See the companion business-case report for formulas, sensitivity and break-even conditions.

