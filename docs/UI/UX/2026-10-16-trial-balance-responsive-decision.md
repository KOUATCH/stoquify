# Trial balance: narrow-screen identity columns

Date: 2026-10-16. Scope: trial-balance presentation only.

The 144px account-code and 224px account-name columns together exceeded the 245px usable table viewport at a measured 320px CSS screen width. Keeping both sticky covered the numeric columns even after keyboard horizontal scrolling.

Use ordinary horizontally scrolling identity cells below the existing `md` breakpoint; preserve sticky identity cells at `md` and above. Apply the same breakpoint to the footer's total label so it does not cover narrow-screen amounts. Keep canonical column metadata, order, widths, numeric formatting, full-report totals, table scroll region and server authorization unchanged. Filters wrap outside the table's horizontal scroll region.

This is a scoped resolution of frozen-identity guidance against the design master's requirement that essential table content remain reachable. It does not authorize changing other table contracts. Browser evidence verifies 320×844 and 1440×900; intermediate breakpoints and assistive technology remain separate acceptance work.

Evidence and verification: [Delivery 18](../../system-audit/2026-10-12-ui-ux-review/roadmap/EXECUTION-18.md).
