# Ordered Graphify Run

Date: 2026-07-14

Scope: deterministic code-graph refresh for Stoquify in the order requested by the user, followed by support folders needed for architecture navigation.

## Run Order

| Order | Folder | Nodes | Edges | Communities | Output |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | `services` | 3,320 | 6,075 | 239 | `services/graphify-out/` |
| 2 | `app` | 526 | 379 | 199 | `app/graphify-out/` |
| 3 | `components` | 928 | 857 | 222 | `components/graphify-out/` |
| 4 | `actions` | 757 | 1,007 | 142 | `actions/graphify-out/` |
| 5 | `hooks` | 255 | 252 | 36 | `hooks/graphify-out/` |
| 6 | `lib` | 408 | 610 | 51 | `lib/graphify-out/` |
| 7 | `types` | 72 | 36 | 36 | `types/graphify-out/` |
| 8 | `prisma` | 115 | 258 | 10 | `prisma/graphify-out/` |

## Consolidated Graph

Merged graph artifact:

- `graphify-out/ordered-code-graph.json`

Validation result:

- Nodes: 6,380
- Links: 9,474
- Size: 7,016,506 bytes

## Notes

- The whole-repo graphify detection found 2,541 supported files and about 8.66 million words, so a full semantic run was intentionally avoided.
- These folder runs used `python -m graphify update <folder>`, which re-extracts code structure without LLM semantic extraction.
- Each folder has its own `graph.json`, `graph.html`, and `GRAPH_REPORT.md`.
- The first merge command wrote `graphify-out/ordered-code-graph.json` successfully but hit a Windows console encoding error while printing a Unicode arrow. The merged JSON was validated afterward.
- `hooks`, `lib`, `types`, and `prisma` were added because they are necessary support layers for tracing route/action/component/service relationships, shared contracts, security utilities, and schema/model dependencies.
