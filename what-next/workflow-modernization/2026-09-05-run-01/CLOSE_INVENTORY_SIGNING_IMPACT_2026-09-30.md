# Signing dependency revalidation after inventory freshness correction

The progress reconciler initially refused the new `close-assurance-pack.service.ts` hash because PR-19 signing closure binds that dependency. The earlier closure was not silently rebound.

`lanes/environment/freshness-signing-impact-ec52cc83-ab29-4697-8db8-df32750042cf.json` now verifies:

- An AST declaration comparison against the exact captured pre-change source finds changes only in `inventoryAnnexFromResult`, `evaluateInventoryAnnexFreshness` and `certificationBlockers`. Every other top-level declaration, including the invalidation entry points imported by reconciliation signing/export and their helpers, remains exactly unchanged.
- Actual local reconciliation preparation/signing and same-request replay produce one signature event and one signature audit.
- Signing invalidates the affected historical close and pack while retaining the pack's content hash and historical certified flag. Those historical rows are explicit synthetic negative-test fixtures, not a successful close certification.
- Actual certificate export and replay preserve export bytes/hash and do not create duplicate financial effects. No journal entry or payment was created.

Two failed verifier attempts remain: `freshness-signing-impact-86ce1ac3-7f76-440c-b1d5-5ee10909a046.json` assumed a stored accounting-period ID; the real relationship was resolved by organization and business date. `freshness-signing-impact-7df09a53-7ce4-4790-a7d1-0202dfdec13a.json` used an incomplete synthetic export permission and was correctly denied. The final verifier uses the actual `payments.reconciliation.certificate.export` contract. No production permission or service guard changed.

The narrow impact review preserves prior PR-19 evidence only for this changed dependency. It does not establish successful certified close, production performance, statutory approval or new workflow closure. See `CLOSE_INVENTORY_FRESHNESS_2026-09-30.md` for the main correction, 146-test gate, actual EN/FR draft downloads and remaining limits.
