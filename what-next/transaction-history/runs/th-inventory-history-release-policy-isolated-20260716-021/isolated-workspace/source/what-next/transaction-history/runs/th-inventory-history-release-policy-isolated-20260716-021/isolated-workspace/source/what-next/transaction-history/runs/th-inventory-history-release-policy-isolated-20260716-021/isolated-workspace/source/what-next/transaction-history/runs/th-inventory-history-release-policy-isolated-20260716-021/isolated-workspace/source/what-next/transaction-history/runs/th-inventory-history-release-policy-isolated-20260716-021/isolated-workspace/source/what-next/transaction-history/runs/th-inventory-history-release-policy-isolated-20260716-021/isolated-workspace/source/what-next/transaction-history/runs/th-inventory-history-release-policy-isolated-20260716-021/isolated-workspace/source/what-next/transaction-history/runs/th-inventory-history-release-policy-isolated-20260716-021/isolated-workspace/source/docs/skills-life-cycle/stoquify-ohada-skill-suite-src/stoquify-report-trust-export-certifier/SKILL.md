---
name: stoquify-report-trust-export-certifier
description: Audit, implement, and verify Stoquify accountant-grade report and export trust. Use for BI dashboards, accounting reports, cash-flow reports, payroll reports, compliance exports, close packs, CSV/PDF exports, provenance, currency, filters, row counts, redaction, and certification status.
---

# Stoquify Report Trust Export Certifier

## Purpose

Make Stoquify reports and exports accountant-grade through provenance, filters, currency, period status, row counts, redaction, and certification state.

## Required First Reads

1. `components/reports/`
2. `actions/analytics/`
3. `services/accounting/`
4. `services/reports/` when present
5. `components/reports/report-trust-banner.tsx` when present

Read `references/evidence-map.md` for report surfaces. Read `references/verification.md` before checks.

## Workflow

1. Identify report audience: owner, accountant, finance officer, manager, auditor, public/customer, or internal operator.
2. Trace each displayed/exported number to service-owned data and provenance.
3. Verify currency, filters, period status, row counts, redaction, source freshness, and certification state.
4. Fix report trust metadata before visual polish.
5. Add snapshot/export tests for provenance and redaction where possible.
6. Save report-trust findings for material audits or changes.

## Guardrails

- Do not let client-side aggregation become accounting truth.
- Do not export sensitive data without role-aware redaction.
- Do not hide stale, partial, estimated, sandbox, or blocked report states.
- Do not hardcode currency when organization/report context should control it.

## Output Contract

Report audience, source data, trust metadata, redaction state, currency/period handling, changed files, verification results, and residual report risk.
