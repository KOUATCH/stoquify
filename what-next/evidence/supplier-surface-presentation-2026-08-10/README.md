# Supplier Surface Presentation Evidence

Date: 2026-08-10

This directory contains the authenticated browser evidence for the supplier
create, edit, detail, AP-history, directory, quick-create dialog, and denied
role surfaces.

The evidence was produced by:

- npm run test:e2e:supplier
- Playwright projects: supplier-authenticated-desktop,
  supplier-authenticated-tablet, supplier-authenticated-mobile, and
  supplier-rbac-negative
- Synthetic fixture source: scripts/supplier-e2e-fixture.js
- Production backfill: false

## Result

- 24 browser tests passed.
- Seven authenticated supplier scenarios passed at desktop, tablet, and
  mobile sizes.
- The denied role could not reach supplier reads or mutations.
- Every captured surface reported zero serious or critical axe violations.
- Every captured surface reported no document overflow, clipped actions, or
  overlapping actions.
- Fixture cleanup completed.

## Evidence files

- create-page-desktop.png, create-page-tablet.png, create-page-mobile.png
- edit-page-desktop.png, edit-page-tablet.png, edit-page-mobile.png
- detail-page-desktop.png, detail-page-tablet.png, detail-page-mobile.png
- history-page-desktop.png, history-page-tablet.png, history-page-mobile.png
- list-desktop.png, list-tablet.png, list-mobile.png
- mutation-dialog-desktop.png, mutation-dialog-tablet.png,
  mutation-dialog-mobile.png
- rbac-denied-desktop.png
- supplier-authenticated-desktop.json
- supplier-authenticated-tablet.json
- supplier-authenticated-mobile.json
- supplier-rbac-negative.json
- certification-summary.json

The successful run initially wrote to the pre-existing
what-next/evidence/supplier-workflow-2026-08-10 contract. The evidence was
copied here to satisfy the presentation-remediation artifact contract, and the
browser spec now writes future runs directly to this directory.

English authenticated routes were exercised by the configured supplier suite.
French copy and message contracts compile, but a French authenticated browser
and screenshot pass was not configured in this run.

The local image viewer could not perform a separate manual screenshot review
because the Windows sandbox helper failed during initialization. Automated
browser and layout evidence is valid; no manual visual certification is
claimed.
