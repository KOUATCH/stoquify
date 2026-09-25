# Stoquify brand adoption plan

## Recommendation and first useful slice

**Start with asset compatibility, the shared logo component and favicon.** Keep the existing routes, component props and layout widths. Add local font/token foundations behind an opt-in brand scope, then activate one public page as the first visible pilot. Defer the global Button switch until its caller impact is reviewed.

Use the original solid S. Rejected unusual-S files are not implementation inputs. This run writes documentation and standalone previews only; no application changes or deployment occurred.

## Why this sequence

One shared logo reaches public, auth and desktop/mobile shell consumers. The theme is more complex: gold HSL base tokens, blue product actions, hard-coded Button colors, later dashboard overrides, and forced dark views coexist. Finance also uses gold for warning. A global recolor would be both incomplete and semantically risky. See `token-mapping.md` for the exact bridge.

Current working tree is already dirty (418 tracked entries, 688 untracked entries). Capture an implementation-specific patch or use a user-authorized isolated checkout when implementing. Do not reset, stash or revert unrelated work.

## Phase 1 — Foundations and recognizable identity

**Owner: frontend/design-system implementer.** Files: `public/brand/stoquify-mark.svg`, `public/brand/stoquify-wordmark.svg`, `components/global/kit-logo.tsx`, `components/global/Logo.tsx`, `app/layout.tsx`; proposed additions `public/brand/stoquify/`, `public/fonts/stoquify/`, `app/brand-fonts.ts`, `app/brand-tokens.css`.

- Copy only the selected masters, fonts and licenses from docs/branding; do not copy rejected exploration or photography into application chrome.
- Preserve existing asset URLs or migrate every reference together. Keep a versioned previous asset for cache/rollback management. Use hashed/versioned asset references or existing cache policy; do not invent a service worker.
- Preserve component signatures. Fix width/height handling to honor the real logo aspect ratio. Keep localized tagline separate and optional; avoid repeating the tagline where it truncates.
- Add light/dark font and token definitions without globally activating them. Scope adoption to a controlled root, including portal hosts.
- First visible change: solid S in the current header/sidebar space and browser tab; fonts/color activation limited to the chosen pilot.

**Checks:** all shared consumers render; 16/24/32/48 px symbols; 140 px horizontal lockup; EN/FR labels; old URLs; local font requests. **Rollback:** revert this phase's asset/component patch only; keep unrelated current source untouched.

## Phase 2 — Landing and authentication

**Owner: public/auth frontend implementer with content review.** Files: `app/[locale]/(home)/layout.tsx`, `landing.css`, `landing-fonts.ts`; `components/landing/landing-header.tsx`, `landing-footer.tsx`, `hero.tsx`, `hero-dashboard.tsx`, `landing-section-navigation.tsx`; `components/auth/AuthLayout.tsx`, `components/auth/v2/AuthV2Shell.tsx`; scoped auth styles in `app/globals.css`. `messages/en.json` and `messages/fr.json` only for explicitly selected content edits.

**Depends on:** Phase 1 asset/font contracts.

Landing visual treatment:
- Header: use solid S lockup; preserve Product, Workflow, Platform, More, Scenarios/Adoption, Atlas, locale switch and session-dependent controls.
- Hero: preserve the existing 0.82:1.18 two-column composition, badge, current headline, three POS/Stock/OHADA cards, two CTAs and proof boundaries. Use Manrope and a teal/ink hierarchy; remove incidental glow/grain only after comparing legibility. The preview uses existing EN/FR message strings, not new claims.
- Primary CTA keeps `/#pricing`; secondary keeps `/#product`. Keep actual session and locale behavior. Dark mint buttons get ink labels in the same change.
- Product illustration: restyle the existing HeroDashboard frame, four status cards, coverage and next-action regions. Keep source sample labels; do not import invented metrics from the earlier brand kit.
- Body: retain current section order: LandingHero, DisconnectProblem, ProductGallery, ConnectedWorkflow, OperationsMap, PeopleToPay, ModuleDeepDives, AutomationSection, TrustSection, UseCases, PricingSection, FinalCTA. Use spacing/type/color to distinguish sections without inventing capabilities.
- Trust: retain provenance, support limitations and rollout caveats. New logo appearance is not evidence of regulatory certification. Footer keeps existing destinations and legal content pending separate review.

Authentication: keep login/register/recovery controls and error messages; restyle the shell, inputs and focus states. Distinguish root `(auth)/layout.tsx` from the reusable `components/auth/AuthLayout.tsx`. No changes to credentials, sessions, invites or consent.

