Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

## Workspace

Work in:

`E:\ohada saas\Focused projects\stoquify`

## Review Type

This is an evidence-led development-blocker isolation, classification, and elimination-strategy review.

Do not implement remediations during this review.

## Primary Source Report

Begin with:

`what-next/ohada-compliance-deferral-architecture-review.md`

Corroborate its conclusions against current repository truth. Do not assume that command results, gate counts, package scripts, or blockers recorded in the report are still current.

Also inspect, where relevant:

- `what-next/platform-progress-recovery-assessment-2026-08-10.md`
- `docs/country-pack/COUNTRY_PACK_REGULATORY_ISOLATION_TARGET_ARCHITECTURE_2026-07-26.md`
- `docs/country-pack/COUNTRY_PACK_REGULATORY_ISOLATION_IMPLEMENTATION_2026-07-26.md`
- `scripts/policy-gates-integration-contract.json`
- `package.json`
- CI and release workflows
- Gate implementations under `scripts/`
- Relevant code under `app/`, `actions/`, `services/`, `components/`, `hooks/`, `lib/`, `config/`, `prisma/`, and focused tests
- Relevant dependency information under `graphify-out/`

## Mission

From the source report and current repository evidence, isolate every material gate or constraint preventing Stoquify from progressing through smooth, sustained development.

For every blocker, provide a systematic resolution strategy covering:

- Technical remediation
- Architecture or data-model remediation
- Human decision, review, or approval
- Legal, accounting, regulatory, or external-expert dependency
- Infrastructure, secrets, provider, or environment dependency
- Product, operational, ownership, or coordination dependency
- Verification and final exit criteria

Translate “make giant strides” into a measurable operating strategy that:

1. Restores a reliable everyday development path.
2. Restores a green integration and promotion path.
3. Separates release-only and external blockers from ordinary engineering work.
4. Preserves universal accounting, security, audit, tenant, privacy, reconciliation, and data-integrity controls.
5. Establishes one binding critical path rather than generating more disconnected audit reports.
6. Identifies the first product vertical slice that can advance without waiting for qualified statutory approval.

## Required Review Board

Activate the full reviewer roster because this is a platform-wide blocker review. Require a finding or an explicit `not applicable` determination from every applicable discipline:

- Enterprise/platform architecture
- Backend, domain, API, event, and integration engineering
- Database, data integrity, and migration engineering
- Application security, IAM/RBAC, privacy, fraud, and abuse resistance
- Frontend and design-system engineering
- Workflow UX, accessibility, localization, and content design
- Product strategy and business-process analysis
- Finance, accounting, treasury, reconciliation, and internal controls
- OHADA/SYSCOHADA statutory and country-pack compliance
- Quality engineering and release assurance
- SRE, DevSecOps, observability, resilience, performance, and cost
- SaaS modularity, packaging, billing, growth, customer success, and product operations
- Audit evidence, records governance, and data quality
- POS, inventory, purchasing/AP, payroll, payments, close assurance, and offline synchronization
- Change management, documentation, training, support, and rollout operations

## Required Blocker Classification

Classify every discovered item into exactly one primary category:

1. **Development blocker**  
   Prevents ordinary local development, type checking, focused testing, migrations in safe environments, or feature integration.

2. **Integration or promotion blocker**  
   Prevents code from entering the shared integration path but should not block unrelated local work.

3. **Production-release blocker**  
   Must prevent production release but should not unnecessarily stop development.

4. **External or qualified-human blocker**  
   Requires legal, accounting, statutory, provider, regulator, security, or other qualified approval that cannot be manufactured in code.

5. **Infrastructure or environment blocker**  
   Requires secrets, safe database targets, provider credentials, deployment infrastructure, or environment configuration.

6. **Organizational or operating-model blocker**  
   Results from unclear ownership, excessive work in progress, parallel workstreams, report sprawl, missing decision rights, or lack of a binding critical path.

7. **Non-blocking risk or warning**  
   Requires monitoring or later remediation but does not currently block development or release.

8. **False or indirect blocker**  
   Appears blocking only because a sequential command stops early, a missing alias hides downstream results, or a gate is assigned to the wrong lifecycle stage.

Do not count the same root cause repeatedly merely because several aggregate commands expose it.

## Required Analysis

### 1. Establish current repository truth

Inspect the dirty worktree and preserve all unrelated changes.

Reconstruct the complete gate topology from:

- `package.json`
- Gate scripts
- Integration contracts
- CI workflows
- Release workflows
- Migration and deployment scripts
- Existing reports

Identify:

- Every gate
- Its owning script
- Its lifecycle stage
- Its dependencies
- Whether it is wired into aggregate commands
- Whether it is missing an expected alias
- Whether it is fail-fast or continues downstream
- Whether it mutates state
- Whether its failure is direct, indirect, or environmental
- Which gates become invisible when an earlier command fails

