# Payroll Trust Spine execution register

Program objective: Close Work Packages 0–8 using live evidence without advancing past a failed HIGH or CRITICAL invariant, weakening tenant/RBAC/SoD/transaction controls, or modifying unrelated domains.

Started: `2026-08-21T19:55:24Z`  
Starting Git HEAD: `35b4cc6a06a50ee11de5bfce6b04993e38bd589a`  
Starting branch: `codex/service-boundary-burndown`  
Baseline mode: `EXPLICIT_OWNERSHIP_SNAPSHOT`  
Working tree: `DIRTY_PREEXISTING`

## Promotion rule

Only one work package may be active. A package advances only after its required implementation evidence and independent negative verification are saved under `evidence/WP-XX/`. Any HIGH or CRITICAL invariant failure blocks promotion. Historical reports never override a newer live replay.

## Work-package register

| Package | Status | Decision | Active boundary |
|---|---|---|---|
| WP0 — Baseline control and ownership | COMPLETE | APPROVED_FOR_WP1 | Ownership snapshot, report-trust truth, bounded Jest, baseline ratchet |
| WP1 — Architecture and policy freeze | COMPLETE | APPROVED_FOR_WP2 | Lifecycle, SoD, event, migration, rollback contracts |
| WP2 — Additive persistence and migration proof | COMPLETE | APPROVED_FOR_WP3_INTERNAL_ENGINEERING_ONLY | Transition ledger and legacy evidence bridge |
| WP3 — Runtime transition kernel | COMPLETE | APPROVED_FOR_WP4_INTERNAL_ENGINEERING_ONLY | Review, approval, emission, posting commands |
| WP4 — HRIS and event completion | COMPLETE | APPROVED_FOR_WP5_INTERNAL_ENGINEERING_ONLY | Protected actions, leave/payroll events, and fresh-auth boundary |
| WP5 — Close assurance and data trust | COMPLETE | APPROVED_FOR_WP6_INTERNAL_ENGINEERING_ONLY | Invalidation and evidence blockers |
| WP6 — Read models and operator UX | COMPLETE | APPROVED_FOR_WP7_INTERNAL_ENGINEERING_ONLY | Server capabilities and lifecycle UI |
| WP7 — Gate ratchet and PostgreSQL certification | COMPLETE | APPROVED_FOR_WP8_INTERNAL_RATIFICATION_ONLY | Mutation, concurrency, rollback certification |
| WP8 — Cross-domain ratification | COMPLETE | PROGRAM_COMPLETE_INTERNAL_ENGINEERING_RATIFIED | Live 012/013/014 replay |

## WP0 acceptance

- [x] Exact starting commit and branch recorded.
- [x] In-scope inherited files recorded with SHA-256 hashes in `execution-register.json`.
- [x] Report-trust gate is honestly 35/35 or exposes a real product blocker.
- [x] Offline POS remains 16/16.
- [x] One focused Jest test reliably terminates with a pass/fail result.
- [x] Required baseline-ratchet checks have saved outcomes.
- [x] WP0 evidence decision is recorded.

## WP1 acceptance

- [x] Current collapsed lifecycle and trust-boundary defects traced from live source.
- [x] Exact lifecycle and command contract frozen.
- [x] Three-person SoD policy frozen without self-approval bypass.
- [x] Canonical event payload contracts frozen.
- [x] Additive migration, honest legacy backfill, cutover, and fail-closed rollback frozen.
- [x] Machine-readable contract assertions pass.
- [x] Live purchasing/AP prerequisite remains ready 11/11.

## WP2 acceptance

- [x] Additive transition ledger and nullable evidence links validate.
- [x] Compound tenant/run and tenant/event ownership is enforced.
- [x] Runtime evidence, version, sequence, SoD, and event checks fail closed.
- [x] Legacy backfill is partial, idempotent, and does not fabricate stages.
- [x] Transition evidence is database append-only.
- [x] Fresh 76-migration replay succeeds on isolated PostgreSQL.
- [x] Runtime proof passes 10/10 and focused tests pass 24/24.
- [x] Existing immutability, payroll-presence, typecheck, and service-boundary gates remain healthy.

## WP3 acceptance

- [x] Four persisted lifecycle commands replace the collapsed runtime path.
- [x] Every command is tenant-scoped, serializable, CAS-protected, and idempotent.
- [x] Frozen SoD and fresh-auth requirements fail closed.
- [x] Canonical review, approval, emission, and posting evidence is transactional.
- [x] Payslips are event-bound before ledger posting.
- [x] Posting invalidates certified close evidence before final event application.
- [x] Later-state idempotent replay is preserved.
- [x] Focused lifecycle tests pass 22/22; combined canonical/WP2/WP3 tests pass 33/33.
- [x] Full typecheck, Prisma validation, focused lint, and diff check pass.

## WP4 acceptance

- [x] Review, approval, emission, and posting actions are independently protected.
- [x] Tenant, actor, permissions, and fresh-auth facts are server-derived for every transition.
- [x] Declaration preparation requires fresh authentication.
- [x] Approved leave persists canonical `LEAVE_APPROVED` business-event/outbox evidence.
- [x] Leave request linkage, balance debit, audit, and final event application share the transaction.
- [x] Tenant scope, manager scope, requester/approver SoD, approval evidence, and certified balance holds remain enforced.
- [x] Focused tests pass 32/32; combined WP2–WP4 event/lifecycle/action/HRIS tests pass 72/72.
- [x] Full typecheck, focused lint, structural scan, and diff check pass.

