# M1-03 execution report

30 September 2026. **Local engineering and runtime verification passed. M1-03 remains open for operational evidence.** This checkpoint extends the 27 September baseline and the canonical [work-package register](MOAT_WORK_PACKAGE_REGISTER.json). It does not change the M1/M2 priority or release the platform.

## Delivered behavior

The accountant work desk now includes unanswered requests alongside submitted responses. Pending rows identify the client recipient as the response owner, preserve the original request deadline and expose no evidence body or recipient identifier. Submitted responses retain the existing authorized review flow. The new pending projection is bounded to 100 findings per client; contradictory, duplicate, malformed or truncated request history is withheld and the client page is marked incomplete. The ten-client pagination boundary remains in place.

Each request shows the corresponding notification outbox state: queued, processing, deferred, processed, failed, retries exhausted, cancelled or unavailable. The lookup is scoped to the client and exact request event key. A processed notification is explicitly labelled **recipient delivery unverified**. Failed notifications direct the accountant to the delivery operator; this work does not introduce a second notification sender or claim that transport recovery has been exercised.

When acceptance needs fresh authentication, the accountant can confirm their password in the review panel. The password is cleared after submission. A successful identity check returns keyboard focus to acceptance and requires an explicit retry with the same conclusion and command key. The source acceptance service continues to own authorization, segregation of duties, replay and transactional resolution.

The portfolio cards, route headings and work-desk controls support English and French. Portfolio links retain the selected language. The existing client-and-period handoff to the portal was verified through actual downloads for both clients in both languages.

## Runtime evidence

Evidence is stored in `what-next/moat-execution/2026-09-30-run-01`. The runtime target was the existing owned, disposable PostgreSQL database `stoquify_local_registration_20260906_01` on loopback and the local application at `http://127.0.0.1:3110`. The fixture guard verified the database identity and organization ownership before writes. Every new fixture organization uses the existing synthetic ownership prefix. Browser requests outside the local app were blocked. No real customer, provider credential or production database was used.

| Requirement | Observed result | Evidence |
|---|---|---|
| Two-client browser workflow | EN and FR list, unanswered work, notification state, detail, password confirmation and acceptance passed; FR work desk fit a 390-pixel viewport | `browser.json`, `browser-en.png`, `browser-fr.png` |
| Current authority | Expired/revoked/read-only mandates rejected; expired module blocked reads/writes; read-only module allowed read and rejected write; browser revocation rejected acceptance and cleared review data | `postgres.json`, `browser.json` |
| Source identity and privacy | Wrong-client request/detail and response rejected; summaries exclude source bodies and recipient IDs; corrupted pending source withheld | `postgres.json`, regression tests |
| Replay and concurrent acceptance | Four concurrent identical commands returned one acceptance, one business event and one outbox entry; two distinct commands produced one winner | `postgres.json` |
| Transaction recovery | An injected failure after acceptance insertion rolled back the comment and finding transition | `postgres.json` |
| Correct-client export | Real browser reload/downloads and PostgreSQL exports retained client/period and contained the selected ledger journal, excluding the other client's journal; empty ledger export rejected | `browser.json`, `proof-export.json` |
| Changed source | Actual manual-journal creation/posting marked a seeded certified snapshot stale, persisted an invalidation event/outbox and left the other client unaffected; new trust export included the changed source | `proof-export.json` |
| Regression and static checks | 206 tests across 11 Jest suites; TypeScript, scoped ESLint and service-boundary ratchet passed | `regression-tests.json`, `checks.json`, `service-boundary.json` |

The source-change test seeds the **initial certified-snapshot condition** and then calls the real journal-posting service. It proves the invalidation transition, event and tenant boundary. It does not prove creation of a fully eligible certified close pack, pilot-cycle certification or expert/statutory approval. The accountant trust-pack export is exercised through its real readiness and sensitive-action gates using balanced, source-linked synthetic ledger entries.

Keyboard tests exercise native controls, detail focus and explicit submission. They are not a screen-reader audit or accessibility certification. Development-server timings are not production performance benchmarks. Transaction rollback is demonstrated; backup restore and financial cutover reconciliation remain separate operational checks.

The first browser export attempt timed out after pressing the server-rendered control before the portal finished hydration; no export audit was created. The harness was corrected to wait for the loaded page, and the failed attempt is retained as `browser-previous-*.json`. Fixture corrections also replaced an unsupported module status and an incorrect top-level event-correlation assertion with the authoritative event key. The rollback test verifies the service's sanitized error, rather than expecting its injected internal message.

## Acceptance disposition and remaining work

M1-03 is recorded as `LOCAL_RUNTIME_VERIFIED_EXTERNAL_GATES_OPEN`, not fully complete. Browser/isolated-database blockers B1 and B2 are resolved for this local checkpoint. M1-02 and M2-01 remain dependencies for the real operational journey; they do not block the engineering checks now completed.

The remaining evidence is concrete:

1. A selected real rail/statement format and permissioned payment corpus, including settlement, fees, reversals and unknown outcomes, owned by M2-01/PR-17.
2. Consented client inputs, reconciled opening/control totals and accountant sign-off for financial continuity.
3. Actual recipient delivery receipts, failed/unknown delivery recovery, a named operator and measured support cost.
4. Observed pilot tasks and repeated close cycles, screen-reader review, backup/restore rehearsal and the applicable release decisions. No customer-pilot success or commercial moat is inferred from synthetic fixtures.

No deployment, schema migration, live-provider activation or customer outreach was performed. Existing cash, payment and other concurrent program changes were preserved. The modified product surfaces are the work-desk service/contracts/component/copy, portfolio presentation and the two accountant route headings; the domain acceptance, ledger and export owners were exercised without rewriting them.

## Recovery and next action

If the new view must be withdrawn, revert the pending-request/notification projection and identity panel together with their UI contracts, retaining all authoritative request, response, acceptance and ledger history. Keep the existing client-scope correction. Use current grant/module controls to stop a pilot; do not erase audit history.

Continue M1-03's operational gate when the named owners provide the evidence above. M2-01 is the next external input package. The Data Trust Accountant Portal skill governed this implementation; Docs Report Publisher publishes this report and the updated roadmap narratives as matching Markdown/PDF pairs.
