# Post-Slice-438 Architecture Graph Refresh — 2026-08-09

## Status

Ready. Graphs were regenerated from the isolated referral release tree based on `5d7c73d557e5ca49560fa8627ce45fb75a68de8a`.

- Frozen candidate digest: `befa17a694e7dddb94c604f1d6b7d62a0892bccfee841236b90d0c9dd352ba2b`.
- Shared-hunk selection digest: `c19a27d09bac35fe4934933fc554fcf084aed7c30dfb509e0287e447c1484fa3`.
- Deterministic command: `python -m graphify update <folder>`.

## Ordered refresh

| Order | Layer | Nodes | Edges | Communities |
| ---: | --- | ---: | ---: | ---: |
| 1 | `services` | 5719 | 10285 | 417 |
| 2 | `app` | 616 | 469 | 224 |
| 3 | `components` | 1141 | 1056 | 274 |
| 4 | `actions` | 1044 | 1282 | 195 |
| 5 | `hooks` | 308 | 321 | 44 |
| 6 | `types` | 72 | 36 | 36 |
| 7 | `lib` | 425 | 620 | 58 |
| 8 | `prisma` | 116 | 259 | 11 |

The merged graph contains 9440 nodes and 14328 edges. 1 duplicate node identifier(s) were deduplicated. The refreshed ordered graph SHA-256 is `18f74ec091d4d9218a138c993f6ef88ce07fb9663a9bfce6c13297d43ca7e658`.

## Canonical artifacts

The component, action, app, hook, and type graphs and reports were copied to the root `graphify-out` directory. `graphify-out/ordered-code-graph.json` is the merged navigation graph.

## Referral coverage validation

The isolated graphs contain 354 nodes matching customer-statement, receivable, settlement, referral, accountant-invite, or credential-sign-in concepts.

- services: 283 matching nodes.
- app: 31 matching nodes.
- components: 20 matching nodes.
- actions: 19 matching nodes.
- hooks: 0 matching nodes.
- types: 0 matching nodes.
- lib: 1 matching nodes.
- prisma: 0 matching nodes.

Every generated JSON artifact parsed successfully. The oversized service HTML visualization was intentionally removed; its JSON and Markdown report remain authoritative.

## Authority

These graphs are architecture-navigation evidence. Source, migrations, runtime checks, and release gates remain authoritative for behavior and deployment.
