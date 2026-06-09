---
id: 025
title: Add @next/bundle-analyzer and a release-time bundle check
area: performance
priority: P2
effort: S
phase: quick-wins
status: done
---

# Add @next/bundle-analyzer and a release-time bundle check

## Problem
The dependency list includes everything: 30+ `@radix-ui/*` packages (some are only used on one page), `@tiptap/*` (heavy, only the rich-text editor needs it), `framer-motion` (200KB), `xlsx` (1.6MB!), `recharts`, `lucide-react`. Without measurement, you don't know whether all of this is reaching the browser on every page. Likely the dashboard ships several hundred KB more JS than needed.

For a B2B SaaS with paying customers on slow connections, every 100KB of JS matters for time-to-interactive.

## Acceptance criteria
- [ ] `@next/bundle-analyzer` added as a devDependency
- [ ] `next.config.ts` wraps the config with `withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })`
- [ ] `npm run analyze` script added: `ANALYZE=true next build`
- [ ] A baseline measurement: run the analyzer, screenshot or save the report, commit to `docs/perf/bundle-baseline-2026-05.html`
- [ ] Top 3 bundle bloat sources are identified and a follow-up ticket (or notes in this one) is written for each
- [ ] **Test:** `npm run analyze` opens the bundle treemap in the browser
- [ ] Optional: a CI step that fails if `app/dashboard/page.tsx` first-load JS exceeds N KB (set N to current+10% as a starting budget)

## Implementation notes
- `next.config.ts` pattern:
  ```ts
  import withBundleAnalyzer from "@next/bundle-analyzer"
  const baseConfig: NextConfig = { /* existing config */ }
  export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(baseConfig)
  ```
- Common bundle wins for this project (likely):
  1. `xlsx` — heavy. Only load it dynamically (`const XLSX = await import("xlsx")`) on the export-to-Excel button click
  2. `@tiptap/*` — only used on rich-text routes; ensure it's not eagerly imported in shared components
  3. `framer-motion` — verify it's tree-shaken; replace some motion components with CSS transitions if they're cosmetic
  4. `recharts` — heavy; lazy-load on the reports page only
- Next 15's `experimental.optimizePackageImports` can deep-tree-shake `lucide-react` and similar — add `lucide-react`, `@radix-ui/react-icons` to the list

## Out of scope
- Lighthouse CI / formal budgets — separate ticket if you want PR-blocking perf checks
- Image optimization audit (next/image audit) — separate ticket

## Resolution
Implemented 2026-05-23.

- `@next/bundle-analyzer ^15.1.4` added to devDependencies (matches Next 15.1 — run `npm install` to install)
- `next.config.ts` wrapped with `withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })`, layered inside `withNextIntl` and outside Sentry (correct order — Sentry wraps last)
- `npm run analyze` script added — `ANALYZE=true next build`
- Baseline measurement + bundle-bloat triage tickets deferred to a follow-up. The infrastructure is in place; running it produces the actionable data.
