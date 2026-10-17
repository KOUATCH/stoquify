# Browser evidence and verification ledger

Date: 12 October 2026. Browser: existing Edge session at localhost:3000. Role displayed: SUPER_ADMIN. Existing POS tab preserved; separate audit tab used for dashboard navigation. No sale, approval, access change, invitation, notification, or business-data mutation was submitted.

| ID | Route | Locale / role | Viewport / state | Evidence | Outcome and limits |
|---|---|---|---|---|---|
| B01 | `/en/dashboard` | EN / SUPER_ADMIN | DOM measured 1851×891; populated, incomplete setup, partial domain coverage | `evidence/dashboard-en-desktop.png`; AX observation in tool record | Brief + eight setup cards precede urgent work; document height 3330 px; no restricted-role verification |
| B02 | `/en/dashboard/owner-war-room` | EN / SUPER_ADMIN | DOM measured 1851×891; blocked/stale evidence | `evidence/owner-en-desktop.png`, `evidence/owner-en.txt` | Document height 5513 px; duplicated work/risk sections and technical copy; tab title contains Kontava |
| B03 | `/en/dashboard/pos` | EN / SUPER_ADMIN | Existing desktop window; same desktop browser, exact DOM dimensions not separately measured | `evidence/pos-en-desktop.png` | Loading transitioned to expired register ownership, open shift, pending/conflict/blocker counts, empty cart; no recovery or checkout command clicked |
| B04 | `/en/dashboard/owner-war-room` | EN / SUPER_ADMIN | Requested 390×844 override; later measured 585×1266; mobile menu visible in AX | Tool AX observation only | Responsive branch observed; screenshot attempts timed out. Do not count as a 390 px visual pass. Reset requested; observed size did not establish full restoration to initial dimensions |
| B05 | `/fr/dashboard/payroll` | FR / current browser session | Navigation/tab title confirmed; content inspection timed out | Browser tab list only | NOT a rendered French payroll check. English-literal finding is based on source |
| B06 | `/en/login` | Existing user browser tab | Tab present; attach/content inspection timed out | Browser tab list only | NOT a public/auth rendered audit |

Screenshot pixel dimensions may differ from CSS viewport due to display scaling. They are private local audit evidence and are not published.

## Checks

| Evidence class | Check | Result |
|---|---|---|
| Workflow contract | `npm run agent:workflow:check` after runner/lifecycle/registry inspection | Passed; 198 scripts unclassified |
| Source inventory | `node docs/system-audit/2026-10-12-ui-ux-review/build-inventory.cjs` | 167 page files, 27 families; outputs contain route hashes and revision |
| Artifact integrity | JSON parse, unique route patterns, source-file existence, proposal JavaScript syntax | Passed: 167 unique routes, no missing source files, root route `/`, one inline script parsed; layout artifact not separately browser-render verified |
| Skill retrieval | Two local Python `-B` UX searches after source inspection | First search off-target and rejected; second returned focused form/error accessibility guidance |
| Source inspection | Routes, representative components, tokens, navigation, seven role templates, page contracts, graph discovery | Completed as described in README; not full semantic review of every leaf component |
| Mocked unit tests | Application tests | Not run; audit only |
| Real database tests | Transactions, locks, constraints, tenant isolation | Not run; no disposable database target supplied |
| Browser | Dashboard, owner overview, POS recovery state | Observed; no completed mutation journey |
| Accessibility | Keyboard completion, screen reader, contrast, axe, zoom matrix | Not completed; no compliance certification |
| Performance | Controlled build/profile/Core Web Vitals | Not measured; tooling timeouts are not performance scores |

## Required follow-up matrix

Use disposable fixtures with explicit role accounts for ADMIN, MANAGER, SUPERVISOR, EMPLOYEE, CASHIER, VIEWER, custom financial roles, and accountant mandates. Test EN/FR at 1440×900, 1024×768, 390×844, and 320 CSS px reflow, with 200% text zoom and keyboard focus checks. Confirm actual dimensions in each capture.

Priority journeys: owner issue→specific record→back; cashier valid shift→sale→uncertain result recovery; low stock→item→authorized replenishment; AP request→independent review→execution→reconciliation; payroll missing input→ready period; accountant evidence request→client response→independent acceptance. Keep live business records unchanged during testing.
