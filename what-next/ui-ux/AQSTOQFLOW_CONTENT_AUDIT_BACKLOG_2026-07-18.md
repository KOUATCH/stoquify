# Stoquify Content Audit Backlog

**Date:** 2026-07-18
**Phase:** UI/UX Phase 07 follow-on
**Completed scope:** Landing, login, registration, and focused public control language

## Purpose

This backlog records content work intentionally left outside the focused public-first-impression change. It prevents the landing and authentication revamp from becoming an unsafe mass rewrite of operational workflows.

## Priority 0: High-Risk Product Messages

| Area | Audit target | Acceptance condition |
| --- | --- | --- |
| Payments and reconciliation | Provider states, unmatched items, suspense, settlement, retry, and reversal copy | Every state distinguishes recorded, provider-confirmed, matched, reviewed, released, and failed outcomes. |
| Accounting and close | Posting, period locks, invalidation, certification, and export language | Copy never implies completed close while blockers, unposted entries, or unresolved evidence remain. |
| Compliance and country packs | Fiscal documents, authority evidence, adapters, and filing messages | Legal claims are qualified; unknown and provider-dependent states remain explicit. |
| Payroll | Run, approval, payslip, declaration, payment, and posting states | Copy separates calculation, approval, payment evidence, declaration status, and accounting posting. |
| Access and approvals | Permission denial, fresh verification, double validation, and module access | Users can tell whether access, role, assurance, subscription, or workflow state caused a block. |

## Priority 1: Daily Operational Surfaces

| Area | Audit target | Acceptance condition |
| --- | --- | --- |
| Dashboards | Headings, indicators, exception queues, freshness, and next actions | Every signal leads to a source workflow and avoids decorative metrics. |
| POS and receipts | Session, drawer, sale, return, receipt token, and offline replay copy | Operator, payment, receipt, and synchronization states are not conflated. |
| Inventory | Counts, transfers, adjustments, write-offs, valuation, and availability | Quantity changes state actor, location, reason, approval, and effective status. |
| Purchasing and suppliers | Request, order, receipt, invoice, match, approval, and payment readiness | Terms remain consistent across purchasing and payables. |
| Sales and customers | Order, invoice, credit, receipt, dispute, and receivable state | Commercial and financial state are clearly separated and connected. |
| People and attendance | Contract, presence, leave, manager approval, and payroll-input readiness | Employee, manager, payroll, and administrator actions use role-specific language. |

## Priority 2: Cross-System Consistency

| Area | Audit target | Acceptance condition |
| --- | --- | --- |
| Empty states | Module pages and tables | Each state explains absence, impact, dependency, and next action. |
| Loading and freshness | Async pages, jobs, provider reads, and offline sync | Copy distinguishes loading, queued, processing, stale, retrying, and failed. |
| Notifications | Success, warning, failure, and partial completion | Messages name the action, resulting state, retained safety, and follow-up. |
| Forms | Labels, helper text, validation, and destructive confirmation | Users understand required data, business consequence, and recovery. |
| Tables and filters | Columns, units, statuses, tooltips, and saved views | Vocabulary and units are consistent across modules and locales. |
| Exports and evidence | Generation, scope, date, source, hash, and access | Copy states what was exported and whether it is authoritative or provisional. |

## Localization Follow-Up

- Perform a native French editorial review of public and auth copy.
- Decide whether to migrate the catalog from ASCII transliteration to correct French diacritics.
- Build a shared glossary for OHADA accounting, payroll, payment reconciliation, and access control.
- Add automated English and French key-parity checks beyond the public surface.
- Review long French strings at 390 px, 834 px, and 1440 px.

## Evidence and Ownership

Each backlog slice should produce a scoped message inventory, before and after examples, capability evidence, focused parity tests, browser screenshots, and a dated report under what-next/ui-ux.

Product, accounting, payroll, compliance, and security owners should approve terms in their control boundary before release.
