# Purchase editor — final recovery verification

Final recovery receipt: `purchase-recovery-cbda867c.json`,2passed/0failed, stable bound sources, no browser errors or Fast Refresh messages. All browser contexts are closed. The original cancelled orders remain byte-for-byte equivalent under the receipt's serialized record/line comparison.

This focused follow-up used only the two real drafts created by the earlier successful clone checks: PO-000003 and PO-000004. Each was opened, given an unsaved note, cancelled once through the authorized real service, and subjected to one real rejected Save. Both now remain CANCELLED. No original order was reset, no further order was created, and no clone operation was repeated.

The server action responded with `text/x-component` in both cases. Actual current server status changed the existing form to read-only recovery while preserving the unsaved note. The note remained focusable and selectable using Ctrl+A, Save became disabled, and changing between390px and1440px preserved the form, values and exact document width. The generic English technical cancellation toast was absent. The cancelled database record and its lines remained unchanged by the rejected save.

This verifies retention across the observed in-page server response, not recovery after closing the tab or clearing browser state. It does not make a cancelled order editable or authorize posting, receiving, approval or payment.

## Relationship to earlier evidence

`purchase-editor-browser-ef30b99c.json` already proved the explicit-save/native Continue behavior, exact243.50 financial preview and saved detail, no-op monetary/reference/line identity preservation, real independent draft cloning, zero receiving/accounting effects, foreign-tenant clone denial and genuine denied-user route behavior. Its two combined journeys remained failed because the delayed response discarded the draft. That receipt and its screenshots remain unchanged.

The final follow-up targets that exact remaining defect after the route/component/hook correction. The two prior cancelled originals were hash-compared unchanged. It does not relabel the old failed run or claim every positive case was rerun against the later recovery source.

## Native images

All four final images were visually inspected:

- `en-purchase-recovery-retained-390-cbda867c.png`
- `en-purchase-recovery-retained-1440-cbda867c.png`
- `fr-purchase-recovery-retained-390-cbda867c.png`
- `fr-purchase-recovery-retained-1440-cbda867c.png`

Desktop captures show the actual Cancelled/Annulée status, selected unsaved note, exact243.50 total and disabled Save. Mobile captures focus on the preserved, selected note and exact amounts; the status/error explanation is outside that viewport and its presence is separately established by the driver/desktop evidence. The sidebar retains existing English labels. No full-product localization or accessibility certification is claimed.

## Request observations

The sanitized receipt records one real update POST for each locale and its server-component response, with no request body, cookie or action identifier retained. The English response took about9,569ms and French about1,298ms in the development server. No approved production performance budget is asserted.
