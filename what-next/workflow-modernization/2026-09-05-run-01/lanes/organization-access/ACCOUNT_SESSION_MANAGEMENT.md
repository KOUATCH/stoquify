# Account session management

Implementation checkpoint, 2026-09-06. Source baselines v34–v35; v35 adds the visual-review correction explaining the current list beside a recovered result and uses outline styling for secondary review/reload actions. This is a supported workflow batch within the ongoing platform review, not a platform completion or security certification.

## What changed

Open `/en/dashboard/settings/security` or `/fr/dashboard/settings/security` in the existing authenticated application. The route now requires the catalogue's `profile.read` permission. The previous `PASSWORD_READ` requirement was unknown to the authorization engine, which rejected even a combined `profile.read | PASSWORD_READ` check. No catalogue aliases, existing role grants or global session policies were changed. The failed intermediate attempt is retained.

The session panel now reads a current, self-scoped list from a service. It shows when that list was checked and distinguishes a failed read from no other sessions. Review the other devices, explicitly confirm sign-out, and receive the saved result. The requesting session remains active. An added or changed session makes an uncommitted preview stale. Sessions created after the transaction's reviewed set are preserved.

Deletion and the result receipt commit in one database transaction. An audit failure rolls back deletion. The same request ID returns the same recorded result, including after a lost response or a same-tab refresh; replay does not delete subsequently created sessions. Current account, organization, role permission and requesting-session validity are checked before both a first submission and replay. No client-supplied actor, organization, raw session token or target-user field authorizes the action.

The panel shows the latest ten receipts for this account and organization. It intentionally labels these as records from this workflow; it does not claim a comprehensive history of all historical password resets, administrator actions or legacy session deletion.

The URL no longer determines sign-out success. The before experiment displayed `revoked=999` in both languages while session rows and revocation audits were unchanged. Stored MFA enrollment data also no longer produces an operational “MFA enabled” badge; an additional sign-in challenge is unavailable in the current configuration.

## User procedure and inputs

| Situation | What to do | Required information and source |
| --- | --- | --- |
| Review your other devices | Open Security, then Review other sessions / Vérifier les autres sessions. | Your existing signed-in account; device descriptions and dates are supplied by stored sessions. A device description is descriptive browser data, not independently verified device identity. |
| Sign out the reviewed devices | Check the list and press Sign out reviewed sessions / Déconnecter les sessions vérifiées. | No approval document or manually entered record ID is required for this self-service operation. Existing `profile.read` authority and a valid current session are rechecked. |
| The list changed | Reload current sessions, inspect the new list and submit a new request. | The current list comes from the service. Do not copy an old count into a URL. |
| Result is unknown or the page was refreshed | Reopen the review and choose Recover the same sign-out request. | The browser retains the original request ID and reviewed digest for 24 hours in the same tab and requesting session. No password, session token or device list is stored in this retry metadata. |
| Browser storage is unavailable | Allow site storage, then reload the review. | The browser's site-storage settings; the operation stays disabled until retry identity can be retained. |
| Permission or current session changed | Sign in again, or ask the organization administrator to review your role. | Your administrator assigns existing catalogue permissions. A newly signed-in session does not inherit the previous session's pending request. |
| Find a completed result | Read Recent sign-out records on the Security page. | The service supplies the result ID, completion time and actual count from its saved audit receipt. The latest ten are shown. |

Some older application transports can rely on cached authentication. Removing session rows is not proof of immediate rejection everywhere. The permission endpoint is exercised separately in browser verification; a previously open screen can remain visible. Global cache/provider changes previously rejected by automatic review remain unapplied.

## Implementation and control boundaries

`Security page → AccountSessions → useAccountSessions → account-session.actions → account-session.service → Session + AuditLog`.

The service uses current organization/account/role/membership/session locks and a deterministic receipt ID. A submitted digest is compared with the current scoped set. Only the reviewed IDs belonging to that actor are deleted; the requesting ID is excluded again at deletion. Authentication tokens stay on the server. Replay validates the saved receipt's scope and request identity. Malformed retained history produces an error rather than a successful empty history.

