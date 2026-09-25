# Draft editing verification attempts

All receipts below are retained under `../lanes/environment/` unless a different path is stated. An observed baseline defect is not a control passing. Later results do not relabel an earlier failure or timeout.

| Receipt / command output | Result and correction |
| --- | --- |
| `purchase-order-edit-before-2c58b290-0b9.json` | Four baseline defects reproduced: stale draft overwrite, repeated line reconciliation on exact retry, save after role revocation and save after session revocation. |
| `purchase-order-edit-after-322fb07d-a69.json`, `purchase-order-edit-after-769560c6-a9b.json` | Failed event write. Diagnostic identified invalid accounting source enum `PURCHASE_ORDER`. New draft save events were corrected to non-posting events with entity identity in the payload. |
| `purchase-order-edit-after-7a8b9cea-3b7.json` | Initial four database checks passed after that correction. |
| `purchase-order-edit-after-1c294f7a-31b.json` | Extended check expected FORBIDDEN for an inactive organization; actual module evaluator denies it as NOT_FOUND. Assertion now expects that existing deliberate denial; order-unchanged checks remain. |
| `purchase-order-edit-after-c2789699-ce1.json` | Rollback fault check expected an injected raw error. The event engine correctly returns its safe `Business event could not be recorded` error. Assertion corrected to that exact engine contract; rollback and retry assertions retained. |
| `purchase-order-edit-after-67ff7e7f-d1d.json` | Fourteen extended database groups passed, including scoped grants, concurrency, binding, rollback and receipt integrity. |
| `purchase-order-edit-after-400f7557-27d.json` | Fourteen groups passed again against the service including the separate archive correction. This is the final draft database source binding. |
| `purchase-order-archive-before-e341b255-2fb.json` | Positive draft archive reproduced the pre-existing invalid accounting source enum defect. It failed without changing the order or retaining a partial audit/event. |
| `purchase-order-archive-after-48180150-492.json` | Archive now completes with one retained line, one audit, one applied non-posting event and unchanged nonfixture financial/role invariants. Full archive authority/recovery remains outside this bounded fix. |
| `purchase-order-edit-browser-587887b6-34d.json`, `purchase-order-edit-browser-a7b27905-1c2.json` | Browser assertion selected global route announcers as well as alerts, causing strict-selector failure. Scoped it to the actual editor form. The second run repeated the failure because an unprivileged helper-file write had been denied by the filesystem; the reviewed write then succeeded. No business assertion was removed. |
| `purchase-order-edit-browser-f3086369-a63.json` | Both languages passed independent and overlapping draft comparison and small-screen/text-resize checks. English recovery navigation timed out after 60 seconds; French completed all tested cases. |
| `purchase-order-edit-browser-5dc14fd9-17a.json` | English recovered the lost confirmation without duplicate effects, then correctly rendered the protected route-denied view after role revocation, rather than the inline editor alert expected by the harness. French completed the full test. Extended verification now accepts either actual denial presentation and additionally requires the saved record to remain unchanged, the local draft to remain present and restoration after legitimate permission returns. |
| Browser command output `c9ae6c` | Subsequent process exited 1 without producing its final JSON receipt. The application wrapper later reported exit 0 (`eb60dd`). Recorded as interrupted/incomplete; no runtime result inferred. The isolated application was restarted for final verification. |
| `purchase-edit-tests-01.json` | 81 tests in seven suites passed before additional cases. |
| `purchase-edit-tests-02.json` | 91 tests in seven suites passed; elapsed 116.781 seconds. |
| `purchase-edit-tests-03.json` | 89 passed, two editor cases exceeded the unchanged five-second test timeout while browser, typecheck and lint ran concurrently. Rerun sequentially with the same assertions and timeout; this attempt remains failed. |
| Typecheck output `362670` (earlier in the turn) | Two editor references used a non-canonical authentication code. Corrected to the existing `AUTH_REQUIRED` code. Later typecheck outputs `104054` and `66acde` passed. |
| Lint output `38b01c` | Ordinary comparison handler named `useComparedDraft` was interpreted as a React hook. Renamed it `applyComparedDraft`; behavior unchanged. Final changed-file lint is bound in the final receipt. |

The redundant immediate `router.refresh()` after navigating to the saved order was removed. The action already invalidates the relevant records, and a second refresh can compete with navigation. Final browser verification uses one navigation, retains the same timeout and checks stored outcomes rather than interpreting a spinner as success.

The final successful browser/test/gate paths, source hashes, screenshots and exact commands are recorded in [the checkpoint receipt](purchase-order-edit-receipt.json). Full production build, actual native screen-reader/native zoom checks and production performance assurance were not performed in this checkpoint.

Final results: `purchase-edit-tests-04.json` passes all 91 tests/seven suites in 16.035 seconds with unchanged timeouts. Lint `c54f52` and typecheck `656d76` pass. `purchase-order-edit-browser-0c20aed5-ecd.json` completes both EN/FR journeys with 16 screenshots and unchanged source/nonfixture invariants.

Visual review found that a full-page mobile screenshot omitted a painted region. `purchase-order-edit-visual-22535790-11b.json` passes actual viewport visibility/hit checks and captures eight additional unmodified desktop/scrolled-mobile views. Direct inspection of the French comparison top, notes and actions and English top shows the content rendered correctly. These viewport images supplement the retained full-page capture rather than editing it or claiming the blank region was acceptable UI.
