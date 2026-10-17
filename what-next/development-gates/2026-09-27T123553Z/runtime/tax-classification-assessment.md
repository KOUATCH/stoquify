# Product tax and unit assessment

Read-only source snapshot: 2026-09-27T12:54:18.065Z.

All 41 items use their organization’s stored standard VAT row (19.250). References are valid and active, but no per-product tax-classification evidence is represented in the inspected Item/TaxRate and POS contracts. All 41 assignments therefore require a reviewed classification matrix before claiming production tax accuracy; none is declared legally incorrect by this audit. A valid reference is not proof of applicable tax treatment.

The two active zero-rate rows are unused. POS fiscal output derives taxCode from whether the numeric rate is positive, so it does not preserve reason-specific zero treatment. The accounting owner supplies reviewed product treatment and effective source evidence; engineering supplies mapping, provenance and tests. Synthetic development scenarios can continue without pretending they have production tax approval.

Units are meaningful: 20 active rows and two retired, unused generic Pack rows. Six-bottle packs and 500-sheet reams have corresponding conversion factors; unassigned Sheet rows serve as conversion bases. Four juice/nectar products use litres despite one-litre package names. The catalog owner should confirm measured-litre versus sealed-package stocking; engineering should preserve quantities if a conversion is required.

Exact item, tax and unit IDs, consumer lines and required input are in tax-classification-assessment.json. Current catalog fields and executed queries are in tax-classification-current-data.json. No database or application changes occurred.
