# Close recovery notifications and setup rule sides

FA-CASH-COMMAND remains In progress. The previous turn was progress: it implemented and verified authentication recovery. This checkpoint completes its notification correction and one authoritative setup prerequisite; no full workflow closure is claimed.

## Corrections

The close hooks and global QueryProvider each emitted a failure notification. The retained recovery screenshot showed both covering the form. The close mutations now use the application's existing notification-ownership metadata. Their localized handlers remain responsible for success and ordinary failure notifications. A FRESH_AUTH_REQUIRED error still rejects with its code, but uses the close page's inline identity form without an overlapping error popup. No shared provider behavior changed.

The accounting setup server described a rule as balanced when it merely contained two referenced lines. A service-contract reproduction accepted both debit-only and credit-only rules. The server now selects and checks line sides, requiring at least one debit and one credit, matching the control-center UI. This is a scaffold check, not proof of arithmetic balance, correct accounting treatment, current account resolution or complete operational setup. Existing mappings, journals, period, authority and authentication gates remain effective.

## Evidence

- 41 tests / 4 suites, changed-file lint and repository TypeScript passed in `evidence/close-readiness-followup-checks-c15bf320-6c46-478b-bbb0-a766eedcfb46.json`. The hook tests use the real QueryProvider, check absence of duplicate global events, retain one ordinary failure/success notification, and preserve inline fresh-auth recovery. Component tests retain explicit retry and drafts. Setup tests reject one-sided rules without a READY write; control-center regressions pass.
- Browser: `lanes/environment/close-notification-browser-f70b23dc-c304-4a31-bc5a-e14ddfc10937.json`. English 1440px and French 320px, reduced motion, keyboard initiation, incorrect password, real password verification, pointer confirmation, focus return and explicit retry passed. No fresh-auth notification overlap, downloads or financial effects; the current setup gate still denies export. Screenshots are bound in the review receipt.
- Before/after service contract: `lanes/environment/setup-side-contract-reproduced-a7d2978b-d641-4272-97e4-e99e2a32b861.json` and `setup-side-contract-corrected-809ae2e3-3119-444a-8d86-b268352acf29.json`. The same isolated in-memory read adapter yields 13 issues for all-debit/all-credit rules after correction, and none for debit/credit pairs. This is not database or operational readiness evidence.
- Actual owned PostgreSQL: `lanes/environment/setup-side-persistence-ad826e67-e4da-4561-a116-6513bd6989ff.json`. New deliberately incomplete synthetic organizations contain negative historical-rule fixtures. A foreign tenant's debit/credit rule cannot mask the local debit-only rule. Correcting its second line removes exactly one issue; 37 other setup issues remain, accounting stays disabled/IN_PROGRESS, and no journal, payment or export exists.
- Browser route-ready observations: EN 19,296 ms; FR 11,624 ms. Explicit denial: EN 6,821 ms; FR 4,519 ms. Development compilation, disabled cache and automation affect these observations; they are not approved performance-budget results.

## Operating guidance and remaining work

Use `/en/dashboard/accounting/close` or `/fr/dashboard/accounting/close`, choose the intended period, and retry the original action explicitly after identity verification. The password comes from the account holder, current permissions from the organization administrator, and accounting mappings/rules from the responsible accountant's source configuration. Do not put passwords in support records.

If setup reports a missing balanced scaffold, the authorized setup owner should inspect the selected effective rule and its debit/credit lines. Use the legitimate posting-rule editor and reviewed business treatment; the negative fixtures in this evidence are not sample production accounting rules. Reassess after correcting configuration. Two opposite sides alone do not establish readiness.

Next engineering work: readiness currently accepts any matching-purpose scaffold, while operational selection also uses source type and priority; it checks reference presence without re-resolving every current account. Review those differences before claiming operationally eligible setup. Four required purposes lack default templates (CASH_DRAWER_CLOSE, GOODS_RECEIPT, EXPENSE_APPROVAL, INVENTORY_ADJUSTMENT). Trace actual producers and applicability; do not replace these gaps with generic placeholder entries. Full successful close certification, invalidation/recovery, payroll/provider lifecycles, native screen-reader/zoom verification and production latency remain open. No whole workflow was closed or reopened.

## Review and rollout

Architecture/backend: existing mutation metadata and server-owned setup service reused. Security/IAM: errors retain machine codes; no authorization, tenant or fresh-auth relaxation. Data/finance: setup transition denies malformed side scaffolds, and isolated runtime checks show no activation or financial effects. Frontend/UX/localization: native form and existing EN/FR feedback remain; pointer overlap is resolved without new design primitives. Quality: before/after reproduction, real provider integration, focused regression and scoped browser/database verification. Audit/operations: immutable source archives and receipts preserve previous evidence; no migration or deployment.

Statutory/country-pack approval is not applicable to a line-side prerequisite and notification correction; no legal/accounting certification is claimed. Billing/packaging, AI/agent, offline, external provider, POS/AP/payroll processing and event delivery changes are not applicable: their code and contracts are unchanged. Their parent-workflow obligations remain tracked.

Roll out only through normal release gates. Monitor setup denials and duplicate-notification regressions. If recovery UI needs rollback, restore only the notification changes from this checkpoint's source archive; retain the server-side debit/credit gate. A targeted gate rollback would reintroduce the documented false-readiness defect and requires an explicit incident decision. Never revert the shared working tree wholesale.
