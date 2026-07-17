# Offline POS Replay Finalizer Readiness Report

Date: 2026-06-16

Skill: `priority-009-offline-pos-replay-finalizer`

## Safe Run Mode

This is a readiness/report-mode run. No application code is changed by this report.

## What This Skill Will Implement

Convert accepted offline POS envelopes into final POS, inventory, payment, fiscal, and ledger truth through controlled replay services.

## Priority Evidence

- Slice 7 from the examination report and residual blocker from the offline POS sync implementation report.
- Offline POS accepted envelopes remain pending replay and cannot yet become final legal or accounting truth safely.
- Source reports: what-next/AQSTOQFLOW_ENTERPRISE_SYSTEM_EXAMINATION_REPORT_2026-06-16.md, what-next/AQSTOQFLOW_STATUTORY_SERVICE_MODERNIZATION_SCAN_2026-06-16.md, what-next/AQSTOQFLOW_CERTIFICATION_ASSURANCE_SCAN_2026-06-16.md, what-next/AQSTOQFLOW_SERVICE_BOUNDARY_GATE_REPORT_2026-06-16.md, what-next/AQSTOQFLOW_010_INVENTORY_VALUATION_KERNEL_CONTINUATION_REPORT_2026-06-15.md, graphify-out/GRAPH_REPORT.md

## Files It Will Inspect

- services/pos/offline-sync.service.ts
- services/pos/pos.service.ts
- services/pos/receipt.service.ts
- services/inventory/*
- services/compliance/*
- services/payments/*
- services/accounting/*
- actions/pos/sync.actions.ts
- components/pos/offline/*

## Gates It Will Enforce

- npm test -- services/pos services/inventory services/compliance services/accounting services/payments --runInBand
- npm run inventory:boundary:fail
- node scripts/service-boundary-gate.js --mode report
- npm run typecheck

## Success Looks Like

PENDING_REPLAY offline POS envelopes can become final truth only through controlled replay, or remain blocked with explicit evidence.

## Dependencies

priority-001 through priority-008, especially inventory and error normalization.
