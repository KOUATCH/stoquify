---
name: stoquify-payment-recon-cash-truth-moat
description: Audit, implement, and verify Stoquify payment reconciliation, provider evidence, bank and mobile-money statements, cash drawer evidence, POS settlement, suspense workflows, provider health, close blockers, and proof-pack exports.
---

# Stoquify Payment Reconciliation Cash Truth Moat

## Purpose

Make cash truth defensible across bank, mobile money, POS, cash drawer, provider statements, suspense, ledger postings, and close assurance.

## Required First Reads

1. `services/reconciliation/payment-suspense-workflow.service.ts`
2. `services/payments/statement-import.service.ts`
3. `services/payments/`
4. `services/accounting/`
5. `docs/domains/payments-reconciliation/` when present

Read `references/evidence-map.md` for reconciliation surfaces. Read `references/verification.md` before checks.

## Workflow

1. Identify the payment channel and evidence source.
2. Trace import, normalization, matching, exception, suspense, approval, posting, and close-blocker behavior.
3. Verify provider evidence is not trusted without source hash, account status, period context, and reconciliation state.
4. Verify unresolved material exceptions block certification or close where required.
5. Add tests for duplicate import, stale provider account, unmatched payment, suspense approval, and posted proof where relevant.
6. Save reconciliation evidence under `what-next/skills-life-cycle/` for material runs.

## Guardrails

- Do not expose provider credentials or raw sensitive payloads.
- Do not mark payments trusted without external, cash, POS, or suspense evidence.
- Do not let suspense approvals bypass maker-checker or period controls.
- Do not remove close blockers without replacement evidence.

## Output Contract

Report payment channel, evidence source, matching state, suspense state, close effect, verification results, and remaining cash-truth risk.
