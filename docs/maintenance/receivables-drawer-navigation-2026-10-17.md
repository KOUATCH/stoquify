# Receivables drawer navigation — 2026-10-17

## Findings and scope

Opening or closing a loaded invoice used `replaceWith`, which called `router.replace` inside a transition. This unnecessarily requested a server-rendered route and made the workbench enter its loading state for a selection-only URL change. During the browser attempts, drawer navigation stalled and one earlier session eventually redirected to sign-in.

Separate runtime failures remain: the in-app browser reports debugger synchronization timeouts before it can read or close the page, including after resetting the automation connection. A direct, unsandboxed request to `http://localhost:3000/en/login` timed out after 20.04 seconds with no response bytes. These observations establish a stalled development environment, but do not establish its deeper cause or prove the drawer navigation caused the debugger failure.

## Change

`hooks/useAROpenItemsHistoryWorkbench.ts` now changes only the `selected` URL parameter with native `history.replaceState` for opening/closing details. The installed Next app router explicitly synchronizes native history changes with `useSearchParams` using its restore action. Customer/date/page-size parameters, return parameters, and fragments are preserved. Date/filter/reset navigation keeps its existing server-router path.

The drawer still resolves only from the currently authorized query result. Actor/organization query keys, response-scope checks, permission revocation behavior, server authorization, export controls, balances, and evidence grades are unchanged. Existing unrelated working-tree edits were preserved. No financial/database writes or migrations were performed.

## Verification

- Source: inspected the current hook, workbench, action authorization, existing sales native-history pattern, installed Next history integration, and Receivables page contract. Historical graph references were used only for locating the hook.
- Workflow: `npm run agent:workflow:check` passed (196 package commands remain outside its reviewed manifest).
- Mocked hook regression: `node node_modules/jest/bin/jest.js --config .codex-tmp/ar-drawer.jest.cjs --runInBand --no-cache` passed all four tests (199.061 seconds). Tests cover open/close without server navigation/refetch/loading, preserved URL scope, retained server navigation for date changes, permission revocation, and cross-organization response rejection. Next's URL-to-hook synchronization is simulated in this unit lane; it still requires browser verification.
- Scoped `git diff --check` passed.
- Real database tests: not run. Browser screenshots after this change: not captured; the browser control connection remains blocked.

## Recovery attempt and remaining work

The verified localhost:3000 listener was Node PID 30916. A narrowly guarded restart script checked this exact listener identity before attempting to stop it and would have launched `scripts/dev-app-safe.js` with a fresh isolated cache. Windows returned Access denied at the stop operation. The script stopped there: no server was stopped, no replacement was launched, and no build cache was deleted. This was an operating-system denial, not an automatic approval-review rejection.

The user subsequently confirmed the server was restarted and explicitly selected Edge. The first new Edge tab timed out while enabling focus emulation and remained blank in the tab inventory. Reading that tab was denied by the browser URL policy because its URL was invalid. An attempt to bind the existing Edge Receivables history tab was then rejected by automatic approval review as a workaround. Browser work stopped, and explicit approval for read-only Edge verification was requested. The server restart is user-confirmed; it has not yet been independently verified after restart.

Remaining: after browser access is permitted, verify English SO-004, opening and closing details without a page-loading transition, on desktop and mobile; capture fresh screenshots. Historical screenshots are not verification of this change.

Rollback: remove only the new `selectRow` callback and restore its former `replaceWith({ selected: ... })` use. Preserve all pre-existing hook safeguards and unrelated changes.
