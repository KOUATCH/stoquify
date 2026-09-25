# Stoquify — proposed visual identity

14 September 2026 · Version 1 · Recommendation for review

**Recommendation: A — Steady flow.** A geometric S, a substantial Manrope wordmark, deep teal, forest ink, warm paper, soft mint, and a restrained citron accent. This identity suggests coordinated everyday business without restricting the name to inventory.

Open `index.html` for the visual guide. It includes three directions, a working concept selector, a light/dark preview, an English/French preview, and application examples. All product data in the examples is fictional. The language toggle changes the website preview, not the whole brand guide.

## 1. What informed the proposal

Read-only inspection of `E:\ohada saas\Focused projects\stoquify` found:

| Evidence | Observed state | Design implication |
|---|---|---|
| `public/brand/stoquify-mark.svg`, `stoquify-wordmark.svg` | q mark, a diagonal teal cut, a small dot, font-dependent SVG text | Reduce small details; supply outlined wordmarks that render consistently |
| `components/global/kit-logo.tsx` | Dark logo uses a gold tile; light logo uses ink; teal accents; lowercase wordmark | Establish consistent theme variants instead of changing the mark's character |
| `app/globals.css` | Gold base primary, blue product action, teal, gold, and copper accents | Define one proposed primary action color and explicit semantic roles |
| `app/[locale]/(home)/landing.css` | Marketing aliases reference the shared product colors | Map approved tokens into existing contracts during a later rollout |
| `app/[locale]/(home)/landing-fonts.ts` | Instrument Serif, IBM Plex Sans and JetBrains Mono are described; export is an empty hook with fallbacks | Propose and bundle actual local fonts for predictable rendering |
| `app/layout.tsx` | Metadata describes an OHADA-aware POS, inventory, finance, payroll, accounting and evidence platform | Use a broader identity than a stock box or shopping cart |
| `components/landing/landing-header.tsx` | EN/FR navigation and a shared logo component | Verify expanded French labels and accessible logo naming |
| `what-next/ui-ux/screenshots/2026-07-19/landing-navigation-en-desktop.png` | Historical screenshot: dense dark interface, gold q tile, serif display type, blue CTA | Preserve credibility while simplifying the visual hierarchy |
| `what-next/ui-ux/stoquify-landing-release-gate-2026-07-19.md` | Historical passing checks and unresolved statutory evidence gates | Do not turn historical reports into current release or compliance claims |
| `innovation/FINANCE_COMMAND_SURFACES_SMOKE_RERUN_NOTE_2026-06-26.md` | Historical focused finance route smoke evidence | Finance is represented in existing project work; deployment readiness was not assessed |

Repository metadata and files establish intended positioning, not universal availability of every module. No live production service was inspected. The screenshot is dated July and is not represented as today's running application. No repository files were changed.

## 2. Positioning and voice

**Promise:** a clearer way to coordinate daily business. Tone: capable, welcoming, direct. Use specific actions such as “Review payments” and “Check stock.” Avoid unsupported claims such as “fully compliant,” “guaranteed accuracy,” or “everything automated.”

Suggested brand line: **Your business, working together.**

French adaptation: **Votre entreprise, en harmonie.** This is a creative adaptation rather than a literal translation. Test both lines with target customers before public adoption.

The identity is broad enough for sales, stock, finance and people. Availability claims still follow actual packaging, entitlements and country support.

## 3. Three directions

| Direction | Idea | Strength | Tradeoff |
|---|---|---|---|
| A · Steady flow | A continuous geometric S with angled terminals | Direct initial cue, simple monochrome silhouette, teal continuity | S motifs are common; distinctiveness requires further review |
| B · Common ground | Two intersecting rounded loops | Immediately suggests coordination | Less linked to the name; overlaps become dense at small sizes |
| C · Open horizon | Open frame plus smaller step | Strong geometry and warm architectural character | Could suggest property or construction before business software |

All use the same type families so the comparison emphasizes the symbols and palettes. Assessments are design judgments, not recognition-test results. No logo similarity or trademark clearance has been performed for this kit.

## 4. Logo construction and use

Use `logos/stoquify-horizontal-color.svg` as the primary signature. The symbol is authored vector geometry. Wordmark letters are Manrope 750 converted to outlines with modest spacing adjustments. The logo lettering is editable as paths, not as live text. Licensed original variable fonts are supplied separately.

Available lockups: horizontal, stacked, standalone symbol, and wordmark only. Each has full-color, black, white, and reversed variants. Reversed means a mint mark with white lettering for dark surfaces. Keep these colors together; do not recolor letters by module.

**Clear space:** ¼ of the visible symbol height on all four sides. This is external clear space around the supplied artwork, not a guarantee that its SVG viewBox includes sufficient padding. For the wordmark alone, use ½ the capital S height.

