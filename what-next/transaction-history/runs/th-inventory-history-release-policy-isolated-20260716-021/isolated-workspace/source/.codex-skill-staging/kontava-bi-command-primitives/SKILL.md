---
name: kontava-bi-command-primitives
description: Build or update reusable Kontava BI command dashboard UI primitives. Use when creating or changing shared BI command components, command brief headers, command mode tabs, what-changed strips, action priority boards, business truth zones, risk radars, proof drawer hosts, trust legends, or safe BI state surfaces before page-specific dashboard redesign.
---

# Kontava BI Command Primitives

Use this skill to build reusable, enterprise-grade BI command UI primitives for Kontava dashboards after the shared BI command contracts exist.

The mission is to make Owner War Room, Manager Action Center, Cash Command, Analytics, Accounting, Assurance, and future BI command surfaces share one serious command language instead of one-off dashboard widgets.

## Operating Rules

- Inspect before editing.
- Build shared primitives before page-specific redesign.
- Reuse existing dashboard color semantics and component patterns.
- Keep UI useful, dense, and scannable.
- Do not create a new visual system.
- Do not add decorative effects with no decision value.
- Do not put cards inside cards.
- Preserve text fit on mobile and desktop.
- UI must receive trust, evidence, freshness, blocker, redaction, permission, and module state from server-side data.
- Do not compute trust, authorization, evidence grade, or redaction in the client.
- Save a run report in `innovation/` when code changes.

## Inspect First

Read these files before modifying anything:

- `components/bi/**`
- `components/evidence/ProofTrailDrawer.tsx`
- `components/finance/finance-dashboard-theme.ts`
- `app/globals.css`

If component tests are needed, inspect the test setup and nearby tests before adding new tests.

## Allowed Areas

- `components/bi/**`
- `components/finance/finance-dashboard-theme.ts` only for shared helper reuse.
- `app/globals.css` only when a missing shared token or primitive style is truly required.
- Focused component tests for `components/bi/**`.
- A saved run report under `innovation/`.

## Forbidden Areas

- Page-specific redesigns before primitives are stable.
- Owner War Room or Manager Action Center recomposition.
- New dashboard routes.
- Database or Prisma changes.
- Service-layer changes unless the user explicitly expands scope.
- Decorative animations, random effects, or visual novelty that does not improve comprehension.
- Client-side trust or permission calculation.

## Required Primitives

Build or refine shared components for:

- `BICommandBriefHeader`
- `BICommandModeTabs`
- `BIWhatChangedStrip`
- `BIActionPriorityBoard`
- `BIBusinessTruthZone`
- `BIRiskOpportunityRadar`
- `BIProofDrawerHost`
- `BITrustLegend`
- Safe state surfaces for stale, partial, blocked, redacted, permission-denied, module-unavailable, safe-error, empty, and loading states.

Export all stable primitives from:

- `components/bi/index.ts`

## Design Requirements

- Use existing `dashboard-landing-theme`, `dashboard-glass-panel`, `dashboard-stat-card`, `dashboard-control`, `dashboard-filter-chip`, and `--dash-*` tokens.
- Reuse helpers from `components/finance/finance-dashboard-theme.ts`.
- Use `Badge`, `Button`, and existing UI primitives where appropriate.
- Use lucide icons where an icon helps scanning.
- Keep text compact and readable.
- Prefer command strips, ranked queues, flow rows, evidence rows, proof buttons, and state surfaces over ornamental cards.
- Render safe empty and blocked states that explain what is needed without leaking hidden data.
- Render redacted states with policy/reason where provided.
- Render permission-denied and module-unavailable states without implying hidden values.

## Implementation Workflow

1. Inspect existing BI components and theme helpers.
2. Confirm the shared BI command contracts exist in `services/bi/bi-contracts.ts`.
3. Add primitives under `components/bi/**`, keeping each component focused.
4. Reuse `BIEvidenceBadgeRow`, `BIStateBadge`, `BIEmptyState`, `EvidenceGradeBadge`, and `ProofTrailDrawer`.
5. Add `BIProofDrawerHost` without weakening proof access rules; it should only host already-authorized proof subjects/actions.
6. Export new primitives from `components/bi/index.ts`.
7. Add focused component tests where the test stack supports React component tests.
8. Run validation commands.
9. Save a concise run report in `innovation/`.

## Testing Expectations

Focused tests should cover:

- Command brief renders title, conclusion, trust, freshness, source modules, and review state.
- Mode tabs render all modes and call `onModeChange`.
- What-changed strip renders empty, stale, partial, blocked, redacted, and normal change events.
- Action priority board renders permission-filtered actions and disabled reasons safely.
- Business truth zone preserves blockers, redactions, primary metric, and proof/action affordances.
- Risk radar ranks risks without hiding severity, evidence, or blockers.
- Proof drawer host handles no proof subject, unavailable proof subject, and available proof subject states.
- Safe state surfaces render clear copy for empty, blocked, redacted, permission-denied, module-unavailable, stale, partial, safe-error, and loading.

## Validation Commands

Run:

```powershell
npm run typecheck
npm run lint
```

Run focused component tests when added, for example:

```powershell
npm test -- components/bi/__tests__/bi-command-primitives.test.tsx --runInBand
```

When time permits or the change touches broader gates, also run:

```powershell
node scripts/kontava-moat-release-gate.js --mode fail
```

## Completion Criteria

The skill is complete when:

- Shared BI command primitives exist and compile.
- Components are exported from `components/bi/index.ts`.
- Components use existing dashboard color semantics.
- Components render safe states consistently.
- No page redesign was performed.
- Owner War Room and Manager Action Center can adopt the primitives without special-case UI.
- Focused tests and validation commands pass or any blockers are documented.
- A run report is saved in `innovation/`.

## Next Skills

After this skill passes, the next logical product-facing skill is `kontava-owner-morning-brief`, followed by `kontava-manager-daily-run-sheet`.
