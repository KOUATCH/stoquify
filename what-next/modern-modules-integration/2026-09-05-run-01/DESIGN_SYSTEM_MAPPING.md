# Native module composition: design-system mapping

Evidence date: 2026-09-05. This document describes the implemented presentation and its boundaries. See `VERIFICATION.md` for execution results; a component choice is not accessibility or release certification.

## One authenticated application

The existing [dashboard layout](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/layout.tsx>) remains responsible for tenant context, authenticated access, the desktop sidebar and the topbar/mobile navigation. The integration replaces the content of the existing `/en/dashboard/settings/modules` and `/fr/dashboard/settings/modules` route. It does not embed the prototype, add another application shell or use demonstration state in production.

The route retains `withSettingsSurfaceAccess` and `MANAGE_SYSTEM_SETTINGS`. It now consumes the context returned by that guard instead of repeating the same permission lookup. The service produces the initial organization-scoped configuration; the client stores only a draft selection.

The layout itself does not establish `--dash-*` variables for every descendant. Like current authenticated workbenches, [ModuleCompositionWorkbench](<E:/ohada saas/Focused projects/stoquify/components/modules/ModuleCompositionWorkbench.tsx>) provides `.dashboard-landing-theme.dark` and `.dashboard-landing-content` around its own content. No new palette is introduced.

## Current source resolves historical guidance

The June 26 UI Constitution specifies the authenticated dashboard family. Its general theme and semantic contract remains consistent with current source. The June 12 UI registry describes a historical gold/chestnut button treatment. Current [globals.css](<E:/ohada saas/Focused projects/stoquify/app/globals.css>) defines `.dashboard-button-primary` and `.dashboard-button-create` through blue brand tokens; the shared `Button` also uses blue for its default action. The integration follows those current definitions. Gold remains evidence/review attention, rather than the default action color.

The prototype's white canvas, local green accents and standalone navigation remain illustrative design evidence. Their interaction model is integrated into the existing dark dashboard language.

The shared Checkbox inherits the older gold `--primary` token. A workbench-scoped override uses `--dash-brand` for checked selection, `--dash-brand-strong` for its border and the existing near-white `--dash-text` for its check icon. No `--dash-on-brand` token exists in current source, so the implementation does not rely on an undefined variable.

| Meaning | Implementation | What it does not imply |
| --- | --- | --- |
| Selected draft or required connection | `--dash-brand`, `--dash-brand-strong`, `--dash-brand-soft`; checkbox, label and connection explanation | Selection does not prove activation, approval or operational health. |
| Primary review/apply action | Shared `Button` with `.dashboard-button-primary` | A blue action is not an authorization grant. |
| Existing granted access, informational state, saved draft | Shared `dashboardToneClass("info")` or muted treatment | Access eligibility is distinct from completed business setup. |
| Confirmed server-applied configuration | Success tone plus “Applied” / “Appliquée” and recorded revision | A configured workspace is not a release, accounting or compliance certification. |
| Waiting input, evidence and retained access | Gold tone, explanatory text and source/setup links | A waiting input is not completed setup or fabricated approval. |
| Requested/preparing lifecycle | Info tone, durable state label and desired/active revisions | Recording a request does not activate its desired workspace. |
| Verified preparation step | Success tone, explicit “Verified” label and expandable evidence | Passing a setup check does not certify every future operation. |
| Expired/suspended/missing access, stale review | Warning or danger according to consequence; textual reason | Color alone never carries the decision. |
| Blocking preview, failed application | Danger tone, alert semantics and recovery action | The last active workspace is not replaced by a failed attempt. |
| Historical and secondary text | `--dash-text-muted`, `--dash-text-soft`, shared borders/surfaces | Metadata is not presented as a business KPI. |

No “Live” or “Healthy” badge is invented from workspace selection. Generated time is shown as a checked snapshot. No synthetic finance totals are displayed, and a failed load has a distinct failure state rather than a successful empty dataset.

## Reused components and narrow additions

