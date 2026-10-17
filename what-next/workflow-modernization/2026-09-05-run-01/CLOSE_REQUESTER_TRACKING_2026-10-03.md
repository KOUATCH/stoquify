# Requester tracking for retained Close evidence

Primary FA-CASH-COMMAND; supporting FA-CLOSE-PACK. This feature restores visibility to the person who requested missing evidence, including completed and interrupted work. It does not close the parent workflows or implement recipient replacement.

Baseline: 2026-10-03; branch `codex/migration-control-plane-release-2026-08-29`; HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Register SHA256 `a1fd19c6f259399313a7e3ae6973ae8c95e8e231306c0a15f9d50c0a7b7b47f2`; progress SHA256 `aa73c363f2664db12ecf28f4b4da318b529bf658e6037a3521eea6a00d859825`. Shared changes preserved. Coverage remains 270 workflows /17 families, 191 unmapped entries, 264 Queued, two In progress and four Complete—verified.

## Problem, contract and implementation

After sending a request, the finding left the requester's unrequested-findings list. The recipient and reviewer had their own queues, but the original author had no sent-request view. Accepted work also disappeared from active queues. A departed recipient could leave an obligation with no actionable explanation for the requester.

The existing Close workbench now has **Requests you sent / Demandes que vous avez envoyées**, scoped to the authenticated author, tenant and selected period. Current Close read and evidence-request permission are required; history remains readable when the module permits reads but no new writes. Authority is rechecked after collection. This author-only history does not widen the delegated accountant portfolio.

`close-evidence-request-tracking.ts` reads 100 requests plus one continuation candidate, with at most four relevant comment records per finding. It uses a repeatable-read transaction to derive lifecycle state from a coherent snapshot. The original request, response and independent acceptance must agree on tenant/period/finding/run, identities, correlation references and relevant state. Accepted status additionally requires matching resolution time and a parsed replacement binding for the original scope. Missing, duplicate, legacy unbound or malformed evidence produces **review required**, not a successful empty result or accepted status. Source-query failure propagates.

The projection returns request/finding/assessment references, dates, a permitted finding title, response-owner display name, current owner eligibility and lifecycle status. Private response text, reviewer notes, raw metadata, hashes and reviewer identities are omitted. Current owner eligibility checks account usability and same-tenant Close read/comment roles. An unavailable owner leaves the obligation visible with instructions to involve the access administrator. No automatic reassignment or new request is created.

History uses its own scoped cursor. Loading more retains other collections and drafts. The existing assessment context and exact title localization are reused. History and accepted evidence remain neutral informational states, with warnings for unavailable owners and explicit investigation guidance. No schema/migration, new permission, shell or design system is introduced.

## Acceptance criteria and verification

- Authors can see pending, responded and accepted requests from the selected period.
- Other actors/tenants and revoked permissions cannot retrieve the history.
- Read-only module access retains permitted history while new operations remain unavailable.
- Ineligible recipients and inconsistent old evidence remain visible without fabricated completion.
- More than 100 authored requests are reachable through scoped continuation.
- Private response and review content remain excluded.
- EN/FR history, drafts, authorization failures, responsive layout and actual retained acceptance are checked.

Initial static runs passed 465 then 467 tests across fourteen suites while UI coverage was extended. The final static run passed **469 tests across fourteen suites**, no-emit TypeScript and changed-file lint. These include explicit authentication/authorization denial clearing previously rendered history and transient failure preserving drafts. Source bindings were stable in all three final receipts:

- [Focused tests](evidence/close-evidence-recovery-jest-a801dc48-1cf5-4070-a63e-12f7153c4788.json).
- [TypeScript](evidence/close-evidence-recovery-typecheck-444b4f4a-0ecd-4449-aae3-7042f71898f7.json).
- [Lint](evidence/close-evidence-recovery-lint-72009005-cbf6-4ed6-b448-fbb7ba5d5f75.json).

The [owned runtime receipt](lanes/environment/close-request-uniqueness-33bf32be-93af-4696-9d12-44584ad50cec.json) passed all **seven checks**, including existing serial/concurrent uniqueness guarantees, requester-only tracking and private-content exclusion, actual recipient deactivation/restoration and 104 authored records across two continuation pages. Of these, 102 deliberately ambiguous historical records require investigation; they are not falsely reported accepted. Source, outside-fixture and financial snapshots remained unchanged. Receipt SHA256: `16fdd79b3bd06c7c8527306cf6322e1942f0aa8208e901d0206372f8f67d4b03`.

