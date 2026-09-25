# Executed verification commands — v81

Working directory: `E:\ohada saas\Focused projects\stoquify`.
The bundled Node executable below was used directly. No npm lifecycle migration or seed command was invoked.

```powershell
$paymentNode = 'C:\Users\J COMPUTER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'

& $paymentNode node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false

& $paymentNode node_modules/jest/bin/jest.js --runInBand --runTestsByPath components/purchasing/__tests__/PaymentRequestWorkbench.test.tsx services/purchasing/__tests__/payment-request-read.service.test.ts services/purchasing/__tests__/payment-request-contracts.test.ts services/purchasing/__tests__/payment-request-evidence.test.ts actions/purchasing/__tests__/payment-request.actions.test.ts services/purchasing/__tests__/supplier-payment-balance.test.ts services/purchasing/__tests__/ap-control.service.test.ts actions/purchasing/__tests__/ap-control.actions.test.ts scripts/__tests__/module-purchases-route-evidence.test.js --json --outputFile=what-next/workflow-modernization/2026-09-05-run-01/evidence/payment-workspace-final-v81.json

& $paymentNode node_modules/eslint/bin/eslint.js components/purchasing/PaymentRequestWorkbench.tsx services/purchasing/payment-request-read.service.ts services/purchasing/payment-request-contracts.ts actions/purchasing/payment-request.actions.ts components/purchasing/__tests__/PaymentRequestWorkbench.test.tsx actions/purchasing/__tests__/payment-request.actions.test.ts services/purchasing/__tests__/payment-request-read.service.test.ts i18n/request.ts 'app/[locale]/layout.tsx' 'app/[locale]/(dashboard)/dashboard/purchases/payables/payments/request/page.tsx' 'app/[locale]/(dashboard)/dashboard/purchases/payables/payments/approve/page.tsx' 'app/[locale]/(dashboard)/dashboard/purchases/payables/page.tsx' 'app/[locale]/(dashboard)/dashboard/purchases/purchases-route-data-access.ts'

& $paymentNode node_modules/eslint/bin/eslint.js scripts/__tests__/module-purchases-route-evidence.test.js

& $paymentNode what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-payment-workspace-browser.cjs
```

All final commands exited 0. The browser command creates fresh fixtures only after verifying ownership of the dedicated localhost database. It requires the existing owned application on port 3110. It executes real test-user sign-in and payment-request/approval actions, and writes screenshots and a uniquely named receipt. It performs no release or external payment.

Preserve the existing test-output file: for a later rerun, choose a new output filename rather than overwrite the v81 result. Full build, live customer operation, external settlement and professional certification were not performed. See `evidence/payment-workspace-v81.json` for session IDs, failed attempts, source hashes and exact runtime scope.