| Need | Existing component or class | Integration |
| --- | --- | --- |
| Page brief and organization/revision context | [CommandBriefHeader](<E:/ohada saas/Focused projects/stoquify/components/dashboard/primitives/command-center-primitives.tsx>) | Localized purpose, stable organization and generated timestamp. |
| Buttons, input, badge | `components/ui/button.tsx`, `input.tsx`, `badge.tsx` | Existing control foundation with dashboard utilities and wrapped mobile labels. |
| Configuration/work/history sections | `components/ui/tabs.tsx` | Radix tab semantics and keyboard behavior. |
| Capability selection | `components/ui/checkbox.tsx` | Explicit labels, state and `aria-describedby` explanations; required connections cannot be removed while depended upon. |
| Impact review | `components/ui/dialog.tsx` | Radix modal focus behavior, close/return handling and protected submission. |
| Empty, loading and error content | Shared `RouteStatePanel` | Localized route loading/failure files and a separate empty-search state. |
| Semantic tones | Shared dashboard `dashboardToneClass` | Cross-module primitive rather than importing finance-owned styling. |
| Module-specific layout | [module-composition.module.css](<E:/ohada saas/Focused projects/stoquify/components/modules/module-composition.module.css>) | Grid, sidebar-summary placement, portal token scope, reflow and reduced motion. No global palette or unrelated route rewrite. |

The shared dialog adds one optional `closeLabel` prop, defaulting to its existing “Close”. This lets the new French review say “Fermer” without changing other consumers. Because Radix portals escape the page element, the scoped dialog class maps `--dash-*` to the existing root `--product-*` variables. Applying the full dashboard page class to a modal would also bring page pseudo-elements and layout rules into the overlay; the scoped mapping avoids that side effect.

## Interaction decisions

The builder has retailer and service-business starting points plus the current configuration. Recipes modify only a draft. Search and category filters are local presentation operations; they do not request protected objects or grant capability access.

Required dependency hints are calculated in the client for immediate explanation. The service recomputes the complete impact and produces the revision/hash used for submission. Local hints cannot make a server-blocked configuration applicable.

The summary moves above the catalogue on narrower viewports. Below 950px, its existing single review button is fixed near the viewport bottom so it remains reachable after a long scroll. The builder reserves six rem plus the device safe-area inset underneath the content, allowing the final rows to scroll fully above the control. Tablet positioning accounts for the existing 220px sidebar. There is no duplicate button, so the same reference restores focus after closing review. The control stays below the modal's stacking layer and disappears when leaving the Configure tab. Desktop layouts keep the normal review control inside the summary alongside the catalogue. Capability and workspace grids collapse to a single column on narrow screens, and impact columns stack inside the scrollable modal.

Pending states describe the actual operation: checking, saving, verifying identity, applying or refreshing. The interface does not play a timed demonstration of infrastructure provisioning. The existing password step-up action is used when the server requires fresh identity confirmation; password input is cleared after verification and is not placed in browser storage.

Durable preparation is a separate server-owned read model. A compact panel exposes requested/active revisions, current operation, missing inputs, failed steps and permitted resume. Completed steps are collapsed to preserve density while retaining access to their checked time, evidence hash and attempt count. Verified compliance sandbox limitations remain visible on the catalogue card, preparation panel and review; success does not hide the test-environment restriction. The journey strip derives its current stage from the actual draft, review, operation and workspace view. Local network activity cannot establish a durable lifecycle status.

Operational stops are separate labelled checkboxes under an expandable section. Existing stops remain selected by default; unsupported choices are disabled with a reason while an obsolete explicit stop can still be cleared for review. The impact dialog translates the server's operation and observation codes into business language, separates new admission from permitted continuation work and explains dependent capabilities and pending work. The authoritative stop support and preview result determine whether submission is available.

Payroll and compliance selections reveal native, labelled scope selectors populated only from the service's tenant- and permission-scoped period/authority lists. They do not create synthetic periods or approvals. The review uses fresh server-returned scope descriptors, including payroll dates/pay date and compliance environment, rather than reusing potentially stale picker labels. Sandbox verification remains visible even when completed setup steps are collapsed, so a successful test-environment check cannot appear to establish production submission readiness.

Historical links are taken only from the server's authorized retained-workspace list. Reactivation prepares a new draft and a fresh preview. The resume action uses the existing operation reference and the same identity challenge; it does not manufacture a new successful operation. Focus returns to the originating resume control or the resulting operation/workspace heading.

Directly stopped workspace cards show an explicit stopped-state badge and continuation-oriented description. A response for an earlier command is compared with the current lifecycle command before announcing completion. Draft saving/reopening also handles the server's fresh-identity requirement through the existing password challenge, preserving the exact request and returning focus to the originating control.

Unsaved selections, proposed new-work stops and selected setup record references are kept in session storage under an organization-and-user-specific key. The saved value contains draft choices and a revision hint, never grants or authentication. Browser storage failure does not prevent work. Durable saved drafts and history come from the service. Refreshing current state preserves the edited draft while invalidating its preview. Changing setup scope requires another review; resume uses the previously recorded scope.

The server-rendered catalogue is visible before the client finishes loading. Commands, tabs, search and filters remain disabled until client initialization and draft restoration complete. This prevents a fast click from being lost during hydration; the root exposes its readiness through `aria-busy` and `data-hydrated`.

