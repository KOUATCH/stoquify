---
id: 024
title: Add eslint-plugin-jsx-a11y and an axe-core Playwright check
area: accessibility
priority: P2
effort: S
phase: polish
status: done
depends_on: [017]
---

# Add eslint-plugin-jsx-a11y and an axe-core Playwright check

## Problem
The project uses Radix UI throughout, which is accessibility-friendly by default. Good. But there is no enforcement: a future PR can introduce `<div onClick>` instead of `<button>`, an `<img>` without `alt`, or a form input without a label, and nothing will catch it. Pre-funding due-diligence in some jurisdictions (US public-sector procurement, EU Accessibility Act starting 2025) will ask about WCAG conformance.

## Acceptance criteria
- [ ] `eslint-plugin-jsx-a11y` added to `eslint.config.mjs` with `recommended` config
- [ ] Initial lint pass surfaces a list of violations; fix the ones in critical flows (auth, dashboard nav, POS sale, recipe-create equivalent for stockflow's domain), suppress with `// eslint-disable-next-line jsx-a11y/...` + reason for the rest
- [ ] `@axe-core/playwright` added; one Playwright spec at `tests/e2e/a11y.spec.ts` runs `axe-core` against 5 critical pages (`/auth/login`, `/dashboard`, `/dashboard/items`, `/dashboard/pos`, `/dashboard/settings/users`)
- [ ] The spec fails on any "serious" or "critical" axe violation; logs but doesn't fail on "moderate" / "minor"
- [ ] CI runs the spec on PRs (extends #017's Playwright job)
- [ ] **Test:** the spec passes against current code (after fixing the violations found in the initial lint pass)
- [ ] **Test:** intentionally remove an `alt` from a critical-page `<img>` → spec fails

## Implementation notes
- `eslint-plugin-jsx-a11y` flat-config snippet:
  ```js
  import a11y from "eslint-plugin-jsx-a11y"
  // ... in eslintConfig array:
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    plugins: { "jsx-a11y": a11y },
    rules: a11y.flatConfigs.recommended.rules,
  }
  ```
- The first run likely surfaces 20-100 warnings. Don't try to fix all in one ticket — fix the loudest (interactive elements lacking semantics, form-input labels missing) and ratchet down over time
- Common Radix issue: `<DropdownMenu.Trigger>` rendered as a styled `<div>` instead of `<button>` — fix with `asChild` + a real button
- Skip a11y on the marketing landing page (`app/(marketing)/page.tsx` if it exists) — it's typically the most a11y-painful and the lowest-risk to defer

## Out of scope
- Full WCAG 2.1 AA audit with a human screen-reader user — that's a separate engagement
- Color contrast deep dive (Tailwind tokens) — surface via axe if it flags
- Skip-link / keyboard-trap manual testing — covered by manual QA

## Resolution
Implemented 2026-05-23.

- `eslint-plugin-jsx-a11y ^6.10.2` added; wired into `eslint.config.mjs` for `app/**` and `components/**`. **Started at `warn`** rather than `error` — the existing codebase has accumulated some violations (interactive divs, missing alts) and breaking the lint job on day one would block every PR. Ratchet up to `error` file-by-file or directory-by-directory as they're cleaned.
- `@axe-core/playwright ^4.11.3` added.
- `tests/e2e/a11y.spec.ts`: axe-core run against `/` and `/auth/login`. Filters to `serious` / `critical` only; logs the full violation list when something fails. Dashboard / POS / settings pages need authed fixtures (#018) before they can be checked the same way — add as they land.

When the lint baseline is clean, flip the plugin's defaults from `warn` to `error` by removing the override block, and the existing CI lint job (already runs with `--max-warnings 0`) will gate regressions automatically.