### 2. Record command evidence

Record each attempted command as:

- `passed`
- `failed`
- `skipped`
- `timed out`
- `blocked`

For every command, record:

- Exact command
- Purpose
- Start and completion time
- Exit status
- Concise result
- Direct blocker
- Whether the result is deterministic
- Whether an environment or external dependency affected it

A failed gate is evidence to analyze, not permission to delete, weaken, bypass, or relabel it.

### 3. Separate OHADA rules from universal invariants

For each gate, determine whether it protects:

- An OHADA/SYSCOHADA-specific statutory rule
- A country-pack rule
- Qualified expert approval or dated legal provenance
- A universal accounting invariant
- Ledger or monetary precision
- Tenant isolation or RBAC
- Audit or approval history
- Privacy or secrets safety
- Migration and data-loss safety
- Idempotency or reconciliation
- Provider reliability
- General code quality or operational readiness

Explicitly identify which OHADA-specific activities can be deferred without weakening universal platform invariants.

### 4. Build the master blocker register

Create one row per unique root blocker with at least:

| Field | Required content |
|---|---|
| Blocker ID | Stable identifier such as `BLK-001` |
| Blocker | Concise name |
| Gate or command | Exact gate exposing it |
| Category | One classification from the required taxonomy |
| Lifecycle stage | Local, integration, promotion, pilot, or production |
| Current evidence | File, command, result, and date |
| Root cause | Underlying cause, not merely the failure message |
| What it actually blocks | Exact development or release capability |
| What it does not block | Work that can continue safely |
| Universal or OHADA-specific | Explicit classification |
| Technical remedy | Concrete engineering actions |
| Human remedy | Decision, review, approval, training, or ownership action |
| External remedy | Provider, regulator, expert, credential, or environment action |
| Dependencies | Preconditions and downstream effects |
| Responsible role | Role accountable for resolution |
| Decision authority | Role authorized to accept or approve the outcome |
| Verification | Exact test, command, evidence, or review |
| Exit criteria | Objective definition of resolved |
| Priority | Critical, high, medium, or low |
| Recommended phase | Immediate, next, later, or release-only |
| Status | Open, partially resolved, externally blocked, or resolved |

### 5. Produce a resolution playbook for every blocker

For each material blocker, explain:

1. Why the blocker exists.
2. Whether it is correctly positioned.
3. Whether it is blocking too early or too broadly.
4. What must remain fail-closed.
5. The minimum safe technical remediation.
6. The required human or organizational action.
7. External dependencies that engineering cannot complete.
8. The correct owner and decision authority.
9. Dependency order.
10. Verification and rollback expectations.
11. What becomes unblocked when it is resolved.
12. What will remain blocked afterward.

Do not use “fix the gate” as a remediation. State the exact underlying condition that must be corrected.

### 6. Evaluate known blocker families

Validate rather than blindly repeat the report’s findings. At minimum, investigate:

- Missing or incomplete integration-policy profiles
- Missing gate aliases or aggregate-command wiring
- Production statutory gates incorrectly affecting development
- Type-checking and code-health failures
- Payroll immutability runtime validation
- Prisma destructive-migration findings and approval evidence
- Safe database-target requirements
- Secrets, public URLs, HTTPS, and live provider configuration
- Country-adapter official specifications and sandbox conformance
- Release-isolation and pilot-evidence requirements
- Gates with unexpected side effects
- Report and readiness-artifact sprawl
- Excessive parallel workstreams and lack of a single critical path
- External approvals being mixed with engineering completion
- Aggregate commands hiding downstream gate results

### 7. Design the execution sequence

Produce a dependency-aware plan with four horizons:

#### First 48 hours

Prioritize actions that restore accurate development feedback and remove false blockers, including:

- Freeze a trustworthy evidence snapshot.
- Reconcile current gate topology.
- Restore or correct integration-only gate wiring.
- Separate development, integration, and production commands.
- Resolve type-checking uncertainty.
- Confirm which failures are genuine versus environment-caused.
- Assign named role ownership to every critical blocker.

#### First 7 days

Prioritize:

- Local runtime and migration harness reliability
- Payroll immutability verification
- Migration-safety decision packets
- Secrets and environment ownership
- Safe database-target configuration
- One green integration path
- Selection of a releaseable vertical product slice
- Elimination of duplicate blocker tracking

#### Next 30 days

Prioritize:

- Completion of the selected vertical slice
- Pilot and browser evidence
- Release-isolation proof
- Provider and country-adapter conformance
- Qualified statutory review preparation
- Operational documentation and support readiness
- Sustainable CI and gate-governance ownership

