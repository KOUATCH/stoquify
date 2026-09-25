# Verify terminal offline replay evidence — v136

Status: bounded v136 evidence published. The full workflow review remains active.

## Reproduced defect and correction

The REPLAYED/DUPLICATE_REPLAY shortcut returned sale, order and posting references straight from event metadata. The focused regression (`c923a2`) failed because a fabricated sale/order/batch was returned as a successful duplicate replay without original result evidence. This is a verified service defect; no production exploit is claimed.

The shortcut now validates the accepted payload hash, parses its original request and checks event scope. It calls the retained original-result service using the server-supplied tenant and cashier. It then checks the scoped `pos.offline.event.replayed` business event, actor, source, location/terminal/device, original payload hash, sale/order identifiers, posting batch and stored document/fiscal fields. It also requires a matching POSTED sale-completion journal entry. Missing or inconsistent evidence produces a bounded 409 conflict; it does not repair history or substitute metadata for proof.

The duplicate lookup calls no sale commit, receipt hydration, posting, delivery or event update. Existing immutable result checks remain effective. A different cashier cannot use terminal metadata to evade the result's original-actor scope. Historical replay acknowledgement remains distinct from the current sale state: the response adds `currentSaleStatus` and `observedAt` from the verified sale read, including a later void/refund. Fiscal/document fields describe the verified recorded acknowledgement; they are not a fresh fiscal-authority certification query.

The existing test-only offline deployment authorization is unchanged. This does not activate replay for live customers or enable a new browser path.

## Verification

- Initial regression failed (`c923a2`), explicitly returning fabricated references under the old shortcut. The corrected focused 29-test run passed (`908dd0`).
- Final 73 tests across offline sync, retained commit recovery and POS service passed (`e3798e`). Tests cover a valid terminal acknowledgement with current returned status, missing original evidence, corrupt payload, inconsistent metadata, missing replay business event and missing posting. Failure checks assert no commit, receipt hydration or history update.
- Both changed TypeScript files passed ESLint (`e3798e`): `services/pos/offline-sync.service.ts` and `services/pos/__tests__/offline-sync.service.test.ts`.
- Typecheck passed (`22eb36`) using bundled Node and `node_modules/typescript/bin/tsc --noEmit --pretty false`.
- Actual PostgreSQL checks passed (`4bcb1f`, `lanes/environment/terminal-replay-v136-1f9a519c-5010-4f0c-93b1-1771376e1a0f.json`): a previously verified owned v135 terminal replay is readable without financial/event changes; another cashier is denied; deliberately altered synthetic metadata is rejected without auto-repair; a real fixture void remains visible as CANCELLED while historical acknowledgement stays DUPLICATE_REPLAY. The corruption fixture was restored explicitly by the verifier; the application never repaired it automatically.

This is a backend evidence-read change. No new UI, EN/FR string or browser interaction changed, so no new browser/accessibility pass is claimed. v135 browser evidence remains historical at its bindings. Offline pending records originally came from controlled fixtures, not a certified device/signature ingestion journey. Snapshot comparisons cover financial records and the offline/business-event records; they are not universal database or production certification.

## Operator procedure and release

The offline replay caller remains gated by existing deployment controls. No new route is enabled. For a terminal evidence conflict, retain the event and report its ID/correlation reference. An authorized operator needs original payload/hash, client commit identifier, cashier and tenant, device/terminal/session, immutable commit result, replay business event, document hash and sale-completion posting. Obtain these from the owned event/commit/accounting records, not from a copied metadata field alone. Compare the reported current sale status with the historical acknowledgement; a voided sale can still have a valid historical replay record.

Do not mark the event pending again, edit accepted payloads, rewrite posting references or create a replacement payment to remove the conflict. A reviewed correction/supersession workflow is still required and is not supplied by this patch. The application returns a bounded conflict and preserves the evidence.

No deployment, schema migration, production payment, external message, receipt delivery or X1 clearance occurred. Runtime verification used `stoquify_local_registration_20260906_01` under the existing isolated test authorization. Branch/commit/dirty-source bindings are in `evidence/source-baseline-v136.json`. Preserve earlier gates and unrelated working-tree changes. Prefer a forward fix over restoring the metadata-only shortcut. Production recovery/rollback rehearsal remains open.

## Review and remaining scope

Selected skill: `007-aqstoqflow-pos-ledger-controls`. Architecture/backend: replace metadata-only shortcut with verified retained-result and event/posting checks. IAM/privacy: original cashier/tenant scope and safe conflict response. Finance/data/audit: verified source linkage, no write effects, current reversal state distinct from historical acknowledgement. QA/SRE: failed reproduction, focused regressions, actual retained/altered/voided database evidence and current hashes. API/events/offline: test-only gate retained, terminal reads do not redeliver acknowledgements. UX/localization/accessibility: no surface change in this patch; existing support recovery is incomplete. SaaS/operations: no module, commercial eligibility or provider change. Country formulas, HRIS/payroll, AP, analytics and AI behavior are not applicable to these changes because none changes; all remain in the platform inventory. No professional certification is claimed.

Open work: audited offline conflict correction/supersession, full signature/ingestion/revocation/close lifecycle, a usable operator resolution surface, closed-tab result discovery, wider receipt/correction/accessibility coverage, coordinated rollout and all other unfinished platform workflows. High-impact open boundaries prevent release certification. The task is not globally blocked; authorized implementation can continue.
