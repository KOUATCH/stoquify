# AqStoqFlow Public Color Token Inventory

Date: 2026-07-18

## Decision

The canonical authenticated dashboard contract in `app/globals.css` remains the source of truth. Landing and auth keep their appropriate density and surface treatment, but consume the same product brand and semantic status meanings through `--product-*` aliases.

## Semantic Contract

| Meaning | Shared token | Canonical value | Dashboard alias | Landing alias | Auth alias |
| --- | --- | --- | --- | --- | --- |
| Brand / focus | `--product-brand` | `#2f7df6` | `--dash-brand` | `--color-brand` | `--auth-brand` |
| Accessible primary action | `--product-brand-action` | `#2563eb` | Dashboard button helpers | `--color-brand-action` | Auth `--primary` / `--auth-brand-action` |
| Primary action hover | `--product-brand-action-hover` | `#1d4ed8` | Dashboard button helpers | `--color-brand-hover` | Button hover state |
| Operational freshness | `--product-spruce` | `#2dd4bf` | `--dash-spruce` | `--color-spruce` | `--auth-spruce` |
| Trust / evidence | `--product-gold` | `#d7a84f` | `--dash-gold` | `--color-editorial` | `--auth-gold` |
| Warm secondary emphasis | `--product-warm` | `#c97855` | `--dash-warm` | `--color-warm` | `--auth-warm` |
| Success / healthy | `--product-success` | `#2ec98a` | `--dash-success` | `--color-success` | `--auth-success` |
| Warning / at risk | `--product-warning` | `#f0ae3a` | `--dash-warning` | `--color-warning` | `--auth-warning` |
| Danger / blocking | `--product-danger` | `#ef6a6a` | `--dash-danger` | `--color-danger` | `--auth-danger` |
| Information | `--product-info` | `#49c6e5` | `--dash-info` | `--color-info` | `--auth-info` |

## Surface Contract

| Surface | Shared token | Value |
| --- | --- | --- |
| Canvas | `--product-canvas` | `#152027` |
| Chrome | `--product-chrome` | `#19272f` |
| Panel | `--product-surface` | `#1d2d35` |
| Raised panel | `--product-surface-raised` | `#253943` |
| Muted border | `--product-border-subtle` | `#344a54` |
| Strong border | `--product-border` | `#54707a` |
| Primary text on dark | `--product-text` | `#f7faf8` |
| Secondary text on dark | `--product-text-muted` | `#d3ddd8` |
| Supporting text | `--product-text-soft` | `#a9b8b2` |

## Auth Contrast Derivatives

Auth retains a softer light/dark shell. Derived ink tokens preserve the same semantic hue while improving contrast on light surfaces:

- Brand ink: `#2f7df6` light, `#8fb7ff` dark.
- Spruce ink: `#178e83` light, `#7de8dc` dark.
- Gold ink: `#8b6a20` light, `#f0c76a` dark.

## Governance

- New landing, auth, or dashboard states should consume semantic aliases rather than introduce raw module-local meanings.
- Teal remains operational freshness; it is no longer the landing brand.
- Gold remains trust/evidence, not the default public CTA.
- Public primary actions use the darker action-blue token so white text reaches at least 4.5:1 contrast.
- Public composition may remain more expressive than authenticated work surfaces, but color meaning must stay shared.
