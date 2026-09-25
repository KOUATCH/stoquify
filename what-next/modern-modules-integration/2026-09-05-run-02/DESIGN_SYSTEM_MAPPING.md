# Native module composition: current design-system mapping

Evidence date: 2026-09-05. This continuation records current implementation changes. The run-01 design record remains unchanged. Execution results and source bindings belong in this run's VERIFICATION.md; implementation choices do not establish certification.

## Existing shell and visual language

The existing [dashboard layout](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/layout.tsx>) supplies authentication, organization context, sidebar and topbar/mobile navigation. The guarded Settings → Modules route serves the native [ModuleCompositionWorkbench](<E:/ohada saas/Focused projects/stoquify/components/modules/ModuleCompositionWorkbench.tsx>) at /en/dashboard/settings/modules and /fr/dashboard/settings/modules. The route retains its settings permission boundary. There is no iframe, copied application shell or prototype-owned operational state.

The workbench uses the current .dashboard-landing-theme.dark and .dashboard-landing-content families. Its [scoped stylesheet](<E:/ohada saas/Focused projects/stoquify/components/modules/module-composition.module.css>) provides layout and portal token scope. Current [globals.css](<E:/ohada saas/Focused projects/stoquify/app/globals.css>) makes primary dashboard actions blue. Historical gold/chestnut action guidance and the prototype's local green palette do not replace these current definitions.

| Meaning | Current treatment | Interpretation |
| --- | --- | --- |
| Selected capability, required connection, navigation or focus | Existing dash-brand, dash-brand-strong and dash-brand-soft tokens; checked control and written explanation | A draft selection establishes neither approval nor health. |
| Draft, requested operation or preparation | Info/neutral semantic tone, named state and requested/active revisions | Pending preparation preserves the last verified workspace. |
| Verified preparation step or applied configuration | Success tone plus explicit state and recorded evidence | A completed setup check is scoped; it does not certify every domain operation. |
| Waiting input, retained rights and retained records | Existing gold/trust treatment and source/action text | Evidence or retention is distinct from selection. |
| Expired/suspended access or stale review | Warning/danger according to consequence, with a written reason | The action remains subject to authoritative validation. |
| Failed request or denied new work | Danger treatment, persistent alert and recovery instruction | Failure is never shown as a successful empty result. |
| Freshness and supporting detail | Checked time, revision, muted text and existing borders | A generated timestamp is not a synchronization or health claim. |

The shared Checkbox still inherits an older gold primary token. The workbench's narrow override uses dash-brand/dash-brand-strong with the existing near-white dash-text checkmark. Current source has no dash-on-brand variable. Gold continues to identify evidence/attention rather than checked draft selection.

## Reused components and responsive behavior

| Need | Existing foundation | Integration |
| --- | --- | --- |
| Page purpose and organization/revision context | CommandBriefHeader | Localized context derived from the service. |
| Controls and badges | Shared Button, Input, Checkbox and Badge | Dashboard utilities, explicit labels, descriptions and wrapped text. |
| Configure, workspace and history | Shared Radix Tabs | Existing roving keyboard focus and selected-state semantics. |
| Impact and identity review | Shared Radix Dialog | Named title/description, focus containment, localized close and explicit return. |
| Loading, empty and unavailable states | Shared RouteStatePanel | Failed loading remains different from no available results. |
| Status meaning | Shared dashboardToneClass | Reuses the cross-module tone implementation. |
| Cards, catalogue, summary and review layout | Scoped module-composition.module.css | No global theme rewrite or second design system. |

The portal dialog maps dash-* variables to existing product-* tokens because the portal sits outside the page wrapper. Its shared optional closeLabel retains the existing default for other consumers and provides “Fermer” here.

The summary moves above the catalogue on narrow layouts. At widths up to 950 CSS pixels, the same review button stays near the bottom of the viewport; reserved page space allows the final content to scroll above it. Tablet positioning accounts for the existing sidebar. Leaving Configure hides this control. There is one review reference for focus restoration, and its stacking level remains below the modal. Narrow layouts stack capability/workspace cards and impact sections; the dialog scrolls vertically within the viewport. Scoped reduced-motion rules shorten transitions and animations.

## Trustworthy interaction state

The accepted workflow remains: choose an outcome, configure capabilities, inspect dependencies, review consequences, submit through authorized controls, then use the resulting workspace. Retailer, Service business and Current configuration choices edit a draft. Search and filters affect presentation only.

Immediate dependency hints improve editing feedback; the server recomputes actual eligibility, compatibility, setup and effects. Apply is bound to the reviewed revision and evidence hash. Available code, granted access, desired selection, active configuration, completed setup and permission for an operation remain separate.

The page shows desired and active revisions alongside the durable operation. REQUESTED, PREPARING, ACTIVE, FAILED and RETAINED are real server states. Missing concurrent setup inputs, failed steps, checked times and permitted resume come from that operation. Completed steps can be expanded; a verified compliance sandbox limitation remains visible even when other completed details are collapsed.

The browser retains unsaved selections, proposed stops and setup references under an organization-and-user-specific session key. It stores neither grants nor passwords. Saving/reopening a durable draft and applying/resuming may invoke the existing fresh-identity challenge. Hydration completes before controls become available, so early clicks cannot race draft restoration. A response for an older command cannot announce a newer operation as complete.

