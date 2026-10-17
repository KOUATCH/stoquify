# Cash Command: close proof and invalidation

Evidence date: 2026-09-30. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`, with existing shared changes preserved. Workflow **FA-CASH-COMMAND remains In progress**. This correction is not whole-workflow closure.

## Delivered correction

The close proof reader now respects persisted source invalidation, requires a retained certified export before trusting a `CERTIFIED` status, and includes unavailable checklist controls in its complete tenant-scoped assurance checks. Invalidated exports remain visible as history but no longer have an edge saying that they certify the current close. Both the export node and its link indicate blocked trust. Private invalidation metadata is used only for the decision; it is not copied into the response.

All new explanations and recovery instructions have French translations. Existing drawer components, semantic colors, routes, permissions and redactions are reused. No database schema, export writer, professional approval or financial posting rule was changed.

The original baseline reproduced three defects against synthetic historical rows: (1) certified status with no certified export was graded certified; (2) the actual invalidation service marked an `EXPORTED` run and its historical pack stale, but both still appeared certified; (3) a high-risk unavailable checklist control was graded operational. Corrected reads block all three. The historical certified rows are explicitly adversarial fixtures, **not successful certifications**.

## Actual lifecycle and its limits

On a new ownership-guarded local organization, the actual close assessment persisted a blocked run with one high-severity finding and T2 trust. An independent synthetic reviewer recorded `CHANGES_REQUESTED`. The actual export service produced a watermarked, hashed `DRAFT_NOT_CERTIFIED` JSON artifact and retained its blocker list. Attempting certified export was rejected; run/export/event/journal/payment fingerprints were unchanged by the denied attempt. Draft export and proof reads did not certify the run. Cross-tenant proof lookup was denied.

The export blocker list includes insufficient trust, unresolved controls, stale inventory annex evidence and missing payroll pilot-cycle evidence. No approval/certificate hash was invented to clear those gates. The synthetic actors and direct-service permission/fresh-auth contexts test service behavior, not real human authority or an upstream production approval flow. Qualified statutory review remains separate.

## Verification

- Baseline: `lanes/environment/close-proof-baseline-7b700f0a-fb10-4645-81a8-953101dc0ad4.json` — three reproduced defects, stable source.
- Corrected service/runtime: `lanes/environment/close-proof-corrected-8488c6c5-37d5-4448-9050-b6f5272e2251.json` — five proof stages, actual assessment/review/draft/refusal and unchanged records during reads.
- Focused checks: `evidence/close-proof-checks-6bf1546e-b13a-42ee-a05b-8d40581ab6aa.json` — **8 suites / 91 tests**, changed-file lint and TypeScript pass. Includes payment coverage regressions, proof actions/module boundary, drawer and close export service tests.
- Actual application: `lanes/environment/cash-close-proof-3f285fd6-8ce8-4e80-a249-0e4976de304b.json` — four cases: draft and invalidated history, each EN 1440px and FR 320px. Real action response/subject binding, localized blocker, keyboard entry/containment/Escape/focus return, no drawer horizontal overflow or page errors, stable business records during reads. Four screenshots retained; FR invalidated screenshot inspected.
- The first sandbox runtime attempt failed writing its receipt (`EPERM`, terminal exit 1); no success was claimed. The approved rerun produced the baseline above. There was no approval-review rejection.

Use `run-close-proof-checks.cjs` for the inspected, migration-free test/lint/typecheck sequence. Runtime and browser verifiers require the existing disposable database and local app; they fence network requests and assert database/organization ownership. Browser interception disables HTTP caching, so these runs do not establish production or warm-cache performance.

## Newly established engineering dependency

`lanes/environment/close-inventory-freshness-a77cf5b7-7e26-4591-8d82-e002296f20ac.json` shows two calls to inventory reconciliation with identical returned business evidence and different default `recordedThrough` timestamps. Their `reportHash` values differ. Repeating the first cutoff reproduces the first hash. The verifier performs no writes.

Source explains the result: `services/inventory/inventory-reconciliation.service.ts` hashes a report containing `recordedThrough`; close assessment and close export each call the service using a new default cutoff. Consequently the unchanged fixture's saved annex fails export freshness. **Next engineering action:** correct the close/inventory comparison contract and test unchanged evidence, later/backdated writes, corrections and recorded invalidation. Reusing the old cutoff alone would conceal later records and is not an acceptable remedy. This defect is recorded, not corrected in this patch.

## Use and recovery

Open `/en/dashboard/finance/cash-command` or `/fr/dashboard/finance/cash-command` with finance and close-read permissions. Open **Close proof / Preuves de clôture**. A stale or missing-evidence message means the retained status/export cannot establish current trust. Open `/en/dashboard/accounting/close` (or French equivalent), investigate the listed controls and obtain a new assessment; follow the normal authorized review/export workflow. Retain historical exports. Do not edit status, hashes or evidence flags to force certification.

For rollout, retain the existing local-only cohort until the outstanding close/payroll and workflow acceptance criteria are met. No migration or deployment occurred. A rollback must revert only the recorded before/after changes while preserving unrelated checkout changes; reverting this patch reintroduces the three misleading proof states, so forward correction is preferred. No financial records need reversal.

## Review accountability and remaining scope

Architecture/backend/data: service-owned decisions, complete aggregate checks, historical records retained. Security/privacy: tenant root and aggregate scopes retained; no raw metadata disclosure. Frontend/UX/localization: existing shell/drawer and EN/FR language reused. Finance/audit: historical certification distinguished from current trust; no ledger or money writes. Quality/release: focused regression, real local services and browser checks bound to source; no release certification. SRE: same aggregate query count, bounded display; production latency remains unverified. Product/operations: actionable stale-evidence recovery, known false-staleness dependency recorded. Statutory: existing expert-review requirements retained; no certification claim. Billing/packaging, offline/provider execution and AI behavior: not applicable to this read-only proof correction.

Successful genuine certified-close export remains unverified. Other Cash closure requirements include broader payroll/payment/provider/declaration lifecycles, native screen-reader/browser zoom/nontext contrast/shared denied-state landmarks and production performance. Earlier successful payment/reconciliation and synthetic-input payroll journal evidence remains valid within its stated scope.
