# Modules & workspace: complete page redesign

Date: 27 September 2026
Route: `http://localhost:3000/en/dashboard/settings/modules`
Status: implementation complete; automated verification and browser acceptance are distinguished below.

## Outcome

The page now starts with a compact organization header, the active workspace count, and an explicit indication of whether the draft differs from the saved configuration. Capability discovery and the draft decision sit together. Optional presets and setup-scope forms no longer dominate the first screen. Review and save remain easy to reach, with a persistent review action on narrower screens.

The redesign retains the existing business commands. It does not purchase capabilities, grant access, alter dependencies, change billing, bypass fresh authentication, or apply operational stops during verification.

## Intended users and priorities

The route is registered as `settings-modules` in `app/[locale]/(dashboard)/dashboard/settings/settings-route-data-access.ts` and requires `MANAGE_SYSTEM_SETTINGS`. Its primary user is therefore an authorized organization configuration administrator. The UI must help that administrator understand the active workspace, discover a capability, distinguish draft changes from access and readiness, review consequences, and reach a permitted next action.

Business users reach their permitted destinations through My workspace; the page does not infer additional administrative authority from their job titles. Existing route and service checks remain authoritative.

## Evidence and initial problems

The live test organization initially had eight selected business capabilities, three foundations, requested revision 0 and active revision 0. No lifecycle operation was shown. Six selected capabilities reported setup restrictions.

The initial desktop screen devoted substantial space to a large header, revision metadata, a five-step journey, presets, operational controls, and expanded payroll/compliance scope forms before showing the catalogue. The journey suggested a sequence although the interface did not require a wizard. The same page mixed ordinary shortcut configuration with stopping new business work. Important distinctions were present but visually competed with one another.

The current source, service contracts, route permission, prior catalogue report, and component tests were inspected. `graphify-out/graph_components.json` was checked; it has no ModuleCompositionWorkbench node, so its older graph cannot establish this component's current relationships. The current imports, route and contracts were used instead.

## Component decisions

| Area | Change and purpose |
| --- | --- |
| Header and organization | Compact heading and concise purpose statement; organization remains visible. Refresh is secondary. Browser metadata uses the same page title. |
| Current state | Active business-capability count is separate from draft status. Actual stopped-operation count appears when present. Revision/source/check timestamps remain in Configuration details. |
| Journey | Removed the five-step indicator. Existing Configure, My workspace and Change history tabs remain direct task navigation. |
| Presets | Native disclosure keeps optional starting points one click away; the three presets remain available and still only edit the draft. |
| Catalogue | Grouped comparison rows, search, category and Selected filters remain. Active membership, access, setup and draft state are distinct. Actual stopped operations now appear separately in affected rows. |
| Draft | Review and save appear beside the catalogue. The summary separates explicit choices, required connections and foundations. Added/removed choices, changed scopes and changed operation controls are identified. |
| Scope | Payroll/compliance selectors move into a disclosure in the draft panel, with a visible count of unchosen scopes. Existing unavailable-scope and sandbox explanations are preserved. |
| Preparation | Real operation state and remaining requirements remain visible. Requirement cards use available width, completed evidence remains disclosed, and the existing permitted resume action takes priority over review. |
| Workspace | Authorized destination cards have a consistent Open workspace action; actual stopped-work labels and authorized historical links are preserved. |
| History | Records use a simple timeline treatment. State, revision, date, selected capabilities and reopen remain visible; technical evidence is disclosed. Pagination and focus behavior are retained. |
| Operational controls | Separate section after ordinary configuration, with a direct draft-panel button that opens it and moves keyboard focus there. No checkbox is changed by the navigation action. |
| Review and authentication | Scrollable review body and persistent footer, impact counts, larger close target, consistent secondary-control contrast, and initial focus at the heading. Close is disabled while a command is pending. Existing fresh-authentication flows are unchanged. |
| Notices and boundaries | Existing error/retry/conflict messages and limitation disclosures remain. No new requests are introduced for display-only changes. |

## Meaning and safeguards

A selected checkbox represents inclusion in a proposal, including clearly identified automatic dependencies. It does not establish entitlement or readiness. Actual active membership comes from `activeModules`; access and setup come from the service catalogue; stopped new work comes from `newWorkStoppedModules`.

