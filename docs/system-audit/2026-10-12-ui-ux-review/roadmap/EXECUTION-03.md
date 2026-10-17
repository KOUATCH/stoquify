# Delivery 03 — clearer command actions and a compact owner summary

13 October 2026. Packages UX02/UX03; command-center primitives slice. **Implemented locally; rendered and role acceptance pending.** This does not complete either package or the full UI/UX program.

## Visible changes

- The owner's four attention counts now share a compact definition-list strip instead of four separate cards. All four server-provided counts and their labels remain visible.
- Priority actions, risk actions, the brief's primary action and the owner's operational queue use one action control. Generic Open/Ouvrir labels include the supplied task context; specific server labels remain intact.
- Unprefixed internal destinations use the existing locale helper. Duplicate query parameters and anchors survive. Explicitly localized paths, external destinations and anchors retain the existing helper's behavior.
- Disabled controls show their explanation as visible text, linked with `aria-describedby`. Missing/blank destinations render an unavailable control rather than an active link to the current page. No permission is inferred or granted.
- Controls use the existing Button/theme tokens, a 44px minimum height and wrapping text. The owner's queue stacks content and its action on narrow widths.
- French owner interface copy has accents and clearer wording. Severity/evidence badges receive the page locale. The acknowledgement explains that marking the brief read applies only to this visit and does not resolve an action. Backend-provided narratives and arbitrary business text are not translated or rewritten by these controls.

## Acceptance evidence

| Criterion | Evidence / state |
|---|---|
| Keep URL context and locale on unprefixed handoffs | EN/FR component assertions cover duplicate status parameters, location and anchor |
| Preserve explicitly supplied destinations | Component cases cover already-localized, external and anchor URLs |
| Unavailable actions remain non-navigable with an explanation | Disabled primary/secondary and missing/blank destination cases passed |
| Distinct controls retain their own accessible descriptions | Repeated-action case passed; DOM focus checked for an enabled link |
| Queue ranking and server state remain intact | Priority-board integration case passed; no sorting or permission code changed |
| Owner summary retains all four values | Component checks compare all displayed definition values to the supplied result |
| Owner modes, evidence recovery and acknowledgement still work | Existing owner tests and new French acknowledgement case passed |
| Compact header retains uncertainty outside disclosure | Existing EN/FR compact-header tests passed |
| Actual reflow, contrast, focus visibility, first-screen height and role journeys | **Not verified in this delivery**; browser navigation failed before application rendering |

## Verification and side effects

Source revision: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`, with substantial pre-existing local changes. [Captured baseline](evidence/delivery-03-baseline.json) contains the seven pre-existing files before this slice; [owned patch](evidence/command-center-2026-10-13.patch) isolates this delivery from those changes.

- `npm run agent:workflow:check` — passed; 198 package scripts remain outside the reviewed registry. Current script and lifecycle definition reviewed; no delegated application command executed.
- Mocked/component lane: **42 tests passed, four suites**, [machine-readable result](evidence/command-center-tests-2026-10-13.json). Runner uses installed Next/Jest without a project `dir`, so it does not load application Next configuration or environment files. Only Jest DOM setup is loaded. Owner evidence action/drawer are mocked; the real locale helper runs with only `defineRouting` mocked for Jest compatibility. This is not real database or browser evidence.
- Scoped ESLint on all nine changed TSX files — passed, exit 0. Inspected `.eslintrc.json` and installed Next ESLint configuration; no `--fix`, caching, environment loading or app startup.
- TypeScript transpilation syntax checks — nine TSX files, no syntax errors. **Not a full semantic typecheck.**
- Scoped `git diff --check` — passed after removing a trailing blank line introduced during extraction. No broad formatter or cleanup.
- No migration, seed, database test, build, deployment, business-data mutation or external send was run in this delivery.

Exact component command:

```powershell
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.command-center.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/command-center-tests-2026-10-13.json
```

Scoped lint command:

```powershell
node node_modules/eslint/bin/eslint.js components/bi/BIActionButton.tsx components/bi/BIActionPriorityBoard.tsx components/bi/BIRiskOpportunityRadar.tsx components/bi/BICommandBriefHeader.tsx components/owner-war-room/OwnerWarRoomDashboard.tsx components/bi/__tests__/BIActionButton.test.tsx components/bi/__tests__/BICommandBriefHeader.compact.test.tsx components/bi/__tests__/bi-command-primitives.test.tsx components/owner-war-room/__tests__/OwnerWarRoomDashboard.test.tsx
```

## Browser coverage

| Attempt | Role | Locale | Viewport | Result |
|---|---|---|---|---|
| Edge, `http://localhost:3000/fr/dashboard/owner-war-room` | Not established in this attempt | Requested FR | Not measured; no page rendered | `net::ERR_CONNECTION_TIMED_OUT`, tab 1861538191 |
| Accountant in Chrome | User-reported existing session; previously observed ACCOUNTANT | Not checked this delivery | Not available | Chrome absent from current browser inventory |
| Cashier in Firefox | User-reported existing session | Not checked | Not available | Firefox absent from current browser inventory |

There is no new screenshot or successful visual acceptance claim. Previous SUPER_ADMIN screenshots do not verify this patch or the missing roles. No further server was started and no user session was reset during this delivery.

## Design and source decisions

Applied the command-center primitives skill and project UI/UX Pro Max within the existing master/constitution/component registry. Current source was used for behavior. The August component graph's `bi_biactionpriorityboard_tsx` node (community 98) corroborates the shared surface but is historical evidence only.

Focused skill query: `descriptive links disabled reason progressive disclosure`, UX domain, `ux-guidelines.csv`. The Disabled States result supports distinguishing unavailable controls; existing Button semantics plus visible reasons were reused. Skip Links and Smooth Scroll results were unrelated to this slice and not applied. No palette, animation or framework replacement was generated.

The inventory page contract was read while checking the previously identified stock handoff. `/dashboard/inventory/stock` is absent. The inventory root redirects to `/dashboard/inventory/items`, whose page checks `inventory.items.read`; the owner's stock actions currently declare `inventory.read`. Correcting those destinations requires aligning the action's additional permission check with the destination, not merely changing a URL. That is the next UX03 source task; this patch leaves those service routes unchanged. Destination guards remain authoritative.

## Remaining work and rollback

Next: repair the stock handoff with destination/permission regression coverage, finish owner read-model EN/FR narratives, then run desktop/tablet/mobile and restricted-role acceptance when the browser can reach the application. POS and inventory workbench redesigns remain queued in the roadmap.

Rollback: reverse only this delivery's patch after checking for later edits, remove its newly introduced action component/test and runner if unused. Do not reset dirty files to HEAD or restore the entire captured baseline over later work. There is no data rollback or migration.
