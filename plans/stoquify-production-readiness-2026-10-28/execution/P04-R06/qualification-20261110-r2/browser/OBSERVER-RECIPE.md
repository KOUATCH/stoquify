# P04-R06 r2 original-response and consumer qualification

This new recipe preserves every E01–E29 and prior browser failure. It requires independent source admission before the runtime owner executes the new isolated candidate. The browser author runs no application, database or browser.

## Scope and ownership

The six existing EN/FR authorized, externally revoked exact-session reload and newly authorized restored cases remain mandatory. Four positive cases each add a separately bracketed user refresh, actual language-link navigation away, and actual language-link return. Each navigation includes a fresh read using the existing reload control. Total: 18 native before/after brackets; no profile saves. All prior predicates for denied views and private response bytes remain.

Root owns the product repair and shared register. Runtime owner owns the fresh disposable database, credentials, server/bridge/browser lifecycle, accepted artifact and cleanup. This observer owns only new evidence under `browser/consumer-attempt01`, created exclusively. It imports built-in modules and the three owned pure/observer helpers; no application, Prisma, environment configuration or launch code.

## Required interfaces

`runBrowserDiagnostic(fixture, controls, helpers)` is exported by `run-consumer-qualification.cjs`.

- `fixture`: baseURL `https://localhost:3296`, candidate/artifact identities, source manifest hash if available, synthetic users with id/email/organizationId, and `profileReadActionBinding`.
- `controls`: `snapshot(label)` and `invalidateSession(alias, 'revoke', exactToken)`, using the reviewed native target controls.
- `helpers`: `createContext`, paced actual credential `signIn`, `closeContext`, `safe`, `sanitize`, `assertNoSecrets`, and original-response `getResponseCapture`.
- Derive the action binding from the new sealed artifact's `server-reference-manifest.json` using `actionBinding`. It selects the unique `getSelfProfileAction` export from `actions/users/self-profile.actions.ts` with the profile-page worker. Only safe mapping fields and manifest SHA are returned; the encryption key is never returned or saved.
- Bridge receipts retain exact response ID, full URL hash, method/status/path, completion/abort/downstream outcomes, decoded original bytes SHA/length and all fixture actor-canary flags. Add exact request `nextAction` and its hash. For that exact admitted read action only, use `profileReadEvidence` on the original decoded bytes and return its safe summary or a retained parsing error. Bytes stay in memory.

## Original-byte evidence

Attach passive Chrome protocol listeners before navigation. `Network.streamResourceContent` returns the prefix buffered before streaming; subsequent `Network.dataReceived.data` chunks are retained in their original order even when events precede the command reply. Reconstruct prefix then subsequent chunks, enforce 32 MiB limits, and compare exact SHA256/length against the independent decoded original bridge response. The total must also equal the complete CDP decoded data-length total. Unsupported streaming, lost bytes, duplicated bytes, overflow, ambiguous response/request/hop identity, mismatched bytes/actor flags, redirects, cached/service-worker delivery and actual non-cancellation failures fail closed.

Record every actual `loadingFinished` or `loadingFailed` terminal, original Playwright completion/body error, safe headers, initiator stack, frame/navigation lifecycle and pagehide/pageshow/visibility events. No fetch interception, replay, cache changes or request suppression occurs. Raw response bytes, fields and cookies are never saved. Only synthetic fixture screenshots, hashes, safe IDs and timestamps enter evidence.

## Required consumer evidence

Profile reads require exact compiled Next-Action identity and the successful result reached from the original Flight root's `a` reference. The bounded pure parser respects length-framed text/binary rows, rejects duplicate model IDs, malformed/truncated/unresolved/cyclic data and never treats arbitrary embedded text as a result. The browser-received bytes are parsed independently and must produce exactly the same summary as the original bridge bytes.

Bind result actor/organization/email to the fixture; bind the exact snapshot identity, profile-field hashes and checkedAt to the observed account-data branch. A passive DOM observer records changed checkedAt/field/email hashes with browser timestamps. The result's checkedAt must be fresh for that original request; its DOM consumption must follow its original response. Record request, response, terminal and consumption ordering. The existing component source ties its displayed fields and checkedAt to one query result; the hidden snapshotHash is a response identity, not falsely claimed to be a DOM attribute.

Each of the four positive states must additionally consume a later exact checkedAt after an explicit user click on “Reload current account record”, in its own native no-write bracket. Correct appearance, byte counts or a successful session response alone never satisfies the required read.

A canceled required POST can pass the new consumer gate only with the above exact browser-byte/root-result/consumer proof and separately proven fresh user refresh. Its cancellation and failure under the old strict-network criterion remain recorded. This is an explicit new consumer contract, not a retrospective pass for previous attempts.

A canceled speculative GET must have actual RSC/prefetch headers and script initiator evidence; it additionally requires successful real language-link navigation and fresh current-authority profile consumption in the same context at its target route. It is never substituted for a required POST. Other unresolved cancellations fail. Final qualification requires all 18 checks, all four refresh proofs and all eight navigation proofs; both denied reloads must expose no fixture-private bytes or visible private content and cause no native changes.

## Native and visual evidence

Every observed read/navigation/denial compares all business-table digests and full user/session/account/audit row arrays. Real sign-in and deliberate exact-session revocation occur outside these no-write brackets. Screenshots and DOM evidence distinguish source inspection, pure helper checks, actual browser responses and real native evidence. This scope does not certify accessibility, all localization, mobile layouts, BFCache or the complete R07 stale-authority workflow.

## Prior bridge investigation

The preserved bridge pipes request to upstream, records original response data, synchronously decodes its captured copy on upstream end, and pipes the unchanged response to the browser. It forwards upstream headers wholesale, including framing/hop-by-hop headers, and adds only the response ID. It records upstream completion and downstream finish/close; its prior request-close/abort detail was incomplete. No explicit request-close-triggered abort exists in the inspected path. Its configured upstream timeout is 120 seconds; prior cancellations occurred much sooner, so that timer is not established as the cause.

Complete bridge bytes and downstream finish did not prove browser completion. The new bridge must retain safe content-length/encoding/transfer-encoding/connection metadata and request/upstream/downstream end/abort/close timing. Preserve transport unchanged until evidence identifies a cause; no automatic claim that application or proxy caused the prior cancellations.

## Verification and admission

Current workflow contract passed. Syntax check passed. The 53 pure helper checks cover original-stream prefix/event ordering, wrong identity/action/tenant, missing/ambiguous/failed terminals, bytes/actor mismatches, stale/unconsumed DOM, malformed Flight and safe compiled mapping. These are not runtime qualification. Exact hashes and counts are in the source/verification receipts. Primary independent reviewer must admit the frozen recipe, helpers and actual outcomes; any change requires a successor binding.
