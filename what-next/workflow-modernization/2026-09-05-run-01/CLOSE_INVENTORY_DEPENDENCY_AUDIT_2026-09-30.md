# Inventory freshness: reconciliation dependency audit

This record supersedes the workflow identification in `CLOSE_INVENTORY_SIGNING_IMPACT_2026-09-30.md` and its impact JSON: **PR-10 is signing; PR-19 is preparation**. Those immutable records incorrectly called signing PR-19. Their runtime assertions remain valid. The signing verifier created a reconciliation run; it did not call the separate preparation service. The preparation claim is supported by the additional execution below.

Actual preparation, exact replay, independent signing, retained signed history and a later preparation replay pass in `lanes/environment/freshness-preparation-impact-95060730-66b8-4160-ad07-78f3e5bc6d65.json`. The replay retains one preparation receipt and one preparation audit, preserves the signed certificate, and creates no journal or payment. This execution used only the guarded disposable database and synthetic fixtures.

The prior signing impact receipt verifies signature and certificate-export replay, retained pack hashes and close invalidation. Its AST comparison finds only three changed declarations: inventoryAnnexFromResult, evaluateInventoryAnnexFreshness and certificationBlockers. The invalidation functions and all other top-level declarations are unchanged. The new preparation receipt binds its current service and signing dependency. Together these bounded checks support retaining both earlier closures after this dependency change; neither is a newly completed workflow.

All earlier closure receipts remain immutable. The updated reconciliation script accepts only their exact predecessor close-pack hash through the new reviewed dependency binding. Other source and evidence bindings still fail closed on any mismatch.

The first attempt to create the preparation verifier through a shell write was denied by the filesystem sandbox; creation succeeded through the file patch tool. The subsequent attempted invocation before creation failed with MODULE_NOT_FOUND. The actual guarded database verification then completed successfully. No application authorization was relaxed.

The Cash workflow remains in progress. Genuine certified close, applicable payroll-pilot evidence, broader recovery/accessibility and production latency still need completion. This audit supplies no production, statutory or accessibility certification.
