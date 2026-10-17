# Stoquify design retrieval guide

Owner: design-system/frontend lead. Reviewed: 2026-10-07. Revisit when tokens, shared components, route contracts, or installed framework majors change.

This file is a retrieval adapter for the existing product design. It introduces no palette, token pipeline, application styling, or claim of visual/accessibility verification.

## Read in this order

1. Follow repository `AGENTS.md` and the current task's scope.
2. Read the [UI constitution](../../docs/UI/UX/AQSTOQFLOW_UI_CONSTITUTION_2026-06-26.md) for theme boundaries, semantics, density and governance.
3. Read the [component registry](../../docs/UI/UX/AQSTOQFLOW_UI_COMPONENT_REGISTRY_2026-06-26.md) and inspect the [current primitives](../../components/dashboard/primitives/command-center-primitives.tsx). Some primitives labelled future in the dated registry now exist; prefer their actual exports and props.
4. Inspect [live semantic tokens](../../app/globals.css), [Tailwind configuration](../../tailwind.config.ts), and the component being changed. These contain the current implemented values, not a proposed replacement theme.
5. Read the applicable page contract below. Use the [UI registry](../../docs/product/user-experience/ui-registry.md) as dated reference evidence and verify its examples against current source.

| Surface | Contract | Permitted specialization |
|---|---|---|
| Public discovery and authentication | [public-auth](pages/public-auth.md) | Spacious public layout; calm light/dark auth shell |
| Inventory quantity, value and history | [inventory](pages/inventory.md) | Dense filters/table/workbench with scoped evidence |
| POS checkout and recovery | [pos](pages/pos.md) | Tactile controls and rapid operational flow |
| Sales reporting | [sales](pages/sales.md) | Daily evidence, performance comparisons, persisted filters and sales-record drill-through |
| AP payment review and execution | [ap-payment](pages/ap-payment.md) | Dense review, approval and payment evidence |
| Customer receivables | [receivables](pages/receivables.md) | Current invoice position, aging and Customer AR History |
| Supplier payables | [payables](pages/payables.md) | Operational invoice position, aging and existing AP workflows |

Page contracts refine layout, density and workflow. They cannot replace the product brand, weaken authorization/tenant/privacy controls, turn missing evidence into success, or change server-owned financial truth. If source and documentation conflict, record the specific conflict and resolve it through a dated design/domain decision; do not let the last file read silently win.

## Existing visual contract

- Keep the blue `--product-brand*` family and its `--dash-brand*` / `--auth-brand*` aliases. Keep gold/chestnut primitive button variants and gold/warm semantic accents; product blue is not permission to recolor all buttons. Reuse [Button variants](../../components/ui/button.tsx) and established dashboard actions.
- `--product-*` is the shared meaning layer; authenticated work uses `--dash-*`, auth uses `--auth-*`. Success, warning, danger and information retain their own meanings and visible text/icon cues.
- Authenticated routes use `.dashboard-landing-theme dark` and `.dashboard-landing-content`. Preserve intentional public/auth theme boundaries. `.bee-eater-dashboard-theme` is not a second default.
- [Brand token proposals](../../docs/branding/brand-tokens.css) remain proposals. Generic search palettes, marketing layouts and ECC-generated `DESIGN.md` files do not authorize replacing the current product contract.
- Reuse existing typography and spacing scales. Use compact panel headings, tabular numeric presentation where appropriate, clear source/freshness labels, `rounded-lg` dashboard surfaces and existing primitive variants. Do not add a font or animation library to meet this guide.
- Prefer `CommandBriefHeader`, `StatusStrip`, `KpiTile`, `ActionQueue`, `ProofBadge`, `EvidenceTimeline`, `FilterBar` and `DetailDrawer` from the current primitives when their contracts fit. Use `DashboardRouteState` / `DashboardErrorState` or existing wrappers for shared recovery states. Verify props rather than copying dated examples.

## Required behavior and evidence

Show loading, empty, partial, failed, permission-denied, module-locked and stale-session states where the journey can produce them. For a pending mutation or uncertain network result, display the actual server state and the authorized recovery action. An absent result is not zero and an acknowledgement is not proof of completed payment.

Preserve organization/location, period, currency/unit, locale, time/freshness and applied-filter context when showing operational figures or evidence. Use existing locale-aware navigation and EN/FR copy conventions. A view must not infer access from menu visibility.

Verify labels, keyboard order, visible and unobscured focus, dialog focus return, non-color status cues, responsive reflow, long French text and reduced motion on changed surfaces. Tables may have an intentional labelled scroll region; essential actions and content must remain reachable. Record executed tests/screenshots separately from source review; neither this guide nor an axe result alone proves accessibility compliance.

## Using UI/UX Pro Max and ECC

Start with [the project UI/UX skill](../../.agents/skills/ui-ux-pro-max/SKILL.md). For an existing Stoquify page, use a focused domain/stack query only when it resolves a specific question. Read this adapter first; do not generate or force-persist a replacement master.

Installed baseline reviewed on 2026-10-07: Next.js 15.5.18, React 19.2.6, Tailwind 3.4.19. Recheck package/lock/installed versions for API-specific work. Dataset guidance may target a newer major; record source/category, applicability and any rejected result. UI/UX Pro Max's installed release version is not established by this guide. Do not infer it from catalog counts.

ECC supplies review workflows; project `design-system` supplies token-engineering guidance; `ui-styling` supplies existing-component implementation guidance; `brand`/`design` handle identity and asset work. These do not create competing sources of design truth. The legacy brand sync pipeline is not configured for current application tokens.

## Maintenance and review

The design-system/frontend lead owns this adapter and page contracts; the relevant domain owner reviews financial/privacy implications. Update links when files move, reconcile current primitives before copying registry examples, and record scoped exceptions in `docs/UI/UX/`. Review changed journeys against their page contract with EN/FR and keyboard evidence. Keep production token values in their existing implementation rather than copying a second value table here.
