# Permission lookup and reconciliation recovery

Current implementation batch, 6 September 2026. Read the associated receipt for final command results and source bindings. Earlier findings in the register remain historical unless this checkpoint supersedes them explicitly.

## Corrected behavior

The manual reconciliation controls use `usePermissions` to display the current account's capabilities. Previously a failed `/api/me/permissions` request returned an apparently successful empty list to the interface. The hook offered no explicit error/retry state and cached the list for five minutes. A failed service lookup could therefore look like an administrator had removed access.

The endpoint now uses the existing current-session authority checks, emits private/no-store responses and separates authentication/authorization failures from an unexpected service failure. Successful responses identify the actor, organization and check time. Private account fields and raw exception details are not included.

The client verifies the response actor against the requested signed-in account. Loading, signed-out, failed and successfully checked states are distinct. Existing displayed grants cannot enable a reconciliation mutation during a failed or pending refresh. An actual successful empty grant list remains a valid no-access result.

Successful role and member-access changes invalidate this permission query. It also rechecks on mount, window visibility/focus restoration and explicit retry. It does not poll continuously or push changes into another user's active browser. Server-side action checks continue to enforce current authority, including when any interface snapshot is stale.

The navigation shell currently uses the server-provided permission snapshot through `components/dashboard/useShellPermissions.ts`; it does not use this query. Full shell refresh and continuously active cross-tab propagation remain separate engineering review items.

## What a user does

Open **Finance → Reconciliation** at `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation`.

| Displayed state | Meaning | Required action and input source |
| --- | --- | --- |
| Checking current access | A current permission lookup is running | Wait; no approval document or additional business input is needed |
| Access could not be checked | The current lookup failed; this is not a confirmed removal of your role | Use **Retry access check** / **Réessayer la vérification des accès**; entered amounts and saved proposals remain available |
| Signed-in account unavailable | The interface cannot identify a current signed-in account | Sign in using your own existing account credentials, then reload the workbench; use the normal password recovery route if necessary |
| Current access does not permit a proposal | The lookup succeeded and the returned permissions do not grant this operation | Ask your organization administrator to review the actual role/member assignment; obtain the intended responsibility from your manager and the recorded role decision from the existing access workflow |
| Approval unavailable to the preparer | Separation of duties requires a different authorized account | The independently authorized approver reviews the existing proposal and its evidence; do not add self-approval or simulate a signature |
| Module unavailable | Current capability/setup controls prevent changes | Review module grants and setup through the existing module administration workflow; this permission retry cannot activate a module |

A retry checks access only. It does not resubmit a proposal, approve a payment, change a role or post to the ledger. Proposals and their evidence keep their existing domain lifecycle. On account changes, reload existing application tabs and confirm the company before continuing.

## Verification scope and limits

Focused hook tests exercise lookup failure, successful empty grants, retry after previous success, another-actor response, account change and sign-out. API tests check private failure envelopes and exclusion of personal fields. Reconciliation tests check preserved amounts, disabled proposal/approval controls and retry without financial submission. Role/member hook tests check invalidation after a successful mutation.

The browser driver uses the actual isolated application, current test-account sessions and real permission responses. Its failure path deliberately returns HTTP 503 for only the browser's permission request. This is fault injection, not a claim that the database failed. It does not create financial transactions or modify grants. Actual financial writes, full shell/session propagation, native screen-reader/zoom/contrast checks and a complete release build remain separately incomplete.

The installed headless browser reports background blank tabs as visible (probe `c55c1c`). The visibility-refresh check therefore explicitly emulates a hidden-to-visible event sequence. It is not claimed as native tab-switch verification; keyboard retry uses actual browser keyboard input.

No migration, live provider call, external message, live customer change or deployment is included. Preserve server authorization, module gating, independent approval, evidence revision and financial invariants. Do not roll back to a success-shaped empty list on lookup failure.

## Review responsibilities

| Responsibility | Batch conclusion |
| --- | --- |
| Architecture and backend/API | Existing session authority reused; permission display state remains separate from operation authorization; shell snapshot boundary explicitly retained |
| Database and migration | No schema change or new database mutation; browser driver compares retained organizations, selected identity fields, roles, grants, payment transactions and journal entries |
| Security, IAM and privacy | Actor-bound response, current-session enforcement, non-cacheable envelopes and redacted errors; no global auth/provider rewrite |
| Frontend, UX and EN/FR accessibility | Distinct text states, semantic warning treatment and a keyboard-operable retry; amounts preserved in focused tests; native assistive-technology checks remain open |
| Product and operations | Users can distinguish a service failure from a confirmed role denial and retry without repeating financial work |
| Finance, reconciliation and ledger/close | Existing proposal/approval, independent checker and evidence controls retained; permission retry causes no financial submission or ledger posting |
| Quality and release | Focused regression and owned browser evidence required; full platform and release coverage remain incomplete |
| SRE, performance and cost | Removed five-minute stale eligibility display; mount/focus/mutation/manual refresh instead of continuous polling; local route timing is observational only |
| Audit and records | No permission retry presented as a business approval, grant mutation, payment evidence or X1 completion |
| SaaS packaging and support | No entitlement, package, price or subscription change; module availability remains independently enforced |
| Statutory/country rules | Not applicable to changed calculations: no country rule, tax or statutory report is changed |
| POS/offline, purchasing/AP and HRIS/payroll | Not applicable to domain operations: no producer, replay or payroll record is changed |
| Analytics/data governance | Lookup failure is no longer successful empty access; workflow evidence and source bindings record the actual tested scope |
| Providers/API events | Permission HTTP contract changes; no external provider or event-delivery contract changes |
| AI/agent governance | Not applicable: no agent, automated approval or new authority introduced |
| Rollout/recovery | Ordinary source rollout only; retained controls and failed-attempt evidence remain; no production action performed |

These are engineering review responsibilities, not professional certifications.
