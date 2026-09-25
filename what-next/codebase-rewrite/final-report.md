# Codebase rewrite execution report

**The complete codebase rewrite is not finished.** Two concrete rewrites are implemented and focused behavior/contract tests pass. Most domain modules remain unchanged and have not received a complete behavioral audit. No deployment, data migration, statutory certification, or production activation was performed.

## Implemented

- Cash/payment-history browser reads are separated by actor, organization, permissions, and filters. Old rows are suppressed when scope changes; mismatched server scope is rejected. Export result state belongs to the initiating scope and filters, without a duplicate local success/error state.
- Cash-history summaries now use grouped decimal sums and transaction counts instead of returning all matching records. Existing server guards, module checks, cursor binding, redaction, and financial formulas remain in place. Trusted actor/organization metadata is returned with the result.
- The preflight module consolidates 106 repeated evidence-wrapper implementations. Its length falls from **10,857 to 9,074 lines**, a reduction of **1,783 lines (16.42%)**, including its new shared helper. All 336 exports remain present, and 5,610 serialized comparisons match the original.

Across the four application files edited by this task, the **net reduction is 1,745 lines** after including the additional scope checks. The whole application currently measures 381,619 lines, but five POS files changed concurrently; their changes are excluded from this task's claimed savings. No file, test, required feature, or production dependency was removed to inflate the reduction.

## Evidence and practical limits

**1,019 tests passed in six focused suites.** All 11 affected hook tests passed again after the final optional error-code correction, and the full post-change TypeScript check passed. Prisma validation, workflow runtime presence, and the service-boundary gate passed. The repeated inventory completed.

On a synthetic 200,000-transaction workload, the rewritten summary consumes 49 groups with identical totals and unchanged query count. The measured application-processing improvement excludes the work required to aggregate rows inside PostgreSQL. A representative real-database workload, query plans, full endpoint latency, authenticated browser behavior, and deployment artifacts remain unverified.

The first safe build was blocked by existing build chains in this shared checkout. After those cleared, an isolated production build reached compilation but **timed out after 15 minutes**, without emitting a compiler diagnostic. Its incomplete output was removed; source and evidence logs were preserved. Next.js configuration files remained unchanged. Local app probes also timed out, so authenticated-browser validation remains unverified.

The inventory boundary gate fails with **20 stock-mutation findings in fixture and historical verification scripts outside these changes**. The gate and archived evidence were preserved. This remains an unresolved release blocker, alongside the build timeout and missing authenticated-browser/real-endpoint evidence.

## Outstanding full-program work

The measured application baseline is 383,365 lines. A 1,783-line reduction in one module does not establish a radical reduction of the entire platform. No supported whole-codebase reduction percentage has been promised. Retained test copies, generated schemas, documentation, and build output are reported separately and are not counted as savings.

The remaining work is to complete the current build/browser/database validation, establish required behavior for each remaining domain, reduce remaining duplication, investigate the accounting/inventory dependency cycle, and run integrated product/security/release checks. Seven of the eight original source-import cycles disappear during TypeScript transpilation; only the accounting/inventory group retains an emitted-code cycle. This classification does not prove an initialization defect or justify changing the seven other boundaries. The inventory, role coverage, next work sequence, evidence, and limitations are recorded in `baseline.md`, `rewrite-plan.md`, `progress.md`, `reviewer-coverage.md`, and `verification.md`.
