# Landing dashboard captures

The homepage hero uses `public/landing/cinematic/stoquify-dashboard-en.webp` and
`stoquify-dashboard-fr.webp`, refreshed on 2026-10-25 at 2400 × 1248 pixels
with the current blue Stoquify logo, consistent OHADA descriptor and localized
dashboard status labels. Source display labels were corrected before capture.
These are rendered screenshots of the production `EnhancedEnterpriseDashboard`,
`Sidebar`, and `Navbar` components, using the fictional records in
`landing-dashboard-capture.tsx`. No customer or authenticated account data is used.

To regenerate, temporarily render the fixture from a development-only locale
route under the normal application providers. Pass the locale and
`messages[locale].enterpriseDashboard` labels. The empty query organization ID
keeps dashboard queries disabled. After rendering, use the browser's
`history.replaceState(null, '', '/en/dashboard')` (or `/fr/dashboard`) to let the
real navigation components display the dashboard breadcrumb and active item;
do not reload or navigate into the authenticated route. Wait for fonts and UI
to settle. Capture the viewport as WebP at quality 94. The current captures use
a 1600 × 832 CSS viewport and device scale factor 1.5, producing a
2400 × 1248 pixel image. The smaller
CSS viewport makes the actual interface text larger in the hero while the
higher pixel density keeps it sharp as the preview expands up to 1600px wide.
Remove the temporary route after capture. Never deploy the capture fixture as
a public route or change authentication controls to capture it.

The localized sample-data disclosure is rendered by `cinematic-hero.tsx`, and
the existing scroll animation controls the screenshot's position and scale.
