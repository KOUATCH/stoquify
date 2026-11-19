# P04-R06 browser diagnostic attempt03

This is a new observer for independent admission. It does not replace or alter the failed attempt02 harness or evidence. Runtime ownership and independent acceptance remain with the runtime owner and primary reviewer respectively. The author has not started another app or browser.

`run-browser-diagnostic-attempt03.cjs` exports `runBrowserDiagnostic(fixture, controls, helpers)`. It imports only Node filesystem/path/crypto/assert modules. No app, environment loader, database client or browser launcher is imported.

## Preserved six scenarios

For each EN/FR synthetic actor: obtain a real credential session, navigate to the localized profile and require visible own identity plus a successful current-subject `/api/auth/get-session` response; revoke that exact acquired session externally, reload the same page, require concrete login/denied recovery and no actor canary in any selected response; obtain a fresh credential session in a new context and require authorized profile/session behavior again. The existing six `R06-UI-*` IDs must match the retained test-case map exactly.

Every read/denial still has native before/after snapshots. Business digests/table entries and complete session/audit/user/account row arrays must remain unchanged inside each observation bracket. Credential sign-in and deliberate revocation remain separately recorded actions outside those brackets. This does not qualify same-tab reauthentication, hidden tabs, focus/BFCache, R07 Refresh, accessibility or visual design.

## Runtime interface

The fixture supplies `baseURL` exactly `https://localhost:3296`, `candidateId`, `artifactSha256`, and `users.browser_en` / `users.browser_fr` with synthetic IDs and emails. Secrets are never published by this observer.

The runtime owner supplies:

- `controls.snapshot(label)` returning the existing native snapshot/digest/row contract and evidence filename.
- `controls.invalidateSession(alias, 'revoke', token)` for the exact acquired session only.
- `helpers.createContext(options)` using the owned browser; viewport 1440 × 1000, browser locale en-US, service workers blocked.
- `helpers.signIn(context, alias)` performing paced real credential authentication with credentials registered in the runtime secret registry, returning the token privately and optional sanitized `evidence` reference.
- `helpers.closeContext(context)`, `helpers.safe(error)`, `helpers.sanitize(value)`, and `helpers.assertNoSecrets(serialized)`.
- `helpers.getResponseCapture(captureId)` returning the independently captured original response receipt described below.

The runtime owner owns browser/deny-proxy/bridge lifecycle, all HTTP/DB execution and whole-runtime cleanup. The observer owns only its created contexts and new `browser/browser-diagnostic-attempt03/` output directory, created exclusively. No prior output directory may be reused.

## Original-response evidence

The observing bridge adds `x-p04-r06-response-id` to selected profile/auth responses and tees their original bytes without changing request headers, response bodies or cache behavior. A receipt must contain:

- `captureId`, `method`, normalized pathname `path`, and `status`, exactly matching the observed response.
- `complete: true` for a complete upstream original body, `aborted: false`, `downstreamFinished: true`, `downstreamClosedEarly: false`.
- Separate wire/decoded byte counts and SHA256 values. Gzip, Brotli and deflate decoding must follow the actual Content-Encoding. No decode/capture error may be present.
- `containsActorCanary[alias]`, based on the synthetic actor ID/email, and `currentSessionSubject[alias]`, based on the decoded JSON `user.id`.

The observer captures request resource type, navigation, prefetch, redirect and safe header metadata before attempting response-body access. Cookie, Set-Cookie and Authorization values are never copied into its header evidence. URL queries are omitted. It records browser completion and every body/transport/capture error.

When Playwright returns a body, its exact decoded bytes/hash and actor classification must match the independent receipt. When Playwright cannot retrieve a body, that error remains visible; only complete, exact, independently attributable original response bytes can supply the missing payload evidence. Replays, other responses, unknown completion, early close, transport abort, wrong ID/path/method/status, mismatched hashes and unavailable decoded bytes fail. The report distinguishes original server capture, browser completion and whether Playwright retrieved a body. It does not claim that server capture alone proves client consumption.

Any new outcome needs primary independent review. Missing-body events must first be classified using their actual recorded metadata; no category of canceled/prefetch responses is automatically ignored.

## Bounded validation performed

Source SHA256: `666abbcdc483e6b001d706361eb676275efde2682dc6dd1e200b31f204588bd4`.

After reading the current definition and command registry, `node --check` passed. Twenty-one pure synthetic evidence-admission checks passed: positive identical bytes, retained-error recovery with exact original bytes, rejection of ID/method/path/status/size/hash/actor/complete/abort/close mismatches, missing receipts, missing primary-body outcome, browser transport failure and incorrect empty-body semantics. They exercised only the exported pure classifier; `runBrowserDiagnostic` was not invoked. These checks are not browser, application, database or production-readiness evidence.
