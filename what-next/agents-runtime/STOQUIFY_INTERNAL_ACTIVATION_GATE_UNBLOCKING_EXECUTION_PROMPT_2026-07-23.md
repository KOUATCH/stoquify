# Stoquify Internal Activation Gate Unblocking Analysis and Technical Execution Plan

Act as a multidisciplinary principal review team comprising:

- Enterprise solution architect
- Application security architect
- DevSecOps and platform engineer
- Site reliability engineer
- QA and Playwright automation lead
- AI governance and safety specialist
- Product rollout and support operations lead
- Financial systems control and audit specialist

## Objective

Analyze the following Stoquify Agent Runtime Phase 2A release-gate decision in detail:

> **Internal activation remains blocked** pending:
>
> 1. Recorded product and security approval
> 2. Named rollout, rollback, support, and pilot owners
> 3. Deployed reconciliation schedule and secret
> 4. Production alert transport and ownership
> 5. Enabled-pilot Playwright certification
>
> Definitions remain `DRAFT`; provisioning was dry-run only, and `activate: false`.

Explain precisely what this decision means, why each gate remains blocked, what risks
the gate is controlling, and what must be completed before Stoquify can safely proceed
from dry-run provisioning to controlled internal activation.

## Required Analysis

### 1. Explain the Current State

Explain the operational and technical meaning of:

- `DRAFT` agent and skill definitions
- Dry-run provisioning
- `activate: false`
- Blocked internal activation
- Controlled pilot activation
- Production readiness versus internal pilot readiness

Clarify what functionality may already exist, what has only been simulated, and what
must remain unavailable until the gates are satisfied.

### 2. Analyze Every Blocking Gate

For each of the five blocking conditions, provide:

- A plain-language explanation
- Its technical purpose
- Its product, security, operational, and audit significance
- The risks created by activating without it
- The Stoquify components likely affected
- The required implementation work
- The evidence needed to prove completion
- The tests and acceptance criteria
- The person or role accountable for approval
- The rollback condition if validation fails

Cover each gate separately:

#### Gate 1: Recorded Product and Security Approval

Explain how to create a traceable approval workflow that records:

- What is being activated
- The pilot scope and permitted tenants
- Approved agents, skills, tools, and model providers
- Known risks and accepted residual risks
- Product-owner authorization
- Security-owner authorization
- Approval timestamps and version identifiers
- Expiry, revocation, and reapproval conditions

Propose an appropriate technical approval record, database model, API boundary, audit
event, and release evidence artifact.

#### Gate 2: Named Operational Owners

Define the responsibilities and escalation paths for:

- Rollout owner
- Rollback owner
- Support owner
- Pilot owner
- Security incident owner
- On-call or fallback owner

Provide a practical RACI matrix and specify how ownership should be represented in
configuration, runbooks, release records, and alerting systems. No activation should
depend on unnamed teams or generic ownership labels.

#### Gate 3: Deployed Reconciliation Schedule and Secret

Explain what the reconciliation process must verify, including:

- Provisioned definitions versus expected definitions
- Database state versus approved release manifest
- Agent and skill versions
- Tenant and pilot allowlists
- `activate` state
- Tool permissions and policy assignments
- Missing, stale, duplicated, or unauthorized records

Design the scheduled execution mechanism, secret-management approach, rotation policy,
least-privilege access, failure handling, retry behavior, idempotency, audit logging,
and alert integration.

Do not expose secret values or recommend storing secrets in source control.

#### Gate 4: Production Alert Transport and Ownership

Define the complete alert path from detection to resolution:

- Alert-producing services
- Structured events and severity levels
- Alert transport
- Routing destination
- Named owner
- Acknowledgement expectation
- Escalation policy
- Incident creation
- Resolution evidence
- Post-incident review

Cover failures involving agent execution, reconciliation drift, denied policy actions,
abnormal tool use, model-provider failure, exhausted retries, audit-log failure, and
unauthorized activation attempts.

Specify minimum dashboards, metrics, logs, traces, alert rules, and service-level
objectives required for the pilot.

#### Gate 5: Enabled-Pilot Playwright Certification

Design a Playwright certification suite that tests the real enabled-pilot state rather
than mocked or dry-run behavior.

The suite must verify:

- Only approved pilot tenants can access the runtime
- Unauthorized tenants and users are denied
- RBAC and tenant isolation are enforced
- Approved agents and skills are visible
- Draft or inactive definitions cannot execute
- Read-only tools remain read-only
- Prohibited writes and direct Prisma access are rejected
- Ledger posting, statutory filing, and permission changes remain blocked
- Approval-required actions cannot bypass approval
- Audit events are created
- Failure and retry states are visible
- Emergency deactivation works
- Rollback restores the expected state
- Accessibility-critical workflows remain usable

Provide test organization, fixture strategy, tenant isolation, test-data cleanup, CI
integration, trace/video retention, and certification evidence requirements.

## Technical Unblocking Plan

Produce a practical, ordered implementation plan that includes:

1. Repository and deployment-state inspection
2. Gap confirmation with file and component references
3. Approval-record implementation
4. Ownership and runbook completion
5. Reconciliation job deployment
6. Secret creation and secure injection
7. Alert transport configuration
8. Pilot environment provisioning
9. Playwright certification
10. Security and product sign-off
11. Controlled activation
12. Monitoring and rollback rehearsal
13. Post-activation review

For every step, specify:

- Exact objective
- Required code, schema, infrastructure, or configuration changes
- Responsible owner
- Dependencies
- Verification command or test
- Evidence artifact
- Pass/fail criteria
- Rollback procedure

## Activation State Machine

Propose a fail-closed lifecycle such as:

`DRAFT -> REVIEWED -> APPROVED -> PROVISIONED_INACTIVE -> PILOT_CERTIFIED -> ACTIVE_INTERNAL -> SUSPENDED -> RETIRED`

Define:

- Who may perform each transition
- Preconditions for each transition
- Required approval records
- Audit events
- Automatic expiry or suspension conditions
- Emergency deactivation behavior
- How `activate: false` becomes `activate: true` without permitting direct or
  undocumented database changes

## Required Deliverables

Produce the following:

1. Executive explanation of the blocked decision
2. Current-state interpretation
3. Detailed analysis of all five gates
4. Gate-by-gate implementation plan
5. Proposed state machine
6. RACI ownership matrix
7. Database and API design recommendations
8. Reconciliation architecture and pseudocode
9. Alerting and incident-response design
10. Playwright certification matrix
11. Security threat and control analysis
12. Evidence and audit checklist
13. Controlled activation runbook
14. Rollback and emergency-disable runbook
15. Final go/no-go checklist

## Guardrails

- Do not activate agents or change `activate: false` during analysis.
- Do not perform direct production database mutations.
- Do not give agents direct Prisma write access.
- Do not permit direct ledger posting, statutory filing, or permission changes.
- Do not store or print secret values.
- Do not treat code completion as production readiness.
- Do not mark a gate complete without verifiable evidence.
- Preserve tenant isolation, RBAC, auditability, idempotency, and fail-closed behavior.
- Clearly distinguish implemented functionality, configured infrastructure, deployed
  functionality, tested functionality, and formally approved functionality.
- Identify assumptions and unresolved dependencies instead of silently treating them
  as complete.

## Final Decision

Conclude with one evidence-based status:

- `BLOCKED`
- `READY FOR REMEDIATION VERIFICATION`
- `READY FOR CONTROLLED INTERNAL PILOT`
- `APPROVED FOR INTERNAL ACTIVATION`

State exactly which gates pass, which remain blocked, what evidence is missing, and
the next technically executable action required to move Stoquify forward.
