# Delegated evidence desk

AF06, 20 October 2026. Extension of the accountant portfolio's evidence work desk; inherit MASTER.md, accountant-portfolio.md and the current dashboard tokens.

## Route and roles

Entry: `/{locale}/dashboard/accounting/accountant-portfolio`, per authorized client, “Request and track evidence.” A firm accountant needs current audit/review and evidence-request authority. Client response and response-owner replacement remain in the existing Close workspace. Acceptance remains in the existing independent firm review panel.

## Composition

Reuse the dashboard shell, glass panels, dashboard controls/buttons, visible native labels, 44px minimum controls and responsive one/two-column grid. Show the managed engagement or legacy named-mandate context, selected accounting period, typed original finding, eligible client owner, due date and scoped question. Reuse the current English/French evidence state vocabulary.

Tracking shows current response owner, retained original reference and recipient-change reason. Link to the authorized portal context. Do not display a complete firm total, financial approval button or synthetic source confidence.

## States

- Loading: announce current authorization check, hide stale full-read data, disable conflicting actions.
- Empty: keep the period selector and bounded continuation; an empty recipient batch is not proof that no eligible colleague exists.
- Partial: display coverage notice and independent continuations for findings, recipients and tracking.
- Read-only module: retain readable history, explain that new requests are unavailable and disable submission.
- Transport failure: announce failure, allow refresh; in-memory draft text survives successful retry.
- Uncertain submission: preserve the exact payload/correlation key in the mounted portfolio, bound to the actor/client/period, and expose same-request retry. Hiding/restoring the page or refreshing portfolio authority removes private DOM and unsent text, then reauthorizes before retry is available; remounting the child work desk must not discard an in-flight or uncertain command. A confirmed denial or changed actor clears the retained command.
- Denied or expired authority: clear private data/draft and reauthorize the parent work desk.
- Changed client/period or leaving/hidden workspace: discard private draft; no local storage.
- Full reload, unmount of the portfolio, device loss and browser storage eviction do not yet have durable uncertain-command recovery. This remains an explicit rollout limitation.
- Success: announce recorded request, refresh choices and show current tracking. Do not describe queued notification as delivered.

## Accessibility and verification

Visible labels for all inputs, native datetime/selection controls, live status/error text, keyboard-operable actions and heading focus after a completed read. Long references wrap. English/French desktop and narrow layout checks must be recorded separately from jsdom tests. Automated scoped axe results do not certify screen-reader behavior or whole-page accessibility.

See the canonical [AF06 result](../../../docs/accounting-firms/roadmap-2026-10-19/execution/AF06/RESULT.md) for actual verification and limits.
