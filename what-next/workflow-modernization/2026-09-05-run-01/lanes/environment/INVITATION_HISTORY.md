# Invitation decisions and delivery history

Engineering checkpoint, 2026-09-06. This describes implemented, isolated verification; it is not production delivery or release approval.

## What changed

Settings → Users → Invitations now offers History to administrators who currently have user-read, invitation and role-assignment permissions and may grant the invitation's role. The server checks the stored reviewer as well as the current request context. A tenant or cursor supplied by a client cannot select another organization's decisions.

The history shows recorded issuance, replacement and cancellation decisions, their times, available actor and role names, reasons, and matching delivery-queue observations. It loads 20 decisions at a time with a scoped, stable cursor. Record references are available under details. Tokens, recipient hashes, permission snapshots, raw provider errors and private payloads are not returned to the browser.

Every displayed decision is checked against its event binding and integrity hash. A delivery observation is displayed only when exactly one queue receipt matches the decision's payload and idempotency binding. Missing or inconsistent evidence is explained rather than presented as successful delivery. Accepted-account timing comes from the scoped redemption audit. Hash integrity does not establish a legal signature or professional approval.

The current sender remains disabled. A recorded request means its decision was saved; it does not mean email was sent. Even provider acceptance would not prove inbox delivery. History is read-only and does not attempt delivery or reset a retry count.

## How to use it

| Situation | What you supply and where it comes from | What Stoquify supplies |
| --- | --- | --- |
| Inspect an invitation | Find the recipient in Settings → Users → Invitations; open History. Your access comes from the organization's access administrator. | Scoped decisions, recorded times, references and current delivery observations. |
| Understand a replacement or cancellation | Read the reason entered by the administrator who made the decision. Ask the access owner if the business intent is unclear. | The actual decision sequence; older decisions remain available through Load older decisions. |
| Missing or changed approval evidence | Confirm the intended recipient, role and business reason with the access owner, then use the existing Replace invitation review if authorized. | A new current revision, issuance record and private link; earlier history remains. No invented backfill. |
| History load fails | Retry. No additional information is required. | Previously loaded rows stay visible with their previous checked time; a failed page is retried using the same cursor. |
| Permissions are revoked | Request access from the organization's access administrator. | A denial clears private history from the dialog. It does not grant temporary access. |
| Delivery needs review | Give the authorized support operator the displayed record reference through the organization's approved channel. Never copy private tokens or credentials into a report. | Read-only queue status and review guidance. A production sender and operator mutation controls are not yet delivered. |

The dialog uses Stoquify's existing themed dialog, buttons and status treatment. English and French text explains pending, failed, cancelled, review-required and provider-accepted observations. Its header and actions remain reachable while the decision list scrolls. Closing and reopening cannot apply a late response from an older request.

## Verification

- Final combined regression: 218/218 tests, 14 suites, `evidence/invitation-history-final-regression.json`. Service tests cover current authority, tenant/cursor isolation, evidence/receipt mismatch, redaction and query failures; component tests cover bilingual loading, recovery, access revocation and checked-time preservation.
- Typecheck passed, session 50242/chunk 699e45. Eight-file lint passed, chunk 217fc5. Final scoped boundary scan passed, chunk bb9cb0: two mapped surfaces, zero module gaps and zero active service-boundary violations. Initial scan could not write its local receipt under the sandbox; the authorized local evidence write then succeeded.
- Actual PostgreSQL verification: `invitation-history-verify-e49fd26f-983.json`, 2/2 locale cases. Each retained synthetic invitation has 22 decisions and 21 cancelled queue records; attempts remain zero. Foreign objects/cursors, redaction and authority are checked using real services.
- Actual application browser: `invitation-history-browser-448f773a-116.json`, 2/2 EN/FR journeys, six screenshots. Checks cover 390/768/1440 widths, keyboard focus entry/containment/return, 20-to-22 decision pagination, interrupted request and retry with retained rows. Source hashes remained stable and unrelated authority unchanged.
- Earlier attempts remain retained. The first unit failure was an incorrectly parameterized test table, subsequently corrected; it did not justify weakening application checks.

These development observations do not establish production performance, native zoom, screen-reader or comprehensive contrast certification. No full-build pass is claimed; the previously recorded Windows standalone symlink failure remains separate.

## Rollout, recovery and review responsibilities

No schema migration is required. Release the read service, guarded action, history dialog/table integration and EN/FR messages together after ordinary review. Retain issuance, cancellation, redemption and queue records. Reverting the history interface must not remove records or restore permissive redemption. No deployment or customer activation was performed.

Architecture/backend/API: service-owned read model and thin guarded action. Database: scoped repeatable-read pagination, no schema or destructive changes. IAM/privacy: current reviewer authority, role ceiling and redacted DTO. Frontend/UX/localization: existing dialog and recovery patterns with actual bilingual runtime proof. Audit/records: verifiable decision/receipt relationships without signature claims. QA/SRE/support: retained failures, local observations and explicit disabled delivery; operator mutation/recovery remains open. SaaS packaging: no subscription or entitlement change.

Finance/reconciliation/ledger/close/statutory/country rules are not applicable to these writes because no monetary or statutory behavior changes. POS/offline, purchasing/AP and HRIS/payroll are not applicable because no domain operations or records change. Analytics and AI/agents are not applicable because no metrics or model behavior changes. These are engineering review responsibilities, not professional approvals.

Production transport remains absent following automatic approval rejection; the implementation-only approval question is still unanswered. The invitation lifecycle and the full workflow modernization assignment remain incomplete.
