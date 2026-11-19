# Public contour motif — 17 October 2026

## Design decision

Selected sculpted contours: an asymmetric folded current with blue/teal lines,
soft light and restrained gold highlights. It suggests connected business flows
while leaving the main reading area quiet.

Alternatives considered: orbital ribbons (strong identity but competing crossings
around workflow diagrams) and translucent forms (atmospheric but less distinctive
at small sizes). The selected design is static CSS with a 1,579-byte SVG mask,
with lower intensity on secondary sections and authentication pages.

## Implementation scope

- Landing and workflow pages opt into `public-contour-page`.
- Login/register variants opt into `auth-contour-shell`.
- Recovery variants keep their existing grid.
- One shared stylesheet and SVG asset; no new dependency or JavaScript runtime.
- Decoration uses isolated negative layers and `pointer-events: none`.
- No animation or parallax; forced-colors mode removes the decoration.
- Mobile uses a separate mask alignment and reduced intensity.

## Source verification

Source revision: `b0447642`, with existing unrelated local changes preserved.

- `npm run agent:workflow:check`: passed.
- PostCSS parsing of changed/shared CSS: passed.
- TypeScript parsing of changed TSX: passed.
- SVG XML parsing: passed.
- Scoped `git diff --check`: passed (existing CRLF normalization warning only).
- Isolated server: SVG returned HTTP 200 with `image/svg+xml`, 1,579 bytes.
- UI/UX Pro Max focused search: `ux-guidelines.csv`, Typography / Contrast
  Readability and Accessibility / Color Contrast. Applied the general readability
  principles; no framework migration or suggested palette was adopted.

Mocked unit tests and database tests were not run for this decorative change.
Syntax checks do not establish rendered appearance or accessibility compliance.

## Browser verification

The four-page browser acceptance check remains incomplete. The existing server at port 3000 timed out
without an HTTP response. Normal `npm run dev -- --port 3101` failed during
Prisma generation because the existing Windows engine DLL was locked (EPERM).
For public UI verification only, the inspected isolated launcher was run with
the existing generated client:

`node scripts/dev-app-safe.js --port 3101 --hostname 127.0.0.1`

This uses `.next-dev-session-WbVA81` and its sibling session TypeScript config.
It is not evidence that Prisma generation, database integration, or auth
submissions pass. The isolated Next 15.5.27 server reached ready state.
The landing route compiled successfully (1,650 modules).

The existing port-3000 landing eventually rendered the new motif. Browser DOM
inspection confirmed `public-contour-page`, the new SVG mask, and opacity 0.24.
However, its viewport was 231 x 414, with horizontal overflow, and the browser
viewport control timed out. `landing-narrow-preview-en.jpg` records this diagnostic
state; it is not a desktop or responsive acceptance screenshot. Navigation,
viewport changes and duplicate-tab cleanup repeatedly failed with browser-control
timeouts. A switch to Edge was offered to complete the requested captures.

The user authorized Edge. A dedicated Edge tab opened at
`http://127.0.0.1:3101/en`; the browser inventory reported the Stoquify title and
URL, and the isolated server logged HTTP 200. However, attaching to the tab,
reading its DOM, and capturing its screenshot all timed out on
`Emulation.setFocusEmulationEnabled`. The documented browser/tab API was also
tried after selecting Edge, with the same failure. Metadata and HTTP success
are not visual acceptance evidence. No valid desktop screenshots were produced
by this Edge attempt; browser connection recovery is required to continue.

| Page | Browser acceptance |
| --- | --- |
| Landing | Motif rendered at 231px; normal desktop/mobile checks pending |
| Workflow | Pending |
| Login | Pending |
| Registration | Pending |

EN/FR, normal desktop/mobile dimensions, both auth themes, keyboard focus and
rendered contrast checks remain pending. No claim of four-page visual completion.

No account creation, authentication submission, schema migration, seed, deployment,
or commit is part of this verification.

## Resumed verification — 20 October 2026

Current source revision: `6ee84a90`, with unrelated local changes preserved.
The landing route now renders `CinematicLanding`, and the workflow has a new
cinematic layout. Both had lost their `public-contour-page` opt-in. Restored the
class on these current main elements and added a pointer-transparent, decorative
contour layer above the landing hero photograph and below its text. Login and
registration still use `auth-contour-shell`.

- Source: changed TSX and shared CSS parse successfully; scoped diff whitespace
  check passes (CRLF normalization warnings only).
