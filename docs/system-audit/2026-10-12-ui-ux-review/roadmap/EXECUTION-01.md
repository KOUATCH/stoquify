# Delivery 01 — shared shell and navigation

12 October 2026. Status: implemented locally, acceptance partial, not deployed. This is the first delivery of the [October roadmap](ROADMAP.md), not completion of the whole UI/UX program.

## What changed

- Normal authenticated canvas and repeated work surfaces use existing solid semantic tokens; decorative grid, layered backgrounds and heavy shadows are reduced. Sidebar active selection remains visible.
- Sidebar organization context is simpler and repeated descriptions are visually hidden but retained for assistive technology. The topbar page label is compact and no longer introduces a second primary heading.
- Mobile navigation groups destinations by module within the existing five lanes. The current group opens automatically; search opens matching groups; native disclosures support keyboard operation. Destinations still come from the shell's permission/module-filtered list.
- EN/FR switching preserves pathname, repeated query parameters and anchor. The destination remains responsible for validating authorization and scope.
- Eight route metadata titles and the English trust legend now use Stoquify. Internal resource IDs are unchanged.

This run does not own the earlier dashboard action ordering, owner mode separation or compact evidence header. Those are documented in the previous implementation folders. It also does not claim changes in concurrently edited POS, purchasing, payroll or backend files.

## Scope and source evidence

Read AGENTS, ECC workflow/routing/command registry, test lanes, design master, constitution, registry, relevant dashboard contract, current shell/layout and permission/navigation helpers. Historic graph nodes `dashboard_navbar_tsx` and `dashboard_sidebar_tsx` provided discovery; current code determined behavior. Reused the existing five-lane configuration rather than regenerating route permissions.

Skills applied: UI/UX orchestrator, design-system freeze, shell/navigation governance, project UI/UX Pro Max and roadmap/document guidance. The September fixed-output publisher files were preserved; that publisher workflow is not claimed complete. A focused UI/UX skill search returned keyboard-navigation and focus-state guidance. No new dependencies or palette.

Existing-file edits: `app/globals.css`, `components/dashboard/Navbar.tsx`, `components/dashboard/Sidebar.tsx`, `components/bi/BITrustLegend.tsx`, and metadata in owner-war-room, manager-action-center, daily-close, daily-digest, cash-command, stock-to-cash, assurance/control-tower and its incident detail page. New application files: `DashboardLanguageLink.tsx`, `DashboardMobileNavigation.tsx`, and their two test files.

The [source baseline](evidence/source-baseline.json) was captured before this slice. The [owned patch](evidence/owned-changes.patch) compares against that baseline, preserving earlier Navbar/trust-legend work. It contains 12 existing-file edits and four new files. It is for review and selective rollback; do not replace dirty files wholesale or apply it blindly after subsequent edits.

## Verification by evidence class

| Class | Result | Practical limit |
|---|---|---|
| Workflow contract | `npm run agent:workflow:check` passed after script/lifecycle/registry inspection | 198 unrelated commands remain unclassified; not app certification |
| Source review | Scope, permissions, locale handling, CSS theme boundaries and owned diff inspected | A code review cannot prove real role sessions |
| Mocked component tests | **70 tests / 6 suites passed**, zero failures | Next navigation, session and business dependencies mocked; no database |
| Syntax | 15 TSX files parsed with installed TypeScript; CSS parsed with PostCSS; no parse errors | Not semantic TypeScript, lint or production build |
| Whitespace | Scoped `git diff --check` passed for baseline files | Whole-tree check found unrelated trailing whitespace in PurchaseReceivingWorkbench.tsx:152; untouched |
| Browser | SUPER_ADMIN, normal authenticated dark theme, EN/FR owner plus FR dashboard, desktop/tablet/mobile navigation | Restricted roles, full state matrix and business journeys not accepted |
| Database | Not run | No database test certification |
| Release | Not run | No migration-bearing build, deployment, production performance or full accessibility certification |

Exact focused test command:

```powershell
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/jest-results.json
```

