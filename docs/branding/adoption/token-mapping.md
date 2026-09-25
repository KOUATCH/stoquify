# Token and component mapping

## Recommendation

Add a proposed, scoped canonical brand layer, then adapt existing contracts. **Do not paste the kit CSS into production unchanged.** It uses `.stoquify-brand[data-theme]`, while production uses the `next-themes` `.dark` class. Tailwind utilities also expect HSL channel values, not HEX literals. `components/Providers.tsx:29`; `tailwind.config.ts:34`.

Use `:root` and `.dark` for theme ownership and an opt-in root such as `[data-brand="stoquify-v1"]` for the rollout. These are proposed selectors, not existing code. Dropdowns/dialogs rendered in portals need the brand context on a root that contains the portal host; a page-only wrapper will miss them.

|Meaning|Existing contracts / consumers|Proposed canonical token|Light|Dark|
|---|---|---|---|---|
|Canvas|`--background; --product-canvas; --color-canvas; --dash-canvas; --auth-canvas`|`--sq-background`|`#F5F7F2`|`#102322`|
|Panel|`--card; --product-surface; --color-surface-panel; --dash-surface; --auth-surface`|`--sq-surface`|`#FFFFFF`|`#193431`|
|Raised panel|`--product-surface-raised; --color-surface-panel-raised`|`--sq-surface-raised`|`#FFFFFF`|`#23413C`|
|Primary text|`--foreground; --product-text; --color-text-primary; --dash-text; --auth-text`|`--sq-text`|`#142B2B`|`#F5F7F2`|
|Secondary text|`--muted-foreground; --product-text-soft; --color-text-secondary; --dash-text-soft`|`--sq-text-muted`|`#526762`|`#B7CDC3`|
|Decorative divider|`--border; --product-border-subtle; --dash-border-subtle`|`--sq-border`|`#C9D4CE`|`#36524C`|
|Identifying control border|`--input; .auth-input; .dashboard-control borders`|`--sq-control-border`|`#70867E`|`#7A998C`|
|Primary action|`--primary; --product-brand-action; --color-brand-action; .dashboard-button-primary`|`--sq-action`|`#087F72`|`#A5E6D5`|
|Hover action|`--product-brand-action-hover; --color-brand-hover`|`--sq-action-hover`|`#06675D`|`#BCEEE1`|
|Action label|`--primary-foreground; hard-coded text-white consumers`|`--sq-on-action`|`#FFFFFF`|`#102322`|
|Focus|`--ring; focus classes; .dashboard-control`|`--sq-focus`|`#087F72`|`#D6F36A`|

The contracts above are migration targets; check each component's exact variable name before editing. Existing public aliases are in `app/[locale]/(home)/landing.css:30`; dashboard/auth aliases and later override blocks are in `app/globals.css:274`.

## Format bridge

Keep proposed canonical full-color values separate from HSL utility channels. For example:

```css
/* Proposed light context */
--sq-action: #087F72;
--sq-on-action: #FFFFFF;
--primary: 173.45 88.15% 26.47%;
--primary-foreground: 0 0% 100%;
/* Proposed dark context */
--sq-action: #A5E6D5;
--sq-on-action: #102322;
--primary: 164.31 56.52% 77.45%;
--primary-foreground: 176.84 37.25% 10.00%;
```

Never assign `--primary: #087F72` while consumers use `hsl(var(--primary))`. Generate matching values from one palette to avoid drift. Do not confuse the dark marketing **forest ink** panel (#142B2B) with the darker application canvas (#102322); both have explicit roles.

## Mandatory exceptions and paired changes

1. **Shared Button bypasses primary tokens.** Default is `bg-blue-600 text-white`, hover blue-700 and link blue-600. Migrate variant styling to semantic tokens in the button component; preserve `asChild`, disabled behavior, sizes and event handling. A new token alone will not change these buttons. `components/ui/button.tsx:13`.
2. **Mint buttons require ink text.** Current landing CTAs explicitly use `text-white`. Change their background and foreground together. Until a surface's consumers are migrated, retain deep-teal/white as the valid staged pair rather than switching only the background to mint. `components/landing/hero.tsx:45`.
3. **Finance gold means warning.** `severityTone.warning` maps to `gold`. Bind that use to warning text/background, not the citron brand accent. Separate editorial gold from warning semantics. Preserve critical/danger and signed-value semantics. `components/finance/finance-dashboard-theme.ts:19`.
4. **Charts are not a logo palette.** Preserve distinguishable category/series colors, labels and legends. Positive/negative/zero values keep semantic coloring. Do not replace every blue/green with teal.
5. **Hard-coded shell fills remain.** Navbar/Sidebar include white text, blue focus rings, cyan icons, opacity layers and dark fields. Replace by role, not HEX search-and-replace. Test opacity composites against the final background. `components/dashboard/Navbar.tsx:227`.
6. **Forced dark scopes.** Keep the current dark application treatment for the first branded shell preview. Remove forced `.dark` only after nested views, controls and overlays pass both themes. Do not promise universal light support from a global token switch.
7. **Borders have two jobs.** Keep decorative dividers subtle; use control-border on identifiable input boundaries. Disabled controls preserve state and label semantics. Focus rings must remain visible against their adjacent backgrounds.
8. **Scope icons.** Keep existing Lucide icons for product actions and accessible labels. The six kit icons are optional replacements only for matching navigation concepts; they are not a replacement library for all business actions.

## Typography and logo contracts

Create a shared local font setup (proposed `app/brand-fonts.ts`) and serve approved files under `public/fonts/stoquify/` with OFL notices. Bind body/UI to Inter and heading styles to Manrope. Preserve monospaced code/evidence fields. Tabular lining numerals apply to aligned monetary columns, with existing locale-aware number formatting.

The current landing-fonts hook exports an empty string; its comments are design intent, not loaded fonts. Replace the hook deliberately or bridge it to the shared font variables. Avoid registering the same font twice through both CSS and next/font. `app/[locale]/(home)/landing-fonts.ts:19`.

Preserve `StoquifyLogo` props (`theme`, `className`, `width`, `height`, `tagline`, `compact`) during initial adoption. Use 402:104 horizontal artwork at its intrinsic aspect ratio; honor max-width without clipping. Use the standalone S for tiny contexts, and separate localized descriptors from logo art. Navbar's Logo wrapper should still own its link; do not introduce nested links. Existing hard-coded home labels need localization in a focused follow-up.

## Semantic status palette

|State|Light text / background|Dark text / background|
|---|---|---|
|success|`#1E6F42` / `#E5F4E9`|`#8DDDAB` / `#193D2C`|
|warning|`#805000` / `#FFF1D6`|`#FFD089` / `#44351C`|
|error|`#B42336` / `#FDE9ED`|`#FFADB8` / `#48282F`|
|info|`#245AA8` / `#E8F0FC`|`#ADCDFF` / `#233853`|

Use icons and labels alongside color. Kit contrast results are a baseline only; remeasure actual component combinations, hover layers, charts, focus and popovers after implementation. Brand citron and mint remain decorative unless paired with tested text.
