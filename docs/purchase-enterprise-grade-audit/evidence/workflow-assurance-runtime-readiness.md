# Workflow Assurance Runtime Table Check

Generated: 2026-08-17T03:53:24.058Z
Mode: `fail`
Status: `ready`

## Summary

- Runtime tables present: 7/7
- Migration rows present: 3/3
- Blockers: 0

## Runtime Tables

- present: workflow_assurance_check_definitions
- present: workflow_assurance_check_runs
- present: workflow_assurance_check_findings
- present: workflow_assurance_incidents
- present: workflow_assurance_incident_events
- present: workflow_assurance_alert_deliveries
- present: workflow_assurance_waivers

## Migration History

- present: 20260621103000_workflow_assurance_registry_foundation
- present: 20260621113000_workflow_assurance_incident_spine
- present: 20260720210000_workflow_assurance_multi_finding_persistence

## Blockers

No Workflow Assurance runtime table blockers detected.

## Safety Notes

- This checker is read-only and does not apply migrations.
- Use it as a fallback when Prisma migrate status/deploy cannot report cleanly.
- A passing result does not replace a healthy Prisma migration workflow for release.