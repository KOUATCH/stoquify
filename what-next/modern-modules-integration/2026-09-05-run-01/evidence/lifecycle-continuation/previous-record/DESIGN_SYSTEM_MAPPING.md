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
| Evidence, retained access and nonblocking setup information | Gold tone, explanatory text and source/setup links | Advisory setup information is not a fabricated approval. |
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

Unsaved selections are kept in session storage under an organization-and-user-specific key. The saved value is only module selections and a revision hint, never grants or authentication. Browser storage failure does not prevent work. Durable saved drafts and history come from the service. Refreshing current state preserves the edited draft while invalidating its preview.

The server-rendered catalogue is visible before the client finishes loading. Commands, tabs, search and filters remain disabled until client initialization and draft restoration complete. This prevents a fast click from being lost during hydration; the root exposes its readiness through `aria-busy` and `data-hydrated`.

## Localization and accessibility scope

The `moduleComposition` namespace is added to the existing [English messages](<E:/ohada saas/Focused projects/stoquify/messages/en.json>) and [French messages](<E:/ohada saas/Focused projects/stoquify/messages/fr.json>). Other pre-existing message changes are retained. The locale layout already supplies `NextIntlClientProvider`; the new client uses `useTranslations` and `useLocale`, and the page uses localized metadata.

Visible names, outcomes, recipe descriptions, dependency explanations, setup conditions, grants, history states, review actions, password challenge, failures and recovery are translated. Module identifiers and audit record identifiers remain stable data values. Links use `localizePath` and dates use locale-specific formatting.

The implementation supplies labels, non-color state cues, visible focus outlines, live feedback, native landmarks, localized dialog title/description/close, disabled explanations and explicit focus return. Scoped reduced-motion rules shorten animations/transitions. Browser, zoom/reflow, keyboard and screen-reader inspection results must be read from the verification record; they are not inferred from use of Radix.

## Catalogue and lifecycle limits

The existing canonical module catalogue is used. Entries without a working supported destination are identified as unavailable for new selection; an obsolete explicit selection can still be removed from the draft. Required connections are explained separately from commercial access. Core dashboard/settings/administration foundations are included without pretending all have a standalone landing page.

HRIS packaging, a separately identified internal ledger foundation and assisted-work packages from the design blueprint remain proposed architectural boundaries. They are described as future work and are not inserted as new commercial identifiers. Existing HR/payroll, accounting and agent workflows continue to own their data and controls.

This implementation configures an authorized workspace using established access. Leaving the workspace removes shortcuts; it does not implement capability revocation, new-work shutdown, offboarding, new subscription sales or a general approval register. The review states this before submission. Retained historical access and direct business operations remain governed by existing server permissions and domain controls.

## Graph-assisted source selection

`graphify-out/graph_components.json` identifies `dashboard_sidebar_tsx` in community 60, `dashboard_navbar_tsx` in community 77, `dashboard_dashboardroutestate_tsx` in community 158 and `ui_dialog_tsx` in community 252. Their file membership guided the investigation; current source established actual behavior. The graph manifest points to this workspace, but graph line locations are historical and are not treated as current enforcement evidence.