Change counts compare explicit choices with the latest loaded saved selection. Automatically required connections remain separate. The server review remains authoritative for the final resolved change set, current revision, policy and evidence. Removing a workspace choice preserves granted access; operational stops remain a separately reviewed proposal. Sandbox checks continue to be described as test-environment evidence.

An automated source comparison confirms that the command-handler block is unchanged except removal of the now-unused presentation-only `setDraftEdited` flag. Organization scoping, command payloads, hashes, revision checks, idempotency, fresh authentication, recovery and audit behavior were not rewritten. English and French gained the same 16 presentation keys and matching interpolation arguments; all pre-existing translation content was preserved.

## Journey comparison

Actions below count intentional UI actions, not individual keystrokes. Existing server checks and authentication can add steps when required.

| Journey | Before | After | Trade-off/evidence |
| --- | --- | --- | --- |
| Find a named capability | Focus search + enter query; scroll to reach search | Focus search + enter query; search visible on measured desktop first screen | Search and filtering still preserve the selection. Live reconciliation search and keyboard toggle/revert were exercised. |
| Review current configuration | One review action after reaching the draft panel | One review action visible beside the catalogue, or fixed at the bottom on narrow screens | Server review was opened; no configuration was applied. |
| Apply a starting preset to the draft | One preset selection | Open presets + select preset | One deliberate extra click removes a large permanent section from routine discovery. Fixture tests exercise both presets. |
| Choose an existing setup scope | Select the scope in the expanded section | Open scope + select the existing scope | One deliberate extra click; scope requirements remain signposted and the exact selected scope still enters server review. |
| Open an available destination | My workspace + destination | My workspace + destination | Two actions remain; destination availability continues to come from the server. |
| Inspect/reopen history | Change history + reopen | Change history + reopen | Reopening and authentication verified with fixtures; live history was inspected without creating another record. |
| Reach operational controls | Scroll to controls + open section | Draft-panel controls button opens and focuses the section | Navigation does not change the draft. Stop edits and unsupported-stop behavior are verified with fixtures only. |

Measured initial baseline: at an observed CSS viewport of 1800 × 1125, the catalogue heading was at y=1114 and the draft heading at y=1131, outside the usable first screen. After redesign, at 1440 × 900, the catalogue heading was at y=352, the draft heading at y=373, and search at approximately y=526. These are **different viewport sizes**, so they are evidence of first-screen reachability, not a controlled percentage-improvement benchmark. No task-time savings or user-study results are claimed.

## Browser acceptance

Verified through the live authorized test organization:

- English at observed CSS widths 1440, 390, 767 and 769; no horizontal document overflow in the measured states. Both sides of the 768px sidebar breakpoint were checked.
- At 390 × 844, the fixed review button remained within the viewport. Keyboard focus on Selected was at y=460–504, above the review action beginning around y=787.
- Search, dependency disclosure, keyboard selection and restoration of the original eight choices. No apply or entitlement mutation was performed.
- My workspace destinations and a real history record rendered through the existing tabs.
- An English mobile server preview showed the reviewed revision, impact groups, retained-access explanation and outstanding preparation requirements. Apply and Back to draft remained inside the dialog bounds.
- French rendered and hydrated at 769px and 390px with no measured horizontal overflow. After browser recovery, the French mobile review was also captured. Initial focus was on the heading, the close target measured 44 × 44 CSS pixels, the footer stayed inside the dialog, and cancellation restored focus to Examiner la configuration.
- The theme toggle was exercised and restored to dark. The existing product tokens deliberately use dark dashboard surfaces in both application theme modes; this redesign preserves that contract. This is not a separate newly designed light palette.

The browser sometimes detached its debugger or timed out capturing screenshots. A separate review tab recovered enough access for the responsive and French checks. The automation runtime subsequently stopped responding, including inventory calls, but recovered after the automated suite finished. The final French dialog refinements were then verified. Native 200% browser zoom remains **unverified**. The supported viewport tool does not provide a native browser zoom command; no equivalent narrow viewport is claimed as actual zoom testing. The temporary viewport override was successfully reset and the separate agent-created review tab was closed. The original user-owned English tab remains open.

