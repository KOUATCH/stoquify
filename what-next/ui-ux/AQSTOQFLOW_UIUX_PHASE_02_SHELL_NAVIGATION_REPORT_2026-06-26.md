# AqStoqFlow UI/UX Phase 02 Shell Navigation Governance Report

Date: 2026-06-26

Skill entrypoint:
- `aqstoqflow-uiux-02-shell-navigation-governance`

## Scope Completed

Phase 02 made the authenticated shell calmer without deleting authorized routes.

The implementation separates:

- the full authorized route inventory used by search and command lookup
- the focused default sidebar/mobile menu used for first contact

This keeps every authorized destination reachable while reducing the default sidebar from a full sitemap into a smaller operating focus view.

## Files Inspected

- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-uiux-02-shell-navigation-governance\SKILL.md`
- `docs/UI/UX/AQSTOQFLOW_UI_CONSTITUTION_2026-06-26.md`
- `docs/UI/UX/AQSTOQFLOW_UI_COMPONENT_REGISTRY_2026-06-26.md`
- `config/sidebar.ts`
- `config/__tests__/sidebar.test.ts`
- `components/dashboard/Sidebar.tsx`
- `components/dashboard/Navbar.tsx`
- `components/dashboard/DashboardRouteState.tsx`
- `components/dashboard/DashboardErrorState.tsx`
- `app/[locale]/(dashboard)/dashboard/layout.tsx`
- `components/dashboard/useShellPermissions.ts`

## Files Changed

- `config/sidebar.ts`
- `config/__tests__/sidebar.test.ts`
- `components/dashboard/Sidebar.tsx`
- `components/dashboard/Navbar.tsx`
- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_02_SHELL_NAVIGATION_REPORT_2026-06-26.md`

## Implementation Summary

### Sidebar Config

Added `getDefaultSidebarLinks(links, normalizedPath)`.

The helper:

- keeps `primary` and `utility` links visible by default
- keeps the active parent visible even when it would otherwise be hidden
- guarantees every authorized section has at least one visible default anchor
- preserves the full `sidebarLinks` inventory for search, command lookup, active context, and route tests

### Desktop Sidebar

Updated `components/dashboard/Sidebar.tsx` so:

- default navigation uses the focused helper
- search mode still searches the full RBAC-filtered route inventory
- the sidebar label switches between `Focus` and `Search`
- the destination count reflects total authorized destinations when not searching
- dense footer chrome was reduced by removing the extra command-center proof panel and live website link
- the user/sign-out footer remains available

### Topbar And Mobile Menu

Updated `components/dashboard/Navbar.tsx` so:

- mobile navigation uses the same focused default model
- mobile search still searches the full authorized route inventory
- command search remains backed by `flattenSidebarDestinations(filteredLinks)`
- the organization banner appears at the standard `2xl` breakpoint
- the main command search appears from `lg` upward
- redundant topbar quick links and the extra Command shortcut were removed
- locale, theme, notification, live website, and user controls remain available

### Tests

Updated `config/__tests__/sidebar.test.ts` to cover:

- the focused default sidebar model
- preservation of the five lanes: command, operations, finance, people, governance
- active hidden parents being pulled back into the focused sidebar

## Dirty Worktree Note

The target shell files were already modified before this phase. The route-state components and sidebar tests are also untracked in the current worktree. This phase worked with the current files and did not revert or clean up unrelated changes.

Because the current diff against HEAD includes earlier shell work, `git diff` is noisier than this phase alone.

## Verification Commands And Results

Passed:

```powershell
npm test -- --runTestsByPath config/__tests__/sidebar.test.ts --runInBand
```

Result:

- 1 test suite passed
- 13 tests passed

Passed:

```powershell
npx eslint --no-error-on-unmatched-pattern config/sidebar.ts config/__tests__/sidebar.test.ts components/dashboard/Sidebar.tsx components/dashboard/Navbar.tsx --ext .ts,.tsx
```

Result:

- No ESLint errors reported for touched files

Passed:

```powershell
npm run typecheck
```

Result:

- TypeScript completed successfully

## Route Smoke

Attempted:

```powershell
Invoke-WebRequest http://localhost:3000/en/dashboard
Invoke-WebRequest http://localhost:3000/en/dashboard/finance
```

Result:

- No server was listening on `localhost:3000`.

Attempted to start the dev server with `npm run dev` in the background and wrote logs to:

- `what-next/ui-ux/phase02-dev-server.log`
- `what-next/ui-ux/phase02-dev-server.err.log`

Result:

- No listener appeared on port `3000`.
- The generated log files were empty.

Browser/mobile visual smoke remains a follow-up item once the local dev server is available.

## Acceptance Criteria

| Criterion | Result |
| --- | --- |
| New user sees a calmer default navigation | Passed |
| Primary lanes remain command, operations, finance, people, governance | Passed |
| Search/command access keeps authorized routes reachable | Passed |
| Role/permission filtering preserved | Passed |
| Locale-aware routing preserved | Passed |
| Active hidden parent stays visible | Passed |
| Shell remains type-safe | Passed |
| Browser route smoke completed | Blocked by unavailable local dev server |

## Remaining Follow-Ups

- Run browser screenshot smoke for `/en/dashboard`, `/en/dashboard/finance`, and mobile sidebar once `localhost:3000` is available.
- Phase 03 should create shared command-center primitives so the focused shell has standardized command brief, status strip, action queue, proof badge, filter bar, and drawer building blocks.
- Later module phases should normalize payroll/settings/legacy light surfaces to the dashboard token system.

## Recommended Next Phase

Run:

- `aqstoqflow-uiux-03-command-center-primitives`

