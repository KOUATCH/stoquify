# Confirm the reviewed cart — v134

Status: bounded v134 evidence published. The full workflow review remains active.

## Reproduced financial intent defect

An actual owned PostgreSQL reproduction prepared a request while the cart total was 100 FCFA and cash tender was 200 (expected change: 100). Another session changed the quantity from one to two. The original request then committed a 200 FCFA sale with no change. The previous request hash bound scope and tender but not the mutable cart. Receipt `db2dda`, `lanes/environment/cart-revision-v134-before-2de31824-3a0b-4162-89bb-f045983ce4d7.json`, establishes the defect with real persisted effects in synthetic records.

## Delivered behavior

The server cart read model now supplies an opaque revision hashing cart identity, tenant/cashier/location/terminal/session/customer, persisted update time, notes, financial totals and sorted line identities, items, update times, quantities, prices, discounts and taxes. Decimal values use exact normalized decimal strings. Inventory availability remains a current operational check rather than being mistaken for reviewed cart content.

New commit requests retain `expectedCartRevision` alongside their original tender and identifier. The service verifies it inside the existing serializable transaction before claiming a commit or changing stock, payment, drawer or ledger records. A missing or changed revision rejects new work with a bounded 409 conflict. Existing exact commit evidence is resolved first. The request hash includes the revision only when supplied, preserving the canonical hash of pre-revision requests already recorded.

If an exact recorded result is absent and the scoped draft differs from the original revision, recovery returns `CART_CHANGED`. The EN/FR interface explains the need for review and offers **Review changed cart**. This refreshes the server cart without submitting. The cashier reviews current items, total, tender and change and explicitly chooses Charge/Encaisser. That confirmation keeps the original client identifier while binding the newly reviewed revision; the existing unique registry and hash checks prevent a second sale under that identifier. No automatic submission follows refresh, restored access or review. The original stored request is retained until the cashier confirms the replacement request or a recorded result.

The immediate revision conflict and recovery instructions use EN/FR strings and existing attention/brand tokens. Keyboard activation and 1440/768/320px layouts are exercised in the browser. No application shell or new design system was introduced.

## Verification and interpretation

After correction, the real database test (`bf959a`, `cart-revision-v134-after-1aa4bf77-1fb3-4df2-ae51-495e0d41f864.json`) confirms stale and missing revision rejection without effects, changed-cart recovery, an explicitly reviewed commit, exact replay without effects and rejection of the obsolete original request after completion.

The overlapping transaction test (`0f9fae`, `cart-revision-race-v134-d2101a34-d126-42af-8944-faef2d5bcf7b.json`) pauses a real transaction after reading the original cart. A second real transaction changes the cart and commits. Releasing the original transaction causes its serializable retry to reject the old revision; financial and registry snapshots match the edited draft. Only a read barrier is injected; isolation, writes and authorization are not replaced.

An actual pre-revision v133 result remains readable and exactly replayable without effects (`9a02a1`, `legacy-revision-v134-37a56ff7-c013-4914-95c1-926203551191.json`). This does not establish safe creation of unrecorded legacy requests.

The first EN/FR browser report (`fae7e8`, `cart-revision-browser-v134-202a41c8-9033-4635-9a95-4d402d2a835f.json`) verifies stale submit rejection, same-tab reload, review without effects and explicit current confirmation with the same identifier and one payment. Six screenshots cover three widths; French 320px was visually inspected. Final browser bindings additionally check the immediate translated error and are in the aggregate. Development route readiness observations are measurements, not production budget certification.

The first regression run failed one math-integrity test (`086529`): the new revision guard rejected its corrupt totals before the existing math guard. Its fixture now supplies the revision of the corrupt server cart so the original math check remains independently tested; the expected math failure and no-effect assertions remain intact. The corrected 119-test/11-suite run passed (`e7bbd5`), cart edit/access 10 tests passed (`6ca97d`), and seven revision sensitivity/normalization tests passed (`17b99b`). This totals 136 distinct tests in 14 suites. The two UI suites were rechecked after the final error localization, 21 tests (`75bc3b`); these are repeated tests, not additional coverage. Exact commands, lint/typecheck receipts, current hashes and baseline are in the aggregate.

All tests used inspected migration-free commands and the owned local database `stoquify_local_registration_20260906_01` / app `http://127.0.0.1:3110`. Fixture posting rules and cash transactions are synthetic, not statutory or payment-provider approval. Earlier passing browser reports are historical at their source hashes. No production operation, migration, external payment, receipt delivery or X1 clearance occurred.

## Cashier and operator procedure

Open `/en/dashboard/pos` or `/fr/dashboard/pos`. After a rejected or uncertain submission, check the previous result. If the cart changed, load it for review, inspect items, quantities, total and expected change, enter/review tender and explicitly confirm. Do not make a second cart merely to bypass recovery. The same request identifier remains associated with the attempt.

Support needs the request identifier (recovery panel), authenticated organization/cashier, terminal/session and approximate time. Compare scoped commit evidence and current sale/payment/ledger records. A browser revision is input validation evidence, not proof of approval or payment.

## Compatibility, rollout and remaining work

Release the cart read model, schema/service and client together. New submissions without a revision are rejected. Already-recorded old requests remain readable/replayable, but unrecorded pre-revision browser/offline requests have no review binding and must not be automatically rebound by a worker. Their guided recovery upgrade remains unfinished engineering work. Mixed-version rollout and offline acceptance/recovery require explicit verification before release; do not deploy this batch independently and claim full compatibility. No schema migration is needed for this implementation.

Preserve the original request and registry protections during rollback. Prefer a forward fix; a rollback that restores unversioned new commits would restore the reproduced financial intent defect. No production rollback rehearsal is claimed.

Other open work: closed-tab/cross-device result discovery, review of currency/configuration changes during checkout, every offline/receipt/correction path, wider accessibility including assistive technologies/zoom, and all unfinished workflows in the register. This patch proves the tested cart-content/retry boundary, not whole POS or platform completion.

## Review responsibilities

Selected skill: `007-aqstoqflow-pos-ledger-controls`. Backend/architecture: bind confirmed business intent to the server cart, reuse commit registry. Data/finance: serializable validation before financial effects, exact decimals and unchanged replay. IAM/privacy: current permissions and scoped draft/result lookup remain effective. UX/accessibility/localization: explicit review, retained draft, EN/FR failure and recovery, keyboard/responsive checks. QA/SRE: before/after and overlapping transaction evidence, exact source bindings, measured development readiness. Audit/API/offline: canonical legacy hash preserved, unversioned new-work rejection and remaining offline transition documented. SaaS/operations: no eligibility/price/provider changes; coordinated release required. Statutory/country formulas, HRIS/payroll, AP, analytics and AI rules are not applicable to this code change because they are unchanged; they remain part of the wider review. No professional certification is claimed. High-impact unresolved boundaries prevent advancing to release certification or the next numbered compliance skill.