**Minimums:** symbol 16 px; horizontal lockup 140 px wide; stacked lockup 120 px; wordmark alone 110 px. Use a 32 px or larger symbol where space permits. At 16 px the favicon tile is preferable to bare geometry. Minimums for print: symbol 6 mm, horizontal 35 mm, stacked 30 mm, wordmark 28 mm; these are starting points for printer proofs.

Do not stretch, rotate, add shadows or gradients, outline, crop, alter the angled terminals, add a compliance badge, or place a low-contrast version on a busy photograph. Use a solid backing panel if needed. Never use a favicon tile as an approval or success indicator.

For web use, give an informative logo `alt="Stoquify"`. If the logo sits next to the same visible brand name, avoid duplicate announcements. Decorative patterns have empty alternative text. All SVGs have a title; when used inline in a page, provide a unique accessible name if needed.

## 5. Brand palette

| Color | HEX | Role |
|---|---|---|
| Deep teal | `#087F72` | Primary signature; light-theme actions |
| Forest ink | `#142B2B` | Main text; printed and marketing dark panels |
| Soft mint | `#A5E6D5` | Secondary; reversed symbol; dark-theme actions |
| Citron | `#D6F36A` | Small highlights; social avatar; never a status label |
| Warm paper | `#F5F7F2` | Light canvas |
| White | `#FFFFFF` | Cards; light action labels |

Start with roughly 70% neutral space, 20% ink/teal and 10% supporting color in marketing compositions. This is a composition guide, not a rule for data charts. Keep citron below about 5% of dense product screens. The dashboard example uses mint instead of citron for a quieter final chart bar.

### Semantic themes

| Role | Light | Dark |
|---|---|---|
| Canvas | `#F5F7F2` | `#102322` |
| Surface | `#FFFFFF` | `#193431` |
| Raised surface | `#FFFFFF` | `#23413C` |
| Text | `#142B2B` | `#F5F7F2` |
| Secondary text | `#526762` | `#B7CDC3` |
| Decorative border | `#C9D4CE` | `#36524C` |
| Input/control border | `#70867E` | `#7A998C` |
| Action | `#087F72` | `#A5E6D5` |
| Action hover | `#06675D` | `#BCEEE1` |
| Action text | `#FFFFFF` | `#102322` |
| Focus ring | `#087F72` | `#D6F36A` |
| Success text / background | `#1E6F42` / `#E5F4E9` | `#8DDDAB` / `#193D2C` |
| Warning text / background | `#805000` / `#FFF1D6` | `#FFD089` / `#44351C` |
| Error text / background | `#B42336` / `#FDE9ED` | `#FFADB8` / `#48282F` |
| Information text / background | `#245AA8` / `#E8F0FC` | `#ADCDFF` / `#233853` |

Never use brand teal alone to indicate successful processing. Pair all status colors with an icon and explicit label. Decorative borders are intentionally subtle; use the stronger token wherever the boundary identifies a control. Focus rings use a 3 px offset so their contrast is assessed against the surrounding surface.

`brand-tokens.css` scopes the proposal to `.stoquify-brand[data-theme="light"|"dark"]`. It is a handoff file, not an installed theme. The interactive hero is an art-direction preview; the dark variant retains white cards and primary-colored buttons intentionally. It is not a complete implementation of the proposed dark token system.

