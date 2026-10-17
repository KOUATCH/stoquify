# P06 — Offline failure matrix

## 17 October 2026 — current operator verification

See the [complete current report](../P06-operator-2026-10-17/RESULT.md) for exact commands, hashes, failed attempts, target and cleanup. Prior rows below remain dated history.

| Case | Current evidence | Boundary |
|---|---|---|
| Never-uploaded local evidence | Actual authenticated UI shows one pending item while server has zero; close attempt blocked before any close POST | Current browser/profile and station; not a global server inventory |
| Lost ingestion acknowledgement, reconnect and reload | Actual signed ingestion persisted as PENDING_REPLAY; response aborted; local UNCERTAIN retained; original event resent by keyboard and acknowledged once | No sale/payment/stock/ledger effects; economic replay remains test-only |
| Auth/tenant denial | Real anonymous request gets 307 login redirect before execution; separate authenticated spoofed organization request denied without another batch | No deployed penetration or full module/location policy certification |
| Expired/revoked policy/device | Real server conflicts; original local evidence retained; send disabled; manager path displayed | No automatic renewal, clearing or conflict-to-paid correction |
| Empty local queue after server upload | Separate authenticated browser submits close; server rejects with offline-reconciliation message; shift ACTIVE, zero financial commits | Server can enforce persisted evidence, not invisible work on another profile |
| Cross-tab/restart/corruption/storage failures | 23 real Chromium storage cases pass, including new inventory/close checks and persistent-profile restart | Power loss and loss of both store and marker remain unproved |
| Session/read failures and mobile FR | 64 mocked checks; final 11-panel recheck; actual failed reads/offline transition at 390px preserves local visibility and correct dark tokens | Screen-reader/full accessibility audit not performed |
| Economic replay/concurrency/rollback | 16 real PostgreSQL cases pass, including original-event concurrent replay and hybrid browser/HTTP recovery | Synthetic zero-tax scope; no provider/country/compliance claim |

## Earlier fixture matrix (historical)

16 October 2026. S = current source; M = mocked service/hook checks; B = isolated real-browser storage fixture; D = real database. Exact pass/fail counts and limitations are in [RESULT](RESULT.md) and [VERIFICATION](evidence/VERIFICATION.json). Test definitions in this table are not automatically passing evidence.

