# P0-03 analytical context: remediation design for acceptance

Date: 2026-09-02  
Program: STOQUIFY-ANALYTICS-CONTROLLED-NETWORK  
Status: PROPOSED — Finance and Data/BI owner decision required  
Implementation boundary: P0-03; runtime consumers remain unchanged in this acceptance refresh.

## Decision to review

Approve organization-owned currency and IANA timezone, explicit ISO instants, inclusive-start/exclusive-end periods, authorized location scope, and Decimal monetary aggregation. The resolver is a context normalizer; it does not authorize a tenant or location, calculate local calendar boundaries, perform aggregation, or certify supported currencies.

The [roadmap](../STOQUIFY_ANALYTICS_NETWORK_PHASES_0_TO_3_EXECUTION_ROADMAP_2026-08-30.md) asks P0-03 for an approved remediation design. The [work-package registry](../STOQUIFY_ANALYTICS_NETWORK_PHASES_0_TO_3_WORK_PACKAGE_REGISTRY_2026-08-30.json) also requires that no target metric rely on XAF defaults, that organization timezone determine day boundaries, and that monetary totals use fixed precision. Those runtime conditions are not satisfied by an approved design alone.

Recommended disposition: retain the stricter registered acceptance criteria and complete the Business Pulse adapter within P0-03 after the currency and period policies are approved. If the accountable Product, Finance, and Data/BI owners instead choose design-only acceptance, they must explicitly reassign the three runtime criteria to P1-01, record the dependency and evidence there, and keep the new analytics unavailable until those criteria pass. No scope reassignment is made by this document.

## Current evidence and required changes

| Area | Current code | Required implementation / completion proof |
|---|---|---|
| Organization metadata | Organization has currency and timezone fields in prisma/schema.prisma. The resolver accepts supplied values. | Read metadata by the organization ID derived from the authenticated server context. Validate currency against an approved supported-currency source; reject missing or unsupported metadata. No request-provided currency may relabel source money. |
| Currency validation | analytical-context-contracts.ts checks three letters and uses Intl for precision. Intl accepts XYZ with two fraction digits. | Finance selects the supported-currency policy. Enforce it before returning ready; unknown, special no-currency codes, and unsupported source currencies produce a typed blocker. Intl formatting support is not country or product support approval. |
| Business Pulse currency | sales-analytics.service.ts:143, 647 and 829 retain XAF defaults; getBusinessPulseCommandReadModel does not load organization currency. | Supply validated context to both ready and blocked composition. Missing context shows a typed unavailable state without a fabricated currency. |
| Calendar boundaries | sales-analytics.service.ts uses startOfDay/endOfDay in queries and composition. The resolver only normalizes instants supplied by a caller. | Derive local calendar boundaries from organization timezone once, convert to UTC instants, and pass them through all source queries and result provenance. Use gte start / lt end; remove endOfDay and server-local assumptions from the target path. |
| Precision | Monetary reductions convert source values to JavaScript number at sales-analytics.service.ts:185 and related reductions; display formatting fixes maximumFractionDigits to zero at 1217. | Aggregate source Decimal values without number conversion. Keep exact decimal strings or existing Decimal-safe contracts through composition. Format with organization precision. Approve display rounding separately from source accounting calculation; do not change posting rules. |
| Scope | Resolver checks nonempty IDs, but does not verify ownership or grants. | Reuse existing server tenant, role, module, location, and grant checks. No user-supplied organization ID or location may broaden access. P0-06 owns the denial matrix. |
| Result / exports | BusinessPulseCommandData uses periodEnd; the new context uses periodEndExclusive. | Explicitly version/map the boundary convention. Do not silently reinterpret periodEnd in old consumers, cached results, or exports. Cache key and provenance include tenant, scope, currency, timezone, period, and contract version. |
| Invalid inputs | Typed missing/invalid fields fail closed; date parsing currently relies on Date after an explicit-offset check. | Strict ISO calendar validity is required at the input boundary; do not normalize impossible calendar dates into another period. Reject ambiguous local-only timestamps; explicit instants may be intraday and need not themselves be midnight. |

Source files: [resolver](../../services/analytics/analytical-context-contracts.ts), [context tests](../../services/analytics/__tests__/analytical-context-contracts.test.ts), [Business Pulse service](../../services/analytics/sales-analytics.service.ts), [Business Pulse DTO](../../services/analytics/business-pulse-contracts.ts), [organization money formatter](../../lib/i18n/organization-money.ts), [schema](../../prisma/schema.prisma).

Reuse the existing organization money formatter after currency validation. Its Intl behavior also does not supply a supported-currency policy. No timezone library is selected by this design; first check existing calendar utilities and pin any necessary dependency through normal review.

## Target context matrix

Every target result carries generatedAt, scope, context version, and explicit period semantics. Amounts remain separated by currency. Missing context produces an unavailable/blocked result; counts cannot disguise an unavailable monetary metric. The following is the proposed integration contract, not a claim that these models already implement it.

