# Regulatory Hardcode Gate

Generated: 2026-07-19T20:33:17.943Z
Mode: `fail`
Status: `pass`

## Summary

- Active findings: 0

## Findings

No production regulatory hardcodes detected.

## Gate Notes

- Runtime services must resolve statutory values from versioned country packs or reviewed configuration.
- Country-pack files, migrations, tests, fixtures, and seed data are not production statutory logic.
- Payroll statutory expansion remains blocked unless country-pack provenance and expert-review states are explicit.
