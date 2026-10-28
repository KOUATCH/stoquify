---
id: 023
title: Enable noUncheckedIndexedAccess in tsconfig; bump target to ES2022
area: architecture
priority: P2
effort: S
phase: quick-wins
status: partial
---

# Enable noUncheckedIndexedAccess in tsconfig; bump target to ES2022

## Problem
`tsconfig.json` has `strict: true` ✓, `noImplicitOverride: true` ✓, `noFallthroughCasesInSwitch: true` ✓ — good. But:
- `noUncheckedIndexedAccess` is OFF. This means `arr[5]` is typed as `T` even though it might be `undefined`. The class of "I forgot to check if it exists" bugs slip past TypeScript silently.
- `target: "ES2017"`. Next.js 15 + React 19 + modern browsers all support ES2022+. Bumping the target enables better output (smaller, faster bundles), and lets you use top-level await, class fields, etc. without polyfills.

These are easy strictness wins; both will surface ~10-30 fix-required errors which are real bugs.

## Acceptance criteria
- [ ] `tsconfig.json` updated:
  - `"target": "ES2022"`
  - `"noUncheckedIndexedAccess": true`
- [ ] All resulting `tsc --noEmit` errors are fixed in code (typically by adding `if (item) { ... }` guards or `arr[i] ?? defaultValue`)
- [ ] Where the existing code legitimately relies on "array access can't be undefined here" (e.g. after a length check), use a non-null assertion `arr[i]!` sparingly with a comment explaining why
- [ ] `npm run lint` and `npx tsc --noEmit` both green after the change
- [ ] Bundle size delta measured (likely 1-3% smaller) — note in PR description
- [ ] **Test:** `arr[NaN]` and similar invalid accesses now error at compile time

## Implementation notes
- Roll out in two PRs to keep diffs manageable:
  1. `target: ES2022` — usually zero code changes needed (TS still emits whatever target you set)
  2. `noUncheckedIndexedAccess: true` — this is the one that surfaces real bugs
- Fix patterns:
  - `const first = items[0]` → `const first = items[0]; if (!first) return ...` OR `const [first] = items` (destructuring keeps `T | undefined` typing but reads cleaner)
  - `const role = user.roles[0].name` → `const role = user.roles[0]?.name` (often what you actually want — handle missing case)
  - For `Map.get()` / `Object[key]`: already returns `T | undefined`, so this flag doesn't change them
- Consider also enabling `noUnusedLocals` and `noUnusedParameters` if dead code annoys you — separate optional task

## Out of scope
- `exactOptionalPropertyTypes` — surfaces lots of issues with library types; defer
- Migrating to Biome (faster lint/format than ESLint + Prettier) — separate ticket, larger lift

## Resolution
**Partial** 2026-05-23.

**Done:**
- `target` bumped from `ES2017` → `ES2022`. Zero new type errors (verified: 441 errors before, 441 after — same pre-existing set). Bundle output should be marginally smaller and use modern syntax (top-level await, class fields, etc.).

**Deferred:**
- `noUncheckedIndexedAccess: true` was tried and reverted. It surfaced **258 new type errors** on top of the 441 pre-existing ones (699 total). Fixing them all is its own ~1-day ticket — see follow-up below.
- Most new errors look mechanical (`arr[i]` patterns post a length check) but ~30-40% need real review (Prisma result destructuring, headers/searchParams access). Likely 30-50 actual bugs hidden in the noise.

**Follow-up ticket to write:** "Enable noUncheckedIndexedAccess and fix the resulting ~258 errors in batches" — sized M-L because each batch needs human review.

Verification: `npx tsc --noEmit` error count unchanged at 441 after the ES2022 bump.
