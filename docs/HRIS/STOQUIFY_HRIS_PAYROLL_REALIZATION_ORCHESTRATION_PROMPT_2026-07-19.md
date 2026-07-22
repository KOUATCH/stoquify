# Stoquify HRIS–Payroll Realization and Skill-System Orchestration Prompt

Using the Stoquify HRIS–Payroll Architecture and Integration Decision report as the governing source:

`docs/HRIS-Payroll/STOQUIFY_HRIS_PAYROLL_ARCHITECTURE_DECISION_2026-07-19.md`

architect a complete, phased, evidence-driven program for implementing its recommendations. Then design and build the coordinated system of reusable Codex skills needed to execute, govern, test, migrate, and certify that program.

## Primary objective

Realize the report’s recommended selective-rebuild strategy:

1. Preserve the proven Payroll kernel, including calculation, corrections, country packs, Payroll runs, payslips, payments, declarations, accounting integration, and assurance evidence.
2. Rebuild HRIS/People Core as the authoritative upstream domain.
3. Establish one canonical employee identity and avoid creating competing HRIS and Payroll masters.
4. Eliminate direct or parallel Payroll writers for HR-owned information.
5. Introduce a first-class, immutable, versioned HRIS-to-Payroll input snapshot.
6. Incrementally decompose Payroll’s concentrated services behind characterization tests.
7. Migrate and cut over through controlled shadow runs, reconciliation, rollback, and release gates.

Do not default to either a full greenfield rewrite or indefinite patching of the current HRIS facade.

## Operating method

Begin with a thorough repository and documentation inspection. Use existing knowledge graphs, architecture reports, readiness evidence, schemas, services, actions, tests, permissions, module definitions, migration artifacts, and working-tree changes.

Treat repository evidence as authoritative. Clearly separate:

- Verified implementation facts
- Inferences
- Unresolved questions
- Proposed future architecture
- Assumptions requiring stakeholder confirmation

Preserve all existing working-tree changes. Do not broaden into unrelated product functionality.

## Agent and skill orchestration

Identify and coordinate every relevant specialist capability required for the program, potentially including:

- Program orchestration
- Software and domain architecture
- HRIS domain design
- Payroll and statutory controls
- Data architecture and migration
- Accounting and close assurance
- Security, privacy, and access control
- Module entitlement and provisioning
- API and integration architecture
- UX and accessibility
- Testing and quality assurance
- Release engineering and observability
- Technical writing and operational readiness

Use all relevant agents and skills, but do not invoke agents merely to increase their number. Every delegated task must have:

- A bounded responsibility
- Explicit file or artifact ownership
- Inputs and expected outputs
- Dependencies
- Acceptance criteria
- Verification evidence
- A defined handoff back to the orchestrator

Prevent overlapping edits and contradictory recommendations. The orchestrator must reconcile all specialist outputs into one coherent architecture and delivery plan.

## Skill discovery

Inventory the applicable skills already available locally before designing new ones. Reuse or extend an existing skill when it already covers the required responsibility.

If important capabilities are missing, research reputable external skills, standards, and implementation guidance. External research must:

- Prefer primary and authoritative sources
- Record source URLs and retrieval dates
- Check licensing, provenance, maintenance status, and security risk
- Avoid installing or executing untrusted code without explicit approval
- Never override repository evidence or established project constraints

## System of skills to build

Design a cohesive HRIS–Payroll implementation skill suite rather than a collection of unrelated prompts. Include at minimum:

1. A master program-orchestrator skill
2. Current-state and source-of-truth mapping
3. Canonical employee identity
4. Organization structure and manager scope
5. Contract and employment lifecycle
6. Compensation and payment-destination controls
7. Document evidence, retention, privacy, and redaction
8. Time, leave, attendance, and schedule management
9. HRIS-to-Payroll readiness and immutable snapshots
10. Payroll integration and legacy-writer retirement
11. Data migration, backfill, shadowing, and reconciliation
12. Country-pack and statutory provenance
13. Payments, declarations, and accounting assurance
14. Self-service and manager experience
15. Module entitlement and dependency enforcement
16. Security, tenant isolation, and auditability
17. Browser, accessibility, performance, and release validation
18. Production pilot and final-readiness certification

Each skill must define:

- Purpose and bounded scope
- Preconditions
- Required inputs
- Authoritative repository sources
- Step-by-step workflow
- Permitted and prohibited changes
- Dependencies on other skills
- Required tests and evidence
- Failure and rollback handling
- Completion criteria
- Structured handoff output
- Idempotency and rerun expectations

## Roadmap deliverables

Produce a professional implementation package containing:

1. Executive recommendation
2. Current-state architecture and integration map
3. Target architecture
4. Domain and data-ownership matrix
5. Direct-writer and compatibility-boundary inventory
6. Workstreams, dependencies, and critical path
7. Phased roadmap with milestones
8. Prioritized backlog with acceptance criteria
9. Agent and skill responsibility matrix
10. Skill dependency graph
11. Migration and backfill strategy
12. Shadow-run and reconciliation strategy
13. Rollback and recovery plan
14. Security and privacy threat model
15. Testing pyramid and evidence matrix
16. Release gates and production-readiness criteria
17. Risks, assumptions, decisions, and open questions
18. Estimated sequencing, staffing profiles, and confidence ranges
19. Pilot plan for one tenant and Cameroon
20. Criteria for retiring legacy Payroll mutation surfaces

## Mandatory architectural rules

- HRIS is the exclusive owner of people and employment truth.
- Payroll owns calculated financial and statutory results.
- Payroll consumes immutable certified snapshots, not mutable HRIS rows.
- There must be one canonical employee identity.
- Legacy Payroll source actions must first become HRIS adapters and later be removed.
- Core HRIS state must move from generic JSON metadata into constrained, effective-dated domain models.
- Payroll decomposition must be incremental and protected by existing behavior tests.
- Every migration must be tenant-safe, reconcilable, observable, resumable, and reversible.
- No production-readiness claim may be made without independently verifiable evidence.

## Execution phases

### Phase 0 — Evidence and governance baseline

### Phase 1 — Ownership freeze and direct-writer inventory

### Phase 2 — Canonical People Core schema

### Phase 3 — HRIS compatibility adapters and exclusive-write enforcement

### Phase 4 — Immutable Payroll-input snapshot contract

### Phase 5 — Metadata-to-relational migration

### Phase 6 — Organization, lifecycle, documents, time, and leave completion

### Phase 7 — Payroll service decomposition

### Phase 8 — Shadow runs, reconciliation, and controlled migration

### Phase 9 — Tenant and country pilot

### Phase 10 — Legacy-writer retirement

### Phase 11 — Production certification and staged rollout

For every phase, specify:

- Entry criteria
- Deliverables
- Responsible agents and skills
- Dependencies
- Tests
- Evidence artifacts
- Exit criteria
- Rollback conditions
- Explicit non-goals

## Quality bar

Do not describe unverified functionality as complete. Do not confuse passing focused tests with production readiness. Surface contradictions and architectural uncertainty openly.

Conclude with an honest **GO**, **CONDITIONAL GO**, or **NO-GO** decision for beginning implementation, followed by the smallest safe first execution tranche.

Save the roadmap, skill architecture, agent responsibility matrix, and generated skill definitions under:

`docs/HRIS-Payroll/`

Stop before broad production implementation unless the roadmap, architectural boundaries, skill system, migration controls, and first-tranche acceptance criteria have been verified.
