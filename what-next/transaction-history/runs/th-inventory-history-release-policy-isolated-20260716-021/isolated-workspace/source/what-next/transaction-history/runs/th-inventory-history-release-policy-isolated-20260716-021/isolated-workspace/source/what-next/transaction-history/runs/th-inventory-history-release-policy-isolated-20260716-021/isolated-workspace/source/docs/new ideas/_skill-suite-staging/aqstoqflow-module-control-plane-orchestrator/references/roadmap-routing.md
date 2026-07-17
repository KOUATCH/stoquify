# Module Control Plane Roadmap Routing

Use this reference only after the orchestrator skill is triggered.

## Lane Map

| Roadmap lane | Default downstream skill | Readiness rule | Default output |
|---|---|---|---|
| Evidence baseline | aqstoqflow-module-surface-inventory-gate | Always safe in report mode | Inventory refresh and baseline note |
| Vocabulary freeze | aqstoqflow-module-vocabulary-freeze | First implementation lane after baseline | Canonical vocabulary and dependency matrix prompt/report |
| Entitlement schema | aqstoqflow-module-entitlement-schema | After vocabulary and dependency semantics are frozen | Additive schema and migration/backfill plan |
| Package strategy | aqstoqflow-module-package-strategy | After sellable vs platform domains are classified | Package tiers, add-ons, dependency and pricing model |
| Surface registry ratchet | aqstoqflow-module-surface-registry-ratchet | After baseline inventory exists | Registry design and ratchet plan |
| Access guard contract | aqstoqflow-module-access-guard-contract | After entitlement decision shape is stable | Guard contract and wrapper plan or implementation |
| Module Workbench UX | aqstoqflow-module-workbench-ux-states | After service-owned state contract exists | UX state model and workbench implementation plan |
| Billing boundary | aqstoqflow-module-billing-provisioning-boundary | After package and entitlement models are designed | Provider-independent provisioning workflow |
| Leakage prevention | aqstoqflow-module-leakage-prevention | Before enforcement and before report/export/job rollout | Source-module leakage controls and tests |
| Release gates | aqstoqflow-module-release-gates-and-rollback | After baseline and classifications exist | Report, ratchet, fail-mode, and rollback gates |
| Enforcement pilot | aqstoqflow-module-enforcement-pilot | Only with explicit user approval and rollback plan | Bounded hard-enforcement pilot packet |

## Installed Skills Already Present On 2026-07-12

- aqstoqflow-module-commercialization-orchestrator
- aqstoqflow-module-control-center-packages
- aqstoqflow-module-creation-lifecycle
- aqstoqflow-module-deactivation-policy
- aqstoqflow-module-package-read-model
- aqstoqflow-module-release-gates
- aqstoqflow-module-surface-inventory-gate

## Known Missing Skills On First Install

The orchestrator may route to these names before they are installed. If missing, produce a handoff prompt and mark installation as the next prerequisite.

- aqstoqflow-module-vocabulary-freeze
- aqstoqflow-module-entitlement-schema
- aqstoqflow-module-package-strategy
- aqstoqflow-module-surface-registry-ratchet
- aqstoqflow-module-access-guard-contract
- aqstoqflow-module-workbench-ux-states
- aqstoqflow-module-billing-provisioning-boundary
- aqstoqflow-module-leakage-prevention
- aqstoqflow-module-enforcement-pilot
- aqstoqflow-module-release-gates-and-rollback

## First Pilot Decision

For the first orchestrator pilot, choose vocabulary freeze as the first safe lane after refreshing or citing the module surface inventory baseline.

Reason:

- The roadmap says vocabulary and dependency semantics must freeze before schema, package, guard, UX, billing, and enforcement work.
- Current evidence shows module control is still observe/report mode.
- Current inventory has remaining unmapped and missing-permission records, so broad hard enforcement is not eligible.

Pilot handoff target:

`aqstoqflow-module-vocabulary-freeze`

If the target skill is not installed, save a handoff prompt under `docs/modules/` and report that installing the vocabulary skill is the next prerequisite.
