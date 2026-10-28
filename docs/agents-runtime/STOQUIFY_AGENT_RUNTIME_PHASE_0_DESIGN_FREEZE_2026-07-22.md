# Stoquify Agent Runtime Phase 0 Design Freeze

Status: Approved implementation baseline  
Date: 2026-07-22  
Scope: Phase 0 readiness and Phase 1 shared runtime foundation

## Decision

Stoquify will use one shared, TypeScript-native agent runtime under `services/agents`. Domain agents will compose service-owned read models through a governed tool registry. They will not own business truth, database mutation logic, ledger posting, statutory filing, payroll approval, close certification, stock mutation, cash adjustment, or access-control changes.

Phase 1 is deterministic and has no model-provider, durable-execution, MCP-server, observability-vendor, or visible UI dependency. It records only agent governance, run, evidence, feedback, cost, and policy-incident data.

## Existing Boundaries Reused

- Trusted actor and tenant: `lib/security/rbac.ts`
- Permission vocabulary and aliases: `lib/security/rbac-permissions.ts`
- Module catalog and entitlement: `services/modules/module-entitlement.service.ts`
- Evidence vocabulary and proof trails: `services/evidence/`
- Snapshot freshness and source hashes: `services/snapshots/`
- Sensitive-field policy: `services/security/redaction-policy.service.ts`
- Business signals and action queue: `services/signals/`
- Payment reconciliation read model: `services/payments/payment-reconciliation-workbench.service.ts`
- Persistence boundary convention: service-owned Prisma access only

The architecture graph identifies tenant defence, server-action protection, RBAC hardening, service ownership, and ledger-first posting as cross-cutting platform controls. The agent runtime must compose those controls and must not create a parallel path around them.

## MVP Agents And Pilot Roles

| Agent | Phase | Initial mode | Pilot roles |
| --- | ---: | --- | --- |
| Command Agent | 2 | Read-only | owner, manager, accountant, finance officer, stockkeeper |
| Cash/Reconciliation Agent | 3 | Read-and-draft | accountant, finance officer, authorized manager |
| Inventory/Replenishment Agent | 4 | Read-and-draft | stockkeeper, inventory manager, purchasing reviewer |

Exception handling and action orchestration are shared runtime infrastructure, not separate user-facing chatbots.

## Risk Taxonomy

| Level | Meaning | Phase 1 policy |
| --- | --- | --- |
| `read_only` | Reads service-owned data without changing business state | Allowed after tenant, permission, entitlement, evidence, and redaction checks |
| `draft` | Creates a non-executing recommendation or proposal | Not registered in Phase 1 |
| `low_risk` | Executes a reviewed, reversible workflow action | Not registered; requires Phase 5 approval and idempotency |
| `sensitive` | Affects financial, payroll, statutory, close, stock, or access-control truth | Prohibited from direct agent execution |
| `prohibited` | Bypasses protected services or grants authority | Permanently denied |

## Permanent Prohibited Actions

- Raw Prisma business writes
- Direct ledger or journal posting
- Statutory submission or filing
- Payroll approval, release, or person-level disclosure outside policy
- Close certification or period closure
- Cash adjustment or suspense posting
- Stock adjustment, write-off, transfer execution, or count approval
- Purchase-order or supplier-payment approval
- Permission, role, entitlement, or organization-membership changes
- Provider-side mutation
- Tool exposure before permission and entitlement filtering
- Unredacted prompt, trace, safe summary, or UI persistence

## Phase 1 Read-Only Tool Catalog

