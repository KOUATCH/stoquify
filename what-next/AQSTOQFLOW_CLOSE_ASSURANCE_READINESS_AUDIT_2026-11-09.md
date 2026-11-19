# Stoquify close-assurance readiness audit

Date: 9 November 2026. Selected skill: `018-aqstoqflow-close-assurance-audit`. **Verdict: GO_WITH_GATES for targeted development; not approval for production close certification.**

The close center already exists. Its next development work is to strengthen write authority, make ordinary monthly reconciliation provable, and retain recoverable certified documents. Recreating the schema or building another dashboard would miss the main gaps.

This audit inspected current source and ran two narrow pure/mocked suites. No application, migration, database, provider or browser operation ran. The qualified sales-to-accounting artifact was preserved. The [selected skill](<C:/Users/J COMPUTER/.codex/skills/018-aqstoqflow-close-assurance-audit/SKILL.md>) explicitly states: “Do not start implementation in this skill.” This report defines the implementation gates for the following skills.

## Evidence and freshness

- Baseline: Git HEAD `80e4abb283216b9f8e04b94e5020393f7dcabf62` plus the existing working tree. No unrelated edits were changed.
- All **508 scoped source/test files** match the prior qualified artifact source manifest `a6e0b40433ec6faaadae9e2db14ddd972f0e30ecd0185646b8d7190ed91d2a06`; none were added, removed or changed within that comparison. [Source binding](<E:/ohada saas/Focused projects/stoquify/docs/stoquify-potential/development/close-assurance-audit-2026-11-09/SOURCE_BINDING.json>).
- `npm run agent:workflow:check` passed; 196 scripts remain unclassified. This did not execute application/database commands.
- **26 tests passed, zero failed/skipped, two suites:** current close-proof grading and assessment ordering. Database transactions/locks are mocked in the ordering suite. [Results](<E:/ohada saas/Focused projects/stoquify/docs/stoquify-potential/development/close-assurance-audit-2026-11-09/focused-checks.results.json>), [runner and classification](<E:/ohada saas/Focused projects/stoquify/docs/stoquify-potential/development/close-assurance-audit-2026-11-09/VERIFICATION.json>).
- The prior full build, 121-migration replay, financial kernels and sealed HTTP authentication remain separate historical evidence. They did not earn a close certificate or run the hydrated close workflow. [Prior qualification](<E:/ohada saas/Focused projects/stoquify/docs/stoquify-potential/development/migration-release-2026-11-09/RESULT.md>).
- The June blueprint is present at its relocated [active path](<E:/ohada saas/Focused projects/stoquify/docs/domains/accounting-close/AQSTOQFLOW_CLOSE_ASSURANCE_CENTER_BLUEPRINT_2026-06-15.md>). The old `what-next/` path is absent. The July audit is historical, not the current verdict.
- Graphs were used for discovery only: the June graph report and August action graph identify `accounting_close_assurance_actions_ts` in community 6; payment actions/workbench appear in communities 14/132 and close components in community 4. Current source, not graph line numbers/counts, supports the findings below.

## Existing foundations and audit answers