- Workflow contract: fails on pre-existing reviewed-file drift for
  `test:prisma:restart -> scripts/prisma-dev-restart.ps1`. No registry hashes or
  unrelated scripts were changed to suppress this failure.
- Browser: the reconnected Edge extension can list/create tabs, but navigation
  and screenshots still time out on `Emulation.setFocusEmulationEnabled`.
  No new screenshot or visual acceptance is claimed.
- Preview: the first isolated terminal server exited unexpectedly. A hidden,
  task-owned background server (parent PID 39408) reached ready on port 3101,
  with isolated output `.next-dev-session-hRKXAR`.
- User chose to keep using Edge. The alternate documented CUA attachment
  reached `DOMSnapshot.captureSnapshot` but timed out; subsequent navigation
  and screenshot attempts also timed out. Chrome DevTools was not used.
  All four normal-viewport screenshot checks remain blocked.

### After the full Edge restart

The user reported restarting Edge and reconnecting its extension. The preserved
tab could not be attached to this session. A fresh review tab loaded
`http://127.0.0.1:3101/en` and reported the Stoquify title, but its screenshot
request again timed out on `Emulation.setFocusEmulationEnabled`. This reproduces
the browser-control failure independently of the old tab. No new visual fixes,
screenshots, or four-page acceptance are claimed from this attempt.

## Edge connection diagnosis — 20 October 2026

The user authorized diagnosis and repair of the connection. The control runtime
was reset and initialized again. The installed Browser plugin's
`docs/chrome-troubleshooting.md` was read, and its documented diagnostics were
run outside the sandbox's redirected profile:

| Diagnostic | Result |
| --- | --- |
| `node scripts/check-extension-installed.js --browser edge --json` | Exit 0; Default profile; installed, registered, enabled; no disable reasons; extension version `1.26.1005.11759_0` |
| `node scripts/check-native-host-manifest.js --browser edge --json` | Exit 0; native-host name, registry path, manifest and allowed origins correct |
| `node scripts/chrome-is-running.js --browser edge --json` | Exit 0; Edge running |
| `node scripts/open-chrome-window.js --browser edge --json` | Exit 0; opened the verified Default profile using the documented recovery helper |

After recovery, tab listing showed the authorized `/en/login` page with the
Stoquify title. DOM inspection still timed out on `Page.enable`. Earlier calls
failed on `Page.navigate` and `Emulation.setFocusEmulationEnabled`.
This narrows the observable failure to page/debugger control; it does not prove
the underlying cause. Desktop logs did not establish a specific repairable cause.
An empty-page diagnostic capture was rejected by URL policy; no workaround of
that policy was attempted.

No browser profile, provider cache, native-host registration, extension
permissions or unrelated process was modified. No raw CDP or alternate browser
was used. The documented next recovery step is reinstalling the Browser plugin
through the app's plugin UI. There is no supported reinstall/repair action
exposed to this session. All four visual acceptance checks and screenshots remain
incomplete; tab titles are not visual evidence.

### After Browser plugin reinstall — 20 October 2026

The user reported reinstalling the Browser plugin. A fresh Edge session created
tab `1861542215` and attempted the landing URL on port 3101. The navigation call
timed out and reset the tool kernel; a subsequent session listing confirmed the
tab had reached `/en` with the Stoquify title. The preview server log records a
successful `GET /en` response.

- Screenshot capture failed after waiting 10000ms for
  `Emulation.setFocusEmulationEnabled`.
- A separate DOM snapshot failed after waiting 3000ms for the same command.
- Reinstalling the plugin has therefore not restored page inspection or capture.
  The underlying cause remains undetermined.
- No new screenshots, visual fixes, or rendered acceptance are claimed.
  Landing, workflow, login and register verification remains incomplete.
  No application files or browser settings were changed during this attempt.

## Successful desktop capture and remaining connection issue — 20 October 2026

This section supersedes the earlier statement that no four-page captures exist.
Source revision remains `6ee84a90`, with unrelated working-tree changes preserved.

### Connection diagnosis

- Installed Edge executable: `155.0.4283.62`; ChatGPT extension:
  `1.26.1005.11759`.
- Read-only inspection of the installed Browser service and extension showed
  that attachment enables focus emulation before page inspection. The reported
  timeout is generated by the extension while awaiting
  `chrome.debugger.sendCommand`, rather than by Stoquify.
- Tab listing remained responsive. A fresh tab successfully navigated to the
  static contour SVG and captured it, then captured the actual login route.
  Subsequent navigation, DOM inspection, keyboard interaction and captures also
  succeeded, interspersed with debugger timeouts.
