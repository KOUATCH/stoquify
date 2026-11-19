# Landing section refinement — 2026-10-23

## Scope

- Compact, integrated setup component with shared layout space across all three steps.
- Sale-to-close story and connected workflow library share a 1320px desktop section width.
- Expanded workflow library: 23 journeys, comprising the eight original animated previews, six additional existing atlas journeys and nine source-backed journeys. The desktop/tablet menu scrolls internally; phones use a compact selector. Keyboard navigation keeps the active entry visible.
- Additional journeys cover accountant access, client portfolio and review workdesk, supplier payments, stock loss, employee self-service, financial reports, cash command and data onboarding. Every existing workflow-atlas family is represented; this is not an inventory of every backend action.
- Revised responsibilities overview, business operations, payment and accounting-firm panels, and a four-stage OHADA accounting/close path.
- Dedicated bilingual HRIS/payroll presentation: five chapters and 20 capabilities, with employee/manager/HR/payroll/accounting responsibilities and fictional preview records.

## Source inspection

Reviewed current landing, workflow-atlas, People/payroll and accountant-access/portfolio/portal sources. Confirmed all nine additional source route files exist. Existing graph evidence was treated as dated context, not current behavioral proof. Existing logo/screenshot improvements and unrelated working-tree edits were preserved.

Base HEAD: `9ab93a2a1d81e37ef7e0b10357885b48a3bc5886`; working tree contains other ongoing changes. No commit was created.

## Static checks and mocked component tests

- `npm run agent:workflow:check`: passed; registry reports 196 package commands outside its manifest. No application/database command was invoked by this check.
- Isolated landing Jest configuration inspected before use. Full run: **85 tests passed across two suites**. These use mocked application dependencies, not a real database.
- After the final workflow-menu scrolling change, targeted workflow/navigation checks: **6 passed**, 79 intentionally skipped.
- ESLint for the eight changed implementation TypeScript files: passed.
- Targeted `git diff --check`: passed; existing Windows line-ending notices only.

Commands used:

```text
node node_modules/jest/bin/jest.js --config scripts/jest.landing-showcase.config.cjs --runInBand --no-cache
node node_modules/jest/bin/jest.js --config scripts/jest.landing-showcase.config.cjs --runInBand --no-cache --testNamePattern "expanded|compact workflow|original previews"
```

## Rendered/browser checks

Checked the existing local development server at `http://localhost:3000` in English and French, with desktop, tablet and narrow-phone viewports. Visually reviewed setup, workflow previews, responsibility cards, business panels, accounting/close and HRIS/payroll, including a light-theme HRIS/payroll check. No console errors were reported at the final desktop review.

Observed component heights in CSS pixels (rounded):

| Viewport/locale | Workflow library, 23 choices | Setup, 3 steps | HRIS/payroll, 5 chapters |
| --- | --- | --- | --- |
| 1440px / English | 764 for every choice | 513 for every step | 636 for every chapter |
| 1024px / French | 782 for every choice | 515 for every step | 769 for every chapter |
| 768px / English | 1344 for every choice | 730 for every step | Visually reviewed |
| 320px / French | 1597 for every choice | 1106 for every step after final phone refinement | 1831 for every chapter |

The stacked phone layout naturally requires page scrolling; it does not use an internal vertical content scrollbar. The workflow navigation is the intentional scrollable area on larger screens. Checked page horizontal overflow: 0px at these viewports. Narrow-phone checks found no clipped/overflowing visible descendants in the workflow, setup and HRIS/payroll components.

Keyboard End navigation focused and selected workflow 23 and scrolled it within the workflow menu viewport. Inactive preview panels are hidden and inert. Original eight workflow indexes remain compatible with existing deep links. User theme/motion preferences were restored after inspection.

## Limits

No real database tests, production build, migration, deployment or backend certification was performed. Source inspection, mocked tests and browser results above are separate evidence categories. The previews remain illustrative and do not claim live transactions or certified statutory filings.
