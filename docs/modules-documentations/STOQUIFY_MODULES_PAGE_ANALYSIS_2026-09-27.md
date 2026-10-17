# Stoquify Modules Page — Functional Analysis, Value and Shortcomings

**Review date:** 27 September 2026  
**Page:** [Modules and workspace settings](http://localhost:3000/en/dashboard/settings/modules)  
**Scope:** Current source implementation, user workflow, business value, controls, and improvement priorities.  
**Evidence status:** Source-based analysis. Live rendering, current organization state, and completed automated test results remain unverified.

The page is an organization-wide workspace builder with controls for module access, preparation, and stopping new business operations. Its strongest value is making configuration changes reviewable while preserving existing records and ongoing work. Its main weakness is that users must understand several different meanings of “enabled.”

The review covered the current page, component, services, translations, and existing test cases. Browser control timed out, so the rendered appearance and the organization’s current configuration could not be verified. No application code or module configuration was changed during the analysis.

## 1. What the page controls

The most important distinction is what each setting actually controls.

| Concept | Meaning on this page |
|---|---|
| Selected in draft | A proposed change; nothing has been applied yet. |
| Granted access | The organization has an eligible module entitlement. |
| In the workspace | The module belongs to the active configuration and influences navigation. |
| Prepared | The configuration’s required setup checks have completed. |
| New work stopped | Specific new operations are blocked; permitted completion work and historical access remain available. |

For example, removing **Purchasing** from the workspace preserves its access and ongoing operations. Selecting **Stop new work in Purchasing** changes whether new purchase orders can be created. Neither action purchases a module or changes subscription terms.

The configuration belongs to the organization. Although drafts are locally separated by user, applying a configuration affects the organization’s workspace and navigation.

**Source evidence:** [Configuration service](<E:/ohada saas/Focused projects/stoquify/services/modules/module-composition.service.ts:118>), [navigation service](<E:/ohada saas/Focused projects/stoquify/services/modules/module-navigation.service.ts:8>).

## 2. How the page functions

### 2.1 Choose a starting configuration

The **Retailer** preset selects Inventory, Sales, Point of sale, and Cash accountability. **Service business** selects Sales, Finance, Accounting, and Reports. **Current configuration** starts from the latest recorded selection. These buttons initially change the draft.

### 2.2 Select capabilities and resolve connections

The catalogue supports search and category filters. Cards distinguish draft selection, required connections, access grants, existing workspace membership, and preparation requirements.

Required dependencies are included automatically. For example, Payment reconciliation adds Finance and Accounting; Point of sale adds Sales. An automatically included dependency cannot be directly unchecked while another selected module requires it. Operating dashboard, Organization settings, and Administration are shared foundations.

### 2.3 Choose relevant setup inputs

Payroll introduces an existing payroll-period selection. Compliance introduces an existing authority-connection selection. These inputs define what the server checks; selecting them does not establish readiness by itself.

### 2.4 Save a draft or review its consequences

Unsaved changes are preserved in browser session storage. **Save draft** creates a durable server record without activating the configuration.

**Review configuration** requests a server-generated comparison showing modules joining, staying, and leaving the workspace, preserved access, setup requirements, and any proposed operational stops.

### 2.5 Confirm identity and apply the reviewed change

Write actions require `MANAGE_SYSTEM_SETTINGS` and recent authentication—within ten minutes. When necessary, the page asks for the current password.

The server checks the configuration revision and a fingerprint of the reviewed evidence again. Changed access, setup evidence, or configuration can invalidate the review. Repeated apply requests use an idempotency key to avoid repeating the same command.

**Source evidence:** [Action protections](<E:/ohada saas/Focused projects/stoquify/actions/modules/module-composition.actions.ts:17>), [apply implementation](<E:/ohada saas/Focused projects/stoquify/services/modules/module-composition.service.ts:278>).

### 2.6 Complete preparation

An accepted request can remain pending while required inputs are missing. The previous active workspace stays available until preparation succeeds.

> An explicitly reviewed stop on new work takes effect when the request is accepted, even if preparation remains pending. Resuming new work requires successful validation and preparation.

This timing distinction is especially important: the organization can retain its previous active workspace while an accepted operational stop is already effective.

### 2.7 Use the workspace and inspect history

**My workspace** shows destinations allowed by the saved configuration, current grants, and the user’s permissions. **Change history** shows drafts and configuration outcomes, with pagination.

Reopening a historical record creates a new draft. It does not roll back transactions, restore revoked permissions, or immediately reactivate modules.

**Source evidence:** [Workbench implementation](<E:/ohada saas/Focused projects/stoquify/components/modules/ModuleCompositionWorkbench.tsx:430>).

## 3. Business and operational value

The page provides value in four areas:

- **Simpler navigation.** Organizations can organize the application around their work, reducing irrelevant destinations for a retailer or service business.
- **Safer changes.** Dependency resolution, impact review, revision checks, and preservation of the previous workspace reduce accidental disruption.
- **Controlled operational wind-down.** Supported stop policies distinguish creating new work from completing existing obligations. That matters for inventory transfers, supplier settlement, payroll, and accounting.
- **Traceability and recovery.** Recorded commands, lifecycle events, evidence references, and reusable historical selections help explain what was requested and recover from interrupted preparation.

The implementation also includes useful accessibility provisions: associated labels, live status announcements, focus restoration after dialogs, keyboard focus styling, responsive layouts, and reduced-motion handling. Those are positive implementation choices; they do not establish that the rendered page passes an accessibility audit.

## 4. Shortcomings and improvement priorities

The findings below distinguish confirmed source behavior from usability judgments, intentional product boundaries, and performance concerns requiring measurement. They are not a claim of an exhaustive security audit or an end-to-end production certification.

### 4.1 Make the consequences of applying a configuration explicit

**Assessment:** High-priority usability and operational-risk concern, grounded in confirmed application timing.

One submission can change workspace navigation, record a pending preparation request, and immediately stop new operations. Meanwhile, the workspace itself may still display the previous active revision.

The explanatory text acknowledges this, but the operational controls sit inside a collapsed section and the final button remains generically labelled **Apply configuration**.

The final review should explicitly separate:

- Changes that take effect immediately.
- Changes waiting for preparation.
- Existing work that remains permitted.

Whenever a stop is included, the confirmation should name the affected operations prominently.

**Source evidence:** [Stop application timing](<E:/ohada saas/Focused projects/stoquify/services/modules/module-composition.service.ts:293>).

### 4.2 Align Reports dependencies with destination eligibility

**Assessment:** Confirmed source inconsistency; the specific grant scenario was not reproduced in the live application.

Reports has no required dependency in the module catalogue. However, its workspace destination requires an Analytics entitlement.

Consequently, an organization with Reports access but no Analytics access can select Reports without the preview identifying Analytics as a missing dependency, yet receive no Reports destination in **My workspace**.

The dependency resolver and destination eligibility should agree. The page should also explain when an administrator can configure a module but lacks permission to open it personally.

**Source evidence:** [Reports destination](<E:/ohada saas/Focused projects/stoquify/services/modules/module-composition.service.ts:37>), [catalogue](<E:/ohada saas/Focused projects/stoquify/services/modules/module-catalog.service.ts:230>).

### 4.3 Expose the current supported scope earlier

**Assessment:** Confirmed implementation boundaries; not all are defects.

| Capability | Current boundary |
|---|---|
| Stop new work | Supported for Inventory, Purchasing, Payroll, and Accounting. |
| Accounting stop | Stops new manual journals; required ledger effects and permitted completion work continue. |
| Sales and POS stops | Disabled because their offline continuation requirements are not established by this policy. |
| Payment reconciliation stop | Disabled. |
| Compliance preparation | Supports the specific Cameroon DGI sandbox adapter; production preparation is unsupported here. |
| Time & attendance and Commercial agents | Present in the catalogue but lack destinations in this workbench’s destination map. |
| Purchasing modules | No purchase, upgrade, or subscription-change flow. |

Availability, prerequisites, and the next useful action should be apparent before users build a configuration around unavailable capabilities.

**Source evidence:** [Stop policies](<E:/ohada saas/Focused projects/stoquify/services/modules/module-stop-policy.service.ts:28>), [compliance preparation](<E:/ohada saas/Focused projects/stoquify/services/modules/module-lifecycle-readiness.service.ts:115>), [destination map](<E:/ohada saas/Focused projects/stoquify/services/modules/module-composition.service.ts:23>).

### 4.4 Provide a complete draft reset and explain stale restoration

**Assessment:** Confirmed source behavior with a foreseeable usability risk.

**Current configuration** restores module selection only. It does not restore edited stop controls or payroll/compliance setup choices.

Someone could reasonably interpret it as “discard my changes,” then unintentionally retain an edited operational stop in the draft.

A dedicated **Discard all draft changes** action should reset all three parts together. The existing button could be labelled more narrowly.

Relatedly, browser drafts store a revision but restoration does not compare that revision with the current server revision. Review protections still apply, but the user is not told that a restored draft originated from an older configuration.

**Source evidence:** [Preset handler](<E:/ohada saas/Focused projects/stoquify/components/modules/ModuleCompositionWorkbench.tsx:462>), [draft restoration](<E:/ohada saas/Focused projects/stoquify/components/modules/ModuleCompositionWorkbench.tsx:139>).

### 4.5 Preserve actionable authentication errors

**Assessment:** Confirmed error-presentation gap; passwordless compatibility is conditional on the account types the product supports.

The authentication action distinguishes an incorrect password from rate limiting and returns a retry delay. The workbench maps both to the same general failure message.

A user therefore cannot tell whether to correct the password or wait before retrying. The page should preserve those distinctions and show an appropriate recovery action.

The challenge is also password-only. If passwordless or SSO-only accounts are supported, they need a compatible verification path.

**Source evidence:** [Workbench error handling](<E:/ohada saas/Focused projects/stoquify/components/modules/ModuleCompositionWorkbench.tsx:217>), [authentication results](<E:/ohada saas/Focused projects/stoquify/actions/security/step-up-auth.actions.ts:49>).

### 4.6 Reduce preparation bottlenecks and improve handover

**Assessment:** Confirmed lifecycle behavior with a product-design tradeoff.

Activation waits for every required preparation observation to succeed. One unresolved requirement can hold back the entire requested workspace, including otherwise ready capabilities.

That is a defensible consistency choice, but the page should make the blocking dependency explicit. Messages such as “Complete the required payroll organization and country scope” offer less guidance than a list of the actual missing inputs.

Recovery also depends on the original requesting actor: another administrator cannot simply resume that operation and must submit a new review. This protects review authority but complicates handover.

**Source evidence:** [Preparation completion](<E:/ohada saas/Focused projects/stoquify/services/modules/module-composition.service.ts:370>), [resume eligibility](<E:/ohada saas/Focused projects/stoquify/services/modules/module-lifecycle.service.ts:33>).

### 4.7 Make history explanatory as well as traceable

**Assessment:** Confirmed presentation gaps.

History provides status, revision, time, selections, and identifiers. However:

- The actor is displayed as an internal ID rather than a recognizable name.
- Returned failure codes are not displayed in each history entry.
- There is no concise added/removed comparison for historical changes.
- Setup choices are not explained in the history presentation.

A useful history entry should let an administrator answer “who changed what, why did it fail, and what should happen next?” without interpreting identifiers.

**Source evidence:** [History rendering](<E:/ohada saas/Focused projects/stoquify/components/modules/ModuleCompositionWorkbench.tsx:537>).

### 4.8 Measure loading costs and improve large-list selection

**Assessment:** Confirmed query and refresh design; performance impact remains unmeasured.

Initial loading checks preparation across all catalogue modules with destinations, including unselected ones. Some checks read collections of accounting setup records and inspect provider accounts. This creates a potential latency and failure-coupling problem: trouble in an unrelated domain can prevent the configuration page from loading.

Payroll periods and compliance connections are each limited to 50 returned records, without a picker pagination/search mechanism. Valid older choices may therefore be inaccessible.

Status updates also rely on explicit refresh and resume actions. There is no automatic background refresh in the workbench. These are source-level concerns; actual load times were not measured.

**Source evidence:** [Data loading](<E:/ohada saas/Focused projects/stoquify/services/modules/module-composition.service.ts:118>), [preparation observations](<E:/ohada saas/Focused projects/stoquify/services/modules/module-lifecycle-readiness.service.ts:60>).

## 5. Recommended order of work

| Order | Improvement | Intended result |
|---|---|---|
| 1 | Clarify immediate operational stops versus pending workspace changes. | Administrators understand exactly what confirmation will do and when. |
| 2 | Align Reports dependency resolution and destination eligibility. | A selectable capability has a consistent, explainable access path. |
| 3 | Add complete draft reset and older-draft disclosure. | Administrators can confidently discard changes and understand restored drafts. |
| 4 | Distinguish authentication failures and recovery actions. | Incorrect credentials and temporary lockouts receive useful guidance. |
| 5 | Explain specific preparation blockers and handover constraints. | Administrators know which inputs to fix and who can continue the operation. |
| 6 | Improve historical actor, impact, scope, and failure details. | Configuration history becomes useful for daily support and accountability. |
| 7 | Measure query costs and support larger setup lists. | Performance and selection completeness are assessed with evidence. |
| 8 | Expand supported module and stop policies deliberately. | Product coverage grows while preserving verified continuation behavior. |

The first four improvements would increase trust and usability without requiring a redesign of the underlying configuration system. Capability expansion should preserve the existing distinction between workspace visibility, granted access, operational preparation, and admission of new work.

## 6. Verification record and limitations

- **Source review completed:** route, workbench, module catalogue, configuration service, action protections, navigation, lifecycle preparation, stop policies, authentication handling, translations, and relevant existing test cases.
- **Knowledge graph checked:** the existing route node `locale_dashboard_dashboard_settings_modules_page_tsx` is in community **23** of `graphify-out/graph_app.json`. It describes an older implementation; the findings prioritize current source code.
- **Live browser verification unavailable:** both in-app and regular-browser control attempts timed out. No claim is made about current on-screen values, visual polish, responsive rendering, or measured accessibility.
- **Automated tests not verified:** focused Jest invocations did not produce completed test results. A configuration-loading attempt reported TypeScript error `TS5095`; subsequent attempts did not complete before they were interrupted. This is not evidence of test assertion failures, and no passing-test claim is made.
- **Performance not measured:** query-cost and failure-coupling observations are architectural concerns requiring representative measurements.
- **Changes during the review:** no application code, subscription, entitlement, or operational configuration was modified.

This publication preserves the analysis from the conversation. Publishing the report does not establish a new live audit or replace the verification limitations above.