- Host CPU measured 100% both during failures and after successful captures;
  free physical memory was approximately 2.5 GiB. Resource pressure is a plausible
  contributor, not a proven root cause or a verified permanent fix.
- Supported recovery used fresh task-owned tabs and inspection of the actual
  URL after delayed navigation. No provider code, native-host registration,
  browser security settings, process priorities or unrelated processes changed.
- The connection is usable intermittently, **not permanently repaired**.
  A successful screenshot does not establish that its timeout cause is fixed.

### Visual fix

Both authentication pages initially showed a dark wordmark against the dark
canvas before React hydration selected the dark logo. Changed only the logo
rendering in `components/auth/AuthLayout.tsx` to use CSS light/dark visibility
classes. The theme now selects the correct artwork before hydration. The existing
theme toggle and other authentication behavior remain intact.

### Captured and inspected evidence

All captures below are actual Edge output saved in this directory, using the
local preview on port 3101, unauthenticated, English, dark theme.

| Route | File | Image dimensions | Observation |
| --- | --- | --- | --- |
| `/en` | `landing-desktop-en.jpg` | 1219 × 586 | Contours visible over hero; heading and primary actions remain clear |
| `/en/workflows` | `workflow-desktop-en.jpg` | 1219 × 586 | Contours visible at right; no horizontal overflow in DOM measurement |
| `/en/login` | `login-desktop-en.jpg` | 1234 × 920 | Full-page form and guide; corrected logo; motif below controls |
| `/en/register` | `register-desktop-en.jpg` | 1234 × 1054 | Full-page initial registration step and guide; corrected logo |

Additional evidence:

- `login-light-en.jpg`: full-page light theme, readable logo and contour motif.
- `login-keyboard-focus-en.jpg`: Tab from email reaches password; visible blue
  focus outline; no horizontal overflow in DOM measurement.
- `login-light-fr.jpg`: full-page French login copy and light-theme layout.
- `register-dark-fr.jpg`: French registration layout and visible theme-button
  focus. Dark theme restoration was confirmed through the accessible button name.
- Landing DOM measurement: 1234 × 593 viewport, scroll width 1219; no overflow.
- Attempted 390 × 844 viewport override returned success but measured dimensions
  remained 1234 × 593, including in a fresh tab. Mobile acceptance is therefore
  **not established**. Override reset was called. The corresponding desktop-sized
  diagnostic is named `landing-resize-not-applied-en.jpg`, not a mobile pass.
- French landing/workflow, 200% text zoom and broader responsive acceptance
  remain unverified. No account was created and no auth form was submitted.

### Source and command checks

- `npm run agent:workflow:check`: passed in this attempt; 196 package scripts
  remain outside the reviewed manifest. The earlier unrelated registry failure
  is historical; this task did not edit the registry.
- TypeScript syntax parsing: passed for AuthLayout, CinematicHero,
  CinematicLanding and WorkflowAtlas.
- PostCSS parsing: passed for `app/public-contours.css`.
- Scoped `git diff --check`: passed; existing CRLF normalization warnings only.
- No mocked unit tests, real database tests, migration, production build,
  deployment or commit performed.

## Mobile verification and viewport cause — 20 October 2026

This section supersedes the earlier mobile-verification limitation. All four
routes were captured in Edge at a **measured 390 × 844 CSS-pixel viewport**.
No application code was changed in this attempt.

### Viewport diagnosis and corrected procedure

Read-only inspection of the installed extension's `setViewport` implementation
established that it selects the active tab from the current session and stores
the size on that tab's lease. When no session tab is active, it stores a pending
size for a subsequent attachment. Despite the browser-level capability name,
this is not a resize of every tab.

Earlier verification switched among multiple tabs after setting the capability,
so the inspected tab could retain desktop dimensions. The corrected procedure:

1. Start with no task-owned tabs.
2. Set the documented viewport capability to 390 × 844.
3. Create one task-owned tab and use it for all four routes.
4. Confirm each route's content is rendered and measure `innerWidth`,
   `innerHeight` and document scroll width before accepting its capture.
5. Reset the capability and close that task-owned tab when finished.

The procedure held the correct dimensions across landing, workflow, login and
registration in this run. Reset returned successfully but the existing tab still
measured 390 × 844; it was explicitly closed, and the session then listed zero
tabs. Do not interpret a successful reset response alone as proof of changed
dimensions. No user-owned tab was resized or closed in this attempt.

### Mobile results

English, dark theme, unauthenticated; local preview at port 3101:

| Route | Measured viewport | Document scroll width | Saved screenshot |
| --- | --- | --- | --- |
| `/en` | 390 × 844 | 375 | `landing-mobile-en.jpg` |
| `/en/workflows` | 390 × 844 | 390 | `workflow-mobile-en.jpg` |
| `/en/login` | 390 × 844 | 375 | `login-mobile-en.jpg` |
| `/en/register` | 390 × 844 | 375 | `register-mobile-en.jpg` |

The contour motif is visible on all four. Headings, form labels and navigation
fit the mobile layout without horizontal document overflow. Auth layouts stack
the workspace guide below the form. Registration continues below the initial
viewport; its button and later content remain in the DOM.

- Mobile landing menu opened and exposed the workflow link. Saved additional
  evidence as `landing-mobile-menu-en.jpg`.
- Login keyboard Tab moved from email to password. Saved
  `login-mobile-focus-en.jpg`.
- The first workflow capture arrived before the main content had rendered and
  showed the footer. It was replaced only after DOM inspection confirmed the
  workflow heading, layout and scroll position.
- A registration keyboard navigation attempt timed out; completion of that
  interaction is not claimed.
- These are responsive desktop-Edge checks, not physical-phone testing.
  Mobile French, text zoom and a full accessibility audit remain outside this
  completed four-page capture set.

### Timeout remains an external blocker

The resize cause is established; the underlying debugger latency cause is not.
During this attempt, even the static SVG page intermittently timed out on
`Page.getFrameTree` / `Runtime.evaluate`. On a visible workflow link, an explicit
30-second click timeout still ended on `Input.dispatchMouseEvent` after about
three seconds. Keyboard activation subsequently succeeded. These observations
separate the issue from Stoquify's application JavaScript and from the viewport
setting, but do not prove that CPU pressure is the cause.

Browser plugin version: `26.1013.40934`; extension version:
`1.26.1005.11759`; previously inspected Edge executable: `155.0.4283.62`.
The exposed Edge capabilities are viewport and management; the tab exposes page
assets, not a raw debugger or command-deadline setting. A permanent provider-side
timeout repair was **not achieved**. No vendor cache, extension code, native-host
registration, process scheduling or browser security setting was modified.
Do not report this as a permanent connection fix.

## Foreground comparison and supported-repair handoff — 20 October 2026

The user confirmed that the Edge verification tab was in front.
`edge-reliability-diagnosis.json` records the comparison timings and errors.

- Background baseline: login screenshot failed on focus emulation after
  33.77 seconds overall (reported debugger-command deadline: 10 seconds).
- Following the user's foreground confirmation: four page screenshots passed
  without retries; two navigation calls passed and two exceeded the navigation
  deadline. The landing navigation later completed and its screenshot succeeded.
- Screenshot durations were approximately 36.65, 15.41, 12.96 and 2.16 seconds.
  Continuous foreground state was not independently observable. This result is
  evidence of improvement, not proof of causality or a permanent repair.
- Edge process priorities included Idle, Normal and AboveNormal; CPU load
  remained 100%. Priority alone does not establish that Windows Efficiency Mode
  is enabled for the inspected tab.
- Codex's configured updater reported `up_to_date` for version `26.1013.40934`,
  build `20770`, production channel.
- Browser and legacy Chrome service files have identical SHA-256 hashes:
  `B352A10A7CCF2273CD5062516E82178A62E3F6CD197148B3F4EF97D2B776BF60`.
  No evidence of a mismatched runtime installation was found.

Microsoft documents the **Always keep these sites active** setting as a
site-specific exclusion from sleeping tabs and Edge energy saver:
[Microsoft performance guidance](https://support.microsoft.com/en-us/edge/learn-about-performance-features-in-microsoft-edge).
Testing an exception for `http://127.0.0.1:3101` is the next supported repair
experiment; its effect has not yet been established.

The browser URL security policy explicitly rejected
`edge://settings/system/managePerformance` because it allows only HTTP(S).
No alternate control path or policy workaround was attempted. The user was asked
to apply the exception manually, or report that it already exists. The existing
verification tab was marked for handoff. No performance setting has been changed
by the agent. A permanent debugger repair and post-repair reliability run remain
pending.

### Managed-setting response

The user subsequently reported that the performance setting is disabled or
marked "managed by your organization." The proposed site exception remains
unapplied. No management controls were overridden, and the energy-saving
hypothesis remains untested. `edge-support-report.md` consolidates the observed
versions, failures, timings and repair acceptance criteria for review. It has
not been sent externally. The intermittent timeout remains unresolved.
