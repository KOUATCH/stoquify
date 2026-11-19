# Authenticated retained-close document journey — 10 November 2026

Status: **PASS — actual local development application**, with six completed checks, four controlled authority transitions and two exact original-document downloads. This is separate from the mocked rendered fixtures, PostgreSQL lifecycle qualification and any production artifact or hosted release.

The parent-owned application-ready handoff identified source manifest `07557c8056042d904168ce86d309b4fe9e786241329b4c411d0ea9fdfe2608d4`, origin `https://127.0.0.1:43872` and the isolated earned-close database. The application reused qualified dependencies and a separately generated schema-bound Prisma client through an explicit module override. The browser used the actual English login-v2 form, actual BetterAuth password session, actual close-period route and protected server actions. Authentication and actions were not mocked.

## Executed checks

| Check | Observed result |
| --- | --- |
| Actual password login and close-period route | Successful sign-in; secure HttpOnly session-cookie attributes verified without retaining its value. |
| Latest retained certified receipt | Original JSON recovered through the UI after real password step-up and manual retry. |
| Expired password assurance | The controlled current session required another real password step-up; verification did not automatically retry the download. Manual retry returned the same bytes. |
| Suspended close module | Actual recovery denial removed the private workspace, drafts and receipt list; no file downloaded. |
| Restored close module | A new successful protected read restored access with the draft cleared. |
| Revoked actual runtime session | Actual recovery denial removed private cached content and displayed sign-in recovery; no file downloaded. |

Both downloads were valid UTF-8 JSON, **96,834 bytes**, and matched the private retained original byte-for-byte. Their document digest was `sha256:6a20e8fd9babd4230d1103c207e5ed2c516d737bf909217b55413732c196bafc`.

The recorded current-certification badge remained visible before recovery and after password assurance renewal; the certified-export button was disabled. These are observed presentation states. Historical retrieval does not establish a new financial approval or create a new certification. Earlier financial invalidation and recertification are qualified separately by the PostgreSQL lifecycle cases.

The browser recorded 64 same-origin requests, two owned HMR websocket connections, zero external requests, zero uncaught page errors and zero console errors. Installed headless Edge, its context and owned private profile closed successfully; no profile directory remained. The browser wrote the private `FINISHED.json` acknowledgement with `passed: true`. The parent controller owns application/database shutdown and financial-invariant verification.

## Evidence and visual review

- [Result](attempt-4a55df136f/RESULT.json): SHA-256 `24a7038f727118e180913398dffc04a3b597a6bb5c1632d9d26566fdde8d2040`.
- [Inspected source binding](attempt-4a55df136f/SOURCE_BINDING.json): SHA-256 `dc648d7af48008efa53cf23a84705fa14b914494faf322c6d55e14d873b4a066`; all bound source hashes were rechecked after execution.
- Reviewed browser runner: SHA-256 `aef5d46980c0403003db198a85d7b9bf6f6cd0e564ce03c59e159fe04695d70e`.
- [Retained-copy desktop screenshot](attempt-4a55df136f/authenticated-retained-original-1440.png).
- [Retained-copy mobile screenshot](attempt-4a55df136f/authenticated-retained-original-390.png).
- [Password-assurance recovery screenshot](attempt-4a55df136f/authenticated-stale-password-assurance-recovery-1440.png).
- [Module denial screenshot](attempt-4a55df136f/authenticated-module-denial-1440.png).
- [Session denial screenshot](attempt-4a55df136f/authenticated-session-denial-1440.png).

The mobile retained-copy overview and desktop session-denial screenshot were visually inspected. The mobile layout retained the close evidence and recovery controls in a single scrolling column; the desktop denial showed recovery actions with the private close workspace removed. This run did not execute an accessibility audit, French interactions, mobile authority transitions, overflow measurements or a production build. The separate rendered fixtures supply their own EN/FR and responsive evidence.

Credentials, cookie values, document bodies, private control-file hashes, browser traces and network bodies were not published. Original/downloaded documents, the credential fixture and transient browser profile stayed under the parent's private workspace directory. No production target, provider delivery, schema promotion, deployment or statutory approval was exercised.
