# Top 10 Codex Skills to Advance Stoquify Toward OHADA SMB Operating-System Leadership

Date: 2026-07-11

Audit mode: Static codebase audit. No code changes were made as part of the audit. The report expands the requested "Top 5" framing to 10 ranked skills because the prompt explicitly requested at least 10 skills.

## Executive Summary

Stoquify already has serious enterprise foundations: service boundary gates in `package.json`, tenant/RBAC controls in `lib/security/rbac.ts`, protected action wrappers in `services/_shared/protect.ts`, ledger posting controls in `services/accounting/posting.service.ts`, public receipt token hardening in `services/pos/receipt.service.ts`, and a clear UI constitution in `docs/UI/UX/AQSTOQFLOW_UI_CONSTITUTION_2026-06-26.md`.

The next leap is repeatability. The platform does not only need more features; it needs durable Codex skills that encode the engineering judgment required for an OHADA-focused SMB operating system: service-owned truth, ledger-first operations, tenant-safe authorization, evidence-backed reporting, statutory honesty, and role-centered daily workflows.

Priority scale: `1` = create first, `5` = later.

## Ranked Skills

### 1. stoquify-service-boundary-ratchet

Priority: `1`

Core mission: Keep business truth owned by services, not pages, actions, API routes, or client state.

Why it matters strategically: This is the foundation for finance-grade correctness. RBAC, accounting, inventory, purchasing, payments, reports, and UX all become weaker when business rules leak outside the service layer.

Codebase evidence:

- `package.json` includes service-boundary, API guard, module inventory, policy gate, and repo verification scripts.
- `services/_shared/protect.ts` centralizes protected action behavior, tenant checks, module access, safe error responses, and correlation metadata.
- `app/api/v1/organisations/route.ts` and `app/api/v1/organisations/[id]/items/route.ts` show improved service-backed API patterns.
- `actions/item/items.ts` and inventory actions still justify recurring checks for permission consistency, safe error envelopes, and direct-truth leakage.

What the skill should inspect or modify: Direct Prisma/database access outside approved services, caller-supplied organization IDs, route-local business logic, unprotected actions, unsafe API routes, permission gaps, and legacy service splits. It should modify only by moving ownership into services or adding boundary ratchets.

Done means: All newly touched workflows derive tenant/user context from trusted server context, call service-owned business logic, expose safe responses, and pass the relevant boundary gates.

Suggested verification: `npm run service:boundary:fail`, `npm run api:guard:inventory:fail`, `npm run module:surface:inventory`, focused Jest suites for touched domains.

Risk if not created: Every future feature can silently reopen tenant, ledger, workflow, or API bypasses.

### 2. stoquify-ledger-close-truth-guardian

Priority: `1`

Core mission: Guarantee every material economic event reaches the ledger, source links, audit trail, and close invalidation path.

Why it matters strategically: Stoquify can only become accountant-grade if operational workflows and accounting truth stay inseparable.

Codebase evidence:

- `services/accounting/posting.service.ts` enforces posting, reversal, open-period, balanced-journal, postable-account, sensitive-action, audit, source-link, and close-invalidation behavior.
- `services/reconciliation/payment-suspense-workflow.service.ts` links suspense posting to period checks, maker-checker context, inbox evidence, notifications, and close invalidation.
- `services/events/business-event.service.ts` provides idempotent business-event recording with payload hashing and outbox support.

What the skill should inspect or modify: Journal posting, reversals, POS posting, inventory adjustments, goods receipt, purchasing/AP, payments, expenses, suspense, close assurance, source links, period checks, and business-event coverage.

Done means: No material workflow produces financial state without ledger/source evidence, idempotency, auditability, and close invalidation where appropriate.

Suggested verification: Accounting, reconciliation, close-assurance, period, source-link, and sensitive-action tests; evidence reports showing every workflow's posting path.

Risk if not created: Stoquify may look operationally complete while producing unverifiable or close-breaking books.

### 3. stoquify-rbac-tenant-freshauth-enforcer

Priority: `1`

Core mission: Make tenant isolation, module entitlement, permission taxonomy, and fresh-auth checks consistent across server actions, APIs, services, and sensitive workflows.

Why it matters strategically: Trust in a multi-tenant finance system starts with proving users can only do what their role, organization, subscription, and freshness state allow.

Codebase evidence:

- `lib/security/rbac.ts` defines RBAC context, permission enforcement, org assertions, and audit decisions.
- `lib/security/server-authz.ts` provides API session, module access, and permission helpers.
- `services/_shared/protect.ts` already supports permission, module access, tenant assertion, and optional fresh-auth requirements.
- `scripts/module-surface-inventory.js` and generated module inventory reports show the need for continuing enforcement discipline.

What the skill should inspect or modify: Permission names, action/API guards, module access, sensitive-action requirements, fresh-auth requirements, tenant assertions, stale session organization use, and role-specific workflows.

