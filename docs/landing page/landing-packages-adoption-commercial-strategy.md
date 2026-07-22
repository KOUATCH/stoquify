# Stoquify Packages and Adoption Commercial Strategy

**Date:** 2026-07-18
**Scope:** Repository-backed package strategy and public landing presentation
**Decision:** Use a platform foundation, three adoption paths, controlled extensions, and separately scoped delivery services. Keep pricing quote-led until durable package, subscription, entitlement, and billing truth exists.

## Executive Recommendation

Stoquify should not launch ten independent module SKUs or a generic three-tier SaaS ladder. The product is an interconnected operating system: some capabilities are always-present controls, some are workflow packages, and others carry provider, country, privacy, or assurance costs that need distinct commercial treatment.

The recommended public architecture is:

1. **Platform Foundation:** dashboard, tenant settings, roles, organization scope, and baseline operational controls. It is always included and is not sold as a standalone module.
2. **Operations Core:** inventory, sales, purchasing, suppliers/customers, and source-aware operating reports.
3. **Finance and Assurance:** finance, OHADA accounting, payment reconciliation, close assurance, and compliance, introduced in dependency-aware stages.
4. **People and Payroll:** HRIS/presence foundations, controlled payroll processing, payslip/declaration/payment evidence, and accounting handoff, subject to country, privacy, and release validation.
5. **Extensions:** retail POS and continuity, payment-provider reconciliation, production operations, and source-aware intelligence/growth capabilities.
6. **Delivery services:** onboarding and migration, country-pack setup, provider adapters, and assurance/support services.

This is a better fit than an all-inclusive "enterprise" card because it makes costly or sensitive boundaries explicit and lets customers buy the operating outcome they need.

## Repository Evidence

The recommendation was checked against:

- the 20-entry canonical module catalog and its current dependency metadata;
- the tenant entitlement evaluator, which still derives live truth from registration intent or legacy defaults;
- the module-system current-state proposal and the ten-package design catalog;
- the module program register, where durable package/subscription stages remain blocked behind security, vocabulary, enforcement-truth, and registry work;
- the absence of durable package, subscription, module-billing, provisioning, dunning, and reconciliation services;
- existing POS, finance, OHADA accounting, reconciliation, close, compliance, payroll, HRIS, offline, and reporting surfaces;
- the existing bilingual landing page and public UI smoke patterns.

Important current truth: the package catalog is still a proposal, package pricing is not approved, automated provisioning does not exist, and provider events must never directly grant or revoke runtime access.

## Customer Segments

| Segment | Primary job | Recommended starting path | Likely extension |
|---|---|---|---|
| Counter-led retailer | Sell, control stock, drawers, receipts, and branch activity | Operations Core | Retail POS and continuity |
| Stock-heavy distributor | Control items, purchasing, suppliers, locations, and receivables | Operations Core | Finance and Assurance |
| Multi-branch operator | Standardize locations, approvals, provider evidence, and close | Operations Core + Finance and Assurance | Intelligence and managed support |
| Finance-formalizing SMB | Move from operational records to OHADA ledger and explainable close | Finance and Assurance | Country pack and accountant onboarding |
| Workforce-formalizing SMB | Control people data, time, payroll inputs, outputs, and postings | People and Payroll | Country/payroll setup and managed support |
| Production business | Connect inventory consumption, batches, costing, and yield | Operations Core | Production Operations after beta validation |

## Commercial Model Hypotheses

These are hypotheses for discovery and unit-economics validation, not approved prices.

| Commercial layer | Suggested charging unit | Rationale | Guardrail |
|---|---|---|---|
| Platform and Operations Core | Organization base plus active operating locations | Reflects shared platform cost and branch value without taxing every occasional user | Keep roles, security, tenant isolation, backups, and baseline audit controls included |
| Retail POS and continuity | Active location/terminal, with hardware and payment fees separate | POS support and offline/device operations scale with deployed sites | Do not hide required sales/inventory dependencies |
| Finance and Assurance | Organization plus assurance scope and active provider connections | Reconciliation, close, compliance, and provider operations create specialist cost | Never promise statutory outcomes; price qualified setup and support separately |
| People and Payroll | Organization base plus active employees in a payroll period | Aligns price to payroll workload and customer value | Bill only active employees; preserve legally required history and redaction controls |
| Country packs and adapters | Country/provider setup plus recurring maintenance where justified | Country rules and external adapters have distinct validation and maintenance costs | Publish scope, provenance, limitations, and change responsibility |
| Implementation and migration | Fixed-scope or milestone-based service | Data cleanup, mapping, controls, training, and rollout are not ordinary subscription support | Define acceptance evidence and exclusions before work starts |
| Managed assurance/support | Support tier or annual service agreement | Dedicated review, response targets, and operational assistance create real delivery cost | Keep a usable baseline support path in every subscription |

### Pricing validation sequence

1. Interview target customers around buying jobs and current software/service spend.
2. Build bottom-up cost models for hosting, support, provider events, SMS/messaging, country-pack maintenance, payroll processing, and implementation labor.
3. Quote a small number of design partners using the proposed charging units.
4. Measure activation time, support load, retained usage, willingness to expand, and gross margin by path.
5. Approve regional price books only after tax, currency, reseller, collections, and provider-cost assumptions are reviewed.

## Market Sanity Check

Current official pricing pages show several useful patterns:

- [Odoo](https://www.odoo.com/pricing) packages a broad app suite per user, keeps required app dependencies together, and excludes implementation/expert services from the software subscription.
- [Zoho One](https://www.zoho.com/one/pricing/) distinguishes flexible-user and all-employee licensing and separately offers Jumpstart/Concierge implementation help.
- [Shopify POS](https://www.shopify.com/pos/pricing) combines a platform plan, transaction economics, location-based POS upgrades, and separate hardware.
- [Gusto](https://gusto.com/product/pricing) combines a monthly base, active-person pricing, capability tiers, support, and add-ons.

The inference for Stoquify is to avoid one universal meter. Organization/location economics fit operations; active-employee economics fit payroll; provider/country scope fits regulated integrations; and implementation should remain separately scoped. Foreign list prices are not a substitute for OHADA-market research.

## Landing Experience Implemented

The public Adoption section now presents:

- an always-included Platform Foundation;
- three bilingual outcome-led adoption paths;
- dependency-aware controlled extensions;
- commercial charging drivers without unsupported numeric prices;
- onboarding, country-pack, provider, and assurance delivery services;
- a quote-led rollout CTA and readiness language instead of fictional self-service checkout.

The section uses an accessible three-view tab pattern, keyboard navigation, stable responsive layouts, and explicit data hooks for browser evidence.

## Control-Plane Dependencies Before Self-Service Sales

1. Close the open tenant-scope, grant-ceiling, and verified step-up security prerequisites.
2. Freeze module ownership and dependency vocabulary, including HRIS.
3. Reconcile mixed enforcement truth and complete critical surface registration.
4. Add versioned package, subscription, entitlement, lifecycle-event, and migration records.
5. Implement internal subscription and idempotent provisioning services before a billing provider adapter.
6. Prove downgrade, read-only retention, reactivation, provider drift, support, and rollback behavior.
7. Approve package composition, tax/currency rules, price books, and contractual scope through product and finance governance.

## Non-Claims

- No price, discount, revenue forecast, conversion rate, or margin is approved by this document.
- No package, subscription, billing, entitlement, or provisioning runtime was implemented.
- No broad module enforcement, provider authorization, migration, deployment, commit, or push occurred.
- Production, HRIS/payroll, compliance, country packs, and external adapters remain subject to their documented readiness and validation boundaries.
