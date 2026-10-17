# Close request supervision

Milestone for FA-CASH-COMMAND and its FA-CLOSE-PACK dependency. Neither parent workflow is complete. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`, evidence date 2026-10-04. Existing unrelated changes preserved.

## Problem and delivered correction

An authorized same-organization manager could already replace a request's response owner through the domain service. The workbench only discovered requests authored by the signed-in user, preventing another manager from finding a departed requester's obligations. The request and response services already retain original authorship; changing it would obscure provenance unnecessarily.

The Close evidence workbench now has **Requests from other colleagues / Demandes d’autres collègues**, separate from **Requests you sent**. It lists other authors' requests for the selected organization and period, including retained completed records. A server-owned projection requires current Close read, evidence request and finding assignment permissions. It checks account, organization, module and permissions before collection, then checks current authority again before returning the result. Read-only module access permits inspection, with changes unavailable. Explicit unauthorized supervision-page requests are refused.

The collection has its own seek cursor bound to organization, actor, period and collection kind. It uses the existing bounded tracking projection; response and acceptance bodies are excluded. Original requester account information is read only inside the current organization. Missing account information is unknown, not proof of inactivity. Original request/response metadata is validated against the recorded author rather than the viewing manager.

The existing response-owner replacement form can now open from either collection, using the stored assignment revision. Changing permissions during pagination removes the privileged view. Existing current-authority, session, revision, idempotency and independent acceptance controls remain effective. No new requester ownership record, schema or permission was introduced.

Separately, a restored recovery command's retry button now reflects read-only access and hydration state. Its submit handler already refused read-only writes; the change makes the unavailable interaction visible while retaining the uncertain command.

## Bounded acceptance checklist

| Criterion | Evidence |
|---|---|
| Ordinary authored tracking remains author-only | Exact-query unit regression; actual manager's own collection excludes the departed author's request |
| Current supervision permission and tenant/period/cursor boundaries | Focused denial, foreign-scope, cursor-purpose and post-collection revocation checks |
| Manager discovers an inactive requester's retained work | Owned-database scenario; EN/FR browser journeys |
| Reassignment, new response and independent acceptance complete | Actual domain services and application actions, original requester inactive throughout |
| Original authorship, request and deadline preserved | Full stored request comparison; existing replacement/deadline checks |
| Retry, stale revision and overlapping response remain safe | Six replacement runtime regressions plus focused tests |
| Reload preserves the replacement draft | EN/FR actual browser reload |
| Read-only pending recovery retry remains retained but disabled | EN/FR component tests; no action invoked |
| Existing semantic theme, keyboard, focus and reflow | Actual application screenshots; 1440/768/320px checks and reduced motion |
| Financial and other fixtures unaffected | Before/after database fingerprints in runtime/browser receipts |

This checklist does not certify notification delivery, complete accessibility, high-volume performance or the whole Close lifecycle.

## Verification

The inspected runner directly invokes Jest, the repository's `tsc --noEmit --pretty false`, and ESLint, without lifecycle scripts or database operations:

```powershell
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-close-evidence-recovery.cjs jest
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-close-evidence-recovery.cjs typecheck
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-close-evidence-recovery.cjs lint
```

Executed with the installed bundled Node runtime. **626 tests across 24 suites passed**, zero failed or skipped. TypeScript and lint passed. Source hashes before and after each run match:

- [Focused tests](evidence/close-evidence-recovery-jest-c809fff8-bd87-41ab-9707-e32781d61ffe.json)
- [TypeScript](evidence/close-evidence-recovery-typecheck-ec7390ba-44c8-4ec3-863a-cbf204413712.json)
- [Lint](evidence/close-evidence-recovery-lint-c29ca0df-7f95-4fdd-8cc7-77c02ff3c892.json)

The inert `lanes/environment/close-request-supervision-runtime.cjs --run` wrapper checks owned loopback database identity before creating fresh synthetic fixtures. Seven scenarios passed, including exact and conflicting concurrent submissions, response/replacement overlap and the departed-requester handoff. No migration, reset or external delivery occurs. [Runtime receipt](lanes/environment/close-request-supervision-938ac98e-6907-417e-b9fb-6f687bf7c4d0.json). Its supervised read took 91ms in this synthetic fixture; the earlier own-tracking read took 59ms. These are different workloads, not a performance comparison or approved budget.

The inspected `supplier-ack-local.cjs` launcher starts the network-fenced Next development app on `127.0.0.1:3110`. The browser wrapper requires the exact passing runtime receipt/hash and verified listener PID/workspace, exercises the real application, and retains source/build hashes, screenshots and navigation timings. The publication checkpoint validates every journey and source binding before updating the register.

**Both EN/FR browser journeys passed**, including actual reassignment, response and independent acceptance while the original requester was inactive. Source, financial and outside-fixture fingerprints matched. [Browser receipt and eight screenshots](lanes/environment/close-request-supervision-browser-b0f9ca99-3fc5-4d17-aeda-d563df9228c1.json). Inspected the English and French 320px forms and accepted English history; their text and actions fit the existing theme. Automated checks found no horizontal overflow at 1440/768/320px, verified keyboard focus/actions and reduced motion. Screen-reader operation and browser zoom were not tested in this milestone.

The initial development route visit took 38.836 seconds; the other nine visits took 5.853–10.012 seconds. These are navigation-to-workbench observations in a development process, not production budgets or proof of a latency improvement. The initial cold visit was materially slower than the prior milestone's 5.707–11.459-second range; no controlled performance comparison was conducted. Reloads and individual writes were not timed. Compiled Close route SHA256: `cad8234b03d14ca47566b40864abed6e482b42bfb08d6c0ef308fa530d0ebf3a`. No full build or migration-bearing default build was run.

One initial browser invocation failed the receipt-hash format guard before credentials or fixtures were changed: [retained failed receipt](lanes/environment/close-request-supervision-browser-e54d9189-9dc9-4cdb-b5e0-9e49f8012a6b.json). The correction reads the SHA256 directly from the verified receipt instead of transcribing it. No product change was needed.

## User and operator guidance

Open `/en/dashboard/accounting/close` or `/fr/dashboard/accounting/close`, select the relevant period, and inspect **Requests from other colleagues**. Your access administrator supplies current Close read, request and assignment authority through the existing role system. Merely knowing a request reference does not grant access.

Check the assessment date, original requester, response owner, due date and stored status. For an unanswered request, choose **Change response owner**, select an eligible colleague from the server-provided list and enter why responsibility is changing. Use the existing personnel handover/account information for that reason; do not rewrite the original request or issue a duplicate. Refresh when a stale revision is refused. An uncertain result retains its exact retry command.

The new owner responds through their assigned queue. An authorized independent reviewer then inspects the response and current replacement evidence, records review notes and accepts through existing fresh-authentication controls. Acceptance does not certify the period. Historical requests and recorded owner-change reasons remain visible after completion.

The original requester's unavailability warning concerns their current account/request authority; missing account information is explicitly unknown. An eligible response owner is still required. A submitted response cannot be reassigned using the unanswered-request control.

## Rollout, recovery and review responsibilities

Ship pagination, service projection, localized copy and panel together. No migration or backfill is required. Reverting the supervision UI/projection removes discovery convenience; it must not delete requests, recipient-change audit records, responses or acceptances. Preserve the domain guards and original author bindings. Monitor authorized view failures and latency; source failures must remain failures, not empty successful lists. No deployment occurred.

Architecture/backend: reused existing projection and mutation services with a distinct server-controlled scope. Data/audit/finance: original author and source records remain immutable, deadline retained, independent acceptance and financial fingerprints verified. Security/privacy: least necessary current permissions, same-tenant directory reads, isolated cursors, read-only behavior and revocation checks. UI/workflow/localization: one shared card renderer, established dashboard tokens, EN/FR and recoverable forms. Quality/SRE: actual database/browser effects, source bindings and development timings, with limits stated. Product/operations: managers can continue departed colleagues' work without copying requests. SaaS packaging: existing module eligibility remains authoritative; no commercial change. Statutory calculations, payroll, POS, AI and billing are not applicable because this milestone changes none of their behavior. These are engineering reviews, not professional approvals.

## Remaining work

`respondToMissingCloseEvidence` still emits its workflow event with `ownerId: request.requestedById`. This change does not retarget notifications or prove asynchronous delivery to a supervising manager. That ownership/delivery boundary is the next targeted investigation. Delegated context, correction where no valid evidence chain matches the finding, further authority races, full accessibility/zoom, capacity and original Cash/Close handoffs remain open. Prior scoped draft/recovery evidence is retained with its original source bindings; changed-source conclusions are not represented as current merely because an older report passed.

The full register remains 270 discovered workflows, 4 Complete—verified, 2 In progress and 264 Queued, with 191 unmapped entries and incomplete discovery. No X1 clearance or release certification is implied.
