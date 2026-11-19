# P08 UI state evidence

Run: 18 October 2026. Current status and acceptance decision are in [RESULT](RESULT.md). This file separates real rendered states from mocked state contracts. Screenshots and traces contain synthetic fixtures only.

## Reviewed implementation

The manager action row now associates the existing risk/source with the action by the server-owned action ID. It presents the signal title, next-step text and stale/incomplete/unavailable warning together. Accessible names distinguish each source link. An explicitly unavailable drill-through renders no link; the server remains authoritative when an available link is opened. An unmatched action does not borrow context from another action sharing its route.

The existing cashier panel retains its original request reference, disables Charge during uncertainty, exposes status lookup/original retry, and supports explicit acknowledgement of recorded outcomes. No cashier production code was changed by P08.

## Mocked/component evidence

The nine-suite focused lane covers cashier state/identity/focus, manager mode transitions and source pairing, null/zero and visibility rules, localized signal presentation, digest access recovery and inventory/operating route boundaries. Exact counts/exits are retained in `evidence/unit-*.results.json` and execution records. This is jsdom plus mocked services, not browser or database proof. The initial ESM harness failure is retained.

## Actual browser procedure and artifacts

| Journey / state | Procedure and evidence | Scope |
|---|---|---|
| Cashier original retry | [EN retained request](evidence/P08_EN_RETRY.png), `browser-cashier.cjs` | Actual Better Auth, Next actions, checkout lease and PostgreSQL fixture; keyboard retry |
| Cashier unknown / failed reads | [EN interrupted response](evidence/P08_EN_UNCERTAIN.png) | Response dropped only after independent DB confirmation. Whole connection outage also shows the honest failed-read page; no false empty-cart or sale-failed conclusion |
| Cashier recovered | `P08_EN_RECOVERED.png`, `P08_FR_RECOVERED.png`, `P08_FR_MOBILE.png`, `BROWSER_RECOVERY.json`, `cashier-trace.zip` | Original operation and financial snapshot compared; French uses exact captured pending bytes restored in the same tab. Final report states actual acknowledgement result |
| Manager pending | `MANAGER_LOADING_en.png`, `MANAGER_LOADING_fr.png` | Actual source read waits on an owned disposable table lock; no mocked loading payload |
| Manager source / next step | `MANAGER_SOURCE_en.png`, `MANAGER_SOURCE_fr.png`, destination screenshots | Current snapshot derives a stockout signal from the synthetic inventory level; keyboard opens the real inventory items route |
| Manager empty | `MANAGER_EMPTY_en.png`, `MANAGER_EMPTY_fr.png` | Synthetic source quantity is temporarily made available, then a fresh route read is performed; does not claim a real stock correction |
| Manager failed / recovered | `MANAGER_ERROR_*.png`, `MANAGER_RECOVERED_*.png` | Disposable source table temporarily unavailable, restored, followed by keyboard retry. Runner records restoration in `finally` |
| Manager denied | `MANAGER_DENIED_en.png`, `MANAGER_DENIED_fr.png` | Authenticated role lacks digest permissions; no digest/source actions returned |

Browser results in the final RESULT govern whether each artifact was produced and passed; this procedure table is not a substitute for runtime results. Manager traces/results are timestamped, preserving failed attempts.

Final actual browser results: [cashier: five passing steps](evidence/BROWSER_RECOVERY.json); [manager: passing EN/FR tasks and identity observations](evidence/manager-1792343331471.json). [Execution exits](evidence/BROWSER_EXECUTIONS.json) record both successful runs and the failed initial manager assertion. Selected visually inspected states: [English manager source](evidence/MANAGER_SOURCE_en.png), [French mobile source](evidence/MANAGER_SOURCE_fr.png), [failed source](evidence/MANAGER_ERROR_en.png), [French denied role](evidence/MANAGER_DENIED_fr.png), and [French cashier checking](evidence/P08_FR_MOBILE.png). The cashier trace/result verifies the later completed keyboard acknowledgement; that checking screenshot alone does not.

## Envelope and limits

Chromium on this Windows workstation, EN desktop 1366×768 cashier / 1440×1000 manager and FR 390×844. Mobile means a resized desktop browser, not a physical phone. Keyboard focus and navigation are exercised; no screen reader, zoom/reduced-motion matrix, browser-engine/device fleet or WCAG certification. Development cold compilation and synthetic delays are not production latency measurements; the roadmap's 3-second p95 target is unmeasured.

Stale, unavailable and mismatched-source component states are explicitly tested with typed inputs. The actual failed-read route is browser-tested separately. No browser mock is represented as provider or transaction proof. No mutation is added to the digest. Source routes still enforce permissions/entitlements; this bounded actor fixture does not certify every location grant or cross-register race. A stockout aggregate links to its source workflow, not an exact inventory transaction or resolution record.

Known source-view limitation: the inventory list maps item display names from `nameEn`, including on the French route. The manager test identifies the source by SKU and exact item-ID link. French digest labels and next-step text are verified independently. The first failed French-name assertion and all its evidence are preserved. The development “1 Issue” badge follows the deliberate missing-source injection; it is not removed from screenshots.
