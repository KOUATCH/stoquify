# Stoquify Connect logo — implemented refresh

20 October 2026. Source baseline: `6ee84a90c760d2864f6aef672d8b393ac2b65971`, with unrelated pre-existing working-tree changes preserved.

## Decision

Three directions were rendered: **Flow** (S monogram), **Control** (Q loop), and **Connect** (three coordinated units). The user selected **Connect**, then requested a more beautiful three-dimensional treatment that fits the system's color semantics.

The final artwork uses three interlocking units with open channels and planar blue faces. It suggests coordinated sales, stock, and finance. The dimensional treatment is vector geometry, with no raster dependency, external font request, animation, gradient, or filter. These are design judgments, not recognition-study findings.

This dated decision adopts only the new logo and its related icons. The September teal branding proposal remains a proposal; its palette and token-sync process have not been adopted. The existing licensed Manrope 750 outlines were reused, with an optically reduced S and adjusted spacing for the lowercase wordmark. Font license: `../fonts/Manrope-OFL.txt`.

## Files and integration

- `components/global/kit-logo.tsx`: existing API, theme selection, tagline, and compact mode retained. Uses outlined wordmark and a meaningful `role="img"` / `aria-label="Stoquify"`. Internal SVGs are decorative and unfocusable.
- `components/global/stoquify-logo-artwork.ts`: generated shared geometry, including the dimensional faces.
- `public/brand/stoquify-logo-{light,dark,black,white}.svg`: primary horizontal signatures.
- `public/brand/stoquify-symbol-{light,dark,black,white,flat}.svg`: standalone mark variants.
- Existing `public/brand/stoquify-wordmark.svg`: refreshed horizontal signature, also consumed by the existing email template.
- Existing `public/brand/stoquify-mark.svg` and `public/favicon.ico`: flat white mark on a blue tile. ICO contains 16, 24, 32 and 48 px PNG entries.
- `public/brand/stoquify-app-icon.{svg,png}` and `apple-touch-icon.png`: app and touch assets.
- `app/layout.tsx`: existing SVG icon metadata retained; ICO shortcut and Apple touch icon added.

Current source imports route the shared component to the cinematic public header/footer, auth layouts, dashboard Sidebar and Navbar, and existing secondary consumers. No navigation, permissions, business data, theme switching, application copy, or global color definitions changed. Source discovery also consulted historical graph node `global_kit_logo_tsx` (community 220); current source imports are the integration evidence.

## Color and sizing

| Face | Existing token | Value |
| --- | --- | --- |
| Main | `--product-brand` | `#2f7df6` |
| Highlight | `--product-brand-strong` | `#5796ff` |
| Depth | `--product-brand-action-hover` | `#1d4ed8` |

The shared component resolves these CSS variables at runtime. Static exports use their current values. Ink and white lettering preserve readable contrast on their respective backgrounds. Green, red, amber, and the approved gold/chestnut UI variants retain their existing operational meanings.

Use the dimensional mark at 32 px and larger. The component automatically uses the flat silhouette below 32 px in compact mode. Prefer the tile favicon at 16 and 24 px. Preserve the supplied aspect ratios and leave at least one quarter of the symbol height as external clear space. Use the white signature on solid blue or very dark backgrounds, and black for one-color printing. The wordmark scales as a complete vector rather than truncating individual letters.

Browser verification found the English login subtitle clipped to the narrower wordmark width. The shared text column now allows the subtitle's intrinsic width within its available space, while the outlined wordmark keeps its own aspect ratio. Long subtitles wrap with tighter tracking. At viewport widths of 360 CSS pixels or less, the secondary subtitle is hidden to preserve a clean symbol/wordmark alignment and space for adjacent controls.

## Review artifacts

Open `index.html` for theme variants, the three concepts, downloads, before/after comparison, and small-size examples. These are **asset previews**, not application screenshots.