## WP5 acceptance

- [x] Payroll approval and payslip emission invalidate affected certified-close evidence inside the winning transition transaction.
- [x] CAS losers, downstream failures, and same-payload replays cannot leave partial or duplicate invalidation evidence.
- [x] Shared transition classification distinguishes verified runtime proof, missing post-cutover proof, and disclosed legacy partial evidence.
- [x] Emitted-unposted runs and missing modern transition proof are critical accountant-data-trust and close-assurance blockers.
- [x] Legacy transition evidence remains explicitly partial and is not represented as verified runtime history.
- [x] Financial analytics becomes non-authoritative on weak transition proof.
- [x] Branch profitability and released-payment assurance accept only posted, paid, or archived payroll runs.
- [x] Focused tests pass 175/175 across 8 suites; typecheck, focused lint, diff check, and service-boundary verification pass.
- [x] Purchasing/AP remains 11/11, report trust 35/35, offline POS 16/16, workflow-assurance static release 38/38, and payroll presence 14/14.

## WP6 acceptance

- [x] One server-owned lifecycle projection drives the command read model and run workbench.
- [x] Current stage, next legal action, RBAC, fresh-auth, SoD, write-gate, evidence classification, and blockers are explicit.
- [x] Operator mutations cannot supply tenant, actor, permission, or authentication authority.
- [x] Missing modern transition proof and disabled controlled writes fail closed.
- [x] Legacy partial history remains disclosed and cannot be upgraded to verified evidence by a read path.
- [x] Raw actor identifiers are excluded from lifecycle proof projections.
- [x] Focused verification passes 61/61 across 8 suites; typecheck, lint, diff check, and targeted route/browser smoke pass.
- [x] Purchasing/AP remains 11/11, report trust 35/35, offline POS 16/16, workflow-assurance static release 38/38, payroll presence 14/14, and CI release 11/11.
- [x] The full policy chain honestly stops at statutory expert approval 11/12 and does not create a false production claim.

## WP7 acceptance

- [x] A dedicated trust-spine gate fails on lifecycle collapse, missing final events, missing fresh auth, client trust facts, and missing concurrency/rollback evidence.
- [x] Eight negative mutations plus the ready fixture prove the gate ratchet.
- [x] The trust-spine gate passes 6/6 and is policy-wired.
- [x] A guarded local disposable PostgreSQL harness replays all 76 migrations.
- [x] Real serializable approval concurrency produces exactly one winner and one SQLSTATE 40001 loser.
- [x] The winner commits one linked transition, event, outbox row, and audit row; duplicate evidence cannot create a second commit.
- [x] Failure injection after CAS and before commit leaves the run unchanged with zero partial approval evidence.
- [x] Focused verification passes 69/69 across 6 suites; typecheck, Prisma validation, lint, and diff checks pass.
- [x] Purchasing/AP remains 11/11, report trust 35/35, offline POS 16/16, workflow assurance 38/38, and CI release 11/11.

## WP8 acceptance

- [x] Skill 012 is ratified `APPROVED_FOR_013_INTERNAL_ENGINEERING_ONLY`; its former lifecycle, event, and fresh-auth HIGH findings are closed.
- [x] Purchasing/AP remains 11/11, including `goods_receipt_atomic_stock_posting`.
- [x] Payroll presence remains 14/14 and the dedicated Payroll Trust Spine gate remains 6/6.
- [x] Payments/declarations, accounting-close, and country-pack development gates pass 9/9, 10/10, and 11/11 respectively.
- [x] Skill 013 is ratified `APPROVED_FOR_014_INTERNAL_ENGINEERING_ONLY`; report trust is 35/35 and focused tests pass 375/375 across 7 suites.
- [x] Skill 014 is ratified `APPROVED_FOR_015_INTERNAL_ENGINEERING_ONLY`; offline replay is 16/16 and focused tests pass 36/36 across 4 suites.
- [x] Inventory boundary has zero active violations across 47 scanned call sites; active offline Prisma, placeholder/mock, and unsafe-error scans have zero findings.
- [x] Prisma validation and TypeScript pass.
- [x] No product code was changed during WP8; stale reports were superseded with dated ratification reports.
- [x] Production authorization remains explicitly false and external/inherited blockers remain disclosed.
## Ownership contract

All modifications present in the ownership snapshot are treated as user-owned inherited work. This execution may make surgical changes inside the roadmap boundary but may not reset, replace, stage, commit, or reformat inherited work. Before each package, touched-file hashes are compared with the snapshot and the execution report identifies only the new deltas.

## Current blockers

- Broad inherited dirty state prevents a clean-candidate or production claim.
- Eight inherited raw-error findings remain visible; WP5 added none and they do not authorize cross-domain remediation in this program.
- The guarded disposable PostgreSQL runtime path is now proven; no production-database evidence is claimed.
- External production credentials, provider/authority responses, enrolled device-key operations, and representative environment evidence remain missing.
- Work Packages 0–8 are complete and internally engineering-ratified; no production scope is authorized.
- The monolithic policy replay is currently impeded by a Windows lock on an unrelated generated AI-copilot report path; relevant gates were rerun independently.
- Production migration/release remains unauthorized by inherited migration approvals, expert statutory approval, and dirty-tree provenance.
