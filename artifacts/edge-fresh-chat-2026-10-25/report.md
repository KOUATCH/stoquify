# Edge fresh-chat recovery experiment — 25 October 2026

**Result: failure reproduced on the first navigation. No repair proven.** Two complete four-page cycles were not achieved. Repetitive navigation retries stopped at the first recurrence, as requested.

## Experiment and provenance

- Fresh chat: `01a17413-e483-7f83-b9d1-398c290db867`.
- Originating chat: `01a1491c-9a5e-78a3-b2a2-647195f18a8a`.
- Source revision: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`, with extensive pre-existing working-tree changes. This task changed no application source.
- Edge extension browser ID `2`; extension instance `4479253f-ba43-4f7d-bba9-adad78c8a0af`.
- Browser plugin version 26.1021.31345 was reported by the preceding task; this run did not independently recheck the installed version. Earlier evidence recorded 26.1013.40934.
- Read repository AGENTS.md, workflow, skill routing, verification lanes, command registry, design master and public/auth contract. This is browser-control diagnosis, not a UI redesign or accessibility audit; no design skill was needed.
- Read the preceding `../edge-reliability-2026-10-25/report.md` and `results.json`, and `../public-contours-2026-10-17/edge-support-report.md`.
- Discovered browser state through CUA, selected Edge, and read its current API, screenshot, local-web-development and troubleshooting documentation. Other browsers were not used.

[OpenAI's browser extension guide](https://learn.chatgpt.com/docs/chrome-extension), checked during this run, recommends a new Work or Codex chat as a troubleshooting step that can clear chat-specific connection state. This run tested that step; it did not establish that connection state was the cause.

## Procedure and measured browser results

The intended route order was `/en`, `/en/workflows`, `/en/login`, `/en/register`, repeated twice in one task-owned tab. No viewport override was applied. One new Edge tab was created with the session name “🔎 Edge fresh-chat test”. All timestamps below are UTC; local client time is UTC+01:00.

| Started UTC | Operation | Duration | Result and actual page |
| --- | --- | --- | --- |
| 17:22:16.817 | Create tab and navigate to `http://localhost:3000/en` | 11.085 s | Failed: `Error: Timed out after 10000ms waiting for CDP command Page.navigate.` |
| 17:22:38.319 | Capture resulting viewport without another navigation | 0.236 s | Screenshot succeeded; actual URL and title both `about:blank` |

The first duration includes the supported `cua.createBrowserTab` call, not merely the internal navigation command. Tab ID was `1861543891`. After failure, the supported task-tab listing and URL/title methods confirmed `about:blank`. The screenshot was saved and visually inspected: an empty dark surface with no Stoquify content. It is **failure evidence**, not a landing-page capture. No navigation retry, alternate control mechanism or second tab was used.

Closing only this task-owned tab succeeded in 0.020 seconds. Unrelated tabs were untouched.

![Blank Edge tab after failed landing navigation](failed-landing.jpg)

## Preview availability, measured separately

The first read-only HTTP probe was blocked by the shell sandbox's local-socket permission after 1.681 seconds. That attempt is retained in `http-preview.json`; it is not evidence of a server failure.

The approved unsandboxed read-only GET to `http://localhost:3000/en` returned HTTP **200** in **6.684 seconds**, with the same resulting URL and title “Stoquify | Sales, stock, HRIS and OHADA accounting”. Its record is `http-preview-escalated.json`.

This confirms the existing preview responded at that time. HTTP response success does not establish browser rendering, client hydration or navigation reliability. No server was started or restarted. No authentication form was submitted and no account was created.

## Missing checks and conclusion

| Check | Status |
| --- | --- |
| Cycle 1 landing navigation | Failed |
| Cycle 1 landing rendered identity and website screenshot | Missing; only blank-tab failure screenshot available |
| Cycle 1 workflows, login, register navigation and screenshots | Not attempted after the failure |
| Cycle 2 landing, workflows, login, register navigation and screenshots | Not attempted after the failure |
| Complete successful cycles | 0 of 2 required |

All four fresh website screenshots are unavailable in this run. Historical screenshots were not copied or relabelled as fresh evidence.

The fresh chat did not eliminate the observed failure in this bounded attempt. Recurrence in a new chat weighs against treating the previous chat alone as a sufficient explanation, but it does not identify the root cause. The failure was reported at the browser-control navigation boundary. Successful screenshot capture of a blank tab does not demonstrate reliable page navigation. CPU load and browser scheduling were not measured here; earlier CPU observations remain unproven hypotheses.

## Verification classes and boundaries

- **Source inspection:** repository workflow runner and npm lifecycle references inspected before execution; no application behavior certified from source.
- **Workflow contract:** `npm run agent:workflow:check` passed, exit 0; 196 package scripts remain outside the reviewed manifest. This is repository-contract evidence only.
- **Mocked/unit tests:** not run; no application code changed.
- **Real database tests:** not run.
- **Rendered/browser checks:** failed navigation and visually inspected blank-tab screenshot only. No full visual, responsive, accessibility or authentication certification.
- **HTTP check:** successful landing GET, separately recorded above.

Managed settings, security controls, provider caches, process priorities and unrelated processes were unchanged. No internal Edge settings page was visited; no raw CDP, native UI or shell browser automation was used. The shell HTTP request was only a server-availability probe. No report was sent externally.

This directory contains the support-ready local record. `results.json` consolidates the attempt, missing checks, preview probe and cleanup; `checks.json` preserves browser operations. The precise recurrence and chat ID can support the vendor's documented feedback/support route if the user later authorizes sending it. No further restart/reinstall experiment is supported by new evidence from this run.

Rollback is limited to removing this task-owned artifact directory if desired; no application or browser configuration rollback is needed.
