Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

# Phase 02: Public Data, Tests, And Release Evidence

## Objective

Make the reshaped public Workflow Guide bilingual, accessible, visually reviewed, and resistant to content, destination, and navigation drift.

## Prerequisites

- Phase 01 implementation and usability gate are complete.
- The six-journey information architecture is frozen.

## Required Skills

- `aqstoqflow-prompt-architect`
- `aqstoqflow-uiux-00-orchestrator`
- `aqstoqflow-release-verification-foundation`

## Implement

1. Introduce stable journey and destination IDs.
2. Rename the current destination assertion as a route-existence contract.
3. Add a drift gate that checks each public destination against:
   - one sidebar entry;
   - declared permission metadata;
   - module slug and catalog membership;
   - a real page file.
4. Add tests for primary/supporting roles, progressive detail, EN/FR parity, and prohibited claims.
5. Update browser smoke for the new information architecture.
6. Test EN/FR at 390x844, 768 tablet, and 1440x1100.
7. Cover Chromium and representative Firefox/WebKit.
8. Add keyboard, focus, reflow, contrast, touch-target, axe, and manual assistive-technology checks.

## Verification

Run the smallest current command set, including:

```powershell
npm run ui:gate:workflow-atlas
npm run typecheck
npm run build:app
npm run ui:smoke:workflow-atlas -- --base-url http://127.0.0.1:<production-like-port>
```

Confirm exact script names from the active `package.json`.

## Evidence

Save browser JSON, screenshots, accessibility output, registry snapshot, command logs, and a signed visual-review note under:

`what-next/workflow-atlas-transformation-roadmap/phase-02-public-release-evidence/`

## Exit Gate

- Focused tests and production-like smoke pass.
- Zero serious/critical accessibility findings.
- Zero browser errors, critical request failures, overflow, or clipped text.
- EN/FR semantics match.
- Human visual review is signed.

## Stop Conditions

- A drift gate is described as authorization proof.
- Browser smoke runs only against an unauthenticated redirect or dev-only placeholder.
- Current screenshots cannot be reviewed.

## Non-Goals

No authenticated projection, module enforcement change, telemetry collection, or dedicated dashboard route.