Done means: All protected surfaces use canonical permissions, trusted tenant context, module entitlement checks, and fresh-auth for sensitive operations.

Suggested verification: `npm run module:surface:inventory`, `npm run policy:gates`, RBAC tests, API guard inventory, focused route/action authorization tests.

Risk if not created: Cross-tenant or over-privileged workflows become the fastest path to enterprise failure.

### 4. stoquify-public-api-abuse-boundary

Priority: `2`

Core mission: Harden public, customer-facing, and API-facing boundaries against raw-ID access, data leakage, replay, scraping, unsafe errors, and secret exposure.

Why it matters strategically: Public convenience features such as receipts and customer links become liabilities unless they are token-gated, redacted, rate-limited, and observable.

Codebase evidence:

- `services/pos/receipt.service.ts` separates public receipt access, token verification, and contact-field redaction.
- `scripts/public-receipt-token-config-gate.js` verifies token helper behavior, expiry, timing-safe comparison, secret configuration, route protection, and service verification.
- `scripts/api-route-guard-inventory.js` inventories API route guard behavior and public-route risks.

What the skill should inspect or modify: Public routes, receipt links, uploads, exports, customer-facing documents, API responses, route errors, redaction behavior, rate limits, and token/secret configuration.

Done means: No public or customer-facing route exposes sensitive data through raw IDs, missing tokens, unsafe errors, or unredacted payloads.

Suggested verification: `npm run receipt:token:config-gate`, `npm run api:guard:inventory:fail`, public route tests proving token gating and contact redaction.

Risk if not created: Customer-facing routes become privacy, abuse, and compliance risk.

### 5. stoquify-purchasing-ap-consolidator

Priority: `2`

Core mission: Turn purchasing, receiving, supplier invoices, AP controls, and payment readiness into one controlled operational spine.

Why it matters strategically: Purchasing is where stock, supplier commitments, payables, approvals, evidence, and cash obligations meet. Weakness here breaks both operations and accounting.

Codebase evidence:

- `services/purchase-order/purchase-order.service.ts` is large and owns PO creation, approval, goods receipt, inventory posting, line reconciliation, deletion/archive behavior, analytics, CSV export, and form options.
- Existing purchasing/AP service surfaces indicate this domain needs consolidation and repeatable guardrails.
- Hard-delete gates and AP readiness checks already exist and should become part of the skill's normal loop.

What the skill should inspect or modify: PO lifecycle, goods receipts, supplier invoice matching, AP postings, supplier evidence, line deletion rules, maker-checker controls, archive behavior, and read/write model separation.

Done means: There is no orphaned PO, receipt, invoice, stock, payable, or payment state; AP transitions are evidence-backed and permission-controlled.

Suggested verification: Purchasing/AP focused tests, `npm run hard-delete:fail`, inventory valuation tests, AP readiness reports, and focused service tests for PO approval/receipt/invoice paths.

Risk if not created: Inventory, payables, cash, and supplier balances drift apart.

### 6. stoquify-payment-recon-cash-truth-moat

Priority: `2`

Core mission: Make bank, mobile money, cash drawer, POS, suspense, and ledger reconciliation a defensible moat.

Why it matters strategically: Owners and accountants need cash truth daily. Reconciliation is one of the most commercially defensible places for Stoquify to lead.

Codebase evidence:

- `services/reconciliation/payment-suspense-workflow.service.ts` handles suspense assignment, proposal, approval, posting, period checks, maker-checker context, inbox evidence, and close invalidation.
- `services/payments/statement-import.service.ts` supports statement import and provider-account evidence.
- Payment reconciliation documentation already frames proof trails, stale provider accounts, evidence completeness, and close blockers.

What the skill should inspect or modify: Provider imports, bank/mobile-money statements, POS cash evidence, matching, suspense, stale accounts, unmatched payments, close blockers, proof exports, redaction, and provider health.

Done means: No payment is trusted without provider, bank, cash, POS, or suspense evidence; close packs block on unresolved material exceptions.

Suggested verification: Payment, reconciliation, accounting period, close-assurance, and sensitive-action suites; payment reconciliation evidence reports.

Risk if not created: The product cannot credibly claim cash truth.

### 7. stoquify-statutory-country-pack-production-gate

Priority: `3`

Core mission: Prevent false production-readiness claims for OHADA/SYSCOHADA, tax, declarations, payroll, and country adapters.

Why it matters strategically: A statutory product must be honest about what is sandbox, expert-reviewed, production-supported, blocked, or not yet certified.

Codebase evidence:

- `services/compliance/adapters/cameroon-dgi-sandbox.ts` explicitly refuses production submission and requires posted ledger evidence.
- `services/compliance/adapters/registry.ts` blocks unknown production adapters without official specifications, sandbox proof, and expert review.
- `services/payroll/payroll-tax-rule-evaluator.ts` and payroll control services include expert-review and production-support statuses.

