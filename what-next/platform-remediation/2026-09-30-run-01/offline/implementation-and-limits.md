# R04 / R05 — Offline durability and interrupted sync

Status: client implementation and focused verification completed; offline production replay remains disabled. This is not pilot or device certification.

## Reproduced defects

The current queue reproduced F03 and F04 before modification: two successful concurrent captures returned sequence 1 but persisted only one event; malformed JSON returned an empty queue; a persisted SYNCING event produced no pending replay. See `baseline-behavior-probes.json` (2026-09-30T20:25:39Z). That reproduction used the real original module with an in-memory Storage adapter; it was not browser durability evidence.

## Implementation

- IndexedDB readwrite transactions serialize mutation commits across tabs. Sequence allocation and the complete immutable event commit together. Hashing occurs outside the transaction; revision comparison inside the transaction retries any intervening change. The caller receives success only after transaction completion. Browsers without strict transaction durability fail explicitly.
- Version 1 localStorage data is validated, including payload/entry hashes, identity/sequence lineage and organization/device/terminal/location binding, before import. Original bytes are preserved in localStorage and the IndexedDB record. A change by an older tab blocks new operations for recovery. Damaged data is quarantined in place: no empty replacement or automatic deletion. A separate migration marker detects loss of IndexedDB while localStorage remains.
- Storage denial, quota exceptions and aborted commits propagate as capture failures. Existing committed events and sequence position survive those failures. No new dependency was installed.
- Queue mutators are asynchronous. The only production consumer, `useOfflineSync.ts`, awaits durable claims and completion. Its caller-facing mutation contract remains asynchronous.
- Each sync attempt has a random token and a bounded 120-second lease. Claiming is atomic across tabs. Legacy, expired or invalid/unbounded SYNCING leases become retryable; newer events cannot pass an active lease or unresolved conflict. Claims are capped at the server's 250-event limit.
- Transport/action failure produces UNCERTAIN with a redacted reason code. Retrying uses the original event identity, sequence and hashes. The existing server ingestion duplicate check resolves already recorded identities before normal sequence handling. Delayed responses are fenced by attempt token and cannot resolve a newer attempt.
- A complete successful batch acknowledgement is checked for device identity, batch ID and count conservation. Partial or rejected batches remain CONFLICT for manager review. Automatic local pruning has been removed: ingestion acknowledgement does not establish sale/payment/fiscal finality. Explicit pruning only removes entries carrying a server acknowledgement and preserves sequence/high-water lineage.
- Provisional-only fiscal policy remains enforced. No provider, database schema, replay flag or production configuration was changed.

## Verification scope

The maintained queue suite launches a real local Chromium process and exercises IndexedDB directly, rather than a storage mock. It checks multi-tab concurrent capture conservation, hash continuity, tab and persistent browser-profile restart, migration with preserved identities, corrupt JSON/schema/hash protection, storage denial, injected quota and post-write transaction aborts, lease exclusion/expiry, uncertain retry, stale responses, partial conflicts, old-tab interference, partial eviction and batch limits.

Hook tests check transport ordering, thrown and unsuccessful responses, mismatched/incomplete acknowledgements, retained conflict evidence and failed local acknowledgement persistence. The existing server suite separately exercises duplicate ingestion, revoked-device handling and replay idempotency with service fixtures.

`final-focused-jest.json` / `final-focused.log` contain the final normal-repository Jest run. `verification-manifest.json` records exact file hashes and tool results. Earlier browser-only and isolated-adapter runs are retained as intermediate evidence, not additional independent production qualification.

Final results: **4 suites / 69 tests passed** (91.983 seconds reported by Jest), focused strict TypeScript compilation passed, and the existing static offline fiscal replay gate remained **16/16 ready**. The static gate is a code-structure check, not replay or device certification.

## Remaining prerequisites and limitations

1. **R32 / D03:** Product and operations must qualify actual browsers, operating systems, device storage capacity/eviction policy, supported tenders and fiscal rules. Verification here covers installed desktop Chromium; it does not certify mobile Safari, Android devices, private browsing, physical power loss, browser bugs or disk failure.
2. **R05 end-to-end release proof:** Run lost-response and concurrent replay fault injection against a disposable PostgreSQL fixture and assert one actual sale, stock movement and journal effect. Client browser tests and existing mocked server tests are separate evidence; they do not prove that complete combined workflow. No new authoritative per-event outcome endpoint was added. Retrying ingestion currently performs same-identity resolution; economic replay and provider finality remain server-owned.
3. **Migration rollout:** Close/reload older client versions before migration. Detected old-tab writes halt the new client while preserving both copies; this code cannot make an already loaded legacy implementation transactional. Do not roll back to the old writer after captures enter IndexedDB. Rollback should disable capture/sync and retain both stores for recovery.
4. **Recovery operations:** Quarantine is fail-closed preservation plus operator-visible errors. An authorized recovery/export and conflict-resolution workflow, per-device queue health display and support runbook still need product integration. Never clear local site data as an automatic fix. Exported recovery evidence would contain business/personal data and needs access-controlled handling.
5. **Storage loss:** If both IndexedDB and its localStorage migration marker disappear, a client cannot distinguish that from a new device using local evidence alone. Device/server checkpoint admission is still required before a pilot allows renewed capture. Browser persistence permission is not a backup or a power-loss guarantee.
6. **Retention/performance:** Acknowledged entries are retained by default, and validation scans stored entries. Measure supported queue size, capture latency and capacity on pilot hardware; define acknowledged-evidence retention and audited pruning before broad rollout. Quota exhaustion fails capture explicitly.
7. **No automatic conflict clearance:** Aggregate server responses cannot reliably classify every member of a partial batch. The conservative result is to retain the batch for manager review, not report every event resolved.

R04/R05 must remain **partial at roadmap acceptance** until the device/recovery and combined server workflow gates above have the required evidence. The original client data-loss and stranded-SYNCING mechanisms have focused regression coverage.
