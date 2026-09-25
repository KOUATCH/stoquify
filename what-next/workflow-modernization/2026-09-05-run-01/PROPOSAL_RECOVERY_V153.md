# Governed proposal visibility and recovery — v153

15 September 2026. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`, preserved working-tree changes. Continuing the `016-aqstoqflow-ai-copilot-guardrails` skill. v152 was verified progress. Baseline `evidence/source-baseline-v153.json` (`325fdf`) records 2,927 source files and 1,045 tests; these counts are not workflow completion.

## Delivered behavior

The Daily Digest page now obtains a display flag from the existing proposal-release validator, only when command execution and rendering are both permitted by their rollout. It forwards the flag through the dashboard to the existing agent panel. A missing/unapproved release hides proposal controls; an unexpected query error propagates as a failure rather than a successful denial. Every proposal action still independently checks current release, session, permission, module and fresh authentication. A rendering flag confers no authority.

Preparation retains exactly one request, including its expiry, through recoverable failures while the component remains mounted. A synchronous in-flight guard prevents overlapping submissions. A new run/priority remounts isolated controls, so an old response cannot install an old draft into a new run. Expired and cancelled outcomes now have distinct EN/FR labels and status announcements instead of appearing rejected.

An identical saved decision is recoverable by its original reviewer with the same decision and reason and current operation permission. It returns the recorded result, even if the draft has since expired, without adding an event/audit/outbox or executing a workflow. Another reviewer, changed reason, changed decision or lost permission cannot adopt that replay. Revalidation from v152 still applies to new acceptances.

## Verification

| Check | Result |
| --- | --- |
| Focused tests | 73 tests/eight suites passed (`462dc9`): service, release, actions, proposal controls, agent panel, dashboard and route tests. Covers display grant/denial/query failure, stable retry payload, duplicate pending click, old-response isolation, outcome labels and decision replay restrictions. |
| Lint/typecheck | Ten changed files passed lint (`c2c43c`); final typecheck passed (`239f36`). |
| Actual database | `proposal-recovery-v153-3739db6c-fe5e-4189-aaec-7c91071013af.json` (`f7acc7`): exact creation replay; accepted/rejected decision recovery after expiry; changed actor/reason and lost permission denial; two total events per proposal with one audit/outbox each. |
| Actual application | `/en/dashboard/daily-digest` and `/fr/dashboard/daily-digest` loaded with real owned credentials and role. Default-disabled agent remained disabled; proposal control absent. No page errors and no proposal/event/journal/payment changes from those reads. Six screenshots at 1440, 768 and 320 widths. |
| Timing | EN 24,435 ms and FR 4,430 ms from navigation until disabled-state assertion, on the existing development server. Warmup/compilation and query costs are not separated; no production budget claim. |
| Visual review | French mobile full page inspected. Agent disabled message/button and no-authority text visible. Existing mixed-language digest content and large blank area below cards remain findings; browser-wide accessibility and reflow are not certified. A development issue badge was visible; cause not classified by this batch. |

The first focused run passed 72 tests (`4674a6`); a positive/negative agent-panel display test added the final 73rd test. No failed implementation checks in this batch. Live app session `32685` was confirmed running; it was not restarted due to an inconclusive listener query.

The actual enabled proposal browser journey remains unverified. No approved activation package was created in the owned tenant. Positive governed release and enabled panel paths are test fixtures, not production approval evidence. No migrations, live messages, financial execution, deployment or X1 change.

## Operator guide and remaining work

- If preparation fails, retry on the same screen to reuse the same request. Avoid navigating away while recovering an uncertain submission; persistence across reload/unmount and configuration/history recovery remains to be implemented.
- If a decision response is lost, the same reviewer can repeat the same decision and reason. The server returns the original outcome; it does not repeat its side effects. Changing reviewer or reason is a different request and must not silently overwrite history.
- Acceptance remains human intent only. Perform business work through the existing authorized domain workflow.
- Proposal availability is now wired to the existing release controls. A release owner supplies real approvals, commit-bound verification, role/cohort scope and current operational owner records through the established governance workflow. This test evidence is not a substitute. No new end-user form is introduced.
- Deploy page, dashboard, controls and services as one reviewed change. Existing kill switches/release revocation remain effective on actions. A stale open tab can still show a button after revocation, but submission must reauthorize. Refresh it to update visibility.
- Rollback needs no migration. Preserve historical decisions, events and queue records. Reverting retry handling restores prior duplicate/conflict friction; reverting visibility hides controls even for valid releases.

Next investigate durable proposal recovery/history, expiry handling and Daily Digest's existing locale/layout/access/error states. Full rollout authorization, complete enabled browser journey, keyboard/screen-reader/zoom checks, underlying source freshness and the remaining platform workflows stay open.

## Review accountability

Architecture/backend/data: existing validator reused; tenant-scoped saved decision replay, no schema changes. Security/IAM: rendering separated from action authority; original reviewer, reason and current permission required for replay. AI safety: no execution authority or new tool access. Audit/records: replay preserves original result and effects. Product/UX: fewer retry conflicts; accurate outcome labels. Accessibility/localization: EN/FR outcome/recovery and status semantics tested; full browser coverage incomplete. Quality/SRE/support: source-bound tests, database/browser evidence, development timings and rollback guide. Finance/controls: sampled financial tables unchanged; no certification. Statutory/payroll/POS/AP/payment-provider rule changes are not applicable: no domain policy or dispatch changed. SaaS packaging is not applicable: no entitlement or price changes. Data governance: historical outcomes are preserved, not relabelled as fresh decisions.

Next recommended numbered skill remains `017-aqstoqflow-enterprise-release-gate` when that boundary is selected. The overall workflow review is incomplete.
