# Authenticated customer collection qualification

**PASS — 10 November 2026.** The actual local application recorded one linked mobile-money collection of **100.00 XAF**, then denied further commands after collection-permission removal and current-session revocation. Seven browser steps and six controller transitions passed. Browser page errors, console errors and cleanup errors were all zero.

The successful controller ran from **15:26:42.993 to 15:33:12.171 UTC**. The browser finished at **15:32:57.204 UTC**. This is actual password/session/application/action and isolated PostgreSQL evidence using synthetic financial source facts. It is a development-runtime qualification, not a deployed production release.

## Evidence and provenance

| Evidence | Receipt |
| --- | --- |
| Successful application/controller | [runtime-a912af197f/RESULT.json](runtime-a912af197f/RESULT.json), SHA-256 `e7532ad6f84236977b8c8bdeb567e90631cacca823748b2d6245871de580a624` |
| Successful browser | [attempt-078f797d05/RESULT.json](attempt-078f797d05/RESULT.json), SHA-256 `33f4841310649c932f301ca533b63e83e1cae0285cfe0c2c9eaaee0edfe961ae` |
| Browser source binding | [attempt-078f797d05/SOURCE_BINDING.json](attempt-078f797d05/SOURCE_BINDING.json), SHA-256 `84dde9f5219623f7da9c92588a40182bf7c6f110c4aebcdb94bad4a0ffa99963` |
| Prepared application target | [COLLECTION_RUNTIME_TARGET.json](../COLLECTION_RUNTIME_TARGET.json) |
| Earlier stopped attempt | [runtime-537396d1ec/RESULT.json](runtime-537396d1ec/RESULT.json) |
| Explicit stopped retry admission | [RUNTIME_RETRY_ADMISSION_1.json](RUNTIME_RETRY_ADMISSION_1.json) |

The candidate contained **4,400 application source files**, with source-array digest `1ccc2522b476470ac0a1fe2a7da9ed82ec36ef49ad806cb6a704c89861dbecff`. The controller checked the prepared bytes against both root and candidate before execution and checked candidate source again afterward. Next's generated declaration was separate; its final SHA-256 was `5cd21bac147d62d3a34798daeed02e5c19713b22102686cb15ca14ddfbfc49eb`.

The actual route was `https://127.0.0.1:43882/en/dashboard/finance/receivables/history`, with the private fixture's `customerId` and selected opening-document reference. No historical `dateTo` was supplied. The actor was the separate auxiliary organization's native collector with current receivables read/collect permissions. The UI collection used the current November open period; it did not manufacture an October sale or change the clock.

Execution used Next **15.5.27** in development mode, the previously qualified dependency copy through a private junction, and a private schema-122 Prisma client resolution override. The dependency lock digest was `c5ffe4c81a85824f0aaaf4d8e29e8833670cc676b13c49f8b0baeaafc83d7235`. There was no clean installation, root Prisma generation, schema migration or production build. One combined bootstrap enforced loopback connections and the private client. Environment files and live provider credentials were excluded; delivery flags were disabled. The underlying monthly database qualification was the passed, stopped tracked-stock packet `pg-attempt-54a799a9fc`.

## Actual journey and controlled transitions

The runner continued actual same-origin traffic; it did not mock authentication, permission lookups, server actions or financial services. Controller handshakes only applied the explicitly reviewed authority changes and read-only financial assertions.

| Browser step passed, UTC | Actual result | Ordered controller transition acknowledged |
| --- | --- | --- |
| 15:32:34.446 | Real password sign-in, secure HttpOnly session cookie, selected opening receivable loaded and payment controls available. | None |
| 15:32:36.993 | Explicitly selected the native mobile-money receipt; amount, canonical reference and UTC calendar date matched. Selected a private supporting file for local fingerprinting. | 1. `stale-assurance`, 15:32:36.652 |
| 15:32:42.288 | Initial command required fresh authentication. Keyboard submission focused the current-password field. Actual password verification succeeded and left the same payment awaiting manual retry. Database comparison proved no collection had occurred yet. | 2. `verify-no-collection-before-manual-retry`, 15:32:42.059 |
| 15:32:46.803 | Clicked “Retry the same payment.” The actual collection completed and the controller verified exactly one new settlement and posted journal. | 3. `verify-one-collection`, 15:32:46.666 |
| 15:32:51.823 | A new manual draft was denied after collect permission was removed. Private payment form/selection/current-amount state cleared. A successful fresh read showed read-only history without provider previews or Record controls; receivables read remained granted. | 4. `revoke-collect-permission`, 15:32:48.594 |
| 15:32:53.860 | Restoring the exact original permission array and refreshing enabled a fresh manual draft, with no retained prior draft. | 5. `restore-collect-permission`, 15:32:52.435 |
| 15:32:56.121 | Deleting the exact current runtime session caused both the subsequent payment command and payment read to deny. Private widget state stayed hidden. | 6. `revoke-current-session`, 15:32:53.884 |

