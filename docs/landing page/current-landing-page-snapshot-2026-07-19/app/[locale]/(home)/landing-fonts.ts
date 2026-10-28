/**
 * Marketing-page typographic system.
 *
 * Three voices, each doing one job:
 *   - Instrument Serif → display headlines. Editorial confidence; reads like
 *     it earned its place. Pairs the serif gravitas of a finance terminal
 *     headline with optical sharpness at large sizes.
 *   - IBM Plex Sans → body copy + UI labels. Distinctive over neutral
 *     fallbacks (Inter/Roboto/system); technical precision without losing
 *     warmth.
 *   - JetBrains Mono → numbers, ticker output, dashboard data, code blocks.
 *     The "this is live data" voice.
 *
 * The production build must work without network access. Keep the exported
 * class hook in place for the layout, and let landing.css use its system
 * fallbacks for these CSS variables unless local fonts are added later.
 */

export const landingFontVars = ""