- `concepts.png`: original three-concept board from the built-in image-generation tool.
- `dimensional-exploration.png`: generated refinement of the user's selected direction.
- `previews/identity-board.png`: final shipped vector artwork rendered on light/dark surfaces, in monochrome, and at actual favicon sizes.
- `previews/before-after.png`: preserved previous static asset compared with the final vector signature.
- `before-wordmark.svg`: previous static signature preserved for comparison.

## Verification

| Evidence class | Result |
| --- | --- |
| Workflow contract | `npm run agent:workflow:check` passed before implementation. |
| Source inspection | Checked current logo consumers, metadata, public/auth contract, UI constitution, registry, semantic tokens, and existing font-license provenance. |
| Focused TypeScript | Passed for the shared component, artwork, and their dependencies; no full-app typecheck claim. |
| Lint | `node node_modules/eslint/bin/eslint.js components/global/kit-logo.tsx components/global/stoquify-logo-artwork.ts app/layout.tsx` passed. Existing ESLint config inspected first. |
| Isolated React server rendering | 14 cases passed across both themes, compact 16/24/32/48 px inputs, English/French taglines and no tagline. No DB or application bootstrap involved. |
| Vector checks | Symbol and wordmark fit their viewBoxes; exported SVGs contain paths rather than live text, embedded bitmaps, or scripts; face values match current CSS tokens. Asset hashes and sizes recorded in `verification.json`. |
| Exported visual checks | Inspected final light/dark/mono identity board, small-size assets and before/after comparison. This is SVG rasterization evidence. |
| Local HTTP | Both running local servers (ports 3000 and 3101) returned the new favicon with HTTP 200. `/en` on port 3000 returned HTTP 200 and the new shared vector and accessible name. `/fr/login` timed out. See `http-verification.json`. |
| Actual browser rendering | Chrome 155 via Chrome DevTools Protocol: public and login routes in English/French at 1440, 390 and 320 CSS px (12 captures), no horizontal overflow or clipped visible logo captions. User-provided signed-in Edge `/en/dashboard/pos`: sidebar at 1440 and 821 CSS px, mobile drawer at 390 and 320 CSS px. Logo stayed within its link/container with no caption clipping. See `browser/after.json`, `browser/edge-dashboard.json`, screenshots and `browser/REVIEW.md`. |
| Database | No isolated database tests, migrations, fixtures, or business mutations. Browser navigation used the running application's normal authentication and data requests. |
| Diff hygiene | Scoped `git diff --check` passed. No commit, deployment, or unrelated cleanup performed. |

The project UI/UX skill's focused search returned `ux-guidelines.csv` accessibility advice about meaningful names for icon controls. Existing links remain responsible for keyboard behavior; the logo is a named image, not a new control. No framework-specific or palette recommendations were applied.

## Reproduction and rollback

The authoring scripts use installed `sharp` and `@napi-rs/canvas` (the latter is available in the Codex bundled Node packages); no package dependency was added. Set `NODE_PATH` to that package directory if needed, then run from the repository root:

```text
node docs/branding/refresh-2026-10-20/build-assets.cjs
node docs/branding/refresh-2026-10-20/render-review.cjs
node docs/branding/refresh-2026-10-20/verify-assets.cjs
```

`build-assets.cjs` writes only the owned geometry, logo assets, favicon and previews. `render-review.cjs` writes the two asset-review boards. `verify-assets.cjs` reads source/assets, performs isolated checks and writes `verification.json`. They load no application configuration, contact no service and run no schema command.

`node docs/branding/refresh-2026-10-20/inspect-browser.cjs after --public-only` launches installed Chrome, inspects the running local app through CDP, and writes screenshot/measurement evidence. Omitting `--public-only` attempts the documented local account and authenticated routes; that account did not complete sign-in during this review. The dashboard was therefore inspected through the user's existing Edge session, with temporary viewport overrides restored afterward.

Rollback consists of restoring only the owned component, static signatures, favicon and the two metadata additions to their prior state, and removing this refresh's added geometry/assets if no longer referenced. Preserve other working-tree edits.
