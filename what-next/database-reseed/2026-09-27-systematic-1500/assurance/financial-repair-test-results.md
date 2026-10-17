# Draft financial repair focused test results

Command: `node node_modules/jest/bin/jest.js prisma/__tests__/systematic-reseed-financial-repair.test.ts --runInBand`

Observed result: **1 suite passed; 10 tests passed; 0 snapshots; 5.194 seconds**.

Coverage: decimal rounding for fractional quantities, invalid quantity/discount rejection, safe draft partial-payment plan, and fail-closed handling of non-synthetic IDs, posted status, posted/approved proof, issued derivatives, receipt/match approval evidence, non-draft payments and allocations exceeding the corrected invoice total.

This is unit evidence for arithmetic and protection guards. Candidate preview/apply/rerun evidence and final integrity rerun are separate coordinator requirements.

Targeted TypeScript compilation also passed (exit 0, no diagnostics):

```powershell
node node_modules/typescript/bin/tsc --noEmit --pretty false --target ES2020 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --strict prisma/systematic-reseed-financial-repair.ts prisma/__tests__/systematic-reseed-financial-repair.test.ts
```
