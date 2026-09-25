# Invoice exception requests and review

Evidence date: 2026-09-08. This interface serves PA-017 (maker request) and PA-018 (independent review), with a handoff to PA-019 invoice approval. The full inventory/AP/ledger/close workflow and the platform review remain incomplete.

## Entry points and responsibilities

From Purchases → Payables, makers with `purchasing.ap.invoice.post` can open **Request an invoice exception**. Reviewers with `purchasing.ap.match.review` can open **Review invoice exceptions**. Direct routes are `/en/dashboard/purchases/payables/exceptions/request` and `/en/dashboard/purchases/payables/exceptions/review`, with `/fr/` equivalents. Route visibility does not authorize submission: the service rechecks identity, current role/module access and fresh password assurance. The invoice maker cannot review their own exception even if assigned reviewer permission.

The interface inherits the current dashboard. Brand treatment indicates selection and focus, neutral treatment indicates an open request, and successful exception approval is explicitly labelled as an exception decision. It does not imply invoice approval, posting or payment. Existing shared buttons, inputs and dialog retain dashboard portal styling, bounded height, keyboard focus handling, responsive wrapping and reduced-motion support.

## Maker: what to enter and where to get it

1. Select your prepared disputed invoice. Confirm its number and amount against the supplier invoice and receipt.
2. Explain the variance specifically. Obtain the justification from the supplier's documented explanation and the purchasing owner's decision.
3. Enter the supporting-evidence reference. Use the organization's accessible supplier document or controlled justification record, not an invented approval identifier. HTTP/HTTPS links are opened as references; other references are displayed as text. The application does not fetch an external link merely because it is entered.
4. Choose an expiry in the browser's displayed local timezone. The service receives an explicit timestamp. Your organization supplies the appropriate expiry; the screen does not fabricate one.
5. Review the source, variance, evidence and expiry. Resolve displayed conditions, then verify your own password when asked and confirm. A recorded request awaits independent review and creates no payable or payment.

Partial inputs survive refresh in this browser session. They are isolated by organization, actor and request/review mode. Invalid or incomplete drafts cannot be submitted as valid requests.

## Reviewer: approve or refuse

Select the invoice and open request, choose APPROVE or REJECT, and enter a rejection explanation when refusing. Review the maker's reason, evidence, amounts and expiry. Confirm with your own fresh password assurance. Approval records permission for the variance; the supplier invoice still requires its separate approval. Where your role also permits invoice approval, the result offers that existing route. Refusal records the reason without creating a supplier obligation.

Existing expired, inconsistent or legacy requests can remain blocked. Do not fabricate source hashes or create another request merely to bypass a blocker. Controlled reconciliation and safe replacement/refusal of obsolete requests remain an explicit engineering requirement.

## Recovery and retained history

The browser persists the exact command before sending it. If the response is lost, reopen the same screen and recover that retained request. Do not replace its request reference. Passwords are never stored in the draft. The result must match the organization, actor, invoice, operation, request reference, reviewed revision and expected decision before success is shown.

A stale preview keeps the form but requires a new review. Query failures show an error rather than an empty successful list. A current-access denial invalidates pending read responses and clears private screen state. History separates the recorded result from the observed current exception status, including expiry or resolution through invoice approval. A stored record with invalid evidence is explicitly unverified.

## Verification and rollout

See `../../evidence/match-exception-ui-v67.json` when published for final source bindings, commands and browser screenshots. The initial workbench test suite did not execute because the icon dependency lacked the repository's standard Jest mock; the route suites passed. A direct translation-file write failed with a filesystem UNKNOWN error, then the equivalent patch was applied. This was not an approval-review rejection. A malformed generated patch failed verification without claiming success and was corrected.

No schema migration, default migration-bearing build, deployment or live activation is needed for local integration. Keep original approval/request records through any code rollback. Do not restore unreviewed legacy actions as recovery. Actual browser verification uses newly created synthetic organizations in the owned local database, normal sign-in, two independent users and real services, with external requests fenced. No real payment, external notification delivery or professional certification is claimed. Development route observations do not establish a production performance budget pass.

Remaining work includes legacy/stale reconciliation, outbox/operator visibility, full assistive-technology and inherited French-shell review, other supplier-balance writers, and connected inventory/AP/ledger/close verification. These remain engineering work; screen completion cannot clear X1 or certify the platform.

The first real browser attempt reproduced an existing AP-entry hydration mismatch: server and browser local timezones rendered different timestamp text, disrupting client navigation. The AP timestamp formatter now uses UTC and displays that label. A brief intermediate formatter edit was corrected before final verification because Intl style options cannot be combined with `timeZoneName`; the intermediate browser session was stopped. The original failed receipt and screenshots remain evidence. The final verifier includes the changed AP formatter in its source binding and runs the browser in UTC against the existing server timezone.

Engineering review responsibilities: frontend/design system, localization, accessibility, workflow/product and support cover forms, distinct outcomes, preserved drafts and role handoffs. Backend/IAM/privacy cover current service authority, private context-bound state, result binding and denied-response invalidation. Data/finance/audit cover original exception evidence, no payable from exception alone and the separate invoice-approval effect. Quality/SRE cover actual interaction failures, source bindings and development timings. SaaS packaging reuses current purchasing permission/grant behavior. Statutory rules, payroll, POS/offline, external payment providers, analytics and AI are not applicable to this interface patch because their behavior is unchanged. These responsibilities do not substitute for professional approval or a full assistive-technology audit.
