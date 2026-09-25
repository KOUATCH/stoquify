# Evidence and verification notes

[Guide home](README.md)

Source inventory timestamp: 2026-09-06T16:50:15.390Z. Package assembly: 2026-09-06T16:50:20.522Z.

The browser entry attempt to http://localhost:3000/en/dashboard redirected to http://localhost:3000/en/login. No dashboard UI was observed after authentication; no dashboard control was exercised. No screenshots of business data were captured. No account, invitation, transaction, configuration, migration, seed or application source was changed by this documentation task. Earlier work in this conversation is outside this inspection's change scope.

## Coverage

130 route patterns; 108 source-only; 7 redirect; 7 partial; 7 shared implementation; 1 placeholder. These source classifications are mutually exclusive. Runtime blocking overlaps all 130 routes; it must not be added as a separate disjoint route count. Dynamic patterns represent a page type, not every database record. No representative authorized record was available.

The register contains 3532 rows: 74 explicitly source-reviewed control instances plus static JSX candidates. A repeated shared control can have one row per route; these are not unique live controls. Candidate rows include unresolved translations, dynamic labels, conditional/dormant code and shared barrel exports. Every extracted candidate has either an explanation or an explicit uncertainty; this is not proof that dynamic runtime-only controls are exhaustively known.

## Source and navigation

[Coverage register](coverage.csv) · [Control register](controls.csv) · [Navigation inventory](<E:/ohada saas/Focused projects/stoquify/what-next/dashboard-user-guide/evidence/navigation.csv>) · [Source manifest](<E:/ohada saas/Focused projects/stoquify/what-next/dashboard-user-guide/evidence/source-manifest.csv>) · [Verification log](<E:/ohada saas/Focused projects/stoquify/what-next/dashboard-user-guide/evidence/verification.json>). 17 application route-handler files are recorded separately as non-page endpoints; they are not counted as dashboard pages. Test fixtures, backup page files and non-page helpers are not page routes.

Current source route/component/action/service files take precedence over planning reports. Knowledge-graph reports dated 2026-08-09 were consulted for relationships; they predate this snapshot and cannot prove new behavior. No certification, external provider connectivity, statutory suitability, security audit or accessibility conformance is asserted.

## Unresolved navigation destinations

- My Profile: `/en/dashboard/profile` — no page route discovered; [components/UserDropdownMenu.tsx:183](<E:/ohada saas/Focused projects/stoquify/components/UserDropdownMenu.tsx:183>).
- Settings (account menu): `/en/dashboard/settings` — no page route discovered; [components/UserDropdownMenu.tsx:183](<E:/ohada saas/Focused projects/stoquify/components/UserDropdownMenu.tsx:183>).
- Billing & Plans: `/en/dashboard/billing` — no page route discovered; [components/UserDropdownMenu.tsx:183](<E:/ohada saas/Focused projects/stoquify/components/UserDropdownMenu.tsx:183>).

## Focused supporting tests read

Existing tests were read, not run, for POS close/cash-only checkout, inventory transfer posting/separate approval, AP read-only presentation, customer statement preparation/delivery, analytics provenance and reconciliation controls. No broad build/test suite was needed for documentation.

- [components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx:1](<E:/ohada saas/Focused projects/stoquify/components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx:1>)
- [services/inventory/__tests__/inventory-transfer.service.test.ts:1](<E:/ohada saas/Focused projects/stoquify/services/inventory/__tests__/inventory-transfer.service.test.ts:1>)
- [components/purchasing/__tests__/APControlWorkbench.presentation.test.tsx:1](<E:/ohada saas/Focused projects/stoquify/components/purchasing/__tests__/APControlWorkbench.presentation.test.tsx:1>)
- [components/customers/__tests__/CustomerStatementWorkflow.test.tsx:1](<E:/ohada saas/Focused projects/stoquify/components/customers/__tests__/CustomerStatementWorkflow.test.tsx:1>)
- [services/analytics/__tests__/financial-reports.service.test.ts:1](<E:/ohada saas/Focused projects/stoquify/services/analytics/__tests__/financial-reports.service.test.ts:1>)
- [services/pos/__tests__/cash-payment-history.service.test.ts:1](<E:/ohada saas/Focused projects/stoquify/services/pos/__tests__/cash-payment-history.service.test.ts:1>)
- [components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx:1](<E:/ohada saas/Focused projects/stoquify/components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx:1>)

## Review lenses

| Lens | Applied to the guide |
|---|---|
| Platform/backend/data | Route inventory, read sources, effects, caps, aliases and evidence lineage. |
| Security/privacy | Tenant/role scope, redaction, fresh identity, independent actors and export restrictions. |
| Frontend/UX/localization | Labels, navigation, forms, state/recovery and material English/French differences. Runtime accessibility and mobile layout remain unverified. |
| Finance/accounting/controls | Distinct operational and posted figures, payment settlement, stock posting and close gates. |
| HR/payroll/country packs | Identity, frozen source inputs, guarded run stages and declaration evidence. |
| Reliability/integrations | Polling, stale/error behavior, disabled mail, incomplete UI and provider/receipt boundaries. |
| Product/adoption/modularity | Practical role routines, selection versus grants/activation, workflow handoffs. |
| AI/assurance | Brief/proposal evidence, human decisions, incident and certification limits. |
| Migration/deployment/cost changes | Not applicable: read-only documentation; no deployment, migration or performance/cost change was requested. |

The review used coordinated specialist source reviewers. Recommendations are operating suggestions grounded in this snapshot; they are not new product requirements.
