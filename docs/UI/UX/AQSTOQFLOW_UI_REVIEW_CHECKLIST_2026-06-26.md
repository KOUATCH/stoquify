# AqStoqFlow UI Review Checklist

Date: 2026-06-26
Phase: 09 - Accessibility and visual regression governance

Use this checklist for any UI pull request, especially public, auth, dashboard, finance, payroll, inventory, POS, and settings routes.

## 1. Scope and Source of Truth

- Identify every changed route and map it to `AQSTOQFLOW_UI_ROUTE_MATURITY_MATRIX_2026-06-26.md`.
- Confirm the route uses the UI constitution and component registry before inventing new layout, color, or state patterns.
- Keep the change limited to the requested route or shared primitive. If a nearby route is touched, document why.
- Confirm the route exposes business state, risk, action, and proof where the route is a command-center surface.

## 2. Route Anatomy

- Authenticated command-center routes use `dashboard-landing-theme dark`, `dashboard-landing-content`, and `--dash-*` tokens.
- The first viewport contains a useful command brief, current state, urgent actions, and proof or evidence context.
- Loading, empty, permission-denied, no-active-org, and error states are explicit and actionable.
- Cards are used for individual repeated items or panels, not nested decorative page sections.
- Tables, drawers, filters, and action queues keep stable dimensions and do not resize the page unexpectedly on hover or loading.

## 3. Accessibility

- Every icon-only button has an accessible name through visible text, `aria-label`, `title` plus visible context, or `sr-only` text.
- Inputs use a real `label` or an equivalent accessible name. Date inputs and custom select triggers need the same treatment.
- Keyboard users can reach primary navigation, filters, tabs, row menus, drawers, dialogs, action buttons, and destructive confirmations.
- Focus states are visible on dark and light surfaces.
- Status is not communicated by color alone; pair color with text, icon, count, or proof state.
- Error messages are specific enough for the user to recover, without leaking internals.
- Decorative icons use `aria-hidden="true"` where they add no meaning.

## 4. Visual and Responsive Fit

- Test mobile, tablet, and desktop for Tier 0 routes; test the matrix-defined viewports for Tier 1 routes.
- Confirm no horizontal page overflow except intentional table or carousel overflow inside a constrained shell.
- Confirm long organization names, item names, proof hashes, money values, and localized strings do not overlap neighboring content.
- Use `min-w-0`, truncation, wrapping, `break-words`, or `break-all` where long business text can appear.
- Do not scale font size with viewport width. Use responsive layout, not viewport-scaled text.
- Keep route palettes multi-tone and token-based. Avoid drifting into one-note purple, beige, slate, or brown systems.

## 5. Forms, Tables, Drawers, and Dialogs

- Forms preserve labels, validation text, disabled states, pending states, and submission recovery.
- Tables expose row selection labels, sort/filter controls, empty state, loading state, and pagination state where applicable.
- Drawers and dialogs have titles, descriptions when useful, close behavior, focus trapping through the primitive, and scrollable content when tall.
- Destructive or accounting-impacting actions show confirmation and evidence where required by product rules.
- Proof drawers and evidence timelines preserve source identifiers, hashes, timestamps, and status text.

## 6. Smoke and Verification Commands

Run the focused checks that match the change. For broad UI governance passes, use:

```powershell
npm run lint
npm run typecheck
node scripts/ui-route-smoke-gate.js --mode fail --base-url http://localhost:3000 --out what-next/ui-ux/AQSTOQFLOW_UI_ROUTE_SMOKE_2026-06-26.json
```

When Playwright is later installed and browser binaries are available, add screenshot enforcement for release candidates:

```powershell
node scripts/ui-route-smoke-gate.js --mode fail --require-screenshots --base-url http://localhost:3000 --out what-next/ui-ux/AQSTOQFLOW_UI_ROUTE_SMOKE_2026-06-26.json
```

For changed shared primitives, also run the nearest Jest tests, for example:

```powershell
npm test -- components/dashboard/__tests__/DashboardRouteState.test.tsx components/dashboard/__tests__/todays-operating-truth.test.ts --runInBand
```

## 7. Evidence to Attach

- Route names and viewport sizes reviewed.
- Screenshot paths or route smoke JSON report path.
- Known limitations, especially unauthenticated protected-route screenshots or routes intentionally optimized for tablet/desktop only.
- Any route maturity label changed in the matrix.
- Any remaining accessibility issue accepted for a later phase, with owner route and next action.

## 8. Reviewer Decision

A UI change is ready only when:

- The changed route matches its maturity target or the matrix records why it does not.
- Required lint/typecheck/focused tests pass or the failure is clearly unrelated and documented.
- The route smoke gate does not show 500s, app-error markers, or broken redirects.
- Screenshots are attached when the route is public/authenticated first impression, dashboard shell, or a high-value command-center surface.
- The user can complete the primary route task with keyboard, mouse, and expected responsive viewport.