The assurance timestamp was aged on the actual signed-in session. This proves real password step-up gating and manual retry; it is not an independent expiry-only test of previously complete assurance. The two later denial drafts were manual and performed no further financial write; no extra provider receipt, login, collection or reversal was introduced to obtain a passing result.

## Financial verification

The controller verified one additional settlement and one additional posted journal in the auxiliary organization. Customer balance and the selected receivable's unpaid amount each fell by exactly 100.00 XAF, paid amount rose by 100.00 XAF, and the receivable lifecycle advanced once. The settlement had one allocation to the selected opening document and retained the selected file's fingerprint.

The existing native payment pointed to that settlement and the same original posting batch, with no legacy POS payment claim. Captured metadata matched its canonical provider account, provider event, provider transaction identity, method, amount and currency. The journal balanced at 100.00 XAF on each side and posted exactly 100.00 XAF net debit to the captured provider ledger account. One accounting source link and the matching APPLIED business event completed the source graph. These assertions were read-only after the actual UI command.

The primary October organization's journals/lines, batches, source links, periods, customer accounting facts, native payment facts, close runs and retained canonical database pack bytes stayed unchanged. The separate private October pack file's digest and size also stayed unchanged. After the verified UI collection, later permission/session denial stages left the auxiliary financial fingerprint unchanged.

## Screenshots and rendering limits

The actual browser used English, headless Edge, reduced motion, a **1440 × 1000** desktop viewport and one **390 × 1000** mobile capture. Five masked full-page captures were retained:

| Capture phase | Screenshot |
| --- | --- |
| Native receipt selected in the DOM | [Desktop drawer overview](attempt-078f797d05/native-selection-desktop.png) |
| Collection verified | [Desktop drawer overview](attempt-078f797d05/linked-collection-desktop.png) |
| Collection verified, mobile viewport | [Mobile drawer overview](attempt-078f797d05/linked-collection-mobile.png) |
| Collect-permission denial and read-only refresh verified | [Desktop drawer overview](attempt-078f797d05/collection-permission-denial-desktop.png) |
| Session command/read denial verified | [Desktop drawer overview](attempt-078f797d05/session-revocation-desktop.png) |

The drawer has an inner scroll area. Full-page capture shows its visible upper portion, so the payment form/selected confirmation or denial text can lie below that viewport. These screenshots are actual drawer/overview captures, not visual proof that every selected receipt field or denial message is visible in the image. Selection and denial proof comes from the actual DOM checks and controller/database assertions. The separate rendered 48-check projection packet cited by the main qualification report remains a distinct evidence class. This run does not claim French rendering, a screen-reader audit or comprehensive accessibility certification.

Observed traffic comprised one actual password-sign-in POST, two same-origin API GETs, thirteen protected server-action POSTs and thirty-six same-origin resource GETs. Two permitted HMR WebSockets were observed. Recorded auth/API/action transport statuses were 200; financial and denial outcomes were established by actual UI results and database checks, not by HTTP status alone.

## Privacy, retry and cleanup

The controller created one real credential for the fixture's collector after checking that no credential existed. Passwords, cookies, control file, support contents, browser TEMP/profile, raw app logs and private diagnostics remained under owned `.codex-tmp` paths. Public output contains statuses, digests and masked images, with no password, cookie, control-file hash, HAR, trace, storage state, request/response body or raw private error. The final actual session was revoked and the exact original collect permission array was restored. The synthetic credential and private diagnostic artifacts are retained in the isolated test context; they were not promoted to another environment.

The supporting file was selected through the actual UI, which computed and saved only its fingerprint. It was not uploaded or retained as an original supporting document. The native CONFIRMED/PROCESSED/signature-valid provider observations were synthetic external input facts. The linked settlement, posted journal and source graph were earned internally through the actual command. Live provider authenticity, upstream provider processing, original-document custody, statutory approval, hosted delivery and production deployment were not qualified.

The first attempt failed with a local connection permission denial before credential initialization, app startup, browser control creation or financial activity. It stopped the owned cluster and released both application ports. Root explicitly admitted the unchanged stopped retry in the broader local execution context; no database reset, source change or extra financial action was used. That failed attempt and its admission remain preserved.

Final receipts confirm the browser context/process closed, **zero owned profile directories remained**, the proxy and application stopped, the owned PostgreSQL cluster stopped, and both application ports **43881/43882** were free. No cleanup error was reported. The dedicated test database and evidence were retained. No product/root source was changed by this execution.
