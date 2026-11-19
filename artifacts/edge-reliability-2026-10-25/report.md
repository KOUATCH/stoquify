# Edge reliability follow-up — 25 October 2026

Status: intermittent failure reproduced. No permanent repair proven; no managed settings changed.

## New findings

The installed Browser plugin is now 26.1021.31345, compared with 26.1013.40934 in the previous report. The update predates this attempt; it was not installed by this task. The active Stoquify preview was observed at http://localhost:3000, rather than the older port 3101. These environmental changes prevent treating this run as an otherwise controlled before/after experiment.

The first CUA documentation call timed out and reset its kernel. A subsequent inventory succeeded and found the connected Edge extension. Creating a fresh verification tab then timed out on Page.navigate at 10 seconds, leaving the tab blank. After another navigation reported detachment, tab metadata showed the landing page and a screenshot succeeded. A subsequent read-only DOM measurement failed before command dispatch; the next navigation reported Debugger unattached.

A second fresh tab recovered enough to capture workflow, login and registration. Workflow's initial navigation wait still timed out, although the page subsequently loaded. Login and registration navigation and screenshots passed twice. A repeated landing navigation failed at 10 seconds, leaving the registration page selected. Therefore, two complete successful four-page cycles were not achieved.

An additional supported API experiment wrapped a visible Stoquify home-link click in expectNavigation with a 30-second timeout, and also supplied a 30-second click timeout. It failed on an internal Runtime.evaluate deadline of approximately three seconds. The DOM still showed registration afterward. Increasing the public action/navigation timeout did not repair that inner debugger failure.

## Host and server observations

- A read-only OS sample reported 100% CPU across eight logical processors and about 2.9 GiB free memory.
- A short interval sample attributed substantial CPU use to Node, Git and PowerShell processes. Some had exited by the subsequent inspection; one surviving Node process was classified as a Next.js server/build.
- No unrelated process was terminated or reprioritized.
- A read-only HTTP request to /en/login returned 200 after 7.946 seconds. This is server-response evidence, not rendered browser verification.
- Native Edge accessibility was unavailable; its screenshot returned Codex content and was rejected as website evidence. A native focus check timed out while obtaining window state.

CPU contention is a hypothesis, not a proven cause. The exact latency source remains unresolved. Current evidence supports locating the observed failure at the browser-control/debugger boundary, but does not establish a specific vendor defect or justify changing application code.

## Saved screenshots

These are current desktop Edge viewport captures. No mobile override was applied in this follow-up. Earlier mobile evidence remains in ../public-contours-2026-10-17/.

- landing-recovery.jpg
- workflow-cycle-2.jpg
- login-cycle-2.jpg
- register-final.jpg

Registration's initial screenshots were captured before the complementary panel finished appearing. The final capture includes that content. No form was submitted. Current application content has changed since the earlier October 20 captures; this follow-up makes no full visual-regression or accessibility certification.

## Next supported recovery experiment

[OpenAI's browser extension troubleshooting](https://learn.chatgpt.com/docs/chrome-extension) recommends starting a fresh Work or Codex chat to clear chat-specific connection state. This was not equivalent to the fresh tabs or REPL reset attempted here. The user was asked for explicit authorization because the task-creation tool requires it. This remains an experiment, not a verified fix.

If authorized, use a fresh chat in the same Stoquify project. Read this report and results.json, use Edge through CUA, and create one task-owned tab. Run at least two cycles through /en, /en/workflows, /en/login and /en/register. Record navigation duration, errors, actual resulting URL and a screenshot for each page. Do not hide failed attempts behind retries. Keep managed settings and unrelated user tabs/processes untouched. A run with failures does not pass reliability acceptance. If failures persist, preserve the evidence for the vendor's documented feedback/support route; do not send externally without authorization.

No application source, database, browser management policy or provider cache was changed. Detailed measured operations are in results.json; initial bootstrap/native failures are recorded separately there.
