# P07 blocker — item import and tenant-owned images

17 October 2026. **Blocks complete P07 synthetic master import acceptance.** Do not bypass the image ownership check or report the item import as complete.

## Observed behavior

The actual authenticated workbench successfully stages and independently approves the two P03-derived item identities. Commit remains retryable `APPROVED` with `lastSafeErrorCode = DOMAIN_WRITE_RETRY_REQUIRED`, zero committed rows and a `BLOCKED` milestone. Repeating the original commit and refreshing preserves the same batch, approval and failure evidence. No item, inventory level, movement, journal or posting is created. Customer and supplier imports pass separately.

The new opening-readiness view correctly displays this blocked milestone even though the batch remains approved for retry. The failing full browser attempt is retained in `evidence/browser-1792243991449.json`; independent continuation checks and database diagnostics are listed in RESULT.

## Current source incompatibility

- `services/onboarding/master-data-csv.ts`: the ITEM template permits identity, descriptions and prices; it has no media reference input.
- `services/onboarding/master-data-import.service.ts`, `createThroughDomainOwner`: the safe item payload passes only those master fields to `createItem`. It excludes quantity/location/balances and media fields.
- `services/item/item.service.ts:942`: `createItem` substitutes the legacy external `DEFAULT_IMAGE_URL` when no image is supplied, then calls `claimItemPictures` inside its transaction.
- `services/media/picture.service.ts:68`: a new image reference must resolve to a tenant-owned ready picture asset. A non-owned URL not already retained on the entity is rejected with “Upload an image before saving this item.” This protects ownership; it must remain enforced.

This is a conflict between two current contracts, not evidence of a database migration or provider outage. P07 did not introduce or alter either the item writer or media control. No upload provider was contacted, and no synthetic picture ownership was fabricated to turn the test green.

## Required continuation

Reconcile the governed ITEM-import adapter and the item/media owner in a separately scoped continuation of P07. Decide the supported import path with the existing product rule: either bind independently authorized tenant-owned media to each imported item, or explicitly approve a domain-supported imageless catalogue state if that is valid product behavior. The current source requires an image; P07 cannot silently choose the second policy.

Preserve the source hash/revision, row identity, independent approval, tenant media claim, idempotent original-batch recovery and masters-only boundary. Test wrong-tenant/missing/deleted media and interrupted/repeated commit against a disposable database, then rerun the complete customer/supplier/item browser journey. Do not add opening stock, AR/AP balances or ledger writes to resolve this blocker. Do not run P08 or later prompts as part of this continuation.

P07 is limited to the onboarding read model/action/UI and narrow tests. Broadening the item/media mutation contract is outside this prompt's owned scope. All unrelated changes remain preserved.
