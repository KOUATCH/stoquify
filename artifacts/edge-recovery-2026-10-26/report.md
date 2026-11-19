# Edge recovery repeat — 26 October 2026

**Acceptance not met: 0 of 2 complete cycles. The first Edge navigation reproduced the 10-second Page.navigate timeout. No repair established.**

This was a repeat within chat `01a17413-e483-7f83-b9d1-398c290db867`, originally created for the fresh-chat experiment. It was not another newly created chat. Yesterday's fresh-chat failure remains separately recorded in `../edge-fresh-chat-2026-10-25/`.

## Scope and provenance

Read AGENTS.md, the current workflow and runner/registry definitions, plus the previous reliability report/results and earlier public-contours support report. Skill routing, design master, public/auth contract and verification lanes had already been read in this chat. No design or application changes were made.

Source revision: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`. Before this run, Git reported 234 modified entries and 536 untracked entries. Unrelated changes were preserved.

The supported CUA inventory showed Edge connected as extension browser ID `3`, extension instance `4479253f-ba43-4f7d-bba9-adad78c8a0af`. The current browser API, local-preview, screenshot and troubleshooting documentation were read. Plugin version 26.1021.31345 is historical evidence from the preceding run, not a version independently verified today. No other browser or native UI was used.

## Preview setup and availability

The initial read-only HTTP GET to `http://localhost:3000/en` failed with connection refused after 4.727 seconds. The previous preview was unavailable.

The existing development runner, npm hooks, Prisma helper and Next configuration were inspected before starting a temporary local preview. This was a setup change for verification, not a claimed browser repair. The runner creates isolated build output, uses a separate generated tsconfig and runs no migrations.

1. `npm run dev -- --hostname 127.0.0.1` failed because npm passed only `127.0.0.1`, which Next interpreted as a nonexistent project directory. It allocated `.next-dev-session-nb5mDy`. The pre-hook confirmed Prisma Client was current and reused it unchanged.
2. The inspected helper was then invoked directly as `node scripts/dev-app-safe.js --hostname 127.0.0.1`. It allocated `.next-dev-session-c33rH5`, bound to loopback port 3000 and reported ready after 37.7 seconds. Next reported version 15.5.27.
3. A cold HTTP probe timed out after 45.138 seconds. The server later reported landing compilation completed in 97 seconds. Browser testing began only after that compilation message.
4. A separate post-compilation HTTP probe timed out after 30.173 seconds. The server log also reported `GET /en 200 in 26728ms` and `GET /en 200 in 134621ms`; those log lines cannot be equated to successful client receipt by the timed-out probes.

Therefore, timely client-visible preview availability was **not established** in this run. Server startup/compilation, HTTP-response latency and browser control are separate evidence classes. Local preview latency is a confounder; this run cannot isolate a vendor defect or an application root cause.

The temporary server was stopped through its own terminal with Ctrl+C. Its task-owned generated output and tsconfigs were removed successfully by exact names after resolving them inside the workspace. No unrelated process or build directory was targeted. Git showed no content diff for shared `tsconfig.json` or `next-env.d.ts` after startup.

## Browser measurements

Intended order: landing `/en`, workflows `/en/workflows`, login `/en/login`, register `/en/register`, repeated twice in one task-owned tab. Locale: EN; role: public visitor, no authentication attempt. No viewport override or managed setting change was applied. Timestamps are UTC; client local time is UTC+01:00.

| Started UTC | Attempt | Duration | Result |
| --- | --- | --- | --- |
| 08:21:51.404 | Create Edge tab and navigate to `http://localhost:3000/en` | 13.462 s | Failed: `Error: Timed out after 10000ms waiting for CDP command Page.navigate.` |
| 08:22:22.633 | Screenshot after failure, without another navigation | 20.830 s | Succeeded; actual URL and title `about:blank` |

The creation duration includes the supported `cua.createBrowserTab` call. The task tab ID was `1861544048`; session name was “🔎 Edge recovery 26 Oct”. Its metadata was inspected through the supported API. The resulting JPEG was saved and visually inspected: a dark blank surface with no Stoquify content. It is a failure screenshot, not a landing-page screenshot. Closing this tab succeeded in 0.033 seconds.

![Blank tab after failed navigation](failed-landing.jpg)

No second navigation, alternate browser, native-control attempt or repeated browser retry was made after recurrence.

## Missing checks

- Cycle 1 landing rendered page identity and website screenshot: missing; only blank-tab evidence obtained.
- Cycle 1 workflows, login and register navigation/screenshots: not attempted after failure.
- Cycle 2 all four routes: not attempted after failure.
- Complete successful cycles: **0/2**. All four fresh website screenshots are unavailable. Historical images were not relabelled as fresh.

## Verification and interpretation

- **Source inspection:** workflow runner, lifecycle hooks, development runner, Prisma-generation helper and Next configuration reviewed. No application functionality certified from source.
- **Workflow contract:** `npm run agent:workflow:check` passed, exit 0; 196 package scripts outside the reviewed manifest.
- **Mocked/unit tests:** not run; no application source changes.
- **Real database tests:** not run; no migration or fixture commands.
- **Rendered/browser evidence:** first navigation failed; blank screenshot captured and inspected. No authentication, accessibility or visual-regression certification.
- **HTTP evidence:** initial connection refusal and two timeouts retained in the JSON records; server-side 200 log messages recorded separately.

The same reported browser navigation deadline recurred. A successful blank-tab screenshot does not demonstrate reliable website navigation. The slow preview and changed startup state limit comparison with yesterday. CPU contention, chat-specific state and other scheduling explanations remain unproven; no permanent repair is claimed.

Managed settings, security controls, provider caches and process priorities were untouched. No internal Edge settings navigation, raw CDP, registry/profile edits or shell browser automation was used. No forms were submitted, accounts created, or reports sent externally. The [OpenAI browser extension troubleshooting guide](https://learn.chatgpt.com/docs/chrome-extension), read in the prior turn, was the basis for the original fresh-chat experiment, not evidence that it repaired this run.

`results.json` consolidates setup, measurements, missing checks and cleanup. `checks.json` contains each browser attempt; `http-preview.json` and `http-after-compilation.json` retain the two timed-out HTTP checks. This local record is ready for support review if external sending is later authorized.
