# Close current export regression

Captured 2026-10-01 before the product correction, after adding three focused regression cases. Exact original product/test bytes are in `close-current-export-before-5b09b3bf-889e-48a3-a891-563b88d0e126.json`.

Command: bundled Node `node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/evidence/__tests__/close-proof-invalidation.service.test.ts --testNamePattern='rejects independently stale' --json --outputFile=what-next/workflow-modernization/2026-09-05-run-01/evidence/close-current-export-regression-5b09b3bf-889e-48a3-a891-563b88d0e126.json`.

Observed unified execution session `72384` completed exit 1. Jest ran 3 regression tests: 3 failed, 16 skipped; 1 suite failed. Each received `certified`:

- CERTIFIED run with only an independently stale certified export: expected `blocked`.
- EXPORTED run with only an independently stale certified export: expected `operational` (existing shared grade contract).
- CERTIFIED run with independently stale certified exports outside the displayed sample: expected `blocked`.

The JSON result write failed with EPERM after the test results were printed. No JSON output is claimed for this regression run; this note records the actual terminal result. The passing post-change run has a separate result file.