| Question | Current finding |
|---|---|
| Durable periods, ledger, sources and close records? | Yes. AccountingPeriod, JournalEntry/Line, LedgerPostingBatch, AccountingSourceLink, ProviderEvent, StatementFile/Line, ReconciliationRun, SuspenseItem, PaymentException, LedgerAuditEvent, CloseRun, checklists/findings/evidence/exports and accountant reviews/comments exist. [Schema](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7373>). |
| Does period close enforce financial blockers? | Yes. Draft entries, pending/failed batches, unlinked posted journals, open payment exceptions/suspense, unsigned runs and per-currency trial-balance failures block it. Sealing also requires current independent certification and an exact export/hash/source-revision binding. [Preflight](<E:/ohada saas/Focused projects/stoquify/services/accounting/periods.service.ts:341>), [approval](<E:/ohada saas/Focused projects/stoquify/services/accounting/period-control.service.ts:39>). |
| Are reconciliation certificates approved, hashed, exportable and audited? | The normal signer enforces independent actors, fresh authentication, current preparation/source, complete dispositions and ledger truth; it creates canonical v3 certificate evidence and audit/export receipts. This is application approval plus integrity hashing, not a statutory digital-signature certificate. Coverage admission has a separate weakness below. [Signer](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/payment-reconciliation-certification.service.ts:649>). |
| Is suspense itemized and controlled? | Yes: owner/status/severity, evidence, suspense account, posting batch and resolution metadata exist. Posting creates balanced journals/source links; final resolution reviews actual clearing evidence rather than merely changing a status. [Ledger writer](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/payment-suspense-ledger.service.ts:245>), [resolution](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/payment-suspense-resolution.service.ts:98>). |
| Are session, tenant, permission and error controls present? | Yes, with important legacy gaps. RBAC rereads current user/organization/roles and bypasses cookie-session caching. `protect` returns canonical safe errors. New evidence acceptance also locks/revalidates live authority; legacy close writes/export do not consistently use it. [RBAC](<E:/ohada saas/Focused projects/stoquify/lib/security/rbac.ts:87>), [authority pattern](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-evidence-acceptance-authority.service.ts:135>). |
| Are figures provenance-aware? | The center separates saved assessment from current proof and exposes operational/posted/unavailable states. Current proof rejects stale exports, missing certified exports, high-risk findings/controls and unavailable evidence. Source scope/cache transitions need hardening. No new rendered/browser claim is made. [Current proof](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance-current-proof.ts:45>), [center](<E:/ohada saas/Focused projects/stoquify/components/accounting/CloseAssuranceCenter.tsx:515>). |
| What is missing before accountant-ready close claims? | Consistent live write authority, valid retained signature admission, a supported mixed-activity monthly proof path, document custody/recovery, and a current earned lifecycle through actual producers and authenticated review. |
| What would be misleading? | Calling a hash a legal signature; calling a sentinel an earned certificate; counting malformed SIGNED rows as independent approval; treating transaction date range as declared statement coverage; presenting an old pack/current-period cache as current proof; or calling a file hash proof of original-document availability. |

## Ranked findings

These are source findings or qualification gaps, not demonstrated remote exploits. Existing fail-closed and global certification gates remain important.

### CA-01 — P1: legacy close write authority is inconsistent

Legacy assessment, assignment, comments, waiver, review and export actions omit the explicit module option. `protect` checks entitlement only when that option exists; its RBAC chain does not automatically derive a module gate. Invoked legacy services do not replace it. Dashboard/evidence reads and newer evidence commands do enforce close-assurance access. [Actions](<E:/ohada saas/Focused projects/stoquify/actions/accounting/close-assurance.actions.ts:87>), [protect](<E:/ohada saas/Focused projects/stoquify/services/_shared/protect.ts:92>).

Certified export/waiver also rely on boundary permission/freshness snapshots. The export's final check tests elapsed assurance age, not whether the actor/session/role/module remains authorized after financial-lock waits. New evidence acceptance supplies a stronger reusable pattern. A deterministic revocation race was not executed. [Export control](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance-pack.service.ts:2244>).

Gate: use consistent explicit module enforcement and live transaction authority for sensitive writes, preserving the established lock order and legitimate delegated-accountant scope. Prove denial when revocation is committed before the authority check; define the allowed linearization when an authorized operation commits before revocation.

### CA-02 — P1: close coverage counts incomplete retained approval records

Coverage selects status/time/hash/payload but no maker, signer or signature metadata. It checks a payload self-hash and current source manifest without requiring the independent approval envelope/audit. An existing validator already checks those identities, versions, maker/checker separation and signing audit. [Coverage](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/account-close-coverage.service.ts:24>), [retained validator](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/reconciliation-retained-signature.ts:17>).

A source-only PostgreSQL test fixture supplies a minimal payload and no maker/signer, marks it SIGNED and expects coverage acceptance. That test was not run here. DataTrust/READY/T4/export checks still apply; this audit does not establish that an unauthorized actor can manufacture a certified close. Gate: validate retained approval lineage before counting coverage, while retaining current-source hash validation.

### CA-03 — P1: a normal mixed-activity month lacks a complete proof route

The wired import uses an adapter that sets statement start/end from the earliest/latest transaction. Coverage requires the whole accounting period. A real monthly statement whose transactions occur only mid-month therefore has apparent boundary gaps. Actual reconciliation creation is daily; signing rejects a day with no events/lines; current no-activity proof applies only when the entire period is inactive. A month with both active and inactive days lacks a complete normal application path. This blocks close rather than silently approving missing data. [Import action](<E:/ohada saas/Focused projects/stoquify/actions/payments/reconciliation.actions.ts:184>), [adapter](<E:/ohada saas/Focused projects/stoquify/services/payments/adapters/mobile-money-hmac.adapter.ts:199>), [daily scope](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/payment-reconciliation-run.service.ts:55>), [empty-day signing](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/payment-reconciliation-certification.service.ts:725>).

