# Copilot proposal evidence integrity — v152

15 September 2026. Selected skill: `016-aqstoqflow-ai-copilot-guardrails`. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`, with preserved working-tree changes. Baseline: `evidence/source-baseline-v152.json` (`98469e`). Prior v151 turn was verified progress; the full platform assignment remains active.

## Findings and correction

The proposal service matched citations by subject/module/hash and availability but ignored stored freshness and evidence grade. Four new tests reproduced acceptance of blocked, failed, stale-as-fresh and raw-as-operational evidence (`b6ea16`). Request data could inflate evidence authority. Acceptance also used the saved draft without rereading its originating run.

Creation now checks stored evidence inside its transaction. Citation identity, hash, grade, freshness and availability must agree; conflicting duplicate stored citations are rejected. Prisma's uppercase freshness is compared with the public lowercase vocabulary. Truthfully labelled stale evidence remains usable for non-executing proposals; it cannot be represented as fresh. This is not a new requirement for every proposal to be based exclusively on fresh evidence.

Acceptance revalidates the draft's persisted citations against its creator's completed tenant-scoped run. Changed grades, freshness, availability, hashes, missing runs or malformed citations prevent acceptance and preserve the draft. Another authorized reviewer may accept it. Rejection remains available for an unexpired draft when evidence is withdrawn or changed.

Creation and decisions use serializable transactions. Database serialization/unique-write conflicts become typed `CONFLICT` results. Domain update, event, audit and outbox remain transactional. Acceptance still records intent only; it invokes no target operation. Existing release, module, permission and fresh-auth gates are unchanged.

The controls display EN/FR guidance for changed evidence/proposal state and preserve rejection after failed acceptance. No new shell, theme, dialog or design primitives were introduced; existing danger token and alert semantics remain.

## Verification and limits

| Check | Evidence |
| --- | --- |
| Before correction | Four regression tests failed because invalid claims resolved successfully; 13 existing tests passed (`b6ea16`). |
| Service, release, action and component tests | 55 tests, five suites passed (`365b7e`). Includes inflated grade, conflicting citations, changed evidence, missing run, malformed saved evidence, different reviewer, rejection recovery, EN/FR and typed concurrency conflicts. |
| Lint / typecheck | Four changed files passed lint (`e76ea1`); final typecheck passed (`4eea68`). |
| Owned PostgreSQL | `proposal-evidence-v152-036abd66-57c2-4387-b3f6-646a7800046d.json`, receipt `06102b`. Real services reject six misrepresentation cases without proposal/event/outbox writes, preserve a draft after failed acceptance, allow rejection, retain honest stale labels, accept valid evidence, deny foreign tenant/no permission, reject changed run, and keep one proposal/event/outbox on concurrent creation and one winner on concurrent decision. No journal/payment/posting-batch records created. |
| Release boundary | `proposal-release-gate-v152.json`, receipt `c988d6`: zero activation packages for the owned tenant; real release authorization denies. No approvals manufactured. |
| Actual browser journey | Not verified. `AgentCommandPanel` defaults `proposalDraftsEnabled` to false; its production caller in `DailyHabitDigestDashboard` does not supply the flag. Component tests are not browser evidence. Governed exposure and full EN/FR/mobile/keyboard visits remain work. |
| Failed verification attempt | `b77de8`: Jest hoisting accessed the transaction mock before initialization; three other suites/21 tests passed. Fixed fixture wiring, retained the production contract. |

No migrations, deployment, provider dispatch, X1 changes or production performance claims. The database run uses synthetic evidence directly through domain services, not authorized production approval flows. Serializable transactions establish a consistent stored snapshot; they do not continuously refresh the underlying business source records. Stored grade is not professional certification.

## User and operator guide

If evidence changes during review, refresh the analysis and inspect its cited sources before preparing a new proposal. The old draft remains unchanged after denied acceptance; an authorized reviewer can reject it before expiry. A recorded acceptance does not execute the workflow—open the existing authorized domain workflow to perform any operation.

For concurrency conflicts, refresh the current proposal state before retrying. Integration callers must reuse the same request content and idempotency key when retrying creation. The current browser control recalculates expiry on each preparation attempt; stable retry content and full recovery need a follow-up correction.

No new end-user inputs are required for this patch. A release owner must separately supply the existing governed package's actual product/security approvals, supported role scope, release commit, current certification and operational owner records before enabling a customer. Obtain these from completed organizational review and verification processes, not these synthetic fixtures. The engineering task to connect the existing control to server-owned release availability remains open and does not require inventing approval evidence.

Roll out service and controls together under ordinary release controls. Observe typed conflict and evidence-denial rates; investigate changed sources before treating them as transient errors. Do not rewrite historical proposals or delete evidence to force acceptance. Reverting the service correction restores the known integrity defect. No migration rollback is needed.

## Review matrix and next work

| Responsibility | Review |
| --- | --- |
| Architecture/backend/data/API | Existing service owns evidence comparison and transactional decisions; no schema expansion. Source action graph nodes identify proposal entry points; current source confirms relationships. |
| Security/IAM/privacy | Tenant and required-operation permissions preserved; representative denials verified. Release/fresh-auth wrapper tests remain narrower than a live authorized action journey. |
| AI/agents | Source authority inflation corrected; no execution authority granted. Underlying-domain freshness and source validation still need review. |
| Audit/records | Draft/outcome/event consistency and duplicate handling checked in PostgreSQL. Queued output is not delivery evidence. |
| Finance/controls | No autonomous financial action; sampled financial tables unchanged. Full financial invariants not recertified. |
| Frontend/UX/accessibility/localization | Existing alert and button patterns; EN/FR recovery tested in components. Actual browser, responsive, keyboard and assistive technology coverage remains incomplete. |
| Quality/SRE/operations | Focused regressions, real persistence/concurrency, source bindings and recovery guide. Production contention/performance unmeasured. |
| Product/SaaS | Trustworthy proposal review supports existing intended feature. Actual exposure and stable retries remain incomplete; no packaging changes. |
| Statutory/payroll/POS/AP/provider/ledger specialists | Not applicable to rule changes: this patch neither changes those domain rules nor dispatches their operations. No expert certification claimed. |
| Analytics/data governance | Grade and freshness labels must match stored run evidence. No analytics query or dashboard KPI change. |

Continue governed UI exposure, stable client retry content, rejection/expiry/history recovery, underlying source freshness and the remaining platform register. Next recommended numbered skill is `017-aqstoqflow-enterprise-release-gate` when the release boundary is selected; this report does not establish release readiness.
