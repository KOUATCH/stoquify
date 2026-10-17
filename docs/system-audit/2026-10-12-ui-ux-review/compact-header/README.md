# Compact owner evidence header

12 October 2026. Local working-copy follow-up to the dashboard/owner hierarchy slice. No commit, deployment, migration, or business transaction was performed.

## Change

The owner brief opts into a compact shared header. The conclusion, evidence grade, trust, freshness warning, period, review state, mode controls, and primary action remain visible. Detailed narrative, source modules, and provenance sit inside a keyboard-operable native disclosure. Disabled-action reasons remain visible. Other callers retain the expanded header by default.

The freshness notice is extracted from the existing evidence row and reused outside the disclosure. A stale flag takes precedence over a contradictory `fresh` label. Existing semantic tokens, controls, permission behavior, and server data remain intact.

Owned files for this slice:
- `components/bi/BICommandBriefHeader.tsx`
- `components/bi/BIEvidenceBadgeRow.tsx`
- `components/bi/__tests__/BICommandBriefHeader.compact.test.tsx`
- `components/owner-war-room/OwnerWarRoomDashboard.tsx`: only the `compact` prop was added this slice; its earlier hierarchy changes were preserved.

Other existing working-tree changes were preserved. The ECC workflow, command registry, master, global authenticated contract, existing primitives, and project UI Styling/UI UX Pro Max guidance govern this slice. Graph discovery nodes: `bi_bicommandbriefheader_tsx` (community 50), `bi_bievidencebadgerow_tsx` (community 153); current source was inspected before behavioral claims.

## Verification

| Evidence class | Check | Outcome |
|---|---|---|
| Workflow | Inspected runner/registry/lifecycle, then `npm run agent:workflow:check` | Passed; 198 other scripts remain unclassified |
| Mocked components | Installed Jest with local `jest.config.cjs`, `--runInBand --no-cache --json` | Four suites, 36 tests passed; see `jest-results.json` |
| Source syntax | Installed TypeScript parser, four owned TSX files | No parse diagnostics; see `syntax-results.json`. Not a semantic typecheck |
| Diff | Scoped `git diff --check` | Passed; line-ending notices only |
| Real database | None | Not run |
| Build/release | None | Not run; package build includes migrations |

The isolated Jest runner uses installed Next/SWC without loading application Next configuration or environment. Its setup and mocks were inspected for side effects. Tests cover EN/FR disclosure, visible stale uncertainty, disabled actions, invalid/missing source time, default expanded behavior, existing BI primitives and owner modes. Test fixtures do not certify live role authorization.

## Rendered evidence

Existing SUPER_ADMIN session, localhost:3000, dark theme, populated blocked/stale owner brief. No business action was submitted. Browser navigation had intermittent transport delays; these are not application performance measurements. Temporary viewport override was reset.

| Route | Measured viewport | Observation |
|---|---|---|
| `/en/dashboard/owner-war-room` | 1707×723 | Collapsed header height 259px; warning and action visible; no horizontal overflow. Enter opens source list and narrative, and Enter closes it. `owner-en-desktop.png` |
| `/fr/dashboard/owner-war-room` | 1440×900 | Header height 279px; action section starts at y=578; first action title at y=708. No horizontal overflow. `owner-fr-desktop.png` |
| `/fr/dashboard/owner-war-room` | 389×845 | Header height 659px; document width 369px, no page overflow; long warning wraps, disclosure has visible keyboard focus. `owner-fr-narrow.png` |
| French disclosure | Desktop | Enter opens source list and retains focus on SUMMARY; localized disclosure label and warning visible. `browser-evidence.json` |

These are real screenshots, unlike the rejected blank narrow screenshot from the earlier slice. Viewport captures may include unused dark canvas outside the emulated viewport. Measurements use the rendered viewport, not requested override dimensions.

## Remaining limits and next priority

- Three complete actions above the fold at 1440×900 is still not achieved. The current fixture has two action cards and substantial per-card evidence. The mobile action queue remains below the first screen. No quantitative before/after header comparison was captured under identical conditions.
- Server-supplied title, narrative and action labels still contain English on the French route. Several action URLs still omit the locale. These remain the next bounded source/navigation review.
- Only SUPER_ADMIN was rendered. Daily operator and owner-specific sessions, denied/empty states, light theme, screen-reader use, contrast, real transactions and a full semantic typecheck remain unverified.
- No retention, task-time, referral, collaboration, or network-effect improvement has been measured.

Next: validate localized action-to-record destinations and descriptive action labels, preserving role, organization and period context. Separately review mobile action density without concealing material uncertainty.

Rollback should reverse this slice's two BI component changes, remove the compact test, and remove only the owner `compact` prop. Do not reset the owner file wholesale or discard unrelated edits.