Gate: retain an evidenced declared statement-period envelope, distinct from observed transaction dates, and define an independently approved inactive-interval or full-period reconciliation path. Never widen imported dates to the selected month merely to satisfy coverage, or count unsupported blank runs as proof. Test through actual import/run/sign commands; manually seeded month-long SIGNED rows do not prove this path.

### CA-04 — P1: committed certified JSON has no supported exact-byte recovery owner

Export commits its receipt and CERTIFIED transition, then returns JSON for a browser Blob download. The export model retains hash/watermark/annex metadata, but no canonical document bytes or retrievable artifact reference. A repeated certified export requires READY, so loss of the original response/download after commit has no supported exact-document recovery path. This is a source-derived uncertain-result risk; no network-loss experiment ran here. [Export writer](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance-pack.service.ts:2235>), [READY prerequisite](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance-pack.service.ts:1225>), [export model](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7750>), [download](<E:/ohada saas/Focused projects/stoquify/components/accounting/CloseAssuranceCenter.tsx:435>).

Gate: retain the canonical private document durably before acknowledging certification, with its exact hash and an idempotent receipt/retrieval contract. Re-download must return the original bytes without creating another certification. Preserve historical bytes after invalidation and display their stale/current status separately.

### CA-05 — P1 qualification: the current sales proof did not earn a close certificate

The recently qualified financial test explicitly seeds CERTIFIED sentinels to test invalidation. A real close-service lifecycle test already exists, but its fixture is hardcoded to an October26 disposable database and was not run against the new migration catalog/sealed application in the prior qualification. Its prerequisites also need inspection: fixture-supplied signed reconciliation evidence is not proof of normal import/signoff. [Sentinels](<E:/ohada saas/Focused projects/stoquify/services/pos/__tests__/pos-full-commit.postgres.test.ts:286>), [lifecycle test](<E:/ohada saas/Focused projects/stoquify/services/inventory/__tests__/certified-close-lifecycle.postgres.test.ts:38>), [fixture target](<E:/ohada saas/Focused projects/stoquify/services/inventory/__tests__/cross-workflow.phase3.fixture.ts:8>).

Gate: parameterize a new guarded target; earn assessment/T4/certification/seal through authoritative producers, with independent actors. Then reopen/correct/invalidate/reassess/recertify and recover original retained bytes. Do not insert READY/T4/CERTIFIED/SIGNED rows to satisfy that end-to-end claim.

### CA-06 — P2: close scope, immutable facts and assignee contracts need hardening

Core close relations have independent organization/period/run foreign keys. The retained database inventory has no triggers/CHECKs on the seven core close tables; this is not a demonstrated tenant escape through current services. Add only narrowly justified composite scope constraints and immutable certified facts, allowing legitimate stale-state annotations. [Close relations](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:7549>).

Generic assignment copies `assignedToId` to an unconstrained `ownerId` without resolving eligibility. Define valid tenant operators and external accountants through active client/period grants. Do not prohibit valid external reviewers with a local-user-only foreign key. No notification disclosure was demonstrated. [Assignment](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance.service.ts:3223>).

### CA-07 — P2: client identity, period and export state need explicit transitions

Close query keys default organization to `current` and omit actor context; export state can survive a period change. Full-navigation sign-out mitigates the common identity transition, but it does not establish correct handling of permission-read failures, in-place organization changes or late responses. This is a source/test gap, not a reproduced browser disclosure. [Hooks](<E:/ohada saas/Focused projects/stoquify/hooks/accounting/useCloseAssurance.ts:113>), [center](<E:/ohada saas/Focused projects/stoquify/components/accounting/CloseAssuranceCenter.tsx:495>).

Gate: bind queries/actions/export state to the active actor, tenant, period and current authority; clear/hide sensitive cached state when authority becomes unavailable. Reuse the parent's permission scope rather than adding a duplicate refetching permission observer.

### CA-08 — P2: source custody, account applicability and operations remain explicit gates

Statement import retains hashes/parsed rows without populating the existing encrypted object key. Choose controlled private retention/retrieval or an explicit verified external custody policy. A hash alone does not prove availability or provider authenticity. Account applicability is intentionally conservative because effective-dated provider lifecycle is absent; do not remove archived accounts from coverage merely to clear blockers. [Statement persistence](<E:/ohada saas/Focused projects/stoquify/services/payments/statement-import.service.ts:447>), [coverage applicability](<E:/ohada saas/Focused projects/stoquify/services/reconciliation/account-close-coverage.service.ts:14>).