What the skill should inspect or modify: Country packs, statutory exports, fiscal adapters, declaration lifecycle, payroll tax rules, legal disclaimers, production flags, and expert-review evidence.

Done means: Unsupported countries and obligations remain blocked; supported flows carry reviewed evidence, production support status, and no misleading certification language.

Suggested verification: Compliance adapter tests, payroll statutory tests, declaration lifecycle tests, country-pack readiness reports.

Risk if not created: Statutory credibility becomes marketing language instead of controlled product truth.

### 8. stoquify-offline-pos-fiscal-replay-finalizer

Priority: `3`

Core mission: Make offline POS usable without corrupting fiscal numbering, inventory, cash, or ledger evidence.

Why it matters strategically: Offline capability is essential for many SMB environments, but final fiscal claims must remain server-owned and replay-safe.

Codebase evidence:

- `lib/pos/offline-local-queue.ts` creates offline queue entries with device ID, device sequence, idempotency key, entry hash, and provisional receipt safeguards.
- `services/pos/offline-sync.service.ts` handles offline devices, conflict state, replay status, blocker messages, idempotency, and event evidence.

What the skill should inspect or modify: Device identity, sequence chains, idempotency keys, replay outcomes, conflict resolution, provisional receipts, fiscal certification, ledger posting, inventory posting, and payment evidence.

Done means: Duplicate replay is impossible; offline receipts remain provisional until server certification; inventory, cash, and ledger outcomes are consistent.

Suggested verification: Offline POS sync/replay tests, POS smoke tests, idempotency conflict tests, receipt certification checks.

Risk if not created: Offline POS may work operationally but fail legally, fiscally, or financially.

### 9. stoquify-report-trust-export-certifier

Priority: `3`

Core mission: Make reports and exports accountant-grade through provenance, filters, currency, period status, row counts, redaction, and certification state.

Why it matters strategically: Reports are where users make decisions and auditors ask questions. Trust metadata must travel with every important number.

Codebase evidence:

- `components/reports/cash-flow-report.tsx` uses `ReportTrustBanner`, showing the product already values report provenance.
- Accounting, analytics, payroll, compliance, close-pack, and CSV export services create many future trust surfaces.
- Report formatting and currency behavior should be repeatedly checked for OHADA/XAF correctness and organization-specific context.

What the skill should inspect or modify: Cash-flow reports, BI dashboards, accounting reports, payroll reports, compliance exports, close packs, CSV/PDF exports, currency formatting, redaction, provenance, and evidence status.

Done means: Material reports include provenance, currency, filters, period state, row counts, trust status, and export-safe redaction.

Suggested verification: Report snapshot tests, export tests, provenance assertions, redaction tests, currency correctness checks.

Risk if not created: Users may act on attractive reports whose numbers cannot be defended.

### 10. stoquify-role-based-operating-cockpit-uiux

Priority: `4`

Core mission: Convert enterprise controls into clear daily workspaces for owners, accountants, finance officers, cashiers, managers, warehouse teams, purchasing teams, and POS users.

Why it matters strategically: Correctness alone will not make Stoquify the daily operating home. Each role needs clarity, prioritization, and actionability without breaking business-truth boundaries.

Codebase evidence:

- `docs/UI/UX/AQSTOQFLOW_UI_CONSTITUTION_2026-06-26.md` defines authenticated product UI direction, command-center anatomy, route density, semantic tokens, and anti-patterns.
- `docs/product/user-experience/ui-registry.md` records the dark enterprise command-center style and token expectations.
- Existing UI/UX phase reports cover Today's Operating Truth, command-center primitives, robust states, and accessibility/visual regression governance.

What the skill should inspect or modify: Route anatomy, role dashboards, shell/navigation, empty/loading/error states, command-center primitives, mobile parity, accessibility, visual regressions, and client-derived metrics.

Done means: Each role's daily cockpit exposes trusted operating truth, clear next actions, robust states, and visual consistency with the UI constitution.

Suggested verification: Accessibility scans, visual screenshots, route anatomy checklists, UI constitution review, focused interaction smoke tests.

Risk if not created: Stoquify may be correct underneath but fail to become the enjoyable daily workspace users choose.

## First Skill To Create

Create `stoquify-service-boundary-ratchet` first.

It is the control layer that protects every other improvement. RBAC, accounting correctness, purchasing/AP, reconciliation, reporting, and UX all depend on service-owned truth. Without it, later skills will keep fixing symptoms while new features reopen the same classes of risk.

## Suggested Next Step

Implement the first skill as a real local Codex skill under the local skills folder, with a `SKILL.md` that:

- reads the current repository structure and boundary scripts
- runs or references the existing service/API/module inventory gates
- inspects actions, APIs, pages, services, and Prisma access
- emits a narrow remediation plan before making changes
- verifies with focused commands before declaring done
