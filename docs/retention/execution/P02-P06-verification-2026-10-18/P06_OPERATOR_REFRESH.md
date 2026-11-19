# P06 — Current authenticated operator refresh

18 October 2026. **PASS for the scoped recovery flow.** Current production sources were reused unchanged against the new disposable database. This refresh complements the 17 October implementation packet; it does not rerun all historical mocked, storage or integrated economic-replay suites.

## Current assertions

| Flow | Observed behavior |
|---|---|
| Never-uploaded evidence | Current browser displays retained work and blocks local close before any server-close action |
| Lost acknowledgement | Real authenticated signed ingestion persists PENDING_REPLAY; the response is deliberately lost, leaving the immutable original event UNCERTAIN |
| Reconnect/reload/retry | Keyboard Enter retry acknowledges that same event once; the original identity and payload are preserved |
| Authority boundaries | Anonymous action redirects 307 to /en/login; spoofed tenant creates no extra batch; expired/revoked device policies retain conflicts and expose manager guidance with sending disabled |
| Server close | New authenticated browser with empty local queue sees three persisted blockers; one actual close action is denied; shift stays ACTIVE |
| French mobile | At 390×844, retained counts and manager instructions survive reload; failed remote reads still leave local evidence readable; unverified session cannot send |
| Actual offline transition | Local evidence and reconnect guidance remain visible; controlled repeat confirms the panel keeps its background, text color and 390px width |

[Seven-step operator result](browser-1792354378317.json), [server-close result](server-close-1792354740792.json), [failed-read/offline repeat](read-states-1792354860401.json). Commands were `checks.cjs operator`, `checks.cjs server-close` and `checks.cjs read-states` under this evidence directory; timestamped `.execution.json` files retain real exit codes.

Before/after database observations are equal: financial commits 0, payments 0, stock movements 0, journals 0, postings 0, stock 5, shift ACTIVE. The operator flow verifies evidence recovery, not completion of a sale or test economic replay. The fixture setup's one passing case is reported separately from these browser assertions.

## Rendered observations and limitation

Reviewed captures: [local close blocker](LOCAL_CLOSE_BLOCKED.png), [initial uncertain state](LOCAL_UNCERTAIN.png), [French manager/mobile recovery](LOCAL_FR_MOBILE.png), [French read failure](LOCAL_FR_READ_FAILURE.png), [controlled offline repeat](LOCAL_FR_OFFLINE_READ_FAILURE.png).

The initial uncertain-state capture has unstyled HTML while retaining its state/copy. Concurrent landing/HMR activity was observed, but causation was not isolated. Do not discard that capture or claim the issue fixed. A later, narrow repeat explicitly compared computed styles before/after actual browser offline: background rgb(21,32,39), text rgb(247,250,248), width 390, equal across transition. Its screenshot is styled and legible. This proves that tested transition only, not full offline visual reliability or cold offline startup.

## Prerequisites and limits

Current schema and installed client have no datamodel difference; fixture creation, authentication, persisted authority and actual routes/actions succeeded. Previous P05/P06 broader evidence remains historical and is not relabeled as rerun. The P12 isolated queue suite's 25 checks were not rerun here. [Source hashes and graph references](EVIDENCE_SUMMARY.json) bind this refresh to current readers/panel/actions; dated graph communities are navigation aids only.

Browser requests are restricted to the owned app origin; failure injection is intentional and described. Queue insertion uses the current production helper, but keys/signatures come from synthetic fixtures. No production key enrollment, policy renewal, conflict correction workflow, complete offline startup, cross-device unsent-work discovery, deployed storage durability or provider proof is established. Production economic replay requires test mode plus a separate opt-in; neither was enabled in the development app. No production offline-sales claim follows from acknowledgement.
