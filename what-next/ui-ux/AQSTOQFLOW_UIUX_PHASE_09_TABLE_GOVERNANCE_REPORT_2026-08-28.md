# AQSTOQFLOW UI/UX Phase 09: Table Accessibility and Regression Governance

Date: 2026-08-28  
Status: NOW governance foundation implemented

## Governance controls

- Every current table-bearing application source is registered.
- New unregistered table sources fail the registry ratchet.
- Exactly inventory items, purchase orders, and payment reconciliation are canonical pilots.
- Shared boundaries publish table ID, version, archetype, query fingerprint, selection scope, density, busy state, accessible label, and polite state announcements.
- Inventory sortable headers expose `aria-sort` and keyboard-operable buttons.
- Purchase-order sortable headers expose `aria-sort` while preserving existing sort controls.
- Density controls use `role=group`, bilingual labels, `aria-pressed`, and focus-visible treatment.
- Existing horizontal overflow containers and responsive toolbar breakpoints remain intact for desktop, tablet, and mobile widths.

## Verification matrix

| Check | Result |
| --- | --- |
| Canonical contract tests | PASS |
| Registry ratchet | PASS |
| Purchase-order component controls | PASS |
| Payment-reconciliation protected behavior | PASS |
| Final focused total | 4 suites, 24 tests, 0 failures |
| Authenticated desktop screenshots | NOT RUN: no approved credentials/seed |
| Authenticated tablet screenshots | NOT RUN: no approved credentials/seed |
| Authenticated mobile screenshots | NOT RUN: no approved credentials/seed |

## Release boundary

No visual screenshot claim is made. The task intentionally stops at static responsive implementation and focused automated evidence until an approved authenticated account and seeded organization are supplied.
