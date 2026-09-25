# Native browser zoom verification

Final result: **4/4 application cases passed**, 2026-09-05 16:20:08–16:22:17 UTC. The primary evidence is receipt.json; final-binding.json binds the source, driver, reports and screenshots.

## Genuine zoom and isolation

The fresh owned Chromium 151.0.7922.34 profile used Chrome's automatic, per-tab zoom API. Browser-reported zoom and settings are recorded after each change. CSS zoom, device-metrics overrides and pinch/page-scale emulation were not used. This mechanism is defined by the official [Chrome tabs zoom API](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom); the isolated extension uses a supported [Playwright persistent Chromium context](https://playwright.dev/docs/chrome-extensions).

The driver signed in through the real authentication API as the existing service_en_desktop synthetic account on 127.0.0.1:3107. It did not apply, save or reopen a configuration. Its profile was closed and removed. No user browser/profile or global zoom preference changed.

Final screenshots capture the complete browser surface with no clip or scaling parameter, using [Page.captureScreenshot](https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-captureScreenshot). Each is 1258×1002 pixels.

## Passed scope

The fixed browser window was 1280×1100 pixels; unzoomed content was 1258×1002. Floating-point tolerance accepts the actual 400% value 3.9999999999999996.

| Case | CSS viewport | Device pixel ratio | Result |
| --- | --- | --- | --- |
| English 200% | 629×501 | 2 | Passed |
| English 400% | 314×250 | 4 | Passed |
| French 200% | 629×501 | 2 | Passed |
| French 400% | 314×250 | 4 | Passed, including history |

At 400%, the fractional viewport is 314.5×250.5. Root/body CSS zoom remained 1; visualViewport scale remained 1. There was no document/dialog horizontal overflow beyond fractional-pixel rounding.

Each case reached Review through sequential Tab navigation, verified visible focus and unoccluded controls, opened the dialog with Enter, checked focus containment and Escape return, and reached Apply by keyboard without submitting. Scoped axe checks on each review reported no violations under the selected WCAG2A/AA and WCAG2.1AA tags.

French 400% history used 52 Tabs to reach “Charger les modifications précédentes”. Enter loaded the next 25 records, increasing the view from 25 to 50. Focus moved to the first loaded record; Tab reached its fully visible “Rouvrir dans un nouveau brouillon” control. No reopen was submitted. The separate history browser proof covers real-password reopening of an older active record.

French review text reflowed in the scrollable dialog. High zoom requires vertical scrolling; the reviewed controls remained reachable. Reserved page space permits later content to scroll above the fixed Review control. This does not claim every line fits within one viewport.

The receipt lists 18 final screenshots with hashes. Eleven representative builder, review and history captures were visually inspected; final-binding.json identifies them.

## Preserved earlier attempts

| Record | Interpretation |
| --- | --- |
| attempt-01-auth-timeout.json | Real sign-in timed out during cold local compilation before a zoom case. |
| attempt-02-driver-issues.json and its driver | Two 5-second hydration checks were premature; strict equality rejected the floating-point 400% value. |
| attempt-03-parent-interrupted.json and its driver | Parent requested a pause for history changes. No completed case is claimed. fromSurface:false produced stale pixels, marked unusable as application evidence. |
| capture-probe-receipt.json | An explicitly synthetic static page, fulfilled entirely by the driver, verified screenshot capture. It is not application evidence. |
| receipt.json | Final serialized, source-frozen four-case application run. |

Ordinary Playwright screenshots initially cropped native zoom; raw fromSurface:false then returned stale pixels. Final fromSurface:true without a clip corrected capture only. No application images or appearance were edited.

## Limits

This proves the recorded isolated Chromium module journey. It is not live-customer approval, accessibility certification, an actual screen-reader session, evidence for every browser or complete localization of legacy domain screens.

Rerun the helper only with the isolated server and synthetic account available. It uses real sign-in and removes its owned profile. Read the source and executable hashes in the receipt before comparing results.
