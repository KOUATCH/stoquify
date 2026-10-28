# Stoquify Supplier Core Vertical Slice Evidence

- Date: `2026-08-11`
- Scope verdict: `PASS_CORE_VERTICAL_SLICE`
- Full supplier release-suite verdict: `FAIL`
- Production-readiness claim: `false`
- Legal or accounting certification claim: `false`

## Verified slice

The desktop browser exercised the tenant-scoped supplier path from list and create through the saved detail route, hard refresh, edit and hard refresh, and supplier-filtered accounts-payable history. Scenarios 1-5 passed. The created supplier ID was `cmsotpcwg000dma4swgrem5ft`; the cleanup fixture subsequently removed the isolated organizations, users, and suppliers and reported zero remaining fixture rows.

The create-route repair keeps the form mounted until the successful server mutation returns a supplier ID, then navigates directly to that saved supplier. A focused component regression test covers that behavior.

## Browser evidence

| Surface | Final route | Serious accessibility violations | Overflow/clipping/overlap | Screenshot SHA-256 |
|---|---|---:|---|---|
| Supplier list | `/en/dashboard/purchases/suppliers` | 0 | none | `59892df26a0e765dd8895732ce77a656228d3f58310b286cf709b75ee4c74c3a` |
| Mutation dialog | `/en/dashboard/purchases/suppliers` | 0 | none | `23527ceda7e44d6a4b3ade1a2ce8a684e6d1950391630cb35d5eff40f0c8143a` |
| Create page | `/en/dashboard/purchases/suppliers/create` | 0 | none | `703c930e611d648e62adc5ede3bd998100ccf75a35e72e74d5762ffb1ee20f5a` |
| Persisted detail | `/en/dashboard/purchases/suppliers/cmsotpcwg000dma4swgrem5ft` | 0 | none | `b70c0f978490c073b30b8cabe27c01edcf240071b72552992b5befb10fdc0ffe` |
| Persisted edit | `/en/dashboard/purchases/suppliers/cmsotpcwg000dma4swgrem5ft/edit` | 0 | none | `60f0dd3b2e039e7ae10d95c9c6740bd428c5933008f1eaab191438ee841200a7` |
| Supplier AP history | `/en/dashboard/purchases/payables/history?supplierId=cmsotpcwg000dma4swgrem5ft` | 0 | none | `d1ba99b0ad57ea2cc26bd0b3a8bc8becee2d96dd59a945d9ed0255710499c58d` |

Source artifact: `what-next/evidence/purchasing-ap-supplier-presentation-2026-08-10/supplier-authenticated-desktop.json`.

## Full-suite boundary

The complete supplier browser command is not certified. It finished with 14 passed, 5 failed, and 11 skipped tests. The desktop export/download scenario timed out; later tablet finance, mobile, and RBAC checks were affected by development-server cache/route instability. The source browser artifact therefore correctly retains `status: FAIL`. This scoped record establishes only the requested working core vertical slice and does not conceal the remaining browser/release blockers.

## Follow-up gates

1. Make export/download completion deterministic and rerun desktop scenario 6.
2. Stabilize a fresh Next.js test server and its generated cache for isolated viewport projects.
3. Rerun tablet finance, mobile, and RBAC projects independently with cleanup after each run.
4. Promote the full supplier suite only after every project passes and its evidence/cleanup artifacts are complete.
