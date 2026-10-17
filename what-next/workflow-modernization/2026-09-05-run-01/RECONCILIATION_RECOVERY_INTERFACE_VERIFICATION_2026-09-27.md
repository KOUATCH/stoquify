# PR-10 — additional-source recovery in the application

2026-09-27 UTC; branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`, with shared working-tree changes preserved. **PR-10 remains In progress.** This milestone completes the protected interface and its verified recovery-to-independent-signing path. It supersedes the public-integration gap in the [earlier service report](RECONCILIATION_ADDITIONAL_SOURCES_VERIFICATION_2026-09-27.md), whose historical evidence is retained.

## Delivered behavior and benefit

The existing reconciliation preparation workbench now lets an authorized operator inspect and incorporate additional payments, provider events and statement lines into an existing unsigned run. It uses the existing shell, components, theme and EN/FR dictionaries. No separate dashboard or alternate reconciliation engine was introduced.

The protected preview and submission actions use server-derived identity and tenant scope. Existing module enforcement distinguishes read from write; submission requires verified fresh authentication. Strict input validation rejects forged identity fields. The service retains its current-role, tenant, revision and transactional controls.

The browser stores the pending operation type alongside its exact command in the existing actor/tenant/run-scoped session draft. This matters when the server commits but the response is lost: reload and retry recover the source-incorporation receipt instead of accidentally submitting a preparation command. Changing modes is prevented while an unresolved request exists. Query failures remain failures, and a foreign preview is rejected.

History now combines preparation and source-incorporation receipts, with their distinct operation, actor, reason and recorded time. Read access validates receipt shape, hash, scope and audit linkage; the same receipt loader supports signer-independence checks. Historical receipts do not establish current readiness. Incorporation returns the run to review; fresh preparation and an independent authorized signature remain separate actions.

## Current verification

| Evidence | Result and boundary |
|---|---|
| [Focused checks](evidence/additional-ui-checks-532ee257-0b73-49b6-a4e7-258275a79742.json) | 113 tests across eight suites pass. Eleven changed TypeScript files lint cleanly. Full `tsc --noEmit --pretty false` exits 0, without diagnostics. Recorded source hashes remain stable. |
| [Actual EN/FR application journeys](lanes/environment/additional-browser-ebc53181-7475-4fe9-bc61-e076875bf54d.json) | Both pass: authenticated entry, keyboard preview/focus, 320/768/1440 reflow, password step-up, response lost after actual commit, reload/exact retry, one recovery audit, retained history, renewed preparation, operator self-sign denial, independent signing and revoked-write control denial. No page errors; application source stable. |
| Persisted effects | The browser fixture retains its original match and adds one new match. Retrying retains one recovery audit. The independent signer produces `SIGNED`; no journal entries are created. These are synthetic records in the guarded disposable database. |
| Screenshots | Ten actual application screenshots accompany the browser receipt. French mobile and English desktop previews were visually inspected: long French copy wraps, preview focus is visible, and the established theme is inherited. Screenshots show a scrolled viewport; they do not prove every offscreen control or accessibility criterion. |
| Reused service evidence | [Previous database receipt](lanes/environment/additional-sources-1b62a7e4-f70c-4fad-a413-2ccb52171e08.json) supports matching, rollback, concurrency and retained-reference refusal on unchanged matching/recovery service code. The changed history validation additionally has current unit and browser coverage. |

Commands: `node what-next/workflow-modernization/2026-09-05-run-01/run-additional-ui-checks.cjs` and `node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-additional-sources-browser.cjs`. Exact Jest, ESLint and TypeScript arguments are in the focused receipt. The inspected server wrapper was `lanes/environment/supplier-ack-local.cjs`, loopback port 3110, with no migration or seed. Its owned process tree was stopped after verification; unrelated servers were preserved.

Environment: guarded `stoquify_local_registration_20260906_01`, synthetic fixtures, real PostgreSQL transactions and actual Next.js application. Browser and server external-network fences remained active. No schema change, migration, database reset, production deployment, live activation, real payment or external message occurred.

Entry observations: EN 61,005 ms, FR 10,670 ms; additional-source previews 1,593 ms and 1,396 ms respectively. These are development observations with sequential locales and different initial compilation/cache conditions, not a controlled before/after comparison or production certification. Material entry delay remains to be attributed and measured.

## User and operator instructions

1. Open `/<locale>/dashboard/finance/reconciliation` (`en` or `fr`) and the existing runs/preparation view. Select the existing unsigned run for the intended provider and business date. Obtain these from the retained run and source import records; do not create a duplicate run for the same scope.
2. Choose **Review additional sources** / **Examiner les sources supplémentaires**. Read the server-derived counts and checked time. The system determines source IDs, actor, scope and revision; you do not invent or enter those references.
3. Enter a review reason explaining why new evidence belongs to this run. Use the actual import, provider capture or operational correction as your source. Submit the reviewed additions and authenticate in the application when prompted. Never send your password to support.
4. If the response is uncertain, retain the same browser session and retry the saved request. Reload recovery was verified. A new browser/session is not claimed to restore an unsaved draft. Do not change the reason or operation to disguise an unresolved request.
5. Inspect the retained history and current run status. Resolve any genuine exceptions, then check preparation requirements and prepare the current evidence. The person who made or incorporated the evidence cannot supply the independent signature; ask an appropriately authorized colleague to review the signing handoff.
6. If permissions or setup prevent the action, ask the organization's access or accounting owner to correct the actual prerequisite. Receipt IDs and timestamps come from retained server records. They are reconciliation evidence, not an organizational product approval or a way to clear X1 automatically.

## Remaining closure and recovery limits

PR-10 still requires the bounded provider/period and concurrent signing/preparation race audit, retained-reference manual-resolution and statement-source coverage, source-volume review, operator/outbox handoff, remaining contrast/text-enlargement checks, and entry-latency diagnosis. Native screen-reader speech and browser-chrome zoom remain unverified. Reduced motion was requested in the browser context; this run does not independently certify all motion behavior. No outbox delivery is inferred from a committed row.

Signed runs intentionally refuse new incorporation; their retained correction boundary is separate. A role-authorized operator can still request a preview of a signed run and receive a service refusal; a more specific unavailable-state explanation remains a usability follow-up. The retained-reference manual-review case remains blocked until genuinely resolved. These are engineering requirements, not requests for fabricated approval.

Rollout: no database migration is required for this patch. Keep deployment behind the existing release process and verify current role/module policy in the intended cohort. In an uncertain outcome, inspect the existing receipt and retry the same command. Preserve receipt and audit records during recovery or code rollback; do not restore an earlier implementation that ignores recovery operators when determining signer independence.

## Review accountability

Architecture/backend/data: existing workbench and matcher, server-owned revision, validated durable history and exact retry. Security/IAM/privacy: server identity, fresh authentication, read/write module controls, scoped draft and independent signing. Finance/audit: retained matches, one recovery audit, no posting, renewed review. Frontend/UX/localization: existing tokens/components, meaningful operation labels, EN/FR recovery, keyboard preview focus and three widths. Product/operations: recovery is reachable and does not require an internal-service call. Quality/SRE: source-bound tests and actual database/browser evidence; latency remains a measured limitation. APIs/events/rollout: protected action integration verified; notification delivery and production release remain separate. SaaS packaging: no entitlement or price changes. Statutory/country rules: no rule change or professional certification. POS/offline, purchasing, HR/payroll, analytics and AI are not applicable to the changed behavior; their business lifecycles were not modified.

Continuing skill: `009-aqstoqflow-payment-reconciliation-moat`. This is substantive progress on the existing primary workflow, not a new workflow closure. Continue PR-10's remaining checklist before switching to the ranked backlog.
