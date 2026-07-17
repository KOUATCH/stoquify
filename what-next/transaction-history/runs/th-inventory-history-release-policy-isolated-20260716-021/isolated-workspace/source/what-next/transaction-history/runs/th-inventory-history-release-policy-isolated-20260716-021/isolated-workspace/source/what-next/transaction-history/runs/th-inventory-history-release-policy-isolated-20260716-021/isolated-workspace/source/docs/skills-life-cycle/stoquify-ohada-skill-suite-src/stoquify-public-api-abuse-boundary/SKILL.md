---
name: stoquify-public-api-abuse-boundary
description: Audit, implement, and verify Stoquify public, customer-facing, and API-facing boundaries. Use for public receipts, raw-ID access, redaction, token gates, public exports, unsafe errors, rate limits, secrets, replay, scraping, and abuse-resistance checks.
---

# Stoquify Public API Abuse Boundary

## Purpose

Protect every public, customer-facing, and API-facing surface from raw-ID access, data leakage, replay, scraping, unsafe errors, missing redaction, and secret exposure.

## Required First Reads

1. `services/pos/receipt.service.ts`
2. `scripts/public-receipt-token-config-gate.js`
3. `scripts/api-route-guard-inventory.js`
4. `app/api/`
5. `lib/security/`

Read `references/evidence-map.md` for public/API surfaces. Read `references/verification.md` before checks.

## Workflow

1. Classify the surface: public route, customer link, API route, export, upload, webhook-like endpoint, or receipt/document access.
2. Identify authentication, authorization, token, redaction, rate-limit, and safe-error expectations.
3. Verify public access cannot use raw IDs without a signed or otherwise controlled boundary.
4. Verify service-layer checks repeat route-layer checks for defense in depth.
5. Add tests or gate updates for the exact abuse class.
6. Save a report when a public boundary is audited or changed.

## Guardrails

- Do not expose customer contact fields on public payloads unless explicitly internal and authorized.
- Do not log secrets, tokens, provider credentials, or raw sensitive payloads.
- Do not rely only on route-level checks when service-level verification is feasible.
- Do not degrade receipt token expiry, signature verification, or timing-safe comparison.

## Output Contract

Report surface type, boundary controls, redaction result, changed files, verification commands, residual abuse risk, and next public/API surface.
