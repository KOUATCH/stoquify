# Evidence index

All paths below are local artifacts. Failed originals remain evidence of the defect, not a failed final implementation. Historical POS financial/browser results stay in the prior run and are not counted as fresh execution.

| Evidence | Scope/result |
|---|---|
| [Inventory after](evidence/inventory-after.md) / [exit](evidence/inventory-after-command.json) | Fail mode, 0 active |
| [Inventory guard/tests](evidence/inventory-green-tests.json) | 3 suites, 38 passes; mock/VM clients, no real DB execution |
| [Inventory original failures](evidence/inventory-red-tests.json) | Two expected pre-edit scanner failures |
| [G1 after](evidence/contract-after.md) | Expected exit 1, missing authentic approvals |
| [Program after](evidence/program-after.md) | Expected exit 1, dependency/external/closure requirements |
| [Governance verification](evidence/governance-verification.json) | 45 tests, scoped lint, source hashes, unchanged business artifacts |
| [Governance original failures](evidence/governance-regressions-original.log) | Five demonstrated original false passes |
| [Build wrapper first red](evidence/build-wrapper-focused-red.log) | Five original isolated-output regressions |
| [Parent-link red](evidence/build-wrapper-ancestor-red.log) | Independent review finding reproduced |
| [Final wrapper tests](evidence/build-wrapper-final-green.log) / [exits](evidence/build-wrapper-final-results.json) | 23 pass, scoped lint clean |
| [Typecheck](evidence/typecheck-final-result.json) / [log](evidence/typecheck-final.log) | Final edited source after configuration restoration; exit 0 |
| [Prisma validation](evidence/prisma-validate-result.json) | Exit 0, no migration |
| [Build log](evidence/build.log) / [start](evidence/build-start.json) | **FAILED**, wrapper exit 1, child exit 1; output cleanup disabled/not performed |
| [Packet provenance](evidence/packet-provenance.json) | 11 decisions, nine procedures, exact frozen hash |
| [Final source hashes](evidence/review-final-source.json) | Changed-scope inventory/governance/build files and verified-source drift |

Execution brief: [requested scope](execution-brief.txt). Git baseline and HEAD were recorded before edits. The initial default Jest discovery runs produced no results and were stopped; focused Node configurations supplied the actual test evidence. Initial filesystem-denied writes did not execute. The fixture-manifest auto-review rejection was resolved through the same mechanism after individual evidence was completed; no remaining permission block exists.
