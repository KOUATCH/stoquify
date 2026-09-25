# POS modernization baseline

Started 23 September 2026; resumed 24 September after a user interruption. Scope is the [execution brief](execution-brief.md). This directory represents one continued run.

- Repository: `E:\ohada saas\Focused projects\stoquify`.
- Starting revision: `a05a41ef66cd5d98fd69ae3df18225795f912232`; the working tree was already extensively modified. HEAD alone does not reproduce this run.
- [Git status before edits](evidence/git-status-before.txt), [117-file SHA-256 manifest](evidence/source-baseline.json), and matching source copies in `evidence/baseline/` preserve prior tracked and untracked POS work. Additional owners preserved snapshots before editing files outside this set.
- Root `AGENTS.md`, the Prompt Architect execution rule, and `007-aqstoqflow-pos-ledger-controls` were applied. Numbered skill-suite advancement and production certification are outside this run.
- Current source was checked against graph exports; graph line numbers and inferred relationships were treated as discovery aids.
- Prior charge-button, natural-height checkout, and retained-request recovery reports were inspected. Their changes are regression requirements, not proof of broad readiness.

## Working constraints

The initial verification authorization excluded repository reset, broad formatting, production deployment, live charge/refund/void, permission expansion and application-database migration. Tests use mocks or an explicitly named disposable local database. Source-only gates write into this evidence directory instead of replacing shared release reports.

The user subsequently authorized completion of the specific application migration and the remaining cashier/French-drawer verification. At 04:42 UTC on 24 September, the original `20260909093000_add_suspense_posting_cycles` migration completed on local application database `stoquify_replay_next_20260830`, with its schema invariants and matching Prisma history verified. [Application migration result](evidence/application-migration-result.json) supersedes the earlier missing-column blocker; unrelated schema and the 86 prior migration-history entries were preserved. This authorization did not extend to deployment, role changes or live financial operations.

The French accountant drawer subsequently rendered, its location filter narrowed 13 drawers to the matching one, keyboard selection chose “7 derniers jours”, and related links retained `/fr`. Session expansion exposed an absent closing balance displayed as zero; a single display-expression correction now shows the existing localized unavailable label for null. Browser verification and scoped lint passed for that correction. The earlier full typecheck and 132-file freeze remain historical; [follow-up source provenance](evidence/source-browser-followup.json) identifies this one changed component. The measured viewport remained 927×521 despite requested overrides; this establishes no mobile/tablet coverage. The authorized cashier flow still depends on the existing-account handoff. Current evidence and limits are maintained in the [verification matrix](verification-matrix.md).

The local development server restarted on 24 September uses `.next-pos-audit-dev`. The build's TypeScript configuration changes were restored to their saved pre-build bytes, then only the run-owned development include was removed; see [build cleanup](evidence/build-config-cleanup.json) and [development cleanup](evidence/dev-config-cleanup.json). `npm run build` is prohibited here because it deploys migrations; verification used `build:app` with isolated output and requested cleanup disabled. Windows npm did not forward the skip flag, and the wrapper removed the existing generated `.next` directory. That unintended effect and the bounded build timeout are recorded in the [verification matrix](verification-matrix.md); source and the isolated development output were preserved.

## Baseline failures retained

- Four checkout ownership/response-ordering regressions failed before correction: [log](evidence/checkout-races-before.log).
- Three cash-drawer scope/privacy regressions failed before correction: [log](evidence/hooks-intermediate.log).
- Sale completion after-commit and payment-correction regressions: [completion](evidence/services-completion-red.log), [correction](evidence/services-correction-red.log).
- Intermediate frontend and PostgreSQL failures remain in evidence; only final verification results establish a pass.

No receipt tokens, credentials, or customer records are intentionally included in these reports. Schema-only database copies contain no application rows.
