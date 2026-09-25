# Master-data workflow discovery in progress

## CAT

6 semantic workflows traced provisionally to current service symbols and existing entry files. No runtime journey verified.

- Parent validation checks immediate tenant ownership/self-parent only; multi-level cycles are not rejected.
- Action cache revalidation occurs after writes inside the same success/error wrapper.
- Deleted-parent and retained-child behavior requires a complete runtime trace.

## BRAND

4 semantic workflows traced provisionally to current service symbols and existing entry files. No runtime journey verified.

- Archived-record edit behavior and slug collision recovery need runtime verification.
- Post-write cache failure and retry outcomes are not yet corrected.

## UNIT

5 semantic workflows traced provisionally to current service symbols and existing entry files. No runtime journey verified.

- Management create/update reload all rows after commit and can report a failed operation after a successful save.
- Whitespace validation order can accept empty normalized names/symbols.
- Conversion meaning, downstream historical effects and inactive-unit admission need tracing.

## TAX

5 semantic workflows traced provisionally to current service symbols and existing entry files. No runtime journey verified.

- Management save then aggregate reload can misreport committed writes.
- Current item/transaction rate snapshot and historical-report behavior require downstream verification.
- No legal/tax applicability certification is implied by successful entry.

## LOC

7 semantic workflows traced provisionally to current service symbols and existing entry files. No runtime journey verified.

- Legacy manager assignment now uses same-tenant active-manager validation within its transaction; 11 focused service/action tests passed. Actual database/browser and identity-state concurrency remain unverified.
- Legacy default toggles do not clear the prior default; concurrent management defaults need constraint/transaction proof.
- Save then aggregate reload can misreport a committed change.
- Deactivation with active sessions and retained obligations needs domain verification.

## ITEM

8 semantic workflows traced provisionally to current service symbols and existing entry files. No runtime journey verified.

- Large service reviewed only at entry/schema/selected edit and archive boundaries; remaining branches require tracing.
- Historical item archive sets deletedAt even with evidence; obligation/read consumers require review.
- Opening stock/manual adjustment require full producer-to-ledger and concurrency verification.
