# Stoquify POS cart-height ergonomics verification

Date: 2026-08-15  
Route: `http://localhost:3000/en/dashboard/pos`  
Decision: implementation complete for the scoped layout change; this is not a production, accessibility, accounting, security, or statutory certification.

## Outcome

The desktop checkout sidebar now balances cart visibility with an expanded transaction workspace. A follow-up browser review found that the first cart-focused allocation reduced the payment panel to 170 px and left only 57 px for 329 px of transaction content. The final allocation keeps the tender method, amount, receipt choices, calculations, and fixed charge action visible without scrolling at the tested desktop sizes. Secondary receipt-access history follows the operational controls and can scroll independently when a shorter viewport cannot contain both.

Final measured allocation after the transaction-panel follow-up:

| Viewport | Cart viewport | Representative row | Fully visible rows | Payment viewport | Tender viewport | Operational controls visible | Charge contained | Horizontal overflow |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| 1440 x 900 | 279 px | 77 px | 3 | 335 px | 222 px | Yes, 187 px controls | Yes | No |
| 1920 x 1080 | 374 px | 77 px | 4 | 420 px | 307 px | Yes; full tender region needs no scroll | Yes | No |
| 1280 x 800 | 193 px | 77 px | 2 | 320 px minimum | 207 px | Yes, 187 px controls | Yes | No |
| 1024 x 900 | 288 px minimum | n/a, empty live cart | natural flow | 447 px | 294 px, natural flow | Yes | Yes | No |

Capacity formula used against the observed long-name row height was `(cart client height - 16 px inner padding + 2 px gap) / (77 px row + 2 px gap)`, rounded down. A deterministic seven-line component fixture independently verifies that long-name lines, quantity inputs, and removal controls all remain rendered and available.

## Root cause and baseline evidence

The browser measurement confirmed the stated flex-allocation hypothesis. At 1440 x 900 the previous checkout allocation produced:

- customer panel: 183 px;
- cart header: 97 px;
- cart list: 112 px;
- one representative cart row: 111 px;
- payment/tender panel: 451 px;
- effective visible capacity: one cart line.

The constraining classes were `min-h-[7rem] flex-[0_1_11rem]` on the cart and `flex-[2_1_46rem]` on the payment section. The cart was therefore capped at approximately one line even though the tender area retained most of the sidebar.

Baseline screenshot: `C:\Users\J COMPUTER\.codex\visualizations\2026\08\15\01a003ca-aebe-7050-87b5-038a0ff489d1\stoquify-pos-cart-before-1440x900.png`

First cart-focused screenshot: `C:\Users\J COMPUTER\.codex\visualizations\2026\08\15\01a003ca-aebe-7050-87b5-038a0ff489d1\stoquify-pos-cart-after-1440x900.png`

Final balanced screenshot: `C:\Users\J COMPUTER\.codex\visualizations\2026\08\15\01a003ca-aebe-7050-87b5-038a0ff489d1\stoquify-pos-transaction-panel-expanded-1440x900.png`

## Implemented changes

- Removed the unconditional 760 px checkout minimum so sub-desktop layouts use natural page flow.
- Gave the desktop cart `xl:flex-[3_1_20rem]` with `min-h-0`; retained a 288 px minimum below `xl`.
- Reduced non-interactive customer/header whitespace and kept normal cart rows readable at 77 px for the observed long name.
- Preserved product name, SKU, price, quantity, stock availability, and remove controls; long names expose the full localized value through `title`.
- Added localized removal labels in English and French.
- Preserved 40 px quantity/remove controls in touch mode and a 56 px charge action in touch mode.
- Gave payment `xl:min-h-[20rem] xl:flex-[2_1_24rem]`; totals use a compact four-column desktop grid.
- Placed operational split-tender and receipt-choice controls before secondary receipt-access history so normal transaction work is immediately visible.
- Made only the detailed tender/history content `xl:overflow-y-auto`; the operational controls themselves fit without scrolling at 1280 x 800, 1440 x 900, and 1920 x 1080.
- Kept paid/due/change plus the charge action in a fixed, inline desktop footer so they cannot be clipped by tender overflow.
- Moved tender/receipt blockers into the tender scroll region so a validation message cannot expand and clip the fixed charge footer.
- Added stable test identifiers for cart, tender overflow owner, totals, payment, and charge footer.

