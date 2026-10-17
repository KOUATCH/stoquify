# Moat roadmap execution report

> **30 September 2026 update:** M1-03 local PostgreSQL and EN/FR browser gates passed. Unanswered-request/notification visibility and in-place password confirmation are implemented. Real rail, customer cutover, recipient delivery recovery and pilot gates remain open. See [M1-03 execution report](M1_03_EXECUTION_REPORT.md); dated 27 September statements below describe the earlier baseline.

27 September 2026. Program status: **local implementation delivered; operational, commercial and release gates remain open**. Priority remains M1 with M2 as its operational use case, one M3 experiment and conditional M4 expansion.

## Delivered

Created the dependency-aware roadmap, execution plan, canonical work-package register, requirements traceability, customer/operator protocols, decisions/blockers and this report. Existing workflow and analytics/network ownership is preserved. Narrative documents are published as matching Markdown/PDF pairs under `docs/moat/roadmap`.

Implemented the accountant work desk on the existing portfolio: ten-client pagination; current actor/grant/module checks; submitted-response urgency, team ownership, deadline and evidence state; permission-filtered detail; and acceptance through the existing authoritative command. Summary rows exclude evidence bodies and employee identifiers. Current grants are checked again after the queue read. Incomplete or inaccessible clients are not reported as a complete empty portfolio.

Fixed an existing portal scope gap found along this workflow: the selected client now survives refresh/export, client caches are separate, the selected period reaches the portal, and query errors hide stale evidence. This directly supports a safe handoff from one client task to that client's ledger evidence.

Prepared a source-verified pilot outcome reducer and empty onboarding, observation, payment corpus and supplier worksheets. The reducer separates delivery states, checks tenant/source chains and counts repeat productive use only across distinct reviewed cycles. It is an offline operator tool, not deployed production analytics.

Built an isolated 13-week cash-planning prototype with exact integer money, source references, delayed expected receipts, dated obligations, purchase/transfer choices, lead-time checks, daily buffer breaches, version/assumption hashes and later actual comparison. The example is synthetic. No domain records, purchases, transfers or payments are created.

## Supported customer outcome and limits

An authorized accountant can find submitted evidence across a bounded page of clients, inspect the selected client's validated response, and submit review through the existing protected workflow. Local automated evidence supports the implementation. Actual deployment, browser completion and database integration have not been demonstrated in this run.

The desk does not yet aggregate unanswered requests or delivery outcomes, assign a new individual reviewer, or certify settlement/close. That full principal journey remains M1-03/M2-02. Prepared scorecards and synthetic scenarios do not prove repeat customer value, willingness to pay, provider reliability or a moat.

## Verification

Evidence folder: `what-next/moat-execution/2026-09-27-run-01`. The final verification manifest records commands, exit codes and artifacts.

| Check | Result | Evidence |
|---|---|---|
| Focused application Jest | 10 suites, 115 tests passed | `focused-tests-final.json` |
| Reused acceptance/domain Jest | 1 suite, 72 tests passed | `domain-tests.json` |
| Typecheck | Exit 0 after repair | `typecheck-final.log` |
| Scoped lint | Exit 0 | `scoped-lint.log` |
| Service-boundary ratchet | Exit 0; zero active violations and zero new findings | `service-boundary.json` |
| Cash prototype | 5 tests passed | `prototype-tests.log` |
| Pilot outcome reducer | 3 tests passed | `pilot-outcomes-tests.log` |
| Browser | Blocked before enumeration | `verification-manifest.json` |
| PostgreSQL / live provider / customers | Not run | Missing prerequisites recorded below |

The 187 Jest tests and eight standalone checks are local automated evidence. They do not establish operational completion. Application cases cover the new list/detail/action/UI, portal client scope, existing grants, request/review queues, close actions and data-trust actions. Separate domain tests cover the reused acceptance service.

An initial application run passed 97 of 98 tests. The failing UI test used Next Link against an incomplete jsdom IntersectionObserver shim; the component test now mocks the navigation boundary. Initial typecheck found the route callback used the wrong locale argument; that implementation error was fixed and typecheck rerun. These failures are retained in the evidence rather than discarded.

The browser tool timed out twice before tab enumeration. No browser interactions, screenshots or accessibility certification occurred. No identified authorized isolated database environment was used, and no migration or live provider activation was attempted. Database concurrency/recovery and full financial cutover remain open. No customers were contacted and no commercial evidence was fabricated.

## Rollout decision and continuation

Do not label this program released or commercially validated. Run M1-03 with functioning browser control and a disposable authorized database/user fixture; then use M2-01's actual rail/format selection and consented corpus to complete the payment-proof-to-close operation. The supplied protocols preserve the assessment's go/no-go thresholds and define who decides whether to continue. See the canonical register for exact acceptance, recovery, effort assumptions and next actions.
