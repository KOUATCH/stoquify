# AqStoqFlow 012 Payroll and Presence Ratification

Date: `2026-08-22`  
Selected skills: `012-aqstoqflow-payroll-presence-architect`, `012-aqstoqflow-payroll-presence-engine`  
Disposition: `APPROVED_FOR_013_INTERNAL_ENGINEERING_ONLY`  
Production authorization: `NO`

## Executive decision

The three internal HIGH findings recorded by the 2026-08-20 architecture gate are closed in current source and are now enforced by a dedicated fail-mode gate plus focused transaction and real PostgreSQL evidence. Skill 012 is no longer a sequencing blocker for skill 013.

This decision supersedes only the sequencing conclusion in `AQSTOQFLOW_012_PAYROLL_PRESENCE_ARCHITECTURE_GATE_2026-08-20.md`. It does not convert development evidence into statutory, provider, authority, managed-database, or production approval.

## Former blocker closure

| Former HIGH finding | Current closure evidence | Result |
|---|---|---|
| Payroll could skip stored review and collapse approval, payslip emission, and posting. | Persisted `CALCULATED -> REVIEWED -> APPROVED -> EMITTED -> POSTED` commands, state/version CAS, independent protected actions, SoD, transaction rollback, idempotency, and the 6/6 trust-spine ratchet. | CLOSED |
| `LEAVE_APPROVED`, `PAYROLL_RUN_APPROVED`, and final `PAYSLIP_EMITTED` were absent or incomplete. | Canonical tenant/actor/source-bound business events, audit, outbox, transition evidence, and failure tests commit with their owning transition. | CLOSED |
| Declaration preparation did not require fresh authentication. | The protected declaration action requires server-verified `freshAuth`; client tenant, actor, permission, and authentication facts remain non-authoritative. | CLOSED |

The earlier payment requester/approver/releaser repair remains intact. No same-actor shortcut, client-supplied decision actor, or tenant-bypass path was introduced.

## Live acceptance matrix

| Verification | Live result |
|---|---|
| Purchasing/AP prerequisite | READY `11/11`, including `goods_receipt_atomic_stock_posting` |
| Payroll/presence gate | READY `14/14` |
| Payroll Trust Spine gate | READY `6/6` |
| Dedicated gate mutation suite | PASS `9/9` from WP7 |
| Focused lifecycle/event/action matrix | PASS `69/69` across 6 suites from WP7 |
| Disposable PostgreSQL certificate | READY `3/3`; 76 migrations; one concurrency winner, one SQLSTATE `40001` loser; zero partial rollback evidence |
| Payments/declarations development gate | READY `9/9` |
| Accounting-close development gate | READY `10/10` |
| Country-pack development gate | READY `11/11` |
| Prisma validation | PASS |
| TypeScript | PASS, no diagnostics |

The saved live outputs are under `docs/HRIS-Payroll/payroll-trust-spine-execution/evidence/WP-08/`.

## Architecture boundary retained

- HRIS remains the owner of employee, contract, presence, leave, and certified input truth.
- Payroll consumes frozen tenant-scoped inputs and owns deterministic runs, transition evidence, payslips, payment intent, and declaration read models.
- Accounting owns mappings, balanced posting, source links, period controls, and close invalidation.
- Events, audit, outbox, journal/source evidence, and transition state share the owning transaction.
- Inspection/certification holds and unsupported country-pack capabilities continue to fail closed.
- Actions derive organization and actor authority from the authenticated server context.

## Remaining production boundary

Production remains blocked by qualified statutory source-artifact expert approval, production credentials/provider and authority evidence, inherited destructive-migration approvals, managed production-database evidence, broad dirty-tree provenance, and final release governance. The country-pack production chain remains blocked on `source_artifact_expert_approval` even though its development gate is green.

## Output contract

- selected skills: `012-aqstoqflow-payroll-presence-architect`, `012-aqstoqflow-payroll-presence-engine`
- files changed by this ratification: reports, WP8 evidence, and execution registers only; no payroll/HRIS product code
- gates passed: purchasing/AP 11/11, payroll presence 14/14, trust spine 6/6, payments/declarations 9/9, accounting close 10/10, country-pack development 11/11
- gates blocked: no internal 012 sequencing gate; external production certification remains blocked
- verification result: `APPROVED_FOR_013_INTERNAL_ENGINEERING_ONLY`
- next numbered skill: `013-aqstoqflow-data-trust-accountant-portal`

