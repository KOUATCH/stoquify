---
name: stoquify-ledger-close-truth-guardian
description: Audit, implement, and verify Stoquify ledger-first accounting truth, source links, audit trails, posting rules, close invalidation, period controls, reversal controls, and OHADA/SYSCOHADA accounting evidence across operational workflows.
---

# Stoquify Ledger Close Truth Guardian

## Purpose

Ensure every material economic event reaches ledger postings, source links, audit evidence, period controls, and close invalidation where appropriate.

## Required First Reads

1. `services/accounting/posting.service.ts`
2. `services/accounting/`
3. `services/events/business-event.service.ts`
4. `services/reconciliation/payment-suspense-workflow.service.ts`
5. `package.json`

Read `references/evidence-map.md` for economic workflows. Read `references/verification.md` before checks.

## Workflow

1. Identify the economic event and its source document.
2. Trace the command path from action/API to service to ledger or blocker.
3. Verify period openness, balanced postings, postable accounts, source links, audit records, idempotency, and close invalidation.
4. Verify reversals preserve original evidence and do not mutate historical truth.
5. Add or update tests for the exact posting or blocker behavior.
6. Save a report when a workflow is audited or changed.

## Guardrails

- Do not post from UI-derived values.
- Do not bypass open-period checks.
- Do not mutate posted historical truth when reversal is required.
- Do not claim OHADA/SYSCOHADA correctness without reviewed chart/posting evidence.
- Keep statutory configuration outside hardcoded business logic.

## Output Contract

Report economic event, source evidence, posting path, close effect, changed files, verification results, and unresolved accounting risk.