#### Release-only track

Keep external statutory approval, production credentials, live provider conformance, and other legitimate production conditions visible without allowing them to stop unrelated product engineering.

### 8. Establish the operating model

Recommend a practical blocker-management cadence that includes:

- One authoritative blocker register
- One binding critical path
- Explicit work-in-progress limits
- A single owner and decision authority per blocker
- Daily review of critical blockers
- Weekly lifecycle-gate review
- Clear escalation deadlines for human and external dependencies
- No new broad audit unless it changes a decision
- Every task must end in one of:
  - Verified code or product evidence
  - An explicit user or owner decision
  - A precise external blocker with owner and next action
- Superseded reports must be marked as historical rather than treated as current truth

## Expected Artifacts

Create:

1. `what-next/stoquify-development-blocker-elimination-strategy.md`
2. `what-next/stoquify-development-blocker-register.json`

The Markdown report must contain:

- Executive verdict
- Current gate topology
- Command-result ledger
- Master blocker register
- OHADA-specific versus universal-invariant matrix
- Development versus integration versus production blocker matrix
- Detailed resolution playbook
- Critical-path dependency sequence
- First-48-hours, first-7-days, next-30-days, and release-only plans
- Ownership and escalation matrix
- Recommended vertical slice
- Operating cadence
- Decisions required from leadership
- Residual risks
- Clear list of work that can proceed immediately

The JSON register must be machine-readable and contain the same unique blocker IDs and statuses as the Markdown register.

## Verification Commands

Begin by discovering the actual commands currently defined in `package.json`. Do not invent missing commands or silently substitute aliases.

Run the relevant existing commands, including where available:

- `git status --short`
- `npm run typecheck`
- `npm run policy:gates`
- The integration-policy aggregate command
- Focused statutory development and production gates
- Focused inventory, AP, payroll, country-adapter, and regulatory-boundary gates
- `npm run workflow:assurance:runtime-check`
- `npm run prisma:validate`
- Existing migration-safety checks
- Existing payroll immutability checks
- Existing secrets and release-preflight checks
- Existing local release-evidence checks

If a required alias or command does not exist, record it as `blocked` or `skipped` with evidence. Do not create it during this review.

Do not run destructive migrations, production deployments, live provider calls, or commands requiring unsafe credentials.

## Risk Controls

- Do not modify, remove, weaken, bypass, reorder, or suppress gates during this review.
- Do not interpret statutory deferral as permission to weaken accounting, security, audit, tenant, privacy, reconciliation, or data-integrity controls.
- Do not recommend placeholder financial models that would require destructive migrations later.
- Preserve ledger precision, monetary semantics, provenance, idempotency, reconciliation, immutable evidence, and approval history.
- Preserve fail-closed behavior at production boundaries.
- Do not simulate or manufacture legal, accounting, security, or statutory approval.
- Do not make legal, tax, accounting, security, privacy, accessibility, or production-readiness certification claims.
- Do not expose secrets or production data.
- Do not overwrite unrelated work.
- Do not clean up unrelated lint findings.
- Do not perform broad refactoring.
- Do not convert production-release requirements into ordinary development requirements without justification.
- Do not classify a warning as a blocker unless evidence shows what it actually prevents.
- Do not solve organizational problems by adding more gates, reports, or process layers without measurable value.

## Success Criteria

The review is complete only when:

- Every material gate and unique root blocker has an evidence-backed classification.
- Sequentially hidden downstream gates have been independently evaluated where safe.
- Development, integration, promotion, pilot, production, external, and organizational blockers are clearly separated.
- OHADA-specific requirements are separated from universal platform invariants.
- Every blocker has a technical, human, external, or organizational resolution path as applicable.
- Every blocker has an owner, decision authority, verification method, and objective exit criteria.
- The analysis states exactly what each resolution would unblock.
- Late statutory integration risk is evaluated across data, services, workflows, controls, UI, infrastructure, and operations.
- A dependency-aware critical path is provided.
- The first 48 hours, first 7 days, next 30 days, and release-only work are explicitly defined.
- One vertical product slice is recommended for focused advancement.
- The verdict is candid, prioritized, and actionable.
- The team can identify what work may proceed immediately without weakening legitimate controls.

## Non-Goals

- Do not implement any remediation.
- Do not disable or delete gates.
- Do not integrate or remove the OHADA compliance layer.
- Do not redesign unrelated modules.
- Do not perform broad code cleanup.
- Do not approve destructive migrations.
- Do not configure production secrets or credentials.
- Do not contact regulators, providers, or external experts.
- Do not declare the system production-ready, legally compliant, secure, or accounting-certified.
- Do not produce another general platform audit without a blocker-level decision and action register.
