# Connected workflow library playback — 2026-10-24

## Change and source inspection

The first eight entries render ProductWorkflowDemo. The 15 later entries rendered static JourneyPreview cards. Added a shared interactive JourneyPreview with timed step progression, selectable steps, pause/play, replay and next controls. Existing workflow copy, controls and evidence remain the content source. Hidden journeys reset and do not play; playback also stops outside the viewport, when the document is hidden, or when the landing shell disables motion. All panels remain in the shared sizing grid.

## Mocked component checks

- Workflow contract check passed.
- Scoped ESLint passed for the changed components and tests.
- Isolated landing showcase Jest lane: **3 suites, 94 tests passed**.
- Coverage includes every later workflow in both locales; manual selection, next, pause, replay restarting its timer, cyclic progression, offscreen/document visibility, inactive reset, timer cleanup and global reduced-motion behavior.

## Rendered browser checks

Local application at localhost:3000, English and French, desktop 1440 × 1000 and mobile 390 × 844 CSS pixels. Selected and advanced every entry from index 8 through 22 in each of the four combinations (60 workflow/viewport/locale checks).

- Every later workflow changed its active step when Next was pressed.
- Automatic progression observed in English Sell and collect and French Accounting firm evidence review.
- French pause stopped playback; selected-step controls remained usable.
- Preview height stayed constant across all 15 selections within each combination: desktop 642.36px, English mobile 879.08px, French mobile 898.28px. No horizontal page overflow.
- The original module demos remain separate and unchanged.

## Boundaries

No real database tests, production build, deployment or live business transactions were run. These are illustrative public previews. Existing unrelated working-tree changes were preserved.
