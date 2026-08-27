# 2-Week constrained sprint plan: Top 8 non-table UI/UX deltas

Scope: Only non-table component families (shell, commands, overlays, state systems, forms, accessibility microcopy).  
Date: 2026-08-24  
Source baseline: prior `what-next/ui-ux-enterprise-review` findings.

## Top 8 deltas selected

1. Standardize shell command interactions (keyboard + focus + empty/error behavior)
2. Standardize entitlement/disabled action messaging in navigation
3. Shared destructive confirmation contract (`action`, `impact`, `consequence`, `undo`)
4. Shared command-no-match guidance and recovery action
5. Overlay standardization (modal/drawer width, close semantics, focus trap, restore focus)
6. Shared form phase pattern for high-frequency multi-step workflows
7. Unified state vocabulary for alert/toast/error/loading/empty surfaces
8. Accessibility hardening: focus-visible, aria-labeling, keyboard contracts

## Sprint objective

- Deliver a measurable reduction in enterprise workflow friction without changing backend logic.
- Target: 4 audited modules fully upgraded + one pilot migration pattern to reuse enterprise-wide.

## Team assumptions

- Frontend delivery capacity: 2 developers (shared design-system and app teams)
- Design support: 1 UX designer half-time
- QA: 1 QA engineer for regression + accessibility smoke
- DevOps/release support as needed for feature flags

## Day-by-day plan (10 working days)

### Week 1

#### Day 1 (Mon)
- Finalize sprint contract definitions:
  - Document behavior contracts for shell command, overlay, destructive confirmation, and feedback state vocabulary.
- Create sprint feature flags for rollout safety.
- Add minimal acceptance criteria per delta.

#### Day 2 (Tue)
- Implement shell command contract foundation:
  - Keyboard map, open/close lifecycle, empty results semantics, result action ranking rules.
- Add shared types + lightweight schema validators for command actions.

#### Day 3 (Wed)
- Navigation entitlement messaging pass:
  - Standard “why disabled + what to do” labels and iconography across sidebar and module entry points.
- Begin telemetry hooks for access-denied interactions.

#### Day 4 (Thu)
- Overlay standardization v1:
  - Shared modal/drawer primitives with consistent width variants, escape/cancel behavior, focus trap, restore-focus.
- Migrate two highest-volume surfaces.

#### Day 5 (Fri)
- Destructive confirmation contract v1:
  - Add consequence framing (`financial/legal/compliance` impact snippets by action class).
- Team review + internal demo with operations + support.

### Week 2

#### Day 6 (Mon)
- Form phase template v1 for top 2 workflows:
  - Intake → validate → confirm → finalize.
- Preserve values and recovery state on validation failure.

#### Day 7 (Tue)
- Feedback taxonomy implementation:
  - One canonical status ladder (`info`, `success`, `warning`, `error`, `critical`, `blocked`) used by toast/badges/alerts.
- Map at least 20 high-volume action outcomes.

#### Day 8 (Wed)
- Command recovery and empty-state improvements:
  - “No matches” suggestions, create/adjust shortcut options, quick docs fallback.
- Accessibility pass 1:
  - focus-visible visibility, key bindings, role/aria audit on touched components.

#### Day 9 (Thu)
- Integration hardening:
  - Regression pass for changed modules.
- Validate mobile shell behavior for new shell/overlay patterns.

#### Day 10 (Fri)
- Release readiness:
  - Demo + stakeholder sign-off.
  - Publish change log and run acceptance checklist.
  - Create Phase 2 handoff list for remaining modules.

## Deliverables by sprint end

- 4 upgraded modules at enterprise contract parity on targeted deltas.
- Centralized component contracts for command, modal, confirmation, and feedback state behavior.
- Accessibility baseline for all changed journeys.
- Pilot de-risk report and rollout playbook for remaining modules.

## Exit gates (must pass before merge)

1. Deterministic command behavior across all migrated modules.
2. 100% destructive confirmations using consequence framing.
3. All changed modals/drawers pass keyboard + focus retention checks.
4. No regression for existing high-volume flows (measured by scenario smoke checks).
5. Accessibility smoke pass for touched screens (keyboard, labeling, contrast).

## Known trade-offs

- Restricting scope to 8 deltas means other polish items are deferred and may appear inconsistent briefly.
- Some modules may need minor visual reflow where old overlay behavior is replaced.
- Localization copy hardening is deferred to reduce risk of scope spillover.

## Success metric

- Targeted consistency uplift of +1.0 in audited families (from 3.0 → ~4.0) across the 4 migrated modules.