| Target / existing surface | Period and timezone | Currency / scope rule | Implementation owner |
|---|---|---|---|
| Business Pulse / BusinessPulseCommandData | One organization-local day; comparison day/week/month have independent explicit half-open periods | Organization currency; authorized location; exact source monetary sums | Finance Platform + Sales/POS |
| Daily Digest | Explicit interval since prior review in organization calendar; snapshot time separate | Consume canonical values and bands; no independent money formula | BI / Daily Digest |
| Manager Action Center | Operating day plus action as-of time | Authorized location only; preserve each source context | Manager Action Center + source domains |
| Owner War Room | As-of generatedAt; each underlying metric retains its own period | Tenant scope; consume canonical bands and permitted links | BI / Owner War Room |
| Finance Analytics | Explicit selected historical period and separate comparison period | Organization/source currency; no cross-currency sum | Finance / Accounting |
| Cash Flow | Explicit historical movement period | Same-currency actual movements only | Finance / Accounting |
| Cash Command / proposed CashForecastCommandReadModel | Thirteen contiguous weekly periods in the organization timezone; proposed first bucket starts at organization-local midnight on the selected forecast start date | Opening cash and source commitments retain lineage and currency; unknown coverage blocks or degrades the relevant forecast | Finance / Cash Command |
| Reconciliation / proposed ReconciliationLeakageReadModel | Exposure as-of generatedAt; event windows use explicit cutoff; elapsed age and contractual business-day SLA remain distinct | Rail/location/currency partitions; exposure is not proven loss | Payments / Reconciliation |
| Stock-to-Cash | Source as-of timestamps plus explicit selected movement period | Currency-separated valuation; no source inventory mutation | Inventory / Purchasing / Finance |
| Accountant Portfolio / proposed AccountantAdvisoryPortfolioReadModel | Each client retains its organization timezone, period, generatedAt and active-grant snapshot | Per-client currency and grant; firm summaries use counts/bands, never monetary sums across currencies | Accounting / Accountant Access |
| Referral Funnel / proposed ParticipationFunnelReadModel | Explicit cohort window and observation cutoff; legacy ALL_TIME results retain their existing label | Counts/rates with denominator quality, threshold/redaction policy; organization context does not imply access to participant identities | Growth Analytics + Privacy |
| Purchase Order Analytics | Explicit commitment/receipt period plus as-of time; date-only promised dates use organization calendar | Currency-separated commitments; supplier proposals do not become authoritative PO/AP writes | Purchasing / AP |

Phase 3 scorecards reuse these approved models and denominators. They do not introduce a new currency conversion or cross-tenant aggregation authority.

## Verification and rollout contract

This refresh adds ten focused cases to the prior eight: XOF, a three-decimal currency, organization midnight across a UTC month boundary, 23-hour and 25-hour Paris days, adjacent cutoff equivalence, empty timezone, missing organization, equal period bounds, and a timestamp without an offset.

Those cases validate explicit-input normalization. They do not prove organization-calendar calculation, real database selection, currency eligibility, source tie-out, authorization, or Decimal aggregation.

Before strict P0-03 completion, verify the actual Business Pulse path with:

1. Source events immediately before, exactly at, and immediately after both boundaries; the end event appears once in the next period.
2. The same organization-local periods under different server timezone settings, including 23/25-hour days.
3. XAF/XOF/EUR and the approved decimal-currency set; missing/unknown currency is blocked. Decimal fixtures such as 0.10 + 0.20 retain exact source totals and intended display precision.
4. Organization/location denial and missing metadata; both ready and blocked DTOs avoid currency fallback.
5. Comparison periods and exported/cached provenance agree with the same context.
6. Focused service tests and repository TypeScript validation after implementation.

Keep new analytics off until these checks and owner acceptance pass. Preserve existing routes and source workflows. Rollback is to the existing read path or explicit unavailable state; no migration, ledger adjustment, or source-record rewrite is required by this design.

## Exact owner responses required

- **Product + Finance + Data/BI:** choose strict P0-03 runtime completion (recommended), or explicitly approve the design-only scope amendment described above.
- **Finance, with Accounting consultation:** identify the supported-currency policy/source and approve Decimal source aggregation with display precision/rounding; this is an analytics contract decision, not statutory certification.
- **Finance Platform + Data/BI:** approve organization-calendar boundaries, half-open UTC queries, the proposed forecast-start convention, separate SLA semantics, context versioning, and blocked-state behavior.
- **Accountant Access / Privacy reviewers:** confirm the per-client context and aggregate-only boundaries through their relevant P0-04/P0-06 reviews.

Record the named accountable person, decision, rationale, timestamp, exact version/hashes reviewed, conditions, and evidence reference in the program decision register. Role candidates or test accounts are not approval evidence.
