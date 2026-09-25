# Accounting audit reports

**8 September 2026 — Audit complete; hardening required.**

The audit identifies 15 findings (7 high priority, 8 medium priority). The first-pass tests recorded 1,125 passed and 2 failed across 127 suites; a subsequent AP refresh passed 73 tests. Seven in-memory probes reproduce service behaviors that need correction. No production code, business records, migrations or deployments were changed.

Start with the audit report, then use the risk register and remediation plan. Browser verification stopped at login; deployed database, real concurrency and qualified statutory validation remain unverified. The reviewed worktree contained existing and concurrent purchasing changes.

The [execution roadmap](<E:/ohada saas/Focused projects/stoquify/docs/accounting/accounting-correction-execution-roadmap-2026-09-08.md>) now translates the plan into 28 work items, eight milestones and eight evidence gates. Its reference schedule is 12–16 weeks under the stated staffing assumptions; implementation has not started under the roadmap. Use the [CSV backlog](<E:/ohada saas/Focused projects/stoquify/docs/accounting/accounting-correction-backlog-2026-09-08.csv>) or [JSON backlog](<E:/ohada saas/Focused projects/stoquify/docs/accounting/accounting-correction-backlog-2026-09-08.json>) to track execution.

## Published report pairs

| Document | Markdown | PDF |
|---|---|---|
| correction execution roadmap | [Markdown](<E:/ohada saas/Focused projects/stoquify/docs/accounting/accounting-correction-execution-roadmap-2026-09-08.md>) | [PDF](<E:/ohada saas/Focused projects/stoquify/docs/accounting/accounting-correction-execution-roadmap-2026-09-08.pdf>) |
| audit report | [Markdown](<E:/ohada saas/Focused projects/stoquify/docs/accounting/audit-report.md>) | [PDF](<E:/ohada saas/Focused projects/stoquify/docs/accounting/audit-report.pdf>) |
| architecture and flow map | [Markdown](<E:/ohada saas/Focused projects/stoquify/docs/accounting/architecture-and-flow-map.md>) | [PDF](<E:/ohada saas/Focused projects/stoquify/docs/accounting/architecture-and-flow-map.pdf>) |
| risk register | [Markdown](<E:/ohada saas/Focused projects/stoquify/docs/accounting/risk-register.md>) | [PDF](<E:/ohada saas/Focused projects/stoquify/docs/accounting/risk-register.pdf>) |
| remediation plan | [Markdown](<E:/ohada saas/Focused projects/stoquify/docs/accounting/remediation-plan.md>) | [PDF](<E:/ohada saas/Focused projects/stoquify/docs/accounting/remediation-plan.pdf>) |
| evidence index | [Markdown](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.md>) | [PDF](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.pdf>) |
| accounting audit execution prompt 2026 09 08 | [Markdown](<E:/ohada saas/Focused projects/stoquify/docs/accounting/accounting-audit-execution-prompt-2026-09-08.md>) | [PDF](<E:/ohada saas/Focused projects/stoquify/docs/accounting/accounting-audit-execution-prompt-2026-09-08.pdf>) |
| ledger close truth gate | [Markdown](<E:/ohada saas/Focused projects/stoquify/docs/accounting/ledger-close-truth-gate.md>) | [PDF](<E:/ohada saas/Focused projects/stoquify/docs/accounting/ledger-close-truth-gate.pdf>) |
| statutory integration gate | [Markdown](<E:/ohada saas/Focused projects/stoquify/docs/accounting/statutory-integration-gate.md>) | [PDF](<E:/ohada saas/Focused projects/stoquify/docs/accounting/statutory-integration-gate.pdf>) |

This index also has a matching PDF. The two gate reports are preserved exactly as generated; their passing statuses have narrower scope than the overall audit. The execution prompt is preserved byte-for-byte from the supplied attachment.

Structured findings: [findings.json](<E:/ohada saas/Focused projects/stoquify/docs/accounting/findings.json>). Diagnostic evidence: [evidence index](<E:/ohada saas/Focused projects/stoquify/docs/accounting/evidence-index.md>) and [audit-run manifest](<E:/ohada saas/Focused projects/stoquify/what-next/accounting-enterprise-audit/2026-09-08-run-01/audit-manifest.json>). Machine-validated file pairs and hashes are recorded in [publication manifest](<E:/ohada saas/Focused projects/stoquify/docs/accounting/publication-manifest.json>) after publication.

The first actions are to enforce supported currency, lock material accounting policy, restrict generic source reversals and correct finance proof labels. The plan then addresses database/concurrency guarantees, cross-module close, reporting and accountant workflow validation.
