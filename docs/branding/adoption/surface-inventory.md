# Stoquify branding surface inventory

14 September 2026. Source inspection, not a runtime audit. Repository has 418 tracked change entries and 688 untracked entries before this work. Preserve them. No production files were changed.

## Scope and authority

Use the solid S kit. `docs/branding/s-explorations/status.json:2` explicitly rejects the unusual S alternatives. The broader kit is still a proposed identity, not a claim of legal clearance.

The catalog in `evidence/route-catalog.json` lists 161 page files found by an app-tree scan. The table below prioritizes real branding entry points; shared components reach additional routes in that catalog. Layout groups do not form URL segments. File presence does not prove a route is deployed or accessible to a particular role.

|Priority|Surface|Route / entry|Evidence|Shared dependencies|Proposed treatment|Risk|
|---|---|---|---|---|---|---|
|P0|Shared identity|Root metadata and public favicon|`app/layout.tsx:1`|public/brand; kit-logo; Logo wrapper|Keep asset URLs compatible; replace q with solid S; preserve accessible name|Low visual; global reach|
|P1|Landing|/[locale]|`app/[locale]/(home)/page.tsx:1`|LandingHero; HeroDashboard; 12 section components; home layout|Retain section order, two-column hero, actual EN/FR messages and CTA destinations|Medium: conversion and claim accuracy|
|P1|Workflow atlas|/[locale]/workflows|`app/[locale]/(home)/workflows/page.tsx:1`|Home layout and landing theme|Inherit chrome/type; preserve source links and workflow content|Low–medium|
|P1|Waitlist|/[locale]/waitlist|`app/[locale]/(home)/waitlist/page.tsx:1`|Home layout|Apply typography and controls without changing consent/submission|Medium|
|P1|Founder preview|/[locale]/landing-preview/founder-journey|`app/[locale]/(home)/landing-preview/founder-journey/page.tsx:1`|Existing alternative landing surface|Keep clearly a preview; update only if still maintained|Low|
|P1|Auth|/[locale]/login|`app/[locale]/(auth)/login/page.tsx:1`|components/auth/AuthLayout; auth-shell; auth-copy|Local fonts, logo, paired action foreground, visible focus and errors|High behavioral sensitivity|
|P1|Registration|/[locale]/register|`app/[locale]/(auth)/register/page.tsx:1`|AuthLayout and registration components|Brand shell only; preserve validation, verification and referral behavior|High behavioral sensitivity|
|P1|Auth v2|/[locale]/login-v2; /[locale]/register-v2|`app/[locale]/(auth)/login-v2/page.tsx:1`|AuthV2Shell|Update verified alternative routes; do not redirect users as branding work|Medium|
|P1|Recovery|/[locale]/forgot-password; reset-password; unauthorized|`app/[locale]/(auth)/forgot-password/page.tsx:1`|Auth components and route-specific states|Retain non-enumeration, recovery and denied-state semantics|High|
|P2|Shell|/[locale]/dashboard/*|`app/[locale]/(dashboard)/dashboard/layout.tsx:1`|Sidebar; Navbar; useShellPermissions; module snapshot|Keep 220/280 px layout, five lanes, authorized current destination, mobile focus behavior|High shared surface|
|P2|Dashboard|/[locale]/dashboard|`app/[locale]/(dashboard)/dashboard/page.tsx:1`|EnhancedEnterpriseDashboard; operating truth; command primitives|Restyle existing controls, tabs, metrics and unavailable states; keep data selectors|High data semantics|
|P3|Inventory|/[locale]/dashboard/inventory/items|`app/[locale]/(dashboard)/dashboard/inventory/items/page.tsx:1`|Inventory route and shared table/control system|Preserve dense tables, filters, quantities and loss/stock indicators|Medium|
|P3|Sales|/[locale]/dashboard/sales|`app/[locale]/(dashboard)/dashboard/sales/page.tsx:1`|SalesClientPage; shell|Use brand actions; preserve transaction and refund meaning|Medium|
|P3|Purchasing|/[locale]/dashboard/purchase-orders|`app/[locale]/(dashboard)/dashboard/purchase-orders/page.tsx:1`|Purchase-order components; shell|Keep approvals and receiving workflow; update print presentation separately|High|
|P3|AP|/[locale]/dashboard/purchases/payables|`app/[locale]/(dashboard)/dashboard/purchases/payables/page.tsx:1`|AP workbench; finance theme|Keep invoice, liability, posting and payment states distinct|High|
|P3|Finance|/[locale]/dashboard/finance/reconciliation|`app/[locale]/(dashboard)/dashboard/finance/reconciliation/page.tsx:1`|finance-dashboard-theme; shared tables|Gold remains warning; preserve signed amounts, evidence and exception labels|High|
|P3|Accounting|/[locale]/dashboard/accounting/reports/trial-balance|`app/[locale]/(dashboard)/dashboard/accounting/reports/trial-balance/page.tsx:1`|Accounting report; finance controls|Preserve currency columns and debit/credit ordering; print black on white|High|
|P3|Analytics|/[locale]/dashboard/analytics|`app/[locale]/(dashboard)/dashboard/analytics/page.tsx:1`|analytics-dashboard-theme|Separate categorical chart colors from primary brand color|High visual data semantics|
|P3|People|/[locale]/dashboard/people|`app/[locale]/(dashboard)/dashboard/people/page.tsx:1`|People route; shell|Keep role scope, private fields and approval visibility|High|
|P3|Payroll|/[locale]/dashboard/payroll|`app/[locale]/(dashboard)/dashboard/payroll/page.tsx:1`|Payroll views; shell|Preserve draft/approved/paid distinctions and country-support caveats|High|
|P3|Governance|/[locale]/dashboard/settings/modules|`app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx:1`|Entitlement UI; shell|Visual mapping only; no new module visibility or activation|High|
|P3|Data onboarding|/[locale]/dashboard/settings/data-onboarding|`app/[locale]/(dashboard)/dashboard/settings/data-onboarding/page.tsx:1`|Existing onboarding route and states|Brand upload, progress and error frames without changing import rules|High|
|P3|Accountant portal|/[locale]/dashboard/accounting/accountant-portal|`app/[locale]/(dashboard)/dashboard/accounting/accountant-portal/page.tsx:1`|Authenticated shell; accountant controls|Small product branding; retain tenant/client identity and scoped access|High|
|P3|Customer statement|/customer-statement/[statementId] (portal implementation)|`app/customer-statement/[statementId]/CustomerStatementPortal.tsx:1`|Token-protected statement component|Keep issuer identity primary; restrained Stoquify attribution; preserve actions|High; external sensitive link|
|P3|Supplier portal|/[locale]/supplier-purchase-order/[envelopeId]|`app/[locale]/supplier-purchase-order/[envelopeId]/page.tsx:1`|SupplierPoAcknowledgementPortal|Keep buyer/supplier identity, terms and response controls|High|
|P3|POS|/[locale]/dashboard/pos|`app/[locale]/(dashboard)/dashboard/pos/page.tsx:1`|ProfessionalPOSSystem; existing POS services|Keep large touch targets, cash/checkout cues and offline state; compact logo|High transaction sensitivity|
|P3|Receipt API|/api/receipts/[receiptId]|`app/api/receipts/[receiptId]/route.ts:1`|receipt.service; receipt channels|Inspect response format before touching rendering; no API branding schema change|High; retain token privacy|
|P3|PO print|window.print entry|`components/purchase-orders/ModernPurchaseOrderDetailPage.tsx:1`|Purchase-order details and print CSS|Preserve seller/buyer and legal details; fit paper/monochrome|High document integrity|
|P3|Email|VerifyEmail template|`components/email-templates/verify-email.tsx:1`|react-email Img using public wordmark URL|Provide PNG at correct aspect ratio; explicit HTTPS asset origin; email font fallbacks|Medium; delivery integration needs tracing|
|P3|Report export|Export service boundary|`services/accounting/finance-statement-export.service.ts:1`|Existing report operations|Inspect format first; brand display headers only; no CSV/JSON schema change|High|
|P2|Shared error state|Dashboard recovery/error surfaces|`components/dashboard/DashboardErrorState.tsx:1`|DashboardErrorState; route boundaries|Keep contrast, recovery actions and distinctions between no data and no access|High|

## Cross-cutting findings

- Shared logo consumers include landing header/footer, Sidebar, AuthLayout, AuthV2Shell and the `Logo` wrapper used by Navbar. Preserve the existing component API to contain the first diff. `components/global/Logo.tsx:2`; `components/dashboard/Sidebar.tsx:144`.
- The current five lanes are **Command, Operations, Finance & Trust, People, Governance**. Keep keys, sequence, link destinations and permission/module filtering. `config/sidebar.ts:72`; `components/dashboard/Sidebar.tsx:9`.
- Current shell columns are 220 px at medium and 280 px at large widths. Compact icon use should fit that structure, not justify a new navigation layout. `app/[locale]/(dashboard)/dashboard/layout.tsx:59`.
- Core dashboard and analytics include a forced `dark` class. A global theme toggle does not by itself make these views support a light theme. Treat light support as a separate verified component pass. `components/dashboard/EnhancedEnterpriseDashboard.tsx:298`; `components/analytics/dashboard/analytics-dashboard-theme.ts:35`.
- Email artwork is an SVG forced into 75 × 45 pixels, which does not match the current 520 × 140 wordmark ratio. The origin fallback is `http://3000`. The footer also makes a registered-trademark claim that this review has not verified. Record these as a distinct email adoption slice; do not silently alter verification semantics or send a test email. `components/email-templates/verify-email.tsx:34`.
- No installable PWA manifest or service-worker registration was located in the scoped app/components/public/Next-config search. POS/offline operation must not be mistaken for an installable PWA. Do not add a manifest, service worker or new offline behavior as branding work.
- Merchant documents must retain the merchant's identity. Brand Stoquify chrome/attribution where appropriate, not the issuer's logo or statutory facts. CSV/JSON exports generally receive no decorative branding.

## Historical evidence

The August graph locates Sidebar in community 60 and Navbar in community 77; selected nodes/edges are saved in `evidence/graph-excerpt.json`. These are navigation hints; current imports and the September navigation changes take precedence. `graphify-out/POST_SLICE_438_GRAPH_REFRESH_2026-08-09.md:1`.

The 8 September shell report documents most-specific current selection, collapse/reopen, mobile Escape/focus, search behavior and permission revocation checks. Preserve these behaviors. The 9 September robust-states report is context, not new certification. `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_02_SHELL_NAVIGATION_REPORT_2026-09-08.md:1`.