## Localization and accessibility scope

The `moduleComposition` namespace is added to the existing [English messages](<E:/ohada saas/Focused projects/stoquify/messages/en.json>) and [French messages](<E:/ohada saas/Focused projects/stoquify/messages/fr.json>). Other pre-existing message changes are retained. The locale layout already supplies `NextIntlClientProvider`; the new client uses `useTranslations` and `useLocale`, and the page uses localized metadata.

Visible names, outcomes, recipe descriptions, dependency explanations, setup conditions, grants, history states, review actions, password challenge, failures and recovery are translated. Module identifiers and audit record identifiers remain stable data values. Links use `localizePath` and dates use locale-specific formatting.

The new stopped-operation denial is also translated at the existing transfer creation, purchase-order creation and payroll calculation boundaries. An allowlisted `MODULE_NEW_WORK_STOPPED` reason survives the protected and legacy action responses while the existing `FORBIDDEN` status and safe-message sanitization remain effective. No arbitrary error metadata is published. The purchase-order form receives this expected failure as structured data, so a production exception cannot obscure its reason or be mistaken for successful creation. This extension covers the new denial; existing English labels elsewhere in those older workspaces are not represented as newly localized screens.

Actual browser inspection found the transfer modal could obscure a toast even when a DOM visibility assertion passed. The transfer modal now shows a persistent, localized `role="alert"` directly above its footer, derived from the actual stopped-work mutation error. It keeps the failed draft and suppresses the duplicate stopped-work toast only for this modal; other hook callers retain their normal notification. No global stacking or authentication change was needed. The final French browser case checks the alert's visible surface, captures it inside the dialog and verifies no transfer was created. The separate `stopped-work-inline-feedback-receipt.json` preserves this follow-up's source lineage.

The implementation supplies labels, non-color state cues, visible focus outlines, live feedback, native landmarks, localized dialog title/description/close, disabled explanations and explicit focus return. Scoped reduced-motion rules shorten animations/transitions. Browser, zoom/reflow, keyboard and screen-reader inspection results must be read from the verification record; they are not inferred from use of Radix.

## Catalogue and lifecycle limits

The existing canonical module catalogue is used. Entries without a working supported destination are identified as unavailable for new selection; an obsolete explicit selection can still be removed from the draft. Required connections are explained separately from commercial access. Core dashboard/settings/administration foundations are included without pretending all have a standalone landing page.

HRIS packaging, a separately identified internal ledger foundation and assisted-work packages from the design blueprint remain proposed architectural boundaries. They are described as future work and are not inserted as new commercial identifiers. Existing HR/payroll, accounting and agent workflows continue to own their data and controls.

Leaving the workspace still removes shortcuts only. A distinct reviewed control requests supported stops on new work, scoped continuation and retained records. Current source support determines which controls are available; an unverified owner boundary remains unavailable and is explained. Commercial offboarding, new subscription sales, terminal data retirement and a general approval register remain outside this implementation. Historical access and all business operations retain server permissions and domain controls.

Inventory, Purchasing and Payroll have supported stop controls at this checkpoint. Accounting stop remains unavailable alongside Sales, POS and Payment reconciliation: the required accounting dependency would propagate a stop to reconciliation before that continuation boundary is complete. No selection styling or historical link overrides that server policy. Ordinary employees' navigation remains filtered through their existing role permissions and actual module access; configuration ownership grants no additional domain authority.

The earlier browser screenshots and accessibility checks predate the lifecycle extension. See the updated verification record for actual lifecycle coverage; these design choices do not imply new browser or assistive-technology evidence.

The expanded lifecycle review suite completed with 25 passing tests in 68.4 seconds, including fresh identity confirmation for saving/reopening drafts and a delayed response to a superseded request. Scoped lint passed. The current EN/FR registry audit covers 14 issue codes, 14 requirement codes, 25 operation labels and 34 observation labels with no missing translations. `evidence/workbench-lifecycle-checks.md` retains the earlier timeouts, selector correction and evidence-write failure as well as the successful 22-test checkpoint and subsequent review results. Actual browser evidence is recorded separately.

## Graph-assisted source selection

`graphify-out/graph_components.json` identifies `dashboard_sidebar_tsx` in community 60, `dashboard_navbar_tsx` in community 77, `dashboard_dashboardroutestate_tsx` in community 158 and `ui_dialog_tsx` in community 252. Their file membership guided the investigation; current source established actual behavior. The graph manifest points to this workspace, but graph line locations are historical and are not treated as current enforcement evidence.