| Tool key | Owner service | Module | Required permission | Evidence behavior | Risk |
| --- | --- | --- | --- | --- | --- |
| `readTenantOperatingSnapshot` | `services/snapshots` | dashboard | `dashboard.read` | Snapshot hash, grade, freshness, blockers, redactions | read-only |
| `readBusinessSignals` | `services/signals` | dashboard | `dashboard.read` | Signal-level evidence and permission filtering | read-only |
| `readActionQueue` | `services/signals` | dashboard | `dashboard.read` | Action summaries only; no assignment or resolution | read-only |
| `readProofTrail` | `services/evidence` | reports | `reports.audit.view` | Proof subject, nodes, edges, blockers, redactions | read-only |
| `readPaymentTruthSnapshot` | `services/snapshots` | payment reconciliation | `payments.reconciliation.read` | Payment snapshot trust contract | read-only |
| `readPaymentReconciliationWorkbench` | `services/payments` | payment reconciliation | `payments.reconciliation.read` | Workbench read model with redaction boundary | read-only |
| `readInventoryCashSnapshot` | `services/snapshots` | inventory | `inventory.levels.read` | Inventory snapshot trust contract | read-only |
| `readCloseReadinessSnapshot` | `services/snapshots` | close assurance | `accounting.close.read` | Close snapshot trust contract | read-only |

Tool metadata is Phase 1 runtime governance. Actual domain adapters are introduced only with the agent that consumes them, after the same registry and policy tests pass.

## Runtime Rules

1. Every run starts from `requireRbacContext` or an equivalently trusted server-side context.
2. Every requested source module is evaluated in entitlement `enforce` mode before its tools become visible.
3. RBAC wildcard permission does not bypass module entitlement.
4. Unknown permissions, unknown tools, write-capable tools, and prohibited tool names fail closed.
5. Sensitive fields are redacted before prompt construction and again before output persistence or rendering.
6. Evidence preserves source module, source hash, grade, freshness, blocker count, redaction count, and availability.
7. Missing evidence is explicit and cannot be represented as proof.
8. Runtime persistence is tenant-scoped and limited to agent governance records.
9. Safe summaries cannot contain raw tool input, raw output, credentials, provider references, bank details, payroll amounts, or statutory payloads.
10. No model call is permitted in Phase 1.

## Dependency Adoption Order

1. Phase 0 design freeze
2. Prisma governance schema
3. Shared contracts and policy
4. Trusted context and entitlement resolution
5. Read-only registry
6. Evidence and freshness normalization
7. Redaction boundary
8. Deterministic run and step logging
9. Focused tests and static gates
10. Read-only Command Agent in Phase 2
11. One TypeScript-native model loop only after Phase 1 is green
12. Durable execution, observability vendors, and model routing only when their later-phase need is proven

## Rollout And Stop Conditions

Phase 1 may proceed because existing RBAC, entitlement, evidence, snapshot, redaction, and service persistence boundaries are reusable.

Stop the affected implementation if:

- tenant identity cannot be resolved from trusted server state
- an entitlement decision cannot be enforced before tool exposure
- a proposed read tool requires business mutation
- sensitive fields cannot be redacted before context or persistence
- evidence cannot be represented as available, missing, stale, partial, blocked, or failed
- a schema change would weaken an existing financial or workflow control

Rollback is additive: remove the isolated agent migration, `services/agents`, and agent gate scripts. No existing business table or service behavior is replaced by Phase 1.

## Phase 1 Acceptance Criteria

- Prisma schema and migration validate.
- Agent governance models are tenant-scoped where required.
- Runtime contracts compile without an AI dependency.
- Context resolution fails closed without a tenant.
- Registry output changes by permission and entitlement.
- A wildcard permission cannot bypass module entitlement.
- Only read-only tools are registered.
- Evidence and freshness states are preserved.
- Redaction removes sensitive values before safe output.
- Deterministic runs and steps can be recorded without model calls.
- Unsafe tool attempts are blocked and can create a policy incident.
- Focused tests and agent boundary gates pass.

## Non-Goals

- Visible agent UI
- Chat interface
- Model-provider integration
- MCP server exposure
- Durable workflow execution
- External trace export
- Action drafts, approvals, or execution
- Changes to existing domain business logic
