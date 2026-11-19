# AF07 normalization, identity and coverage contract

20 October 2026 · Parser profile v2 · Existing line fingerprint v1 preserved

## Retained identities

Raw file identity remains SHA-256 of the exact UTF-8 string, including BOM, line endings and whitespace. Its database uniqueness remains tenant + provider account + file hash. The same bytes may therefore legitimately be imported into two different accounts without sharing an inbox receipt.

The existing line fingerprint algorithm is unchanged:

```text
SHA256(join("|", [
  providerTransactionId or "",
  providerReference or "",
  direction or "UNKNOWN",
  String(amount),
  currencyCode or "XAF",
  occurredAt.toISOString()
]))
```

Previously valid, unambiguous input retains the same trimmed decimal spelling and timestamp normalization. In particular, `"100"` and `"100.00"` still have different legacy fingerprints. AF07 does not rewrite either value, recompute stored fingerprints, backfill old rows or rerun old imports.

New line metadata records `formatVersion: stoquify-pilot-v2` and `fingerprintVersion: 1`. It no longer stores the complete raw row or unmasked counterparty. Existing retained metadata is left intact; this is not a retrospective privacy cleanup.

## Stricter new input without historical reinterpretation

The byte-size guard still runs before persistence. Inside the existing transaction, the service resolves retained work, performs module admission for new work, locks Close coordination and the provider account, and rechecks account status and retained results.

Exact retained files return the stored source type and line count without invoking the current parser. Retained duplicate cases return the same exception. This allows historically accepted ambiguous files to be acknowledged without accepting their contents as new v2 input.

New or changed bytes must pass v2 validation. Historical files exceeding the current byte limit still require operational review; replay does not bypass limits, current tenant/account checks or account status. An inactive account is not reactivated by a retained file.

New receipts use an account-scoped idempotency key. A retry of a historical file first searches for its existing tenant/account/source/payloadHash receipt and reuses that receipt's key. Legacy receipts are not rewritten, and a receipt belonging to another account is never reused.

## Changed payloads and duplicates

The existing fingerprint check is supplemented with a semantic identity check scoped to tenant and provider account:

1. Prefer transaction ID + direction.
2. If transaction ID is absent, use reference + direction among reference-only records.
3. Preserve separate FEE and REVERSAL records that share an original transaction ID.

An existing identity with a changed amount, fee, date, currency, description or decimal spelling is held as a duplicate-provider-reference case. It is not silently applied as a correction. References that repeat for legitimate same-direction records need an actual transaction ID or a separately reviewed provider mapping.

Within-file identities and retained identities are checked before creating the statement file. A mixed file with one duplicate is held in full: zero new statement lines, one retained exception, no partial imported file or payment.statement.imported event. Different directions are separate source identities; AF07 does not establish whether a provider's reversal is economically valid.

The provider lock and Read Committed isolation preserve concurrent duplicate visibility. Identity queries group values by direction rather than constructing one SQL branch per row. The existing file/fingerprint uniqueness constraints remain unchanged.

## Atomicity and uncertainty

Statement file, lines, receipt, business event/outbox and Close source invalidation remain within one domain transaction. Import correlation is also passed to the business event itself. An injected event failure in real PostgreSQL rolls the earlier writes back. A safe retry then imports once.

The importer creates source evidence, not journal entries or a financial signature. The existing provider-operation intent and recovery service remain responsible for uncertain import outcomes, matching review and separate signing. See [operations](OPERATIONS.md).

## Current account coverage

The existing coverage service continues to require every account known by the cutoff, including archived accounts where no reliable effective-dated lifecycle exists. Statement windows, independent signoff windows, unresolved obligations, currency mismatch, cadence and settlement lag retain their current meaning.

AF07 adds a current-proof check for signed candidates:

- Require the retained certificate's evidence source hash.
- Verify the retained certificate payload hash with the same canonical serialization used by reconciliation evidence.
- Rebuild the existing reconciliation source manifest and compare its source hash.
- Exclude changed or unverifiable certificates from signed coverage and return `STALE_SIGNOFF`, alongside applicable missing/partial signoff and obligation reasons.
- Propagate unexpected source-read failures; never convert an unavailable source into successful coverage.

This is a conservative **current-proof** check. Even when a caller supplies an earlier recorded-through cutoff, later source changes can invalidate a signature's current status. It does not reconstruct a historical temporal database or claim an old signature is current because later rows fall outside that cutoff. Retained signed artifacts are not modified by the read.

Approved no-activity evidence still requires exact scope, currency, retained source hash, independent approval, no revocation and no contradictory activity or unresolved obligations. Empty files, empty queries and provider outages remain missing evidence. A late statement import blocks the previously approved zero-activity result.

The generic adapter's statement window remains the minimum and maximum occurrence timestamps. It is not upgraded to a full month simply because a filename says “September.” Full coverage still needs actual period evidence. Existing bank-balance snapshot hashing, independent approval and balanced-source checks were reused unchanged.
