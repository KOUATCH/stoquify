# Landing message — claims assessment

Assessment date: 19 September 2026. Scope: the current local workspace, not production certification.

## Evidence standard

Running code supports a claim only within the conditions actually exercised. Implemented code, historical screenshots, mock-backed tests and live transactions are different evidence levels. Roadmaps remain proposals. No roadmap item was promoted to a shipped promise from documentation alone.

The before captures are from 15 September. Revised pages are captured on 19 September. The product image embedded in the landing page is dated **18 July 2026** and labeled as historical, not live data.

## Chosen message

Primary audience: owners and managers of retail and distribution businesses in OHADA markets.

Central problem: sales, stock, purchasing and payment records become difficult to follow when teams work in separate tools.

Three practical benefits:

1. Review daily issues and open the underlying record.
2. Follow stock and money movements back to their sources.
3. Prepare accounting review from recorded operations.

These are qualitative workflow benefits, not measured savings or a guarantee of compliance. They depend on enabled modules, permissions, locations, current records and reviewed configuration.

## Claim decisions

| Claim or implication | Evidence inspected | Decision and limit |
| --- | --- | --- |
| Signup immediately delivers a configured business system | `services/users/user-identity.service.ts`, `registerOrganizationAccount`; `hooks/useRegisterWorkflow.ts`; identity/public-action tests | **Corrected.** Signup records organization details and creates an unverified administrator. It does not configure every module, location, opening balance or connection. |
| Email verification is the next step | Unverified identity creation; registration result's `verificationRequired`; verification/recovery component tests | **Retained.** Enter the emailed code, then sign in. Mock-backed tests do not prove delivery to a real mailbox. |
| See what needs attention | `services/manager-action-center/manager-action-center.service.ts` and its tests | **Conditional.** Scoped action queues and source-linked actions exist. A new empty workspace is not promised populated or complete operational results. |
| Follow stock movements | `services/inventory/inventory-stock-event.service.ts` and its tests | **Conditional.** Stock events and controls are implemented. This does not certify a live tenant's inventory accuracy. |
| Follow purchasing records | `services/purchase-order/purchase-order.service.ts` and its isolated tests | **Conditional.** Purchase-order workflows exist; authority and supplier/item/location setup still apply. No purchase was created in this task. |
| Compare payments with statements or provider evidence | `services/reconciliation/payment-reconciliation-run.service.ts`; auto-match tests covering matched, missing and mismatched evidence | **Conditional.** Requires supported evidence sources and account setup. No universal provider connectivity, payment execution or automatic settlement promise. |
| Prepare accounting review | `services/accounting/postings/post-sale.ts` and tests exercising posting/source/period controls | **Conditional.** Accounting needs reviewed settings and opening data. This is not an audit opinion, statutory filing or compliance certification. |
| Product screenshot shows current live operations | Existing redacted PNG, identical to its July archive | **Rejected.** Visible bilingual captions give the historical date. Image is unchanged and uncropped. |
| Hero sale/stock figures are actual results | New illustrative sample with explicit EN/FR labeling | **Rejected.** No customer ROI, accuracy or productivity percentage is invented. |
| Payroll, country features, offline selling and every integration work at signup | Mixed implementation/proposal scopes; not certified end to end here | **Not promoted.** Removed the primary-page module catalogue. Explicit supported-scope/setup caveats remain. Adoption options are not instant activation. |
| Primary CTA starts deployment or activates a plan | Registration destination and unchanged registration workflow | **Corrected.** “Create your account” / “Créer votre compte” opens registration. Adoption details remain a separate disclosure. |
| Returning users need a product catalogue before login | Existing sign-in flow needs credentials, recovery and return context | **Removed.** Centered form, localized errors and recovery; organization access settings still apply. |

## Immediate versus after setup

Immediately after successful registration: organization information, an administrator identity awaiting email verification, and a verification destination. The canonical registration service creates a default location only when one is explicitly supplied; the standard form does not promise one.

After verification: sign in; confirm enabled modules; configure locations, items and team access; prepare initial records and accounting settings. Bank/provider connections, tax-authority channels, payroll and offline operations require their own supported scope and prerequisites.

## Evidence index

- [Before route/screenshot evidence](../before-route-smoke.json): six public routes, 15 September.
- [Core capability tests](../capability-tests-2026-09-19.json): 107 passing tests across identity, action center, inventory events and sales posting.
- [Purchasing/reconciliation tests](../verification-2026-09-19/purchasing-reconciliation-tests.json): 42 passing tests, two isolated service suites.
- [Public/auth regression results](../verification-2026-09-19/unit-tests.json).
- [Browser results](../verification-2026-09-19/browser-results.json): real local UI checks; mocked API cases explicitly labeled.
- [Auth preservation comparison](../verification-2026-09-19/auth-behavior-preservation.json): exact comparison to the pre-implementation working-tree source, not clean Git HEAD.

Production availability, live provider coverage, statutory acceptance, real email delivery, complete new-tenant onboarding and customer financial accuracy remain outside this evidence. Do not remove those qualifications without separate environment-specific verification.
