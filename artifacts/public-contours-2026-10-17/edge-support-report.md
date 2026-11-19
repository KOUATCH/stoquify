# Intermittent Edge browser-control timeouts

Date: 2026-10-20. Status: unresolved; no permanent repair applied.

## Environment

- Edge executable: 155.0.4283.62.
- Browser extension: 1.26.1005.11759.
- Browser plugin / Codex: 26.1013.40934; Codex build 20770, production channel.
- Codex's configured updater reported up_to_date.
- Local application origin: http://127.0.0.1:3101.
- Browser and legacy Chrome service files have identical SHA-256 hashes:
  B352A10A7CCF2273CD5062516E82178A62E3F6CD197148B3F4EF97D2B776BF60.

## Reproduction and observed results

Using the supported Edge browser-control connection, open one task-owned tab
and navigate among /en/login, /en/register, /en/workflows and /en, capturing a
screenshot after each navigation. Failures are intermittent.

A background login screenshot failed on Emulation.setFocusEmulationEnabled,
reporting a 10-second debugger-command deadline. Overall call duration was
33.77 seconds.

After the user confirmed Edge was foregrounded:

| Operation | Result | Duration |
| --- | --- | --- |
| Login screenshot | Passed | 36.653 s |
| Navigate register | Passed | 8.209 s |
| Register screenshot | Passed | 15.405 s |
| Navigate workflows | Passed | 11.530 s |
| Workflows screenshot | Passed | 12.957 s |
| Navigate landing | Navigation wait timed out | 10.488 s |
| Landing screenshot | Passed; navigation had completed | 2.162 s |
| Navigate login again | Navigation wait timed out | 10.681 s |

Continuous foreground state was not independently observable. This is not a
controlled demonstration that foregrounding repairs the connection.

Earlier failures also affected a static SVG document and commands including
Page.getFrameTree, Runtime.evaluate and Page.captureScreenshot. Tab metadata
could remain available while debugger operations failed. The evidence does not
establish that Stoquify application code causes the timeouts.

## Investigations already performed

- User restarted Edge, reconnected the extension and reinstalled the plugin.
- Fresh browser sessions/tabs did not eliminate intermittent failures.
- Installed runtime files matched; no supported Codex update was offered.
- CPU saturation and some Idle-priority Edge processes were observed, but
  operations also succeeded during CPU saturation. These observations do not
  prove a scheduling or energy-saving cause.
- No provider-owned code, native-host registration, process priority or
  browser management policy was modified.

## Managed-setting boundary

A site-specific "Always keep these sites active" exception was proposed as an
experiment, not an established repair. The browser tool rejected navigation to
internal Edge settings under its HTTP(S)-only URL policy. No alternate access
path was attempted.

The user reports the setting is disabled or marked "managed by your
organization." No exception was applied. An administrator would need to assess
whether this experiment is permitted; overriding management controls is not an
appropriate repair. This restriction does not establish the timeout's cause.

## Request for browser integration support

Investigate intermittent debugger-command completion and navigation-wait
deadlines with the versions and timings above. The local record
edge-reliability-diagnosis.json contains the exact observed errors.

Repair acceptance should include repeated navigation and screenshot cycles
without retries, with route completion and viewport dimensions checked on each
page. This acceptance criterion has not been met.

## Separate completed viewport and visual checks

The viewport API targets the active task-session tab. Setting the documented
390 x 844 viewport with no task-owned tabs, then opening one tab and reusing it
for all four routes, produced the requested dimensions on every route.
This corrected API usage does not repair the debugger timeout.

The four mobile captures are landing-mobile-en.jpg, workflow-mobile-en.jpg,
login-mobile-en.jpg and register-mobile-en.jpg. The contour motif was visible
on all four, without horizontal document overflow. These are responsive Edge
checks, not tests on a physical phone. See verification.md for detailed scope.

This report was prepared locally; it has not been sent to support or an administrator.