The runner uses installed Next/Jest/SWC without loading the application's Next configuration, plus inspected setup mocks. Suites: DashboardLanguageLink, DashboardMobileNavigation, Sidebar-current, dashboard-localization, sidebar configuration and bi-command-primitives. One initial mobile test used a nonexistent permission name; replacing that invented fixture with the existing payables permission produced the final green result. No production permission was relaxed to satisfy it. [Raw test results](evidence/jest-results.json), [syntax results](evidence/syntax-results.json).

## Browser coverage

All observations used the available SUPER_ADMIN session on localhost. These are dev-server smoke checks; live source generation timestamps and records can change, so screenshots are not a controlled same-fixture visual regression comparison. Browser emulation produced actual CSS dimensions recorded below; the tablet target rounded to 1025 rather than 1024 pixels. Temporary viewport overrides were reset.

| Route / locale | Actual viewport | State / action | Result and evidence |
|---|---|---|---|
| `/en/dashboard/owner-war-room` | Initial default, not recorded | Owner brief, blocked/stale | Solid canvas, compact topbar and one primary heading; [image](evidence/owner-en-shell.jpg) |
| `/fr/dashboard/owner-war-room` | 1440 × 900 | Owner brief, blocked/stale | No horizontal overflow; document width 1417; one h1; canvas background image and decorative pseudo-element absent; [image](evidence/owner-fr-1440.jpg) |
| Same FR owner route | 390 × 845 | Menu open, current module | Current group expanded, others collapsed, labels wrap; [image](evidence/mobile-grouped-fr.jpg) |
| Same FR owner route | 390 × 845 | Enter expands Stocks; search `rapprochement`; Escape | Stocks destinations exposed; search shows Finance and French reconciliation destination; Escape closes and focus returns to menu trigger |
| Same FR owner route | 1025 × 768 | Brief, query and anchor present | Document width 1002; one h1; no horizontal overflow; [image](evidence/owner-fr-1025.jpg) |
| Owner FR → EN → Back | Desktop | `?period=today&locationId=all#evidence` | Switched to EN with the exact query and anchor, Back restored FR. This proves URL preservation, not that this route consumes those parameters as business filters |
| `/fr/dashboard` | 1440 × 900 | Populated daily overview | Solid canvas, one h1, document width 1417; [image](evidence/dashboard-fr-1440.jpg) |

Some client navigations completed after the immediate observation; a direct dashboard navigation timed out at the browser command boundary but subsequently completed and was verified by URL/title, DOM metrics and screenshot. This is not a measured app performance result. No transactional UI actions were taken. No role, permission, session or tenant settings were changed.

Screenshot bytes returned by the browser were JPEG; filenames use `.jpg`. The similarly named `owner-fr-1025-repeat.jpg` is a second owner capture, not dashboard evidence.

## What remains and why

1. **Role acceptance:** actual owner, cashier/operator and accountant sessions are unavailable. A request for an existing test workspace/session is pending. SUPER_ADMIN rendering and mocked permission tests cannot prove those real experiences. No passwords requested.
2. **Shell acceptance:** light/alternate-theme and full module visual matrix, actual screen reader, contrast/zoom and new-user navigation usability remain unverified. CSS canvas overrides exclude the explicit alternate theme; shared navigation styling still merits review in both themes.
3. **Next presentation work:** main dashboard header density, repeated evidence badges, mixed French/English service narrative, generic Open links and known action destination problems. These remain visibly present and are assigned to UX02/UX03, not reported fixed here.
4. **Domain journeys:** POS tender/recovery, inventory approval and accountant evidence collaboration require controlled fixtures and their own domain checks. No live transaction will be used to certify a visual change.

The orchestrator requires: “Touch only the phase scope selected for the current run.” This delivery therefore owns phase 02 shared-shell changes. The next engineering slice is phase 03 primitive revalidation followed by UX02 dashboard work; role acceptance for this slice remains open. No acceptance or production release is implied by the roadmap's existence.

## Rollback and continuation

Review the owned patch against current files, then reverse only matching owned hunks and remove new components only after restoring their imports. Do not use `git checkout`, `reset` or full baseline-file replacement: unrelated local changes must survive. No schema rollback is needed.

Resume from the roadmap's execution ledger. Preserve the first five priorities, inspect current source again for concurrent changes, obtain missing role evidence, and record a separate dated result for each subsequent slice. Keep implementation, acceptance and deployment states distinct.
