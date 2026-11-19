# Visible Stoquify computer screens — 18 October 2026

Scope: public landing photography and workflow examples. Shared working-tree edits were preserved; no commit, deployment, database or email operation was performed.

## Change

- Five scene photos (bakery, pharmacy, building supplies, retail and accounting firm) were edited using the built-in imagegen tool. Larger front-facing displays remain within the responsive photo frames.
- Versioned assets are `public/landing/cinematic/{bakery,pharmacy,materials,retail,accounting-firm}-screen-v2.webp`, each with a `-768.webp` mobile variant. Original images remain available. Full prompts and references are in `public/landing/cinematic/photo-screens-v2-manifest.json`.
- `components/landing/photo-workspace.tsx` owns measured screen coordinates, localized illustrative screen content and the enlarged preview. It reuses the existing dialog primitive and cinematic workflow components. The physical screens use a consistent light workspace, independent of the surrounding page theme; the enlarged dialog follows that theme.
- The existing hero keeps its localized production-dashboard capture with fictional records and its existing zoom behavior.
- The business stories and workflow page share the matching scene screens. The preview control has a localized label, dialog title/description, Escape handling, focus trapping and focus return through the existing dialog primitive.

UI guidance: the local UI/UX search returned responsive image sizing, text reflow and visible focus guidance from `ux-guidelines.csv`. These informed fluid previews and keyboard verification; no palette or framework advice replaced the project design contract.

## Evidence

- Source inspection: current photo components, the existing dialog primitive, module previews, public design contract and command registry. No backend behavior changed.
- Contract: `npm run agent:workflow:check` passed; 196 commands remain outside the registry.
- Mocked components: 84 tests passed using the isolated `jest.accounting-workflow.config.cjs` in the task visualization directory. This config does not load application configuration or a database.
- Static: ESLint passed on the changed TSX files and `git diff --check` passed on tracked edits.
- Browser: signed-out `/en`, `/fr`, `/en/workflows`, `/fr/workflows`; 1440×1000 desktop and 390×844 mobile; light and dark. All five selected photos displayed their matching localized screen. Forty workflow dialog opens plus four accounting-story dialog opens passed, including matching content, theme, Escape and focus return. No page errors or horizontal overflow were found. Scoped axe scans of the accounting dialog reported no violations in both locales and viewport sizes.
- Visual review: French mobile and desktop screenshots verified the screen framing and readable enlarged accounting preview. The final bakery asset was checked separately after its replacement. This is scoped UI evidence, not whole-site or business-workflow certification.
- Real database tests: not run; no data behavior changed.

Commands and outputs are retained in:
`C:/Users/J COMPUTER/.codex/visualizations/2026/10/18/01a14fd1-a2ee-7572-8b3c-6e64854cf6a0/`.

```text
node node_modules/jest/bin/jest.js --config "C:/Users/J COMPUTER/.codex/visualizations/2026/10/18/01a14fd1-a2ee-7572-8b3c-6e64854cf6a0/jest.accounting-workflow.config.cjs" --runInBand --no-cache
node node_modules/eslint/bin/eslint.js components/landing/photo-workspace.tsx components/landing/cinematic-business-story.tsx components/landing/workflow-story.tsx components/landing/__tests__/CinematicLanding.test.tsx components/landing/__tests__/workflow-atlas.test.tsx
node "C:/Users/J COMPUTER/.codex/visualizations/2026/10/18/01a14fd1-a2ee-7572-8b3c-6e64854cf6a0/check-photo-screens.cjs"
node "C:/Users/J COMPUTER/.codex/visualizations/2026/10/18/01a14fd1-a2ee-7572-8b3c-6e64854cf6a0/check-final-bakery.cjs"
```

Rollback: reverse only the photo-workspace integration and associated styles/tests, then restore original photo references. Do not restore entire shared files or delete unrelated untracked assets.
