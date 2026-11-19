# Support draft: intermittent Edge control failures, now failing discovery

Prepared 26 October 2026. **Local draft only; not sent.**

Please investigate repeated failures in the supported CUA browser integration on Windows with Microsoft Edge. A new chat did not eliminate navigation timeouts. In the latest attempt, browser discovery itself timed out before a browser could be selected or any navigation requested.

## Identifiers and version provenance

- Diagnostic chat: `01a17413-e483-7f83-b9d1-398c290db867`.
- Originating chat: `01a1491c-9a5e-78a3-b2a2-647195f18a8a`.
- Last successfully observed Edge extension instance: `4479253f-ba43-4f7d-bba9-adad78c8a0af`.
- Browser plugin 26.1021.31345 was recorded in the preceding diagnostic reports; earlier failures occurred with 26.1013.40934. No version could be re-established through the failed discovery calls in this latest attempt.
- Source revision recorded by earlier runs: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`, with substantial pre-existing uncommitted work. This diagnostic does not change application source.

## Latest minimal observation

An independent public-page baseline was planned to remove the local application's response latency from the navigation test. It could not begin:

| Supported call | Tool wall time | Result |
| --- | --- | --- |
| `cua.getState()` | 31.9966 s | `js execution timed out; kernel reset, rerun your request` |
| `cua.listBrowsers()` following the automatic reset | 31.9165 s | Same timeout/reset result |

These durations are reported tool wall times, not internal debugger command durations. The calls preceded the record timestamp of 13:26:40 UTC (14:26:40 client local time). Exact per-call start timestamps were not captured. The second call requested a 30,000 ms tool timeout.

No browser was selected, tab created, page navigated, or screenshot attempted in this latest run. No public-site test passed. Further discovery retries stopped after the two failures. Current browser state and rendered page identity are unknown.

This demonstrates that the present discovery failure can occur without requesting Stoquify navigation. It does **not** identify its cause or rule out host-wide contention, transport/session initialization, or integration issues.

## Earlier reproduction, kept distinct

| Run | Evidence | Limitation |
| --- | --- | --- |
| 25 October, original follow-up | `Page.navigate` deadline; detached/unattached debugger errors; inner `Runtime.evaluate` deadline despite explicit 30-second action timeout | Intermittent screenshots succeeded; CPU saturation observed but causality unproven |
| 25 October, newly created chat | First landing creation/navigation failed on a 10-second `Page.navigate` deadline; tab stayed blank. Separate HTTP GET returned 200 in 6.684 s | Fresh-chat recovery failed this bounded attempt; permanent cause unknown |
| 26 October, repeat in the same diagnostic chat | Same `Page.navigate` deadline; blank screenshot succeeded in 20.830 s | Local preview was initially absent, then slow after startup; client HTTP probes timed out |
| 26 October, originating chat staged-attachment experiment | Blank screenshot preflight succeeded; a prepared preview on port 3101 rendered the landing page and was captured; later explicit-tab navigation returned `Debugger unattached` | A tab disappearance had unknown cause. A helper retaining an old tab reference was recorded separately as a harness issue, not a provider defect |

The staged-attachment report also records HTTP 200 responses for workflows, login and register on the isolated preview. Those are server checks, not rendered browser checks. No run completed two reliable cycles through all four pages.

## Steps already attempted and constraints

The user previously restarted/reconnected/reinstalled several times. Prior attempts included fresh tabs, a fresh chat, explicit longer public action/navigation timeouts, and staged screenshot preflight. None established reliable repeated control.

The browser tool rejected internal Edge settings navigation under its HTTP(S)-only policy. The user reports the performance setting is managed. No workaround through native UI, registry, profiles, raw CDP or shell browser automation was used to bypass that restriction. No managed/security setting, provider cache or process priority was changed. No additional restart/reinstallation is proposed without new diagnostic evidence.

This latest run did not start or stop any server or alter other tasks' browser tabs/processes. A prepared preview was reported as left running by the originating chat; its present availability was not rechecked here because control discovery was already blocked.

## Requested support investigation

1. Correlate the chat/session identifiers with the two latest discovery timeouts and determine whether they stall during initialization, transport, enumeration or another stage.
2. Correlate prior navigation failures with debugger attachment lifecycle and the approximately 10-second navigation / 3-second inner evaluation deadlines.
3. Specify a supported diagnostic collection procedure and, if applicable, a confirmed fixed version or supported recovery step. Do not assume increasing the outer timeout addresses the inner failure.
4. Separate task-tab lifecycle/reference failures from debugger-command timeouts when assessing the evidence.

Acceptance remains two complete cycles in one task-owned Edge tab through landing, workflows, login and register, with successful navigation, actual URL and page identity checks, and screenshots on each visit. Failures must remain visible rather than being hidden by retries.

## Local evidence index

- Latest: [structured discovery results](results.json).
- [Fresh-chat report](../edge-fresh-chat-2026-10-25/report.md) and [results](../edge-fresh-chat-2026-10-25/results.json).
- [Repeat report](../edge-recovery-2026-10-26/report.md) and [results](../edge-recovery-2026-10-26/results.json).
- [Staged-attachment report](../edge-staged-attachment-2026-10-26/report.md) and [results](../edge-staged-attachment-2026-10-26/results.json); its `landing-cycle-1.jpg` is earlier rendered evidence, not a screenshot from this latest attempt.
- [Original follow-up](../edge-reliability-2026-10-25/report.md) and [earlier support report](../public-contours-2026-10-17/edge-support-report.md).

The repository workflow contract passed in the preceding runs. No application tests or database tests were run for this artifact-only follow-up. No new screenshot is available. No report has been submitted externally; external transmission requires separate authorization.
