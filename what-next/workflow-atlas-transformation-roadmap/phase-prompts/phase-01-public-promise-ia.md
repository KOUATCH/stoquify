Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

# Phase 01: Public Promise And Information Architecture

## Objective

Transform the public Workflow Atlas into a bilingual Workflow Guide that explains controlled work without implying assignment, live relevance, permission awareness, or daily operating state.

## Prerequisites

- Phase 00 report is complete.
- Product and Security have signed the no-public-role-authorization invariant.
- Scoped git status is captured and unrelated changes will be preserved.

## Required Skills

- `aqstoqflow-prompt-architect`
- `aqstoqflow-uiux-00-orchestrator`

## Inspect

- `components/landing/workflow-atlas.tsx`
- `components/landing/workflow-atlas-data.ts`
- `messages/en.json`
- `messages/fr.json`
- `app/[locale]/(home)/page.tsx`
- Landing workflow, Operations Map, People to Pay, and use-case sections
- Existing Workflow Atlas tests and screenshots

## Implement

1. Replace daily-launch, best-next-action, assigned-work, and permission-aware implications.
2. Present six journey families:
   - sell, collect, and reconcile;
   - stock, move, and explain;
   - buy, receive, and pay;
   - people, payroll, and statutory proof;
   - close, comply, and certify;
   - govern daily operations and access.
3. Add primary owner and supporting collaborator semantics.
4. Remove the redundant outcome step and repeated full cards.
5. Use one progressive path: source, handoff, control, evidence, destination.
6. Keep one safe sign-in or qualified-rollout continuation.
7. Reconcile overlap with the home page without broad landing redesign.
8. Preserve full French accents and semantic parity.

## Verification

- Focused component and localization tests.
- Content gate rejects prohibited live-work claims.
- Usability review: at least 4 of 5 participants identify owner, control, evidence, and destination.
- No public selector or query parameter reaches an authorization service.

## Evidence

Save changed-route screenshots, usability notes, command output, and unresolved blockers under:

`what-next/workflow-atlas-transformation-roadmap/phase-01-public-promise-ia/`

## Stop Conditions

- The design requires authenticated state to explain public content.
- The change creates a second landing-page narrative rather than consolidating it.
- HRIS and payroll privacy boundaries are represented as one operational permission.

## Non-Goals

No authenticated projection, destination authorization registry, module enforcement, analytics provider, or new dashboard route.

