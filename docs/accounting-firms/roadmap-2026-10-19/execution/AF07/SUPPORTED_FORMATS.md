# AF07 supported pilot statement formats

20 October 2026 · Synthetic fixtures only · Contract `stoquify-pilot-v2`

## Supported scope

The existing MobileMoneyHmacAdapter now accepts the following generic statement profiles. The providerCode passed by a caller is a routing label, not evidence of an official provider format or live integration. No live MTN, Orange, bank, card or wallet feed was connected or verified.

| Profile | Representation | Verification |
|---|---|---|
| Pilot CSV v2 | UTF-8 text, comma delimiter, header row | BOM, CRLF, LF, quoted comma, escaped quote, embedded newline, credit/debit/fee/reversal fixture |
| Pilot JSON v2 | Array of flat row objects; monetary fields are strings | ISO dates/offsets, aliases, strict amounts, invalid records, retained-file replay, changed identity |
| Historical exact-file replay | Identical retained UTF-8 string bytes, same tenant/account | Returns retained file and stored count without running the new parser |
| Official provider exports | Provider-specific columns, locale or credentials | NOT VERIFIED; require authorized redacted samples and an approved mapping |

The service accepts decoded text. An initial UTF-8 BOM is allowed for parsing and remains part of the raw file hash. NUL, replacement characters and unpaired surrogates are rejected. The service cannot prove which decoder produced an already-decoded string; callers must decode source files as UTF-8 without loss. No automatic Windows-1252/UTF-16 conversion is performed.

## Fields and value rules

| Field | Accepted aliases | Rule |
|---|---|---|
| Transaction identity | providerTransactionId / transactionId | At least this or a reference is required; trimmed text |
| Reference | providerReference / reference | Identity fallback only when transaction ID is absent |
| Direction | direction | CREDIT, DEBIT, FEE or REVERSAL; case normalized to uppercase as before |
| Amount | amount | Required unsigned decimal **string**, up to 12 integer digits and two decimals |
| Fee | feeAmount / fee | Same monetary rule; absent/empty means absent, not a fabricated zero |
| Currency | currencyCode / currency | Required uppercase three-letter code; account currency consistency remains a separate coverage control |
| Occurrence | occurredAt / date / timestamp | Valid ISO date or timestamp with explicit Z/offset |
| Posting time | postedAt | Optional; if supplied, the same strict date rules apply |
| Description | description | Optional text; quotes/newlines are parsed, then the historical edge trim is retained |
| Counterparty | counterparty / customerMsisdn | Existing mask/hash retained; the raw row is no longer copied into new line metadata |
| Line number | lineNumber | Optional positive integer within PostgreSQL integer range; otherwise logical row ordinal |

Examples of accepted amounts: `"0"`, `"0.10"`, `"100.20"`, `"999999999999.99"`. Negative signs, exponent notation, thousands separators, decimal commas, leading zero ambiguity, numeric JSON amounts and extra precision are rejected. Direction carries debit/reversal meaning; the importer does not infer a signed monetary value or perform ledger posting.

Date-only values explicitly mean UTC midnight. Timestamps require seconds, optional one-to-three fractional digits, and Z or a numeric offset no greater than ±14:00. Invalid calendar days and timezone-free timestamps are rejected. No day/month guessing, local machine timezone or hidden calendar rollover is used. Supported calendar years start at 1900.

Conflicting aliases are rejected. Duplicate JSON keys, including escaped spellings of the same key, are rejected. Unknown columns are ignored and do not become metadata or authority.

## CSV grammar and bounds

- Headers must be unique and nonempty. Every data record must have exactly the header field count.
- A quote opens only at the beginning of a field. Quotes inside a quoted field are escaped as `""`.
- Quoted fields may contain commas, CRLF or LF. Characters after a closing quote must be a delimiter or record ending.
- Outside quoted fields, record endings are LF or CRLF. Bare CR is rejected.
- Blank records containing only empty cells are skipped; whitespace-only or malformed records are not silently converted into transactions.
- New files are limited to **5 MiB of UTF-8 text and 1,000 data records**. A caller may lower the byte limit, not raise it.
- Empty files are rejected. An empty response is never proof of no activity.

The parser uses a narrow internal implementation because the repository's existing onboarding parser is private and tied to onboarding error contracts. No suitable exported payment parser or installed CSV dependency was found; no dependency was added.

## Fixture controls and measured capacity

Synthetic fixture: [af07-pilot.csv](<E:/ohada saas/Focused projects/stoquify/services/payments/__fixtures__/af07-pilot.csv>).

| Control | Expected |
|---|---|
| Records | 4 |
| Directions | CREDIT, DEBIT, FEE, REVERSAL |
| Sum of unsigned amounts | 126.70 XAF |
| Sum of separately supplied fee attributes | 0.20 XAF |
| First description | Quoted comma, escaped quote and embedded CRLF |

These controls verify exact decimal persistence; the unsigned sum is **not** a settlement balance. Fee records and fee attributes remain distinct source facts. Matching, fee accounting and financial approval remain in their existing domain services.

The final 1,000-row CSV contains 46,934 UTF-8 bytes and totals 100.00 XAF. It parsed in about 40.6 ms and imported in about 1,775 ms on the local synthetic PostgreSQL target. The import includes existing locks, file/line writes, inbox, event/outbox and invalidation. The test client uses the application's 10-second maxWait and 15-second transaction timeout. These are single-run observations, not production SLOs.

An exploratory 10,000-row import took about 23,985 ms with a longer test timeout. That result exceeded the application timeout, so the supported limit was reduced before completion. The exploratory measurements remain in the run folder and do not establish support for 10,000 rows.

See [normalization and identity contract](NORMALIZATION_AND_FINGERPRINTS.md), [operations](OPERATIONS.md), and [result](RESULT.md).
