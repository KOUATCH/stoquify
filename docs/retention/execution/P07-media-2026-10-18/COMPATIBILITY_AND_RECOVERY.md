# P07 item import/media compatibility — 18 October 2026

## Decision and scope

Retain the existing requirement that every newly created item has a tenant-owned ready image. Do not introduce an imageless-item exception, shared placeholder, external URL whitelist or a bypass of `claimItemPictures`.

The ITEM CSV contract now has an `imageUrls` column containing **one** application image reference (`/api/media/<id>`) per row. The plural name matches the existing item domain field; CSV arrays and arbitrary URLs are not accepted. Item templates and new mappings use schema version 2. Customer and supplier templates remain version 1. This is a payload/mapping version change, not a Prisma schema change.

Before staging, operators can upload images through the existing authenticated upload route using the EN/FR helper on the onboarding workbench. The helper retains each successful reference for copying into the appropriate CSV row. Its next uploader is a fresh instance so the shared component's replacement cleanup cannot delete an earlier copied reference. References are page-local; save them before navigating away. Existing authorized references may be reused. There is no bulk media migration or automatic source-image download.

## Authority and transaction boundaries

1. Existing onboarding actions resolve the current actor, organization, target permission and module access. Browser-supplied organization fields do not select the importer tenant.
2. CSV validation accepts only a managed image reference, and the service queries availability with organization, entity type and ready status. Missing, foreign, deleted, uploading and wrong-entity references all produce the same safe issue. No attachment occurs during validation.
3. Independent approval and existing source/content/mapping hashes remain authoritative. Media is a staged row value and therefore part of the original CSV and row hash.
4. The importer passes only approved master fields and the image reference to the existing `createItem` domain owner. Quantity, location and balances remain excluded.
5. `createItem` invokes the unchanged transactional `claimItemPictures`. Availability at staging does not replace this check. Its row lock serializes attachment against cleanup. An unavailable image after approval stops the row without an item/media partial transaction.
6. Interrupted item checkpoint recovery also compares the stored image reference, in addition to the existing name/key match. An item with the same key/name but a different image cannot be adopted as this row's success.

## Existing mapping and batch compatibility

When the default ITEM mapping lacks `imageUrls`, the service creates its next immutable version, preserving the prior column mappings and appending the required image column. It retains the old mapping. A conflicting source-column name fails safely and requires an explicit corrected mapping. Concurrent creation uses the existing unique mapping-version constraint and rechecks the winning mapping. Explicit legacy mapping selection without the required field is rejected; it is not silently rewritten.

Previously approved, image-free rows are **not amended in place**. Download the current template, add authorized image references, validate the corrected file and obtain fresh approval. The corrected source produces a new content hash/batch; the old failed source and approval remain retained. This is necessary because replacing the source/image is a different approval decision.

If a batch has already imported some rows, preserve those result IDs. Retry the same batch only when its original references are available and the source is unchanged. A genuinely deleted image requires a new upload/reference and reviewed correction for remaining rows; do not resurrect a deleted production asset or re-import already committed keys. The current importer rejects duplicates and does not update/merge masters. A response lost after domain commit is recovered by the same original batch, with matching image evidence, without creating another item.

## Verification boundaries

Real database tests exercise actual item and media transactions, staging/approval, partial progress, checkpoint loss, replay and cleanup contention. Their media records are explicit synthetic pre-existing assets in a disposable cluster. The browser imports customer, supplier and item masters through actual authenticated routes/actions from those fixtures.

No real provider upload or image read is claimed. Upload service/route success, encryption and UI reference collection have mocked tests; actual browser upload with provider configuration absent must fail honestly without creating a ready asset. Provider availability, storage durability and production configuration remain separate operational checks.

Opening stock, receivables, payables, journals, ledger postings and reconciliation are still separate, unverified setup steps. Importing item images does not complete them.

## Rollback and handoff

Use the captured before files and owned patches to revert only this continuation. Do not reset the dirty checkout or delete mappings, sources, approvals, items or media attachments. Keep version-2 source evidence for review; an older importer cannot safely consume its required image field. No shared migration, provider cleanup or production-data change was performed.

P08 and later prompts are outside this execution. Its bounded verification does not clear the outstanding P03/P04 live, accountant, cutover or restore gates.