See `verification/contrast.md` and `.json` for exact measured ratios. The intended text pairs target 4.5:1 and selected UI boundaries target 3:1. White on citron and mint text on white fail normal-text contrast and are expressly prohibited. These measurements do not certify the whole interface. Source: [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

## 6. Typography

**Manrope:** wordmark 750; headings 600–750. **Inter:** product UI and body 400–600. Both downloaded from the Google Fonts repository on 14 September 2026 and included unmodified with their SIL Open Font License 1.1 files. License sources: [Manrope](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt), [Inter](https://github.com/google/fonts/blob/main/ofl/inter/OFL.txt).

Fallbacks: `Manrope, Arial, sans-serif` and `Inter, "Segoe UI", Arial, sans-serif`. Self-host the bundled fonts for predictable offline behavior. The font cmap verification covers the supplied EN/FR specimen including é, è, ê, à, ç, œ and euro signs. It does not establish support for every language used across OHADA countries.

| Use | Size / line-height | Weight |
|---|---|---|
| Marketing display | 56 / 62 px; mobile 40 / 46 | 650–750 |
| Section heading | 40 / 46 px; mobile 32 / 38 | 650 |
| Product page title | 28 / 34 px | 650 |
| Card title | 20 / 26 px | 600 |
| Body | 16 / 26 px | 400 |
| UI labels | 14 / 20 px | 450–600 |
| Supporting captions | 12 / 18 px | 400–500 |

The presentation board uses larger editorial headings and scaled mockup text. Do not copy miniature mockup font sizes into production. Use tabular lining numerals for monetary columns; right-align amounts and keep currency explicit. Prefer locale-aware number formatting, with enough width for French expansion. Do not globally letter-space body copy or currency values.

## 7. Icons and supporting graphics

Six original SVG icons are included: overview, sales, inventory, finance, payments, and people. Use a 24 × 24 grid, 1.75 px stroke, round joins/caps and simple interior shapes. Use outline icons by default; reserve filled backgrounds for selected navigation containers. Aim for 20–24 px visible icons inside controls with adequate targets. Use labels for unfamiliar symbols and all status meanings.

Rounded bands may echo the S in marketing backgrounds. The included `pattern.svg` is decorative. Use at low emphasis away from copy; do not use it behind dense financial data. Use real organization or product photography where useful, without implying the generated office is an existing location. Illustrations should have clear, flat forms and restrained palette accents.

Cards use approximately 16 px corner radii; controls 8 px. Use a 4 px spacing unit. Keep logos unaltered even when surrounding cards have shadows.

## 8. Applications and production limits

- Website: proposed hero and header with EN/FR previews. CTA labels are concepts, not functional application links.
- Dashboard: a representative visual treatment with fictional amounts and explicitly labeled statuses. Existing service contracts, permissions, entitlements and workflows are not changed.
- Invoice header: deliberately marked “Document preview” and “Not a fiscal invoice.” This is a brand layout example, not a compliant fiscal template.
- Business cards: editable SVG artwork at a 90 × 50 mm trim ratio, plus PNGs. Alex Martin and the `.example` email are fictional. Files are RGB review masters without bleed; supply real details, printer bleed and printer-specific color conversion before printing.
- Office sign: proportional 1600 × 600 SVG artwork. A fabricator must set physical size, finish, mounting and minimum feature thickness. The generated material mockup may differ slightly from the geometry; SVG masters are authoritative.
- Social: 1584 × 396 banner and square avatar, with high-resolution originals. Preview the target platform's crop before posting; platform overlays and cropping change.
- App: 512 px SVG/PNG tile plus favicon PNGs at 16, 24, 32 and 48 px, and an ICO. App icon artwork is a brand candidate, not an app-store submission package. Use the transparent standalone symbol when a platform applies its own mask.

The office material image was created with the built-in image-generation tool using the vector-logo raster as a reference. See `image-generation-prompt.txt` for the exact prompt. No image-generation CLI was used. Fonts and wordmarks remain actual editable vector assets; the photograph is a raster visualization.

## 9. Verification and review roles

Executed checks are saved under `verification/`: color contrast, font glyph coverage, SVG structure, raster metadata and margins, browser interactions, and desktop/mobile rendering. A contact sheet provides a visual inventory. Inspection at 16/24/32/48 px is a designer legibility check, not a consumer recognition study.

Reviewer lenses applied:

| Lens | Disposition |
|---|---|
| Brand strategy / product / growth | Compared three directions, proposed broad positioning, avoided unsupported feature promises |
| Frontend / design systems | Delivered local fonts, SVG masters, scoped proposed tokens, theme and language previews |
| Workflow / accessibility / localization | Measured color pairs, supplied status labels, checked EN/FR glyphs and responsive preview |
| Quality / release assurance | Verified only the delivered artifact slice; no application release claim |
| Enterprise/platform architecture | Adoption should preserve existing module boundaries; no architecture changes in this task |
| Backend / integrations | Not applicable to execution: no APIs, services, events or providers changed |
| Database / migrations | Not applicable: no schema, records or migrations changed |
| Security / IAM / privacy | Fictional data only in public examples; no authentication or access boundary changed |
| SRE / DevSecOps / performance | Local self-contained preview; no deployment, infrastructure or production monitoring changes |
| SaaS packaging / billing / customer operations | Copy is proposed; module availability must follow actual entitlements during adoption |
| Finance / statutory / country packs | Fiscal template compliance not applicable to this brand-only document preview; no certification or legal rules added |
| AI / evidence governance | Generated mockup labeled; original vector masters remain the production reference |

`package.json` was inspected. The general `build` script includes migration behavior. No repository build, migration, lint cleanup or broad test suite was needed for these standalone files, and none was run.

## 10. Adoption sequence

1. Review A against B and C. Test the mark's recognition, unaided name recall and spelling with a small EN/FR customer sample; do not assume this design judgment is validated demand.
2. Perform appropriate name/logo similarity and trademark review for target markets before investing in signage or registration. This kit has no clearance opinion.
3. Freeze the approved logo and token names. Map them to existing product, public, auth and dashboard color contracts. Keep business logic and module states unchanged.
4. Replace logo references through the existing shared component; keep accessible names and avoid duplicated descriptors. Ship fonts locally with licenses.
5. Verify representative public, auth, dashboard, document and mobile screens in EN/FR and both themes. Check controls, focus, errors, permission states and legibility in context.
6. Publish approved digital assets, then printer-proof cards and signage. Keep a rollback copy of previous assets and a dated asset manifest.

This is a complete proposal kit, not a production rollout. Outstanding decisions: brand selection, customer feedback, legal similarity review, printer specifications and live-product integration.