**Content changes:** optional shorter headline/tagline is a separate proposal; not required for branding. Existing fiscal/support claims need current product-owner evidence before any new public claim. **Checks:** EN/FR navigation and conversion anchors, session variants, recovery/denied states, desktop/mobile and both auth themes. **Rollback:** remove pilot scope or revert only this phase's presentation patch.

## Phase 3 — Shell and reusable controls

**Owner: application frontend implementer; security reviewer checks behavior preservation.** Files: `components/dashboard/Sidebar.tsx`, `Navbar.tsx`, `components/ui/button.tsx`, `input.tsx`, `tabs.tsx`, relevant shell/dashboard selectors in `app/globals.css`. Data/permission code remains owned by existing services and is not edited for branding.

**Depends on:** approved theme pairs and public pilot evidence. Audit Button consumers before changing its global default; use a staged semantic variant if necessary.

- Preserve five navigation lanes, 220/280 px sidebar widths, most-specific active item, `aria-current`, search, collapse/reopen, module filtering, mobile sheet closure and Escape focus restoration.
- Preserve `getModuleNavigationSnapshot`, session enrichment and route RBAC in dashboard layout. Preserve `useShellPermissions` and `moduleVisibleInNavigation`.
- Keep organization/role identity visible; the Stoquify logo must not replace tenant identity.
- Migrate hard-coded action/focus/icon styles by meaning; keep danger/warning distinct. Test Radix portal context inheritance.
- Restyle existing command header, overview/inventory/operations tabs and metrics in EnhancedEnterpriseDashboard. Keep operating-truth generation, amounts, filters, missing-data states and refresh behavior.

**Checks:** focused Sidebar/localization/layout tests; public/logout actions; forbidden versus empty states; dark-first shell, then verified light support. **Rollback:** scoped style/asset patch; no permission catalog or navigation reversion.

## Phase 4 — Modules, portals and documents

**Owner: each module frontend maintainer; shared token owner coordinates.** Exact entry points are enumerated in `surface-inventory.md`.

- Inventory/sales/purchasing: shared tables and controls first; module-owned styling second. Preserve unit/currency handling and approval visibility.
- Finance/accounting/analytics: inspect `finance-dashboard-theme.ts` and `analytics-dashboard-theme.ts` before changes. Separate warning gold and categorical charts from marketing accents. Keep evidence badges, debit/credit and status labels.
- People/payroll: keep privacy and country-specific support descriptions; retain self-service limits.
- Customer/supplier/accountant portals: use modest product attribution and preserve issuer/tenant identity, tokens and permitted actions.
- POS: compact mark, touch targets and offline indicators. No sync, receipt-token or transaction changes.
- Email: correctly proportioned raster logo at an absolute approved HTTPS origin, system-font fallback, image-blocked view. Trace real template invocation before rollout. Existing trademark/footer claims require ownership verification; do not inherit them into new branding copy by assumption.
- Reports/print: update rendering only after confirming format. Retain legal identifiers, financial rows and pagination. Do not change CSV/JSON payloads to add a logo.

**Checks:** representative module states, 58/80 mm receipt if that renderer exists, A4 report/PO print, email image-blocked and dark-client rendering; all against actual outputs. **Rollback:** per-module presentation patch and approved template version.

## Phase 5 — Consistency and handoff

**Owner: design-system maintainer and QA.** Search current code for old q artwork, old asset URLs, unintended blue/gold controls, font duplication and unsupported font loads. Classify each match; do not delete by string match. Regenerate the approved asset manifest after implementation, record preview evidence and unresolved exceptions, then follow the project's normal release process.

**Exit:** consistent identity at verified surfaces; all semantic exceptions intentional; critical flows unchanged. No unrelated lint cleanup, database migration, release certification or deployment is part of this planning run.

## Decisions that remain

1. Confirm adoption of the solid-S kit as the public identity; it is the current proposal, not a trademark-clearance result.
2. Decide whether to keep current headline/copy; this plan recommends keeping it during visual adoption.
3. Decide rollout scope for true light-mode support in currently forced-dark dashboards.
4. Validate email asset origin, merchant attribution and printer requirements when those phases are reached.

These decisions do not prevent the completed inventory, mapping and previews from being reviewed now.

## Reviewer disposition

Architecture/frontend: shared contracts and dependency order. Product/growth/content: preserve current conversion paths and distinguish appearance from new claims. UX/accessibility/localization: paired foreground/background, label/state preservation and EN/FR preview. IAM/privacy: preserve session, module and portal boundaries. Quality/SRE: source hashes, artifact checks, no build/deployment side effects. Finance/controls: no warning, sign, issuer or evidence semantics changed. Backend/database/integrations: no implementation changes applicable. Statutory/country-pack/billing rules: no changes or certification applicable. AI governance: no model behavior changed; existing generated brand photo is not used as a product screenshot.