The [actual EN/FR browser receipt](lanes/environment/close-evidence-browser-845ba6f4-0148-41b5-8775-5f04fb326d54.json) passed both journeys and final source, financial and outside-fixture checks. Each requester reached accepted history through one continuation; private response text was absent. Both journeys preserved drafts, refused a second tab's conflicting request, required fresh authentication followed by explicit acceptance, and retained original missing evidence. Keyboard activation and reduced-motion layouts at 1440/768/320 pixels passed without horizontal overflow. Twenty screenshots were retained. The English desktop and French narrow accepted-history screenshots were visually inspected; this is not a full assistive-technology or zoom audit.

- [English accepted history](lanes/environment/close-evidence-browser-845ba6f4-0148-41b5-8775-5f04fb326d54-en-requester-accepted-history.png).
- [French accepted history at 320 pixels](lanes/environment/close-evidence-browser-845ba6f4-0148-41b5-8775-5f04fb326d54-fr-requester-accepted-history.png).

Observed development route-to-panel times, in requester/respondent/reviewer/returning-requester order: EN 65,799 /11,388 /9,634 /12,854 ms; FR 10,771 /9,706 /7,694 /12,336 ms. The first route includes development compilation. These are synthetic development observations, not a production budget pass or evidence of improved latency. The compiled Close route was bound to SHA256 `1d063e6526f75aa671accad645e0f43801ce42826854c088693bf453b7a4cd5c`. The exact owned loopback listener was stopped after successful finalization.

Commands use the bundled Node runtime and inspected wrappers, executed serially: `verify-close-evidence-recovery.cjs jest`, then `typecheck`, then `lint`; `close-request-uniqueness-runtime.cjs --run`; and `close-evidence-workflow-browser.cjs --run` with the exact predecessor receipt/hash and confirmed loopback listener PID. The static receipts retain actual child command arguments. The local server uses `supplier-ack-local.cjs`, an owned-database identity guard and outbound-network fence. No migration-bearing build or seed script is invoked.

The owned runtime driver extends the prior request-uniqueness checks with author-only tracking, persisted recipient deactivation and restoration, and an explicitly synthetic ambiguous-history/capacity fixture. The browser journey retains its actual request/response/independent acceptance and then returns to the authenticated original author to inspect completed history beyond the first page. The synthetic legacy records are not customer requests or approvals.

## User and operator guidance

Open `/en/dashboard/accounting/close` or `/fr/dashboard/accounting/close`, select the period and find **Requests you sent** beneath the recovery queues. Use the work reference to follow the original request. “Awaiting response” means the recipient still owes a response. “Awaiting independent review” means a response exists but is not accepted. “Evidence response accepted” is retained workflow history; it does not certify the period or authorize payment.

If the owner cannot respond, ask the organization's access administrator to inspect the account and Close roles using the shown owner and work reference. Account/role changes require their normal authority. If the person has left permanently, controlled replacement remains an engineering requirement; creating another request is not a supported workaround. For “stored evidence needs investigation”, provide the reference to an authorized reviewer and retain all original records.

Use “load more sent requests” for older continuation pages. Dates follow the browser timezone. Refresh obtains current state. A transient failure preserves work; a current authentication/authorization refusal must clear privileged rows. No total count or delivery confirmation is inferred from a limited page.

## Rollout, reviews and remaining scope

Release the service contract, cursor schema and panel/copy together through the normal process. No migration is needed. Recovery can revert the read projection/UI without deleting or modifying retained evidence. Observe page latency and investigation/unavailable-owner counts; no production budget or full accessibility certification is claimed.

Architecture, data consistency, IAM/privacy, records, workflow/localization, accessibility, quality and operations apply. Financial invariants remain protected by the unchanged writers and explicit verification. Statutory calculations, payroll calculations, inventory/POS/offline, commercial billing and AI: not applicable to this read projection; their workflow reviews remain required in the full program.

Controlled recipient replacement, investigation/recovery of existing ambiguous evidence, delegated-summary context, broader diagnostic localization, complete accessibility/zoom, other authority races and the remaining Cash/Close handoffs remain open. The rejected all-period manual-posting helper remains unapplied pending the existing approval request. No live activation, production deployment, payment, external delivery, reset, migration or X1 clearance is performed.

The next recovery inspection found a connected source risk in `assignCloseFinding` (`services/accounting/close-assurance.service.ts:3164`): ordinary assignment changes `ownerId` and resets status to `ASSIGNED` for an unresolved finding without checking its existing missing-evidence request or submitted response. Its action uses `accounting.close.finding.assign`. This is not a supported recipient-replacement contract. Reproduce the effect on an owned fixture, then coordinate any correction with existing response/review readers and authority enforcement. No runtime reproduction or fix for this separate boundary is claimed by this milestone.
