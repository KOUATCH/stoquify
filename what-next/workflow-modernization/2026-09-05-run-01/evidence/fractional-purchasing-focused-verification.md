# Fractional purchasing focused verification

Source freeze: 2026-10-01 local session. No database/browser verification was performed by this lane for this revision.

Command (explicit bundled Node runtime; Jest in-band):

```powershell
& 'C:\Users\J COMPUTER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/purchasing/__tests__/receipt-return-recognition.test.ts services/purchasing/__tests__/purchase-return-credit.service.test.ts services/purchasing/__tests__/invoice-receipt-recognition.test.ts services/purchasing/__tests__/supplier-payment-balance.test.ts
```

Final terminal result: session 81966, exit 0; 4 suites passed, 101 tests passed; 3.533 seconds. An earlier run passed 100 and failed one assertion expecting the word "evidence" where the correctly rejected hidden journal reported "effects". The expectation was corrected; no product behavior was relaxed.

Verified scope includes remaining-pool invoice/return allocations, sequential fractional return exhaustion, original zero-value receipt evidence, explicit stock value validation, orphaned stock-marker rejection, immutable v1 proof compatibility, source-pending zero return resolution, actual zero credit record creation and exact reversal, preserved period controls on new zero commands, positive/negative commercial-versus-claim variance, independent commercial net/tax residuals, and proof-bound zero credits in supplier payment balances. The monetary kernels and inventory producers are mocked in these unit suites; actual posting effects require the coordinated database driver. Actual nonzero-tax database execution remains unverified by this lane.

Frozen files and SHA-256:

| File | SHA-256 |
| --- | --- |
| services/purchasing/receipt-return-recognition.ts | f61773a8ad6643fa376e400cdf1bb0be26f393937527ccd3554b89e78b65a876 |
| services/purchasing/purchase-return-credit.service.ts | 4efcc0adbbcbb0fd8d34c8bfd82c8c3ef6550e64382a5319f416ea3ad5b3e88e |
| services/purchasing/invoice-receipt-recognition.ts | 0a3bc34d114e223fc3d3152f99030bba75207c96360301a4ba9232352275d310 |
| services/purchasing/supplier-credit-allocation.ts | 110cdef4580011ccee884e3ee8f249259fb9b03c4aeec8aa1ff5e883b078fab6 |
| services/purchasing/supplier-payment-balance.ts | 534b989cf0698bc096435012f1d9cd6791f1fd9c632b72880ccc6714830619e5 |
| services/purchasing/__tests__/receipt-return-recognition.test.ts | 7b8c3b0eee512115f5e56e13b1c973be9909030c9ce66dad2d0b79ebe760aa09 |
| services/purchasing/__tests__/purchase-return-credit.service.test.ts | 9eb0ff28aa9f724d8e57c8757e345f044da7bebefa4d88fc659764bfd9c01597 |
| services/purchasing/__tests__/invoice-receipt-recognition.test.ts | 8b998bbb851dbebe86f41d41f8972cc9732181a273061acaa7e274cc33a9deb4 |
| services/purchasing/__tests__/supplier-payment-balance.test.ts | 1c64cf8a071bce6488414411cfd95798ecda3c76523affd7089c8537d1b3a9d0 |

Exact pre-edit byte snapshots: `fractional-purchasing-before-bda85c15-0799-4d51-a49f-042829ca30d0.json` and `fractional-purchasing-balance-before.json`. Shared credit allocation helper is new. Parent owns combined lint/typecheck and guarded database verification, including the additive zero-credit constraint migration.
