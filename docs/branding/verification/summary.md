# Artifact verification

Completed 14 September 2026 against the standalone branding kit.

| Check | Result |
|---|---|
| SVG structure | 36 SVGs contain vector shapes/paths; no raster image elements, embedded bitmap data, script, foreignObject or live text |
| PNG export | Every SVG exported successfully with nonempty artwork; transparent logo and wordmark exports have nonzero margins on every edge |
| Theme contrast | 28 intended light/dark text and control pairs pass their 4.5:1 or 3:1 target |
| Additional brand contrast | Ink on mint and ink on citron pass; white on citron and mint on white fail and are explicitly prohibited |
| Fonts | Manrope and Inter EN/FR specimen glyphs present; browser font loading checked separately |
| Favicon and symbol | Inspected at 16, 24, 32 and 48 px; silhouette remains readable in this designer check |
| Preview behavior | 9 checks pass: three concept selections, dark mode, French copy, desktop overflow, mobile overflow, image loading and JavaScript errors |
| Responsive widths | 1440 px desktop and 390 px mobile |
| Visual review | Three contact sheets, comparison board, identity overview, desktop dashboard, French mobile hero, favicon and symbol proofs, and generated office mockup inspected |

The first mobile pass found the comparison table extending beyond the viewport. It now scrolls within a labeled region; the repeat check passes. Final outputs replace that initial failing preview.

The repeating pattern deliberately crops motifs at its edges. The office photograph is AI-generated and can differ from exact geometry; it is not a fabrication master. Contact sheets show matching PNG renders of the SVG artwork, including color, black, white and reversed versions.

Commands used in this workspace:

```powershell
& '<bundled-python>' work/branding/build.py
& '<bundled-node>' work/branding/render.cjs
& '<bundled-node>' work/branding/package.cjs
```

The builder used fontTools installed only in the task's scratch folder. PNG generation used Sharp; browser verification used bundled Playwright Chromium. No application build, database migration, deployment or production UI test was run. Source repository inspection was read-only.

These results are limited to artifact integrity and the measured preview behavior. They are not a screen-reader audit, full WCAG certification, production release approval, trademark clearance, or customer recognition study. Physical printing requires a printer's proof.
