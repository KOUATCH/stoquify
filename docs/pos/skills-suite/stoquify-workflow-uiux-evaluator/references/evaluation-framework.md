# Evaluation Framework

## Contents

1. Target contract
2. Core dimensions
3. Optional domain dimensions
4. Workflow and state matrices
5. Decision framework
6. Report contract
7. Evidence and scoring rules

## Target Contract

Record:

- Target name and exact routes/files
- Primary and secondary personas
- Permissions and tenant/location context
- Primary jobs to be done
- Business invariants and irreversible actions
- Supported locales and viewports
- Evaluation boundary and explicit non-goals
- Evidence date and limitations

## Core Dimensions

Score every evaluation on:

1. Primary-task completion and efficiency
2. Information architecture and visual hierarchy
3. Interaction clarity and feedback
4. Loading, empty, error, denied, stale, partial, and recovery states
5. Accessibility and keyboard behavior
6. Responsiveness and input ergonomics
7. Performance posture
8. Localization and content quality
9. Security, authorization, privacy, and tenant isolation
10. Business-rule and data-integrity correctness
11. Auditability and evidence
12. Test coverage and release readiness
13. Product and market fit
14. Overall coherence and differentiation

## Optional Domain Dimensions

Select only those relevant to the target.

### Financial or transactional

- Amount, tax, discount, currency, and rounding correctness
- Atomicity, idempotency, reversals, reconciliation, and ledger posting
- Maker-checker separation and fresh authorization
- Receipt, payment, or close evidence

### Inventory or fulfillment

- Availability, reservations, movements, valuation, and negative-stock controls
- Location and warehouse boundaries
- Adjustment, transfer, return, and write-off evidence

### Offline or distributed

- Queue durability, replay ordering, idempotency, conflicts, duplicate prevention
- Reconnect visibility and recovery after crash or partial failure
- Device, terminal, freshness, and clock assumptions

### Identity, HR, payroll, or privacy

- Identity resolution, field-level access, redaction, consent, retention
- Approval authority, effective dating, snapshot immutability, correction flows
- Employee self-service versus administrative scope

### Public, growth, or onboarding

- First impression, positioning, trust, conversion flow, discoverability
- Sample/demo labeling, public-to-auth transitions, analytics instrumentation
- Onboarding progress, activation, abandonment, and empty-workspace guidance

### Hardware or high-throughput operation

- Touch targets, keyboard shortcuts, scanner/printer/device readiness
- Peak-load workflow, interruption recovery, and operator handoff
- Supervisor override and exception handling

## Workflow and State Matrices

For each material journey capture:

| Field | Required content |
| --- | --- |
| Persona | Role, permission, tenant/location context |
| Trigger | User intent or system event |
| Preconditions | Data, configuration, authorization, device, connectivity |
| Steps | UI sequence and decision points |
| Boundaries | Components, actions, services, persistence, external systems |
| Invariants | Truth that must remain correct |
| Evidence | Audit event, receipt, proof, status, or user feedback |
| Failure modes | Validation, denial, conflict, timeout, partial commit, stale data |
| Recovery | Retry, resume, reverse, escalate, or safe terminal state |
| Evaluation | Friction, risk, evidence, and unresolved gaps |

Build a state matrix covering applicable states: initial, loading, ready, empty, partial, stale, validation error, permission denied, module locked, network error, conflict, retrying, succeeded, and irreversible completion.

## Decision Framework

Classify significant components and sections as:

- Keep: sound and reusable as-is
- Refine: correct structure with bounded usability or visual gaps
- Split: overloaded responsibility or independently testable concerns
- Move: correct content in the wrong hierarchy or route
- Replace: unsafe or structurally incompatible with the target pattern
- Remove: redundant, misleading, inaccessible, or unsupported

State evidence and migration risk for every Split, Move, Replace, or Remove recommendation.

## Report Contract

Use this order unless the target requires a justified variation:

1. Executive verdict
2. Scope, personas, methodology, and limitations
3. Agent assignments and synthesis method
4. Evidence reviewed
5. Architecture, dependency, and trust-boundary map
6. Persona and job-to-be-done matrix
7. End-to-end workflow assessment
8. Browser evidence or observation blockers
9. Competitive benchmark when applicable
10. Dimension scorecard
11. UI/UX, accessibility, responsive, and performance findings
12. Business-rule, security, privacy, and reliability findings
13. State and failure-mode matrix
14. Test and evidence-gap matrix
15. Keep / Refine / Split / Move / Replace / Remove decisions
16. Ideal future page or workflow anatomy
17. P0-P3 roadmap
18. Implementation sequence and dependencies
19. Verification plan
20. Release gates and no-go conditions
21. Residual risks and unresolved questions
22. Recommended immediate next prompt

## Evidence and Scoring Rules

- Cite exact repository paths and line numbers when practical.
- Include dates for reports, graphs, screenshots, and external sources.
- Treat stale artifacts as leads, not current truth.
- State whether tests were inspected, executed, and passing.
- Do not award 9+ without observed or executable verification of the primary journey.
- Cap confidence at Low when the score rests mainly on inference or stale reports.
- Do not award an overall 9+ while any P0 release blocker remains.
- Explain weighting; do not hide critical defects inside an unweighted average.

