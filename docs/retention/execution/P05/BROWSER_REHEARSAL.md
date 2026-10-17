# P05 — Prepared interrupted-response browser test script

**NOT_RUN.** Manual test script, not an executable automation or a rendered result. Prepared 13 October 2026 because no explicitly owned disposable application/database/browser fixture was established. Do not substitute the historical cart-only smoke script or receipt-token check for checkout recovery.

## Preconditions and record sheet

1. Identify the owner and explicit disposable localhost application/database/schema. Record sanitized identities, source hashes, setup/cleanup responsibility, synthetic cashier, tenant, location, terminal and shift. Never derive the target from ambient `.env`. Inspect current server-start hooks and fixture setup before running them; no migration wrapper is implied.
2. Use reviewed synthetic opening stock, cash and ledger mapping. Establish independent before-state queries scoped to this fixture. Do not use real payments/providers. A zero-tax fixture proves no country tax treatment.
3. Open the actual `app/[locale]/(dashboard)/dashboard/pos/page.tsx` route at the approved localhost origin (`/fr/dashboard/pos`, repeat in `/en/dashboard/pos`). Record actual supported browser/version, viewport, network profile and role. Proposed pilot: Windows Edge, 1366×768; this is a target, not observed coverage.
4. Choose a reviewed response-interception mechanism that lets the request reach the server and suppresses its response **only after independent confirmation of durable commit**. Simply blocking the request, clicking offline too early or assuming a timeout means “after commit” is insufficient. Document mechanism, original operation ID and timestamps; redact credentials and personal information from traces.

## Cases and assertions

| ID | Steps | Required result/evidence |
|---|---|---|
| B01 — response lost after commit | Prepare a sale; capture original retained ID/payload and before snapshot. Submit and suppress the response after durable result is confirmed independently. Capture uncertain UI; reload same browser session; choose check outcome. | Original sale/order/amount shown; no forced reset or second payment. One commit result, one stock issue, expected payment/ledger/outbox counts only. Save original/recovered IDs, screenshots, trace and before/after financial snapshots. |
| B02 — request interrupted before completion | Interrupt before a commit is confirmed, restore connectivity and check outcome. If `NOT_FOUND`, retry the exact retained request; if `PENDING`, keep checking. | No success based on transport state. Same original ID and payload persist. Eventual evidence determines outcome; no extra effects. |
| B03 — duplicate requests | Submit two concurrent identical requests through the permitted fixture interface, then check/retry. | Both outcomes refer to the original sale; one effect set. Independent PostgreSQL counts required. |
| B04 — changed intent / foreign scope | In the synthetic harness attempt changed tender with same key, substituted key with retained leased request, and foreign tenant/cashier/site requests. | Bounded rejection or scoped non-disclosing read; original pending evidence retained; no foreign evidence or extra financial effects. |
| B05 — pending, review and rejection UX | Exercise recorded receipt retry, pending evidence, changed revision, storage refusal and closed-shift retired draft using controlled fixtures. | No false success; review/acknowledgement matches server state; errors preserve intent; receipt failure does not demand another sale. Check FR/EN, keyboard reachability/focus; report assistive-technology checks separately. |
| B06 — delayed response across register change | Defer register A recovery/commit response; switch to register B and load its own pending request if UI allows; then resolve A. | B's request remains intact; A cannot clear/acknowledge B or show as B's outcome. If switching is blocked, record that behavior and its scope. This probes an unreproduced source hypothesis. |

On any discrepancy, preserve fixture evidence and stop the affected test; do not erase the pending sale, manually edit balances or retry with a new key to make the screen look successful. Record cleanup separately after evidence capture. A screenshot alone does not prove ledger/stock counts; database checks alone do not prove usability.

## Required output when resumed

Save a new dated run under P05 without overwriting this run: explicit target/fixture identity, exact tool/command or manual steps, source revision/hashes, request-interruption timing proof, per-case PASS/FAIL/BLOCKED, sanitized trace/screenshots, independent financial snapshots and cleanup outcome. Update P05 only after evaluating all remaining acceptance criteria. This procedure does not execute or authorize P06 or P08.
