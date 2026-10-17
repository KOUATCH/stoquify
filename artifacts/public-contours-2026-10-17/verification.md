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