Screenshots capture the actual browser evidence. Some captures include padding from the browser's screenshot/zoom mapping. Width labels refer to read-only DOM `innerWidth` measurements, not PNG pixel dimensions. The initial screenshot filename is historical: its measured CSS width was 1800.

## Accessibility and visual consistency

Native disclosures, existing Radix tabs/dialogs, labels, live status messages and focus outlines are retained. The new controls navigation moves focus into the opened section. The review dialog starts at its heading, and keyboard cancellation restores focus to review. Primary buttons now use the existing `--product-brand-action` token to avoid the weaker contrast at the bright end of the earlier gradient.

Calculated token contrast ratios: white on primary action 5.17:1; muted text on surface 6.89:1; body text on surface 13.51:1; brand text on surface 4.88:1. These calculations do not constitute a screen-reader audit or certify every composited UI state. See `evidence/color-contrast.json`.

## Automated verification

- Final focused suite: **50 passed, 0 failed** (`jest-acceptance.json`); 369.924 seconds in the final run.
- `npm run typecheck`: **passed**, exit 0.
- ESLint on all three changed TypeScript files: **passed**, exit 0.
- `git diff --check` on the scoped files: **passed**.
- Translation/source preservation audit: **passed**.
- Native 200% zoom and assistive-technology testing: **not verified**.

The canonical runner was attempted exactly once for this redesign and produced no output before it was interrupted after several minutes. The scoped configuration reuses the repository's SWC/jsdom test foundation and restricts discovery to `components/modules`, with the existing CSS-module mapper.

The first scoped run produced 38 passes and 11 failures: five obsolete assertions depended on the removed stepper, old French heading, or a single global status element; six tests exceeded the default five-second timeout on this environment. Assertions were updated to the actual user-facing contract and history panel, without weakening backend expectations. With a 20-second per-test limit, all 49 tests passed. A final run includes the additional review-heading/focus-return test and is recorded separately.

Commands:

```powershell
node ./node_modules/jest/bin/jest.js --runInBand --watch=false --runTestsByPath components/modules/__tests__/ModuleCompositionWorkbench.test.tsx
node ./node_modules/jest/bin/jest.js --config what-next/modules-workspace-full-redesign/evidence/jest.config.cjs --runInBand --watch=false --runTestsByPath components/modules/__tests__/ModuleCompositionWorkbench.test.tsx --testTimeout=20000 --json --outputFile what-next/modules-workspace-full-redesign/evidence/jest-acceptance.json
npm run typecheck
node ./node_modules/eslint/bin/eslint.js components/modules/ModuleCompositionWorkbench.tsx components/modules/__tests__/ModuleCompositionWorkbench.test.tsx 'app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx'
```

## Unresolved issues and release limits

1. **Reports/Analytics dependency inconsistency (pre-existing):** the Reports destination is `/dashboard/analytics/reports` and requires Analytics at that route. The catalogue declares Analytics requiring Reports, without the inverse relationship required by that destination. This redesign does not change the policy. Source: `services/modules/module-composition.service.ts` and `app/[locale]/(dashboard)/dashboard/analytics/reports/page.tsx`.
2. Native 200% zoom and an assistive-technology pass still need completion. Visual checks of fresh-authentication, failed/resumable preparation, unsupported stops and history recovery rely on fixtures rather than triggering those effects in the live organization.
3. The catalog remains sixteen business capabilities; filters make a relevant subset easier to inspect, but the full unfiltered catalogue still scrolls substantially. The draft jump and review action are retained for that reason.
4. Live preparation requirements are real and remain unresolved by this visual redesign. No readiness claim is inferred from the current selection.

## Scope and artifacts

Changed production files: the workbench, its CSS module, English and French message namespaces, and the route's metadata. The focused component tests were updated and extended. No service, schema, billing, entitlement-policy or shared design-system files were changed by this work. The repository already contained extensive unrelated changes; those were preserved.

Evidence includes before/after screenshots, the scoped runner, initial and subsequent test JSON, test/typecheck/lint logs, the source/translation audit and contrast calculations. The source snapshots permit comparison against the exact pre-redesign local state rather than an unrelated Git baseline.

This is a tested implementation with substantial live browser evidence and explicitly outstanding visual acceptance checks; it is not an unconditional production-readiness certification.
