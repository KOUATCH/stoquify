# Realistic development seed data catalog — 2026-08-15

## Dataset profile

- Two synthetic Cameroon retail organizations, one English-default and one French-default
- XAF currency and `Africa/Douala` timezone
- 12 curated roles and 14 login personas per organization (including registration-flow accounts)
- 12 operational locations plus one registration-flow location per organization
- 12 sellable products per organization
- 12/12 products have at least 20 units available at the default POS location; actual starting availability is 83–140 units
- 12 suppliers, 7 brands, 7 categories, 7 units, 2 VAT rates, and 7 expense categories per organization where applicable
- Full coverage fixtures for purchasing/AP, accounting, inventory, payroll, reconciliation, compliance, offline POS, close assurance, and workflow assurance

## Curated catalog

| Category | Example products | Relevant units |
| --- | --- | --- |
| Beverages | Spring water 1.5 L; Orange juice 1 L | Bottle, Liter |
| Staple foods | Long-grain rice; Wheat flour | Kilogram |
| Canned and packaged foods | Sardines in tomato sauce; Tomato paste | Can |
| Household cleaning | Laundry detergent; Dishwashing liquid | Pack, Bottle |
| Personal care | Bath soap; Toothpaste | Piece, Tube |
| Office supplies | A4 printer paper, 500 sheets | Pack |
| Small electronics | Portable Bluetooth speaker | Piece |

No unused category or unit is permitted by the semantic verification. Placeholder/lorem labels, generic numbered categories, and irrelevant reference rows fail the seed.

## POS proof

The runtime verifier used the same catalog, cart, tender, accounting, receipt, and inventory services as the application. It found 12 catalog items with positive test-ready stock, added seven distinct items, completed a cash payment, verified the completed/paid database records, and confirmed each affected inventory balance decreased by one.

## Credentials

The local handoff file is `.seed-artifacts/seed-login-credentials.json`. It contains 28 synthetic development-only personas, login routes, role codes, permissions, module entitlements, default locations, scenarios, and the generated password. The path is Git-ignored. Passwords are never printed by the seed command.

Recommended first-organization personas:

- Super Admin — `super.admin.rds-org001@stockflow.test`
- Admin — `admin.rds-org001@stockflow.test`
- Branch Manager — `branch.manager.rds-org001@stockflow.test`
- Cashier/POS User — `cashier.rds-org001@stockflow.test`
- Inventory Manager — `inventory.manager.rds-org001@stockflow.test`
- Purchaser — `purchaser.rds-org001@stockflow.test`
- Accountant — `accountant.rds-org001@stockflow.test`
- HR Manager — `hr.manager.rds-org001@stockflow.test`
- Auditor — `auditor.rds-org001@stockflow.test`

Use the password from the local artifact or the final task handoff. These accounts are synthetic and must never be used in production.
