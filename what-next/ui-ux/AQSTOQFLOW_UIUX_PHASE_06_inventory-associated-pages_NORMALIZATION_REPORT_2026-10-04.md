# Associated inventory item pages

Date: 2026-10-04

## Scope and changes

Reviewed item creation, the legacy `/new` alias, editing, reference dropdowns, image upload, and the remaining `/[id]/others` subpage. Creation and editing already used most dashboard tokens; this pass closes their remaining visual gaps.

- Standardized create/edit primary and secondary buttons on shared dashboard classes.
- Applied the shared floating surface to item reference and opening-location dropdowns.
- Aligned image upload cards, file controls, previews, retry/cancel actions, progress, ready states, and errors with dashboard colors.
- Applied danger color to creation validation messages.
- Removed redundant outer padding from the edit route; improved wrapping of item names and SKUs; replaced the dollar-specific pricing icon with a neutral currency icon.
- Replaced the edit route's red missing-item panel with the shared not-found state and recovery link.
- Replaced the unfinished `/others` placeholder with an honest, localized empty state and a link to the item overview. No additional-details feature or supplier data was invented.
- Kept `/new` as its existing redirect to `/create`.

Service calls, permissions, form validation rules, upload behavior, and save workflows were preserved. No shared global stylesheet was changed.

## Verification

- Six focused suites covering editing, creation, media, and route behavior: 26 tests passed.
- Targeted ESLint: passed.
- Full `npm run typecheck -- --incremental false`: passed.
- Authenticated desktop edit route and expanded category dropdown visually verified on the running application.
- Mobile screenshot capture timed out; its temporary viewport override was reset. Subsequent create-page navigation also timed out, so no claim of visual verification is made for creation or mobile.

Existing untranslated form copy remains outside this presentation pass. Other inventory modules such as stock movements and transfers were not redesigned.
