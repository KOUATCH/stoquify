# Support request: intermittent Edge browser-control failures on Windows

Prepared 26 October 2026. Status: local draft, not submitted.

Please investigate intermittent debugger attachment and command timeouts in the Codex Browser integration with Microsoft Edge. A supported repair is needed that does not change organization-managed browser settings. Repeated navigation and screenshots remain unreliable despite successful individual captures.

## Environment and scope

- Windows desktop, Microsoft Edge via the Browser extension and documented CUA APIs.
- Browser plugin 26.1021.31345, checked in the earlier 26 October investigation.
- Earlier recorded versions, not reverified today: Edge 155.0.4283.62 and extension 1.26.1005.11759.
- Local Next.js preview at http://127.0.0.1:3101; routes /en, /en/workflows, /en/login and /en/register.
- The user reports Edge performance settings are disabled or organization-managed. No policy, security control, provider cache or process priority was changed.

## Reproduction

1. Select Edge using the documented browser API and create one task-owned tab.
2. Navigate to a ready local preview route and capture a screenshot.
3. Reuse that tab for the other three routes; repeat the sequence.
4. Check actual route completion and screenshot content. Success means two complete cycles without retries or debugger errors. This has not been achieved.

## Most useful observations

| Experiment | Result |
| --- | --- |
| Fresh chat, 25 October at 17:22:16.817 UTC (18:22:16.817 UTC+1) | First navigation failed: `Timed out after 10000ms waiting for CDP command Page.navigate.` Overall call 11.085 seconds; tab remained about:blank. |
| Same fresh-chat experiment | Blank screenshot succeeded in 0.236 seconds. Separate HTTP request returned 200 in 6.684 seconds. HTTP success is not browser-rendering proof. |
| Ready isolated preview, 26 October | Landing navigation succeeded in 11.694 seconds; valid website screenshot in 9.452 seconds. |
| Subsequent explicit-tab navigation, 26 October | `Debugger unattached` after 160 ms; requested navigation did not complete. |
| Latest bounded follow-up, 26 October | Edge discovery, selection, session naming and documentation retrieval succeeded. The next CUA invocation, containing tab creation followed by navigation to /en, exceeded 30 seconds and reset its kernel. No intermediate result was returned, so the blocked sub-operation and final page are unknown. Tool-reported duration: 30.3332 seconds. No screenshot was captured in this follow-up. |

Earlier failures also involved focus emulation, page/frame inspection and screenshot commands. Increasing the public navigation/locator timeout did not eliminate an inner command timeout. This is an observation, not proof of the underlying defect.

## Recovery attempts already tested

The user restarted Edge, reconnected the extension and reinstalled the Browser plugin. Fresh tabs, a fresh chat, foreground comparison, staged screenshot-before-navigation, and a separately started preview did not establish reliability. Native app control did not provide a verified recovery. Please avoid prescribing another identical restart/reinstall cycle without a new diagnostic reason.

## Confounders kept separate

- One localhost:3000 attempt returned connection refused; an isolated preview was then started on 127.0.0.1:3101. Cold compilation was slow. These are application availability observations, not an explanation for every debugger failure.
- A removed tab and a stale helper reference caused separate harness errors; they are not counted as debugger failures.
- CPU saturation was observed during both successful and failing operations. Scheduling and energy saving remain hypotheses.
- Mobile viewport usage was corrected by applying the supported override and reusing one task-owned tab. Historical captures of all four pages at 390 × 844 CSS pixels passed. This does not repair debugger timeouts.

## Requested assistance and acceptance

Please identify supported diagnostics for correlating debugger attach/detach and command deadlines, and provide a supported repair or confirmed product issue. The underlying cause is not established by this evidence. After repair, verify two complete desktop cycles and two mobile cycles across all four routes, saving screenshots and checking route identity and viewport dimensions. No form submission or account creation is needed.

## Local evidence available for review

- [Detailed 26 October report](report.md) and [structured results](results.json).
- [Valid 26 October landing capture](landing-cycle-1.jpg).
- [Fresh-chat reproduction report](../edge-fresh-chat-2026-10-25/report.md).
- [Earlier repeat-cycle evidence](../edge-reliability-2026-10-25/report.md).
- [Historical mobile verification](../public-contours-2026-10-17/verification.md).

These links refer to local files; the report text alone does not upload them. No raw logs, credentials, account identifiers, unrelated browsing content or screenshots are included in this draft. Additional evidence should be reviewed before transmission.

Official submission route checked on 26 October: the chat bubble at [OpenAI Help](https://help.openai.com), described in [How to contact support](https://help.openai.com/en/articles/6614161-how-can-i-contact-support). The [Browser extension guide](https://learn.chatgpt.com/docs/chrome-extension) documents connection troubleshooting. No support request has been sent.
