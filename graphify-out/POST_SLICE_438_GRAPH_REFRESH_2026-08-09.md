# Post-Slice-438 Architecture Graph Refresh — 2026-08-09

## Status

Ready. The Stoquify code graphs were regenerated from the current working tree after Slice 438 and the customer referral vertical loop.

The AGENTS-referenced Graphify skill file was not installed at either declared local path. The refresh therefore used the repository's existing Graphify runtime marker and the deterministic, non-LLM command recorded by the previous ordered run: `python -m graphify update <folder>`.

## Ordered refresh

| Order | Layer | Nodes | Edges | Communities |
| ---: | --- | ---: | ---: | ---: |
| 1 | `services` | 5,719 | 10,287 | 419 |
| 2 | `app` | 622 | 472 | 229 |
| 3 | `components` | 1,173 | 1,089 | 277 |
| 4 | `actions` | 1,044 | 1,284 | 195 |
| 5 | `hooks` | 308 | 321 | 44 |
| 6 | `types` | 72 | 36 | 36 |
| 7 | `lib` | 431 | 623 | 61 |
| 8 | `prisma` | 116 | 259 | 12 |

The merged graph at `graphify-out/ordered-code-graph.json` contains 9,484 nodes and 14,371 edges. One duplicate node identifier was deduplicated during the eight-graph merge.

## Canonical AGENTS artifacts

The five canonical filenames now exist at the repository root graph directory:

- `graphify-out/graph_components.json`
- `graphify-out/graph_actions.json`
- `graphify-out/graph_app.json`
- `graphify-out/graph_hooks.json`
- `graphify-out/graph_types.json`
- `graphify-out/GRAPH_REPORT_components.md`
- `graphify-out/GRAPH_REPORT_actions.md`
- `graphify-out/GRAPH_REPORT_app.md`
- `graphify-out/GRAPH_REPORT_hooks.md`
- `graphify-out/GRAPH_REPORT_types.md`

## Referral coverage validation

Every regenerated JSON artifact parsed successfully.

The merged graph contains 293 nodes matching customer statement, receivable, settlement, referral, accountant-invite, or credential-sign-in concepts:

- Services: 241 matches, including receivable lifecycle/backfill, immutable statements, signed access, encrypted delivery, recipient actions, referral attribution, and accountant onboarding.
- App/API: 26 matches, including public statement GET/action routes, referral route, portal, authenticated statement page, and its entitlement-boundary test.
- Actions: 15 matches, including statement generation/delivery/revocation and protected settlement reversal.
- Components: 10 matches, including `CustomerStatementWorkflow` and its step-up, consent, snapshot, and delivery helpers.
- Lib: one direct settlement-security test match; the authentication outcome helper is present under its own node names.
- Hooks and types: refreshed with no standalone referral-labeled nodes. The referral UI uses server actions rather than a dedicated referral hook, and the Graphify AST extractor does not emit interface-field nodes for the new registration fields.

## Visualization boundary

Graphify intentionally did not regenerate `services/graphify-out/graph.html` because the 5,719-node service graph exceeds its safe HTML visualization threshold. The current `services/graphify-out/graph.json` and `services/graphify-out/GRAPH_REPORT.md` are the authoritative service artifacts; a stale HTML file was not retained.

## Authority

These graphs are current architecture-navigation evidence. Source code, Prisma migrations, runtime verification, and release gates remain authoritative for behavioral and deployment claims.
