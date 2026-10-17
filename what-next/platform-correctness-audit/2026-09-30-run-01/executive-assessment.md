# Stoquify platform correctness assessment

**Verdict: substantial operational foundation, but not yet demonstrated as a complete, reliable offline and professional accounting/payroll platform.** The schema can represent most requested business facts. The important gaps are preserving those facts through currency conversion, corrections, offline recovery and complete close, plus qualified country/provider and deployed-operation evidence.

Audit: 30 September 2026. Baseline commit: 62a56036a5ac9b37236a20c9b148052199069479. The initial working tree already had 129 modified and 1,240 untracked entries; findings concern that captured working tree, not the commit alone. Only this audit directory was authored by this audit. Concurrent work changed 15 source/test files; those changes were preserved and affected tests rechecked. See final source-fingerprint verification in [evidence-index.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/evidence-index.md>).

## What the evidence supports today

Stoquify has meaningful source-owned services for online POS, stock movements and valuation, purchasing/AP, payment evidence, reconciliation, HRIS and payroll. Transactions, idempotency, locks, approval separation, evidence hashes, immutable payroll snapshots and read-model provenance are implemented in many critical paths.

The **strongest demonstrated local evidence** is for online POS/stock/accounting-source infrastructure and tenant-scoped service behavior. All 541 stock-level quantities agree with recorded physical movements; sampled reserved/available/value arithmetic and tenant joins passed. The commerce and platform unit cohorts passed. These results support continued controlled development/piloting, not an unconditional production release declaration.

The inferred primary customer is a Cameroon/OHADA-context small or medium business operating sales, stock, cash, purchasing and people across locations, with owner/manager, cashier, inventory, procurement, finance/accountant, HR/payroll and employee personas. This inference comes from current services, role/module contracts, EN/FR surfaces and the CM country registry. A validated segment-specific requirements/acceptance dossier was not supplied. Organization/location support must not be conflated with legal-entity consolidation, and schema currency fields do not establish correct multi-currency accounting.

## What prevents a complete-platform claim

1. **Accounting correctness:** foreign-currency entries can store incorrect base amounts; reports can combine nominal currencies and still report a balanced result (F01). Locked accounting currency remains mutable (F07).
2. **Correction consistency:** generic reversal can reverse a POS journal without the corresponding business transaction (F02).
3. **Offline sales:** concurrent enqueue can lose a sale, in-flight events can become stranded after restart, and replay is deliberately test-authorized only (F03–F05).
4. **Professional close:** a period can become CLOSED despite a broader assurance blocker; general-ledger opening balance and partial fiscal-year generation also need correction (F06, F08, F09).
5. **Statutory and external readiness:** Cameroon CNPS is draft, IRPP and e-invoicing require expert review; live payment/authority acceptance and deployed operations were not proved (F11).
6. **BI completeness:** operational reports have useful provenance, but complete connected financial metrics, cash-flow reporting and several decision-support capabilities remain partial (F12).

## Evidence strength

| Evidence | Result | Practical limit |
|---|---|---|
| Schema inventory | 211 models; all local model tables/column names present | Full type/index/privilege drift and production metadata not certified. |
| Migration history | 87/87 local checksums match applied migrations | Fresh replay and populated upgrade were not performed. |
| Initial unit/service/component/action sweep | **3173 passed, 23 failed across 326 suites** | Audit-specific runner; mocks do not prove database concurrency or external success. |
| Structural gates | 8 passed, 2 blocked | Text/structure evidence only. |
| Current-source probes | 7 accounting behaviors and 3 offline conditions reproduced | Synthetic doubles/storage, no live financial mutation. |
| Local aggregate data | Stock and sampled arithmetic/tenant checks passed | AP/payroll/reconciliation samples are all DRAFT; final lifecycle denominator is zero. |
| TypeScript and browser | Typecheck timed out; app URL refused connection | No current full build/typecheck, authenticated browser or accessibility certification. |

A zero mismatch on draft fixtures is not a finalized workflow pass. Similarly, no evidence of an exploit is not a security certificate. The audit explicitly separates implementation defects, intentional capability restrictions, scanner/test drift and missing release evidence.

## Business decision and next work

First stabilize offline facts and financial meaning: F01–F04 and F07. Make source-owner correction and close contracts consistent next, including fiscal/calendar and report corrections. Then exercise all final lifecycles in a disposable PostgreSQL/browser environment and qualify the explicitly supported country/provider versions. Build additional BI only on those corrected sources.

[Dependency-ordered remediation roadmap](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/remediation-roadmap.md>) gives owners, acceptance evidence and migration implications. [Detailed findings](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/findings.md>) contains concrete repro scenarios and source links. [BI capability matrix](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/bi-capability-matrix.md>) separates essential completions from later additions.

## Deliverables

- [findings.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/findings.md>) and [verification-summary.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/verification-summary.md>).
- [schema-assessment.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/schema-assessment.md>), [schema-model-inventory.csv](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/schema-model-inventory.csv>) and [model-ownership-register.csv](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/model-ownership-register.csv>).
- [capability-coverage.csv](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/capability-coverage.csv>) and [review-lens-register.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/review-lens-register.md>).
- [architecture-and-workflows.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/architecture-and-workflows.md>) and [bi-capability-matrix.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/bi-capability-matrix.md>).
- [remediation-roadmap.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/remediation-roadmap.md>) and [evidence-index.md](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/evidence-index.md>).

This audit does not grant legal, tax, accounting, privacy, security, accessibility or production-release certification.

## Later worktree changes

| Recheck cohort | Suites | Passed | Failed | Source files changed during run |
|---|---:|---:|---:|---:|
| people | 73 | 552 | 15 | 0 |
| finance | 65 | 677 | 3 | 0 |
| supplement | 16 | 112 | 0 | 0 |
| changed-ui | 1 | 8 | 0 | 0 |

These rechecks followed concurrent payroll/accountant-workspace edits. They overlap the initial sweep and are reported separately. [Source-window and recheck details](<E:/ohada saas/Focused projects/stoquify/what-next/platform-correctness-audit/2026-09-30-run-01/concurrent-changes-and-rechecks.md>). The core offline/accounting reproduction files remained unchanged: yes.