No sale, payment, receipt, inventory, cashier-session, accounting, route-access, entitlement, Prisma, hook, action, or service behavior was changed by this work.

## Browser verification

- Desktop sticky behavior: verified at 1280 x 800, 1440 x 900, and 1920 x 1080.
- Transaction visibility: the payment panel increased from 170 px to 335 px at 1440 x 900 and from 142 px to the 320 px minimum at 1280 x 800.
- Operational controls: the 187 px tender-control group is fully visible at all tested desktop sizes; the fixed charge footer is also inside the viewport.
- Large desktop: at 1920 x 1080 the 307 px tender region contains its complete 306 px content without scrolling.
- Shorter desktop: at 1280 x 800 and 1440 x 900 only secondary receipt-access history extends below the operational controls; normal tender entry and receipt selection do not require scrolling.
- Cart capacity after the requested rebalance: two representative rows at 1280 x 800, three at 1440 x 900, and four at 1920 x 1080.
- Tablet behavior: at 1024 x 900 the sidebar was static, the cart kept its 288 px minimum, payment used natural height, tender overflow was `visible`, and no horizontal overflow appeared.
- Effective 200%-zoom layout: the browser adapter did not change browser zoom through keyboard shortcuts, so the equivalent 720 x 450 CSS viewport was checked. It used natural flow, showed no horizontal overflow, and had no nested tender scroll.
- Localization: the French route rendered `Panier` and `Encaisser 0 FCFA`, retained the responsive classes, and showed no horizontal overflow at 1024 x 900.
- Touch mode: browser interaction changed the charge action from `h-11` to `h-14`; component coverage verifies `h-10 w-24` quantity input and `h-10 w-10` removal target.
- Console: transient `pos.cart.removeLine` missing-message errors occurred during hot reload before locale files refreshed. After full reload, no browser errors were recorded from 10:56 onward and both locale files parsed successfully.

## Automated verification

- `npm run typecheck`: passed.
- `npx eslint components/pos/ProfessionalPOSSystem.tsx components/pos/__tests__/ProfessionalPOSSystem.shift-close.test.tsx`: passed.
- Focused Jest command: passed, 2 suites and 10 tests; the final payment-minimum assertion also passed in the 6-test shift-close suite.
- Long-cart fixture: seven long-name lines and seven removal controls rendered; tooltip, overflow-owner, and fixed-footer contracts passed.
- `messages/en.json` and `messages/fr.json`: JSON parsing passed.
- `git diff --check` on scoped files: passed; Git emitted only the repository's existing CRLF-to-LF warning.

## Limitations and release posture

- The final live browser state exposed 48 catalog records but the cashier shift remained closed. No shift or sale was mutated solely to manufacture a long cart; seven-line and long-name behavior remains verified by the deterministic component fixture.
- The browser adapter retained focus on the same control when asked to advance with Tab, so an end-to-end keyboard focus-order assertion could not be trusted. Existing `focus-visible` classes were preserved, but this work does not claim accessibility certification; manual keyboard and screen-reader review remains appropriate before release certification.
- Browser-level 200% zoom could not be set by the adapter. A 720 x 450 effective CSS viewport was used as the closest responsive-layout proxy; manual browser zoom remains a release-check follow-up.
- No sale was committed and no shift was opened or closed during final layout verification. Domain consequences were intentionally outside this task.

## Multidisciplinary lens disposition

- Frontend/design systems, workflow UX, responsive accessibility, POS operations, product, and quality/release assurance: applicable and covered above.
- Enterprise/backend/API/distributed systems: not applicable; no service or API behavior changed.
- Database, integrity, and migrations: not applicable; no persistence schema or write path changed.
- Security, IAM/RBAC, privacy, fraud, and abuse prevention: not applicable; no trust boundary, permission, or data exposure changed.
- Finance, accounting, reconciliation, internal controls, OHADA/SYSCOHADA, and country packs: not applicable; no financial event or statutory behavior changed.
- SRE, DevSecOps, observability, resilience, performance, cost, integrations, events, offline/edge, and providers: not applicable; this is a local responsive layout change with no runtime dependency added.
- Analytics, data governance, AI/agent governance, SaaS packaging, billing, growth, and customer success: not applicable; no data contract, automated decision, package, or commercial behavior changed.

## Recommendation

Accept the scoped cart-height change for code review. Keep final production classification contingent on the normal release gate, including a manual 200% zoom and keyboard pass on a seeded long-cart environment.