| Controlled case | Current fixture / expected outcome | What remains unproved |
|---|---|---|
| Reconnect after real network interruption | New P06 browser case: capture original event, switch browser offline, failed probe → UNCERTAIN, reconnect/reload → claim same immutable event and increment attempt. No server batch ID invented. | No application ingestion endpoint or actual sale; restored network is not a paid state. |
| Tab termination / browser profile restart | Existing real Chromium cases: durable writes survive closed tabs; owned persistent profile closes/reopens; original operation is retryable after the two-minute lease. | Power loss, kill during disk flush, other browser engines/profiles/devices and real operator visibility. |
| Interrupted persistence / quota | Existing browser cases inject IDB abort/quota and marker-write failure. No capture acknowledgement before transaction completes; old evidence retained. | Real disk pressure/eviction and recovery when both IDB and its marker disappear. |
| Lost ingestion acknowledgement | Queue case retains UNCERTAIN; stale attempt response cannot settle newer attempt. Hook cases send original claimed envelope, reject incomplete counts/wrong-device/missing batch and retain uncertainty. Server case recognizes same identity/hash as duplicate. | D/B integrated response loss after actual server commit. Hook action and server persistence are mocked separately. |
| Repeated replay / already completed sale | Existing service cases recover original commit/receipt/posting evidence and avoid another mocked commit call. New expired-policy duplicate case separates ingestion acknowledgement from new economic authority. | PostgreSQL uniqueness, transaction isolation, competing real contenders and one real stock/payment/ledger effect set. P05 still partial. |
| Changed payload / sequence / hash fork | Existing server cases reject reused identity with changed hash and quarantine sequence gaps/forks; browser validates retained payload/hash chain and refuses duplicate capture identity. | Persisted races and independent hostile entry-point tests against deployed authority. |
| Revoked/inactive device | Existing service cases reject ingestion and block pending replay; post-read revocation/transition-CAS cases retain evidence instead of overwriting newer state. | Actual revocation concurrency in DB, active sessions and runtime delivery. No automatic device replacement authorized. |
| Expired policy | New fixture retains original payload/key/hash as QUARANTINED, does not advance device sequence, sets close blocker, does not call sale commit. Already-ingested duplicate remains evidence acknowledgement only. | A reviewed renewal/correction path for quarantined events; no silent policy refresh or drop. |
| Policy snapshot mismatch | New fixture isolates this condition from expiry and source mismatch; same retention/sequence/close assertions. | Signed policy issuance and safe rollout lifecycle, not client-authored policy authority. |
| Stale/missing reference hash | New fixture isolates mismatch, retains evidence and blocks progression. | Numeric maximum reference/capture age is absent; new characterization accepts old capture time when hashes match. This is not “fresh data certified.” |
| Invalid/missing enrolled-key signature | Existing actual Node crypto fixtures use generated RSA keys; invalid signature quarantined, valid signature accepted as pending. New legacy-unsigned case explicitly reports LEGACY_UNVERIFIED and UNCONFIGURED policy. | Browser signing/key management and mandatory signing policy. No deployed signature guarantee. |
| Replay authorization missing | New fixture removes test opt-in and expects rejection before evidence read or commit. Source additionally requires test NODE_ENV. | Production offline replay stays disabled; no enabling change made. |
| Unsupported browser/storage or damaged legacy evidence | Existing browser fixtures deny IndexedDB, corrupt legacy bytes or alter hashes. Capture fails and evidence is not silently replaced by a fresh queue. | Full rendered unsupported-state presentation, translations, focus and assistive technology. |
| Conflict at queue head | Existing queue fixture retains conflict and newer evidence, returns CONFLICT_REVIEW; no out-of-order send. Hook warns rather than “empty queue.” | Integrated manager reconciliation returning local conflict to a resolved state; no broad clear/delete control added. |
| Receipt/posting evidence missing after commit | Existing service fixtures hydrate or recover evidence, refuse unproven completion, redact low-level errors and preserve immutable event history on transition conflicts. | Real commit plus separate acknowledgement transaction, monetary/stock rollback and receipt provider behavior. |
| Shift / period readiness | S: persisted pending events and close-blocking certificates prevent checkout retirement; server dashboard shows pending/conflicts. Existing mocked sync certificate cases cover blocker calculations. | Browser-local unsent queues are invisible to server-only counts. Period/shift end-to-end visibility and closure race require D/B. |

## Required integration fixture before a broader claim

1. Revalidate P05 against current source; establish an explicitly owned disposable localhost database and app fixture with synthetic cashier/site/device/session. Inspect every setup/cleanup command. Do not use ambient `.env`, run migrations against an inferred target or enable deployed replay via a test flag.
2. Use an opted-in test-only service path with real commit, inventory, payment, ledger and event collaborators. Capture independent before/after snapshots. Inject response loss after the financial transaction but before offline acknowledgement, then retry the original identity concurrently. Assert one effect set and matching receipt/posting proof, including rollback before commit and retained state after post-commit failure.
3. Exercise policy expiry/revocation between ingestion and replay, and between initial read and acknowledgement. A conflict note is not resolution. Verify who can read/review/correct evidence; preserve frozen original intent and historical status.
4. In the intended application browser, capture original local queue IDs, switch network, restart the same profile, reconnect and inspect UI uncertainty. The customer must not see paid/success before authoritative evidence. Verify manager/shift/period blockers include local unsent work; test correct scope after user/register changes.
5. Record exact browser/version, viewport/device, locale, source hashes, fixture identities, timing proof, screenshots/traces and DB snapshots separately. Include FR/EN and keyboard/focus. Do not claim screen-reader or power-loss evidence from these steps unless actually executed.

No real-DB offline integration runner was established by this P06 slice. Existing P05 lifecycle/full-commit runners cover prerequisites, not the complete offline ingestion/acknowledgement protocol. Preserve this fixture specification rather than presenting a guessed command as ready runtime proof.
