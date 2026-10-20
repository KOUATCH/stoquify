# Logo browser review — 20 October 2026

## Result

Fixed the shared logo's clipped login subtitle and crowded smallest-screen lockup. The wordmark remains proportional, captions wrap when needed, and secondary captions are hidden at 360 CSS px and below.

| Surface | Browser / actual CSS widths | Result |
| --- | --- | --- |
| `/en`, `/fr` public header | Chrome 155, CDP 1.3 / 1440, 390, 320 | No logo clipping, caption overflow, or document horizontal overflow. |
| `/en/login`, `/fr/login` | Chrome 155, CDP 1.3 / 1440, 390, 320 | Full English subtitle, wrapped French subtitle; both omitted at 320. Language/theme controls remain separate. |
| `/en/dashboard/pos` desktop sidebar | User's signed-in Edge / 1440, 821 | Symbol, wordmark and Enterprise OS subtitle fit beside notifications. |
| `/en/dashboard/pos` mobile navigation drawer | User's signed-in Edge / 390, 320 | Logo fits the drawer with clear space from the close control. Subtitle omitted at 320 after refresh. |

`before.json` and `before-*.png` preserve the initial English public/login evidence. `after.json` and `after-*.png` contain the final Chrome checks. `edge-dashboard.json` and `edge-dashboard-*.png` contain the authenticated shell checks. Measurements include SVG bounds, container bounds, caption client/scroll widths, viewport and document width. Edge's existing zoom required calibrating viewport requests to observed `innerWidth`; the narrow desktop measurement is 821 CSS pixels.

Chrome checks use the actual Chrome executable with `Emulation.setDeviceMetricsOverride`, `Runtime.evaluate` and `Page.captureScreenshot`. Edge checks use the connected browser's DOM measurements, viewport override and screenshots. Edge's drawer was closed and its viewport override reset after inspection.

The first isolated Chrome sign-in did not leave the login page; `sign-in-attempt.json` records that attempt. The user supplied the existing signed-in Edge tab, which enabled dashboard verification. No session cookies were copied, no authentication bypass was added, and no data was seeded.

The POS initially showed a load failure. After refreshing it loaded and showed that its register was in use by another tab. These are application states outside this logo review; no checkout or register actions were performed.

## Separate source verification

The workflow contract, focused TypeScript check, existing 14 isolated React render cases, vector bounds checks and focused ESLint passed. These do not certify application business workflows. No database test or full accessibility audit was performed.
