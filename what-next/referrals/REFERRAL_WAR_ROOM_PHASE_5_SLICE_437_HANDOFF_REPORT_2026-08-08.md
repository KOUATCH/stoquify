# Phase 5 Slice 437 Handoff Report

Date: 2026-08-08
Slice: Protected Customer Settlement Reversal Action Boundary
Primary skill: `stoquify-statement-proof-network`
Status: implementation complete; current-worktree boundary certified

## Implementation Contract

Create a finance-owned `"use server"` action whose sole public command is `reverseCustomerSettlementAction(input: unknown)`.

The protected binding must require:

- permission `finance.receivables.reverse`;
- audit resource `CustomerSettlement` with allowed-command auditing;
- `freshAuth: { maxAgeSeconds: 300 }`;
- enforced, audited `finance` module access for an action/write surface.

Inside the handler, verify the protected fresh-auth provenance before parsing or invoking any business service. Build a bounded fresh-auth object containing only `lastAuthAt` and the five claims required by the reversal service. Parse the canonical reversal schema, call `reverseCustomerSettlementWithControls` once with session-derived control data, and revalidate existing affected surfaces only after success.

## Required Test Evidence

1. Exact protected options, including the finance module gate.
2. Context-derived tenant, actor, permissions, and bounded fresh-auth evidence despite forged input fields.
3. Table-driven rejection of missing/mismatched fresh-auth provenance.
4. Malformed command rejection before service execution.
5. One service call and bounded result propagation on success.
6. Successful-only cache revalidation.
7. Static release-ratchet mutations for permission, freshness, module enforcement, context binding, parse order, control spreading, and revalidation.

## Guardrails

- Do not expose `CustomerSettlementReversalControlContext` as action input.
- Do not spread action input or raw protected context into the service.
- Do not synthesize `lastAuthAt` with `Date.now()`.
- Do not add a legacy permission alias or wildcard bypass.
- Do not add a route, UI, provider refund, external statement, token, or delivery behavior.
- Do not claim production readiness without migration and PostgreSQL concurrency evidence.

## Handoff Outcome

The implementation contract is satisfied. Verification passed 14 protected-action tests, an 8-suite/86-test focused runtime and security bundle, 290 report-trust mutations, TypeScript, scoped lint, syntax, diff hygiene, exposure checks, and the live 31/31 report-trust fail gate.

The static boundary was hardened after independent review to reject a denial guard preserved only inside dead code. The final constrained re-review returned no findings.

No product caller was added. The action remains dormant outside direct trusted invocation, and public reversal execution remains unauthorized. Runtime module provisioning is intentionally fail-closed.

Implementation report: `what-next/referrals/CUSTOMER_SETTLEMENT_REVERSAL_PROTECTED_ACTION_SLICE_437_REPORT_2026-08-08.md`.

Release evidence: `what-next/skills-life-cycle/STOQUIFY_SLICE_437_RELEASE_EVIDENCE_REPORT_2026-08-08.md`.

## Next Audit Candidate

After Slice 437 certification, return to `/stoquify-referral-war-room`. The leading source-truth candidate is a posted customer receivable document foundation, not statement generation itself.