Payroll and compliance pickers contain only authorized records returned for the current organization. Review uses fresh server-returned descriptors. Changing scope requires another preview; resume uses the recorded scope.

## Explicit operational stops and Accounting scope

Selection controls and operational-stop controls remain separate. Hiding a workspace destination preserves established rights. A reviewed stop affects only the owner operations named by the authoritative preview; existing obligations and retention remain visible.

Current [stop policy](<E:/ohada saas/Focused projects/stoquify/services/modules/module-stop-policy.service.ts>) supports Inventory, Purchasing, Payroll and Accounting. Accounting is deliberately limited to creating new manual journal entries. The stop selection explains that scope before review. Existing journal work, required ledger postings and reconciliation continue under their existing permissions and domain controls. The commercial dependency on Accounting remains required; stopping manual entry is not suspension of that dependency.

The preview names new work, permitted continuation, affected dependencies and observed outstanding work. Counts are scoped observations and can overlap; a zero count does not establish universal operational or statutory readiness.

Sales, POS and direct Payment reconciliation stops remain unavailable. POS/Sales require the separately reviewed offline continuation boundary. Direct reconciliation stopping still needs a verified retained scope for later provider evidence. The interface presents these limits through disabled controls and written explanations. It does not disguise them with a simulated successful state.

## History beyond the initial page

History initially retrieves 25 records. “Load earlier changes” / “Charger les modifications précédentes” retrieves the next tenant-scoped page without replacing records already shown or altering the configuration. Loading and retry labels describe the actual request; a failed page preserves current entries and the draft.

A live status announces how many entries arrived. The first newly loaded record receives keyboard focus and an outline; Tab reaches its “Reopen as new draft” control. Each row keeps a stable record identifier. Reopening creates a new durable draft with current revision/authority checks. It does not mutate the historical command, undo transactions or activate its old state.

Earlier pages retain the lifecycle status returned when they were loaded. The EN/FR snapshot caption asks users to Refresh before relying on a changing status. Routine server-prop replay preserves loaded pages within the same server-derived access, configuration and lifecycle scope. A changed scope or a disjoint newest page resets the cache, and responses started under an older scope are ignored. This keeps history navigation stable without treating cached records as fresh authority; reopening always revalidates current permission.

## Failures at affected owner workflows

The new stopped-operation reason remains allowlisted through action responses while FORBIDDEN, tenant isolation and safe-message handling remain effective. Arbitrary error metadata is not exposed.

Inventory transfer creation displays a persistent localized alert inside its open modal and preserves entered locations, items and quantities. This addresses the run-01 visual finding where a toast was behind the dialog. Purchase-order creation and payroll calculation also translate the introduced stopped-operation denial at their established callers.

The [manual-journal form](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(dashboard)/dashboard/accounting/journals/new/ManualJournalDraftForm.tsx>) now preserves entered fields after a denied creation, displays and focuses a localized inline alert, and links to the journal queue. It navigates only on confirmed success. An unknown network outcome is identified as unconfirmed and directs the user to existing records before another attempt. Failed account/journal lookup is shown as a load failure, separately from valid empty setup. These additions use the accounting page's inherited tokens; older English form labels outside the new feedback remain outside this focused localization change.

## Localization and verification boundary

The existing next-intl provider and moduleComposition namespace in [English](<E:/ohada saas/Focused projects/stoquify/messages/en.json>) and [French](<E:/ohada saas/Focused projects/stoquify/messages/fr.json>) supply outcome labels, catalogue descriptions, dependencies, scope, lifecycle, preview, identity, history and new recovery copy. Stable module/record identifiers remain data values; links and dates use the current localization helpers.

Visible focus, non-color state cues, labels, descriptions, live feedback, modal focus handling and responsive layout are implemented. Prior EN/FR, 320/834-pixel reflow and lifecycle evidence remain bound to run-01 sources. This run records new history, Accounting and clean-rendering evidence separately.

Native zoom passed four final application cases on 2026-09-05, 16:20:08–16:22:17 UTC: English and French at both 200% and 400% in Chromium 151.0.7922.34. Browser-owned automatic per-tab zoom produced 629×501 and 314×250 CSS-pixel viewports from a 1258×1002 content viewport, with devicePixelRatio 2/4, CSS zoom 1 and visualViewport scale 1. The checks reached review by sequential keyboard navigation, verified focus containment/return and visible, unoccluded dialog controls, and found no horizontal overflow beyond fractional rounding or scoped axe violations. French 400% history loaded 25 more records (25→50), focused the first loaded entry and reached its reopen control by Tab without submitting it. Eighteen full browser-surface screenshots were saved; representative builder, review and history captures were visually inspected. The fresh owned profile was closed and removed. See evidence/native-zoom/receipt.json and its README for hashes, scope and preserved earlier driver issues. This is native-zoom evidence for the tested module journey, not an assistive-technology or platform-wide certification.

No actual assistive-technology or accessibility certification follows from component selection, DOM checks or axe results. See the final verification record for the precise passed, failed and untested scope.

## Catalogue boundaries

Canonical module identifiers and existing domain ownership remain intact. Proposed HRIS packaging, a separate internal ledger foundation and assisted-work products remain design proposals rather than newly granted operational modules. No billing provider, new price, commercial entitlement, retention period, X1 approval or production activation is invented. Ordinary employees see only destinations allowed by both current tenant access and their existing permissions.
