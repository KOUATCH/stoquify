# Prioritized backlog, keep/remove/defer, and phased roadmap

## A) Prioritized backlog

### Must-fix (P1)
1. Standardize shell and command interaction contract (keyboard, focus, empty/error behavior).
2. Enforce shared destructive-action confirmation contract with explicit consequence + rollback context.
3. Normalize overlay (modal/drawer) accessibility and focus behavior.
4. Add enterprise breadcrumb + workflow context model for deep screens.
5. Localize critical microcopy and action state vocabulary.

### Should-fix (P2)
6. Unify feedback taxonomies for toast/alert/error with routing-to-recovery mapping.
7. Introduce command surface observability metadata (open rate, fail recovery, abandoned flow rate).
8. Normalize action grouping and form phase orchestration on high-volume workflows.
9. Apply responsive shell contract for mobile and compact viewport.
10. Standardize filter/search affordance across non-table pages.

### Could-fix (P3)
11. Consolidate duplicated copy patterns and microinteraction variants in legacy modules.
12. Implement “last successful path” recall for common return flows.
13. Add richer visual motion tokens for trust-sensitive workflows.
14. Upgrade non-critical decorative polish with enterprise-safe effect policy.

## B) Keep / Remove / Defer

### Keep
- Permission-aware route gating and tenant-aware shell baseline.
- Existing component primitives (command-center primitives, dashboard primitives) to avoid breakage risk.
- Existing enterprise route organization in `graph` + dashboard structure.

### Remove
- Legacy command implementations that bypass the shared command contract.
- Divergent modal size variants and ad-hoc overlay exit behavior.
- Non-governed typography overrides that bypass token boundaries.

### Defer
- Full visual re-skin beyond enterprise-safe scope (cosmetic redesign).
- Deep AI-assisted workflow orchestration in-shell until operational policy is mature.
- Any non-essential motion redesign until accessibility and performance budgets are validated.

## C) Phased modernization roadmap (non-table only)

### Phase 1: Foundation and safety (Weeks 1–4)
- Deliverables:
  - Shell contract spec (sidebar/nav/command)
  - Accessibility baseline (focus, aria, keyboard)
  - Unified confirmation/error policy
  - Non-table route-state taxonomy
- Dependencies: product, design, security, QA alignment
- Exit criteria:
  - 100% critical workflows have deterministic command/error semantics
  - No unhandled destructive confirmation paths

### Phase 2: Workflow consistency (Weeks 5–10)
- Deliverables:
  - Shared overlay primitives
  - Unified feedback-state taxonomy (toast, alert, empty, loading, error)
  - Form stage patterns + recovery map
  - Non-table localization dictionary and reviewer workflow
- Dependencies: Phase 1 + domain leads for finance/inventory/settings
- Exit criteria:
  - Consistency score improvement from 3.0 to 4.0 in core modules
  - Reduced variation in command and overlay behavior across 80% of target surfaces

### Phase 3: Enterprise harmonization (Weeks 11–18)
- Deliverables:
  - Cross-module IA harmonization and breadcrumb model
  - Mobile/compact mode audit
  - Observability instrumentation for UI interaction failures
  - Release gates for localization and accessibility by module
- Exit criteria:
  - Consistency score reaches 4.3+ in target set
  - No unresolved high-severity accessibility gaps

## D) Blockers and trade-off decisions requested

1. Should we target **single enterprise shell behavior** (strictly standardized) or allow controlled module variance for local business workflows?
2. Keep glassmorphism design language as brand signature, or lower effect budget in dense operations for clarity and speed?
3. Should localization hardening be centralized (single dictionary) immediately, or progressively by most-used locale first?
4. Do we gate Phase 3 on full observability instrumentation before/after shell rollout?

## E) Risk and dependency chain

- High dependency: command contract changes influence many components; roll out under feature flags or pilot cohort first.
- Security dependency: entitlement explanation text must align with IAM language and compliance requirements.
- Product dependency: each module owner signs off on standardized flow patterns before broad release.
- QA dependency: non-regression requirement on existing functional flows before visual changes.

## F) Delivery recommendation by package

- Packaging order: `core-shell package`, `workflow package`, `localization package`, `visual polish package`.
- Customer success dependency: release training content after P1 and P2, not before.
- Billing/packaging: no change to entitlement tiers unless specific enterprise add-on UX modules are sold separately.

