# AqStoqFlow 013 Data Trust and Accountant Portal Gate

Date: 2026-08-20  
Selected skill: `013-aqstoqflow-data-trust-accountant-portal`  
Disposition: `BLOCKED_BY_PREDECESSOR`  
Repository boundary: evidence-only audit; no 013 product code was changed

## Executive result

The repository already contains a substantial 013 foundation: ledger-backed report services, source and period provenance, hashed exports, explicit accountant consent with role and expiry, server-resolved cross-client access, portfolio and client-register surfaces, grant/revoke business events, and an accountant portal.

The numbered suite cannot advance into 013 implementation or approval because the required predecessor is still `REPAIR`. The 012 architecture gate explicitly records three unresolved HIGH internal invariants and states that 012 is not `APPROVED_FOR_013`:

1. payroll runs can still bypass a stored `REVIEWED -> APPROVED` transition and collapse approval, payslip emission, and posting;
2. `LEAVE_APPROVED`, `PAYROLL_RUN_APPROVED`, and final `PAYSLIP_EMITTED` business-event contracts remain absent or incomplete;
3. payroll declaration preparation lacks a fresh-auth boundary.

Skill operating rule 6 requires a stop when a HIGH invariant fails. Accordingly, this run did not alter the data-trust, accountant-access, reporting, export, or customer-statement boundaries and does not authorize progression to skill 014.

## Context loaded

- Loaded the complete 013 skill contract and `references/chunk-blueprint.md`.
- Loaded `graphify-out/GRAPH_REPORT.md`; the reusable reporting graph includes ledger reconciliation plus general-ledger and trial-balance services, and the accountant/portfolio community.
- Confirmed the predecessor disposition in `what-next/payroll/AQSTOQFLOW_012_PAYROLL_PRESENCE_ARCHITECTURE_GATE_2026-08-20.md`.
- The following optional required-context documents were not present:
  - `what-next/AQSTOQFLOW_ORDERED_IMPLEMENTATION_CHUNKS_AND_SKILL_SUITE_2026-06-14.md`
  - `what-next/OHADA_SMB_PLATFORM_TECHNICAL_SPEC_2026-06-14.md`
  - `docs/OHADA_SMB_PLATFORM_TECHNICAL_SPEC_2026-06-14.md`

Their absence did not prevent inspection of the concrete source, blueprint, graph report, predecessor gate, and focused tests.

## Reusable 013 foundations

| Requirement | Current source boundary | Result |
|---|---|---|
| Ledger-backed reports and period scope | `services/accounting/reports.service.ts` | Present; tenant and period predicates, provenance, export content hash, and audit context are service-owned. |
| Data-trust metadata and blockers | `services/accounting/data-trust.service.ts` | Present; as-of time, period status, source tables, reconciliation, event, audit, payroll, inventory, and evidence blockers are projected from service data. |
| Accountant consent and portfolio | `services/accounting/accountant-access.service.ts` | Present; explicit consent hash, role, effective time, expiry, revocation, server-resolved tenant/client boundary, and grant/revoke/expire events. |
| Protected report and portal actions | `actions/accounting/data-trust.actions.ts`, `actions/accounting/accountant-access.actions.ts` | Present; authenticated organization and user identity are derived by the protection layer and delegated export checks the resolved grant capability. |
| Accountant UI | `app/[locale]/(dashboard)/dashboard/accounting/accountant-portal/page.tsx` and accountant portfolio/access routes | Present; focused accountant-portal rendering tests pass. |
| Tamper-evident exports | report export and accountant trust-pack services | Present; deterministic content hashes, provenance, audit evidence, and trust-pack export events are covered by the static gate. |

## Live gate result

The checked-in `what-next/report-trust-export-readiness.md` is stale: it reports 35/35 from 2026-08-12. A live fail-mode run on 2026-08-20 produced 34/35 and one blocker:

- `signed_customer_statement_external_access_foundation`

This is static-gate drift rather than evidence of a weakened token boundary. `services/accounting/customer-statement-token.ts` now delegates secret selection, minimum 32-character enforcement, HMAC-SHA256 signing, and timing-safe signature comparison to `services/_shared/signed-external-access-token.ts`. The gate still requires those implementation markers to appear inline in the customer-statement token service, so it cannot recognize the centralized helper.

The invariant remains visible in source, but the fail-mode gate is authoritative for release and therefore remains blocked until its inspection is updated to follow the shared helper and its tests prove both accepted composition and rejection when any shared cryptographic control is absent.

## Verification

| Check | Result |
|---|---|
| TypeScript typecheck | PASS |
| Focused accounting services/actions and report-gate tests | PASS: 6 suites, 361 tests |
| Accountant portal page test | PASS: 1 suite, 3 tests |
| Combined focused verification | PASS: 7 suites, 364 tests |
| Live `report:trust:export` fail-mode gate using temporary outputs | BLOCKED: 34/35; `signed_customer_statement_external_access_foundation` |
| Predecessor 012 approval | BLOCKED: three HIGH internal invariants remain |

## Gate disposition

### Gates passed

- Existing tenant-scoped report and period reads.
- Protected RBAC and authenticated actor derivation for accountant portal and export actions.
- Explicit accountant consent, role, expiry, revocation, and cross-client denial boundary.
- Ledger/source provenance, export hashing, audit evidence, and accountant access events.
- Focused service, action, static-gate, and accountant-portal UI tests.
- Type checking.

### Gates blocked

- Required predecessor: 012 is not `APPROVED_FOR_013` because three HIGH internal invariants remain.
- 013 fail-mode release gate: the signed customer-statement external-access check does not recognize the centralized signing helper and reports 34/35.
- 013 approval and progression to 014 are prohibited while either blocker remains.

## Closure order

1. Resume `012-aqstoqflow-payroll-presence-engine` and close its staged payroll-run transition, final event completeness, and declaration fresh-auth findings with negative, concurrency, and rollback tests.
2. Rerun the 012 gate and require an explicit `APPROVED_FOR_013` disposition.
3. Update the 013 report-trust gate to inspect the centralized signed-token helper without relaxing secret length, HMAC-SHA256, timing-safe comparison, expiry, tenant/statement binding, or revocation checks; add focused static-gate regression coverage.
4. Rerun the live 013 gate, the focused 013 suites, and type checking. Require 35/35 and zero blockers before approval.
5. Only then run the next recommended numbered skill, `014-aqstoqflow-offline-pos-sync`.

## Output contract

- selected skill: `013-aqstoqflow-data-trust-accountant-portal`
- files changed: this gate report only
- gates passed: existing tenant/RBAC/ledger/evidence/UX controls, 7 focused suites with 364 tests, and typecheck
- gates blocked: predecessor 012 HIGH findings; live report-trust gate 34/35
- verification result: `BLOCKED_BY_PREDECESSOR`
- next recommended numbered skill: `014-aqstoqflow-offline-pos-sync` (not yet eligible)
