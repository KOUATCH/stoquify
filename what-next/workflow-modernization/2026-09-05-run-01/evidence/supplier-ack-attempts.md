# Supplier response verification attempts

Evidence date: 2026-09-07. Earlier records remain unchanged.

| Attempt | Outcome and correction |
| --- | --- |
| `supplier-ack-before-8573e555-3e8.json` | Three baseline defects reproduced in the actual browser/service: lost change draft on reload, private headers missing on denial, and four-decimal quantities silently rounded. |
| Initial typecheck `4b8e1b` | Three additive receipt fields missing from a local service projection type. Corrected the projection; final typecheck `c68939` exited 0. |
| Initial lint `f74206` | Two hook dependency warnings. Corrected callback/effect ownership; final fourteen-file lint `e825b8` exited 0. |
| Permission probe `cf59b68e-591` | Evidence write failed with filesystem EPERM. No retained probe result; this is not an approval-review rejection. |
| `supplier-permissions-before-1fcb5b65-c96.json`, `57394fd3-a89.json` | Existing database trigger correctly rejected changing an immutable token permission. No trigger, permission or constraint was disabled. |
| `supplier-permissions-before-f7fa6330-a22.json` | A newly created restrictive fixture reproduced advertised response permission despite `allowRespond=false`. A separate `allowView=false` fixture was correctly rejected by the database scope constraint. The viewing hypothesis was therefore not reproduced; it is not claimed as an exploitable current workflow. |
| Focused tests `supplier-ack-tests-01.json` | 50 tests passed before the later scope-race and effective-permission corrections. Historical intermediate result. |
| Component tests `supplier-ack-component-tests-01.json` | Nine tests passed, including exact retry, refreshed receipt matching and old-response isolation after navigation. |
| Browser `8f809216-7d0` | An ambiguous page-wide alert selector failed while an asynchronous route callback was active; teardown then raised an uncaught callback error. Screenshots retained; no complete JSON receipt. The synthetic interrupted invitation was revoked (`8a7f53`). Cleanup now catches/redacts callback errors and waits for routes. This was not evidence of an application endpoint timeout. |
| `supplier-ack-browser-0dde6783-144.json` | Both locales failed because Next.js route announcers matched the page-wide alert selector. Scoped the assertion to the response form. |
| `supplier-ack-browser-d7d8051c-a04.json` | Journeys reached real saved records, but the driver expected 200 instead of the endpoint's 201 creation status. Its callback error was retained even though the journey flag said passed. This is an intermediate, qualified result—not the final success/header receipt. The driver now checks 201 and rejects any callback error. |
| Final focused tests `supplier-ack-tests-02.json` | 59 tests in seven suites passed (`424b8f`), including signed supplier/customer middleware regressions. |
| `supplier-ack-postgres-7e0317f8-fbf.json` | Eight real PostgreSQL groups passed; all three outcomes, exact retry/conflict, invalid input, scoped access, audit rollback, concurrency and in-flight revocation. Source stable and original financial/role hashes unchanged. |

The final browser and source bindings are recorded in `supplier-acknowledgement-receipt.json` only after its assertions pass. Fixtures use synthetic approved purchase orders; they do not prove the normal purchase-order approval workflow or buyer authorization.