The action derives identity from the existing database-verified `requireSession`. Self-service sign-out retains the existing ability to act with a valid session; this batch does not invent a new approver, commercial entitlement or password-confirmation policy. The page's self-profile read requirement is enforced in the owning service as well.

No schema migration is needed. Existing `AuditLog` stores receipts. Formal retention, legal hold and the organization's deletion cascade remain unresolved platform concerns. No archival certification is claimed.

## Interface and evidence

The component reuses the existing authenticated shell, dialog, button, dashboard theme and semantic danger, warning and success tokens. Portal content explicitly inherits the dashboard theme. Destructive confirmation, unknown outcome and saved success have distinct text. The dialog preserves the same pending command after refresh and cannot replace an unknown request with a new one. The wrapper hides evidence if the authenticated actor or requesting session no longer matches the server page.

Evidence publication is `../../evidence/account-session-receipt.json`. That receipt records exact tests, source hashes, isolated database checks, language-specific browser runs, failed attempts and screenshots. Development timings are observations, not production budgets or a demonstrated speed improvement.

The earlier account-menu diagnostic failed after the menu opened because it tried to resolve the background button through the accessible tree. Its screenshot shows the visible menu. Opening failure is therefore not established. Profile navigation, localized menu copy, unsupported role/Pro labels and the missing profile page still require their own complete correction and browser journey.

## Review responsibilities

| Responsibility | Review and remaining boundary |
| --- | --- |
| Architecture / backend / API | Service owns current scope, reviewed set and lifecycle; thin actions, scoped query keys and identity-bound responses. Existing global authentication transports remain separate. |
| Database / migrations | Real transactions verify deletion/audit rollback and concurrent idempotency. No migration; account/role administrative races beyond tested cases require further review. |
| Security / IAM / privacy | Current self identity, organization and permission rechecked; foreign sessions denied; raw tokens omitted. Cached-authentication coverage across the entire platform remains open. |
| Frontend / workflow / EN/FR | Real dialogs, retained retry identity, failed-read states, keyboard containment/return and responsive screenshots. Native screen reader, browser zoom and comprehensive contrast review remain open. |
| Product / support / operations | Existing self-service route repaired; clear current-session preservation, recorded outcomes and recovery instructions. No additional organizational input is needed for isolated implementation. |
| Audit / records | Mandatory transaction receipt and current-account recent history. Formal retention/hold, organization-delete cascade and all legacy events remain open. |
| Quality / release / SRE | Focused tests, real PostgreSQL and application-browser checks; development timing recorded. No deployment, load test, production build certification or production rollout. |
| Finance / ledger / reconciliation | No amounts, postings, payments, reconciliation records or financial permissions changed; original financial-state digest checked in isolated verification. |
| OHADA / statutory / country packs | Not applicable to the implemented state transition: no statutory rule, country calculation or filing changed. No professional approval implied. |
| POS / offline / purchasing / payroll | Not applicable to new domain processing: no operations changed. Their authentication transports remain part of the broader session-rejection review. |
| Analytics / data governance | No new telemetry or business aggregate; only scoped operational counts and receipt dates. Formal retention remains open. |
| AI / agents | Not applicable: no agent authority, automated approval or AI-generated evidence was added. |
| Events / provider / integrations | Not applicable to provider effects: no external calls, messages, webhook or outbox effects added. |
| SaaS packaging / billing / growth | Not applicable: no price, plan, module entitlement or live customer activation changed. |

## Rollout and recovery

Review the source and evidence, then test an authorized internal cohort with `profile.read` and a second device. Confirm the requesting session survives and the old device is rejected by each transport required for rollout. Review server errors and audit failures without logging cookies or credentials. No live rollout was performed.

Keep issued receipt rows. Code rollback cannot restore a deleted authentication session; the affected device must sign in again. If the new control must be withdrawn, disable that entry point while retaining history. Do not restore the URL-count banner or the nontransactional deletion/audit path. A database restore is not the session-recovery procedure.

The full workflow assignment remains active. The missing Profile journey, account menu improvements, global session invalidation coverage, native accessibility and the remainder of the workflow register are outstanding engineering or verification work.