Notification publication has durable source/hash/audit/lease and duplicate controls, but worker scheduling, retry/backlog operations and actual recipient delivery need separate evidence. The CLI itself does not claim scheduling or that exit0 means an empty queue. Generic adapter/capture support is not proof of live MTN, Orange or bank onboarding; this audit did not establish absence of every alternate provider integration. [Notification worker](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-evidence-notification.worker.ts:27>).

## Policy decisions before implementation

AccountantReview currently records advice/comments; independent certification is the operative approval. REJECTED does not itself block export, and the blueprint does not expressly require a separate APPROVED review. Decide that policy before adding another gate; this is not a demonstrated certification bypass.

Critical waiver approval excludes the requester. Skill020 additionally calls for assignee separation on critical waivers. Specify the owner/requester/approver matrix and test it before changing this branch; preserve current requester separation. [Waiver](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance.service.ts:4583>), [review writer](<E:/ohada saas/Focused projects/stoquify/services/accounting/close-assurance.service.ts:4659>).

## Build gates for skills 019–022

| Gate | Owner role | Required scoped work and success criteria |
|---|---|---|
| 019 — contracts/integrity | Accounting backend lead | Reuse existing models. Decide waiver/review and assignee eligibility; define declared statement coverage, inactive intervals and retained canonical-artifact contracts. Add only necessary fields/constraints after corruption/backfill review. Protect certified facts while preserving explicit invalidation. Any migration must pass fresh replay, populated upgrade and real negative scope/immutability probes on new isolated targets. |
| 020 — authority/engine | Backend lead + QA | First harden legacy module and live authority using the existing evidence-authority pattern. Then require valid retained approval plus current source; support a genuine mixed-activity month without weakening coverage. Test actual-protect denials, independent waiver decisions, changed payload/source, concurrent sign/close and revoke/expire/disable while waiting. Mocked races do not qualify PostgreSQL locking. |
| 021 — existing portal | Frontend lead + QA | Repair actor/tenant/period cache and export transitions; show per-account statement/signoff gaps and custody/provenance. Prove EN/FR loading, denied, unavailable, stale and recovery states, keyboard/mobile behavior and independent-reviewer paths in the authenticated rendered app. |
| 022 — earned close/recovery | QA/platform + domain reviewer | On a fresh fully migrated target, create opening balances/inventory/cash and reconciliation prerequisites through real owners; earn READY/T4 and an independently certified retained pack, then seal. Lose the response deliberately and recover the exact same bytes/hash without duplicate certification. Closed-period writes must fail without effects; reopen/correct must invalidate current proof while retaining the original historical bytes; recertify/reseal. Verify the corrected sealed artifact through authenticated close actions/UI. |

The **first implementation packet** is CA-01: legacy close authority hardening with actual-`protect` denial tests and the existing transaction-authority pattern. Follow with CA-02/03 coverage and CA-04 retention before claiming the earned lifecycle. These are bounded changes to existing software, not a new close-center build.

## Cameroon/OHADA and data-trust boundaries

OHADA's official AUDCIF reference describes the revised SYSCOHADA framework and accounting/reporting rules. Cameroon DGI publishes a 2026 tax-code edition. The actual entity regime, chart, cut-offs, valuation/tax treatment and applicable filings need qualified review; this software audit did not implement or validate those rules. [OHADA reference](https://www.ohada.org/acte-uniforme-relatif-au-droit-comptable-et-a-linformation-financiere-audcif/), [Cameroon DGI 2026 code](https://impots.cm/fr/node/1336).

The zero-tax test chart, direct opening stock and synthetic sentinel records are not a reviewed Cameroon setup. Product T3/T4 grades and CERTIFIED exports are internal system-evidence labels, not regulatory approvals or legal audit opinions. Certification should continue to fail on unavailable critical data; a no-activity claim must come from actual scoped facts and independent evidence, not an empty queue or a missing integration.

## Verification not run and completion

No new Prisma generation/validation, full typecheck/build, database tests, browser journeys or earned certificates were run in this audit. Product source/schema was unchanged; the prior qualified build is linked only through the 508-file source comparison. Real close-scope, malformed-signature, monthly positive-path, retention-loss and revocation/concurrency experiments remain implementation acceptance gates.

Only this report and the supporting audit configuration/runner/evidence were created. No existing application, schema, artifact, test database or unrelated work was modified. Next numbered skill: **019**, scoped to these contract/integrity gates; do not recreate existing models. The first engine implementation then belongs to **020**. Production release still requires the separate release qualification gates.
