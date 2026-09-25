# POS Charge button — 23 September 2026

## Finding and change

The live checkout initially displayed an unfinished cart that required an explicit resume. Register ownership was verified and the tender covered the total, but the required Resume cart action was only near the top of the page. The Charge footer explained the requirement without providing that action locally.

Added the existing localized Resume cart action beside Charge, linked to the same explanation for accessibility. It is disabled while register ownership is unverified or a lifecycle operation is running. It uses the existing server validation flow. Payment, stock, register ownership, and previous-attempt recovery requirements are unchanged.

Only 11 production lines were added in components/pos/ProfessionalPOSSystem.tsx. The existing dirty working-tree files were copied to baseline/ before this task's changes.

## Verification

- Three new regression tests failed before the change because the footer had no resume action.
- All 31 tests passed across ProfessionalPOSSystem.shift-close.test.tsx and ProfessionalPOSSystem.receipt-token-visibility.test.tsx after the change.
- The new tests cover successful resume without submitting a sale, failed resume with the cart preserved, and disabled resume while register ownership is unverified. The success case also checks the busy state and accessible explanation.
- ESLint passed for the changed component and test file.
- The test configuration loader needed TS_NODE_TRANSPILE_ONLY=true and TS_NODE_COMPILER_OPTIONS={"moduleResolution":"node"}; the scan was restricted to components/pos/__tests__. Earlier unbounded startup attempts were stopped. No application configuration was changed.
- No full production build or project-wide type check was run for this small UI addition.

## Live checkout outcome

During verification the live checkout moved into previous-attempt recovery. A read-only Check previous result returned NOT_FOUND; that result alone was not treated as permission to clear or retry the attempt. The existing Review current cart action then revalidated the cart while preserving the original request identifier. The browser accessibility state confirmed that Charge became enabled and cart editing was available.

No Charge or Retry original request action was performed by the assistant, and no sale was submitted by this task. The customer and tender should be reviewed before the user submits the sale. The new footer resume action was verified by regression tests; the live checkout was verified through its existing recovery path because its state changed during the task.
