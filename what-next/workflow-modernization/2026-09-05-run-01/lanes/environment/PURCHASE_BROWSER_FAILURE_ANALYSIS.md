# Initial native purchase-editor failures

Preserved receipt: `purchase-editor-browser-524588b9.json`. Source hashes before/after match. Two boundary checks passed; both EN/FR combined editor journeys failed. No browser page errors occurred and existing account authority/configuration snapshots remained unchanged.

## Premature save

The driver advanced the first three steps using Continue/Continuer, verified the real line values, and then attempted to capture the final review before clicking Save. The final Save label never appeared. The English failure capture shows “Saving changes…”; the French failure capture, inspected afterward, already shows the purchase detail route after the unwanted save completed. The server recorded a purchase update POST although the driver had not clicked Save.

The component reused the same conditional button node while changing it from `type=button` (Continue) to `type=submit` (Save). The native click's default behavior submitted the form after the step transition. This is a real application failure; it is not merely a timeout or screenshot failure. Component tests had not demonstrated native default-action behavior.

Evidence: `en-purchase-editor-failure-524588b9.png`, `fr-purchase-editor-failure-524588b9.png`; line-value captures with the same suffix. Both line-value assertions passed for quantity2, unit cost100, tax19.25%, discount10 and preserved line notes.

## Visual/financial review

The editor used dashboard variable classes without the dashboard theme scope. The actual content rendered white with black borders/text inside the dark authenticated shell. The owner is correcting its scope using the existing dashboard presentation.

The XAF currency formatter also rounded stored tax38.50 to39 and total243.50 to244. The final review must expose the actual precision used by the persisted monetary contract, so users do not review a rounded different total. The French post-save detail capture independently displays244FCFA for the same stored243.50. The owner was notified of both directly affected displays.

## Exact partial outcome

A read-only guarded check after the failed batch found exactly the original two owned purchase orders. Both remained DRAFT with total243.50, shipping15, tax38.50, tax rate19.25, quantity2, unit cost100, discount10, and original order/line notes. No clone or cancellation ran. Repeating the corrected explicit-save journey can reuse these known drafts without recreating or resetting them.

Cold editor compilation took46.1s; the initial real update POST completed in2.914s. These timings are development observations. Cold detail-route compilation is unrelated to the premature-submit cause; the failure occurred before the driver requested its explicit save.

## Passed boundary scope

The real clone service rejected an existing source order when requested under another actual tenant, with no purchase-order count change in that tenant. The genuine denied user could not open the purchase detail route and had no clone control. The latter is a route-permission proof; no denied clone mutation was sent. These passes do not replace the failed positive/editor recovery journeys.

## Rerun criteria

After the owner freezes the corrected source: use the same exact drafts, prove advancing to review sends zero update requests, inspect correctly themed EN/FR review with243.50 precision, click explicit Save, compare persisted fields, clone through its real UI, and only then cancel the original fixture to test stale-editor denial and draft retention. Preserve this receipt and captures as the failed baseline. The browser contexts are closed; owned3107 remains running.
