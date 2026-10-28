# Product Command screenshot verification

Date: 2026-07-19

## Implemented

- Replaced the generic Product Command dashboard artwork with the real read-only Branch daily close capture from `2026-07-18`.
- Preserved the screenshot as unobstructed evidence in a semantic `figure`; the localized evidence label and caption sit below the image.
- Added responsive presentation: a readable left-anchored crop on mobile and the complete screenshot on desktop.
- Added a focused provenance/content gate and a reusable Playwright browser smoke.

## Provenance

- Source: `what-next/referrals/screenshots/daily-truth-review-command-ui-2026-07-18/read-only-desktop.png`
- Public asset: `public/images/product-command-branch-close-2026-07-18.png`
- Dimensions: 1440 x 1000
- Size: 722,982 bytes
- SHA-256 (source and public asset): `93298AD76D21F30DF225DDFED9D10250F2E28BED06741EEA8E3C5537CE851F8A`
- The focused Jest gate compares both files byte-for-byte.

## Verified

- `npm run ui:gate:product-command-screenshot`: passed (1 focused test).
- Focused ESLint check: passed.
- `npm run typecheck`: passed.
- Playwright smoke against `http://localhost:3001`: passed 4/4 combinations.
- English and French localized captions and alt text rendered.
- Mobile 390 x 844 used `object-fit: cover` at 6:5 with no horizontal overflow.
- Desktop 1440 x 1000 used `object-fit: contain` at 36:25 with no horizontal overflow.
- The selected image completed loading through Next Image in every run.
- No browser page errors or failed requests were recorded.

Browser evidence: `what-next/ui-ux/product-command-screenshot-browser-evidence-2026-07-19.json`

Screenshots:

- `what-next/ui-ux/screenshots/2026-07-19/product-command-en-mobile.png`
- `what-next/ui-ux/screenshots/2026-07-19/product-command-en-desktop.png`
- `what-next/ui-ux/screenshots/2026-07-19/product-command-fr-mobile.png`
- `what-next/ui-ux/screenshots/2026-07-19/product-command-fr-desktop.png`

## Residual launch risk

- The source is an E2E evidence capture and visibly contains `Referral Review U1 E2E`; the landing caption therefore identifies it only as a captured read-only state. Replace it with an equivalently complete curated demo-tenant capture before a high-visibility public campaign if test-labelled data is undesirable.
- The browser proof covers local Next.js rendering and optimization. Production CDN/image policy behavior remains a deployment smoke item.
- The PNG is 722,982 bytes. Next Image serves a responsive optimized derivative in the verified browser flow, but the original public asset remains that size.