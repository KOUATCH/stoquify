# Retained POS attempt recovery — 23 September 2026

## Problem and fix

The recovery panel continued to display the NOT_FOUND warning and original-request retry after a successful review of the current cart. Its heading and explanation also continued to describe an unresolved attempt even when Charge had been enabled.

The panel now shows a localized Cart reviewed state only for a successfully reviewed cart in the current register, with verified checkout access and a reviewable recovery outcome. It removes the obsolete retry and review actions, retains the original request identifier, and provides Continue to checkout, which scrolls to and focuses the checkout footer without submitting a sale. Rechecking an attempt resets the review state. English and French labels were added.

No server financial, stock, ownership, or recovery controls were weakened. No stored attempt was manually erased or marked completed. The original-request handler also refuses its obsolete retry path after a cart review.

## Verification

- Four focused regression cases failed before implementation, covering the missing reviewed state and recheck transition.
- All 64 tests passed across checkout UI, receipt visibility, checkout lifecycle services, and sale recovery services.
- After the final current-register/cart display restriction, all nine focused recovery tests passed again.
- Final ESLint and diff whitespace checks passed. Both translation files parse and expose the new labels.
- No full production build or project-wide type check was run.

## Live outcome

The earlier POS tab had closed, so a new local Checkout recovery tab was opened. Register access initially belonged elsewhere; the user confirmed another POS checkout was open. No ownership lock was bypassed. Once access became available, the server restored the retained request and reported CART_CHANGED with no matching recorded result.

The existing Review changed cart action revalidated the current cart. The browser then showed Cart reviewed, the retained request identifier, and an enabled Charge button for FCFA 138,270. Continue to checkout was verified to focus the checkout footer. The tab was left open for the user.

No Charge or Retry original request action was performed, and no sale was submitted by this task. The request remains retained until the user completes or otherwise resolves the sale through the supported workflow.

Baseline copies in baseline/ preserve all pre-existing working-tree edits. Changed files are components/pos/ProfessionalPOSSystem.tsx, its shift-close test, and messages/en.json and messages/fr.json.
