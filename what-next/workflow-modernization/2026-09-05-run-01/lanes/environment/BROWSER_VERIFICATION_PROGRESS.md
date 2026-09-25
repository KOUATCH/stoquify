# Native browser verification — preserved intermediate results

## Purchase editor and clone

`purchase-editor-browser-ef30b99c.json` binds unchanged application sources across the second native run. Its two boundary checks passed; both combined customer journeys remain failed because recovery did not remain available.

Both English desktop and French mobile proved:

- Three Continue clicks sent no purchase update before explicit Save.
- Real line fields, tax rate19.25 and notes remained intact.
- The review and saved detail displayed243.50 rather than244.
- Explicit no-op Save preserved every compared stored amount, reference, date, note and line identity.
- The real Clone action created exactly one separate draft in the same tenant, with new ID/number, copied amounts/notes, received quantities zero and no new receiving, inventory, supplier-ledger or journal effects.
- A genuine cancellation after opening the editor caused a rejected save. The localized inline alert received focus and the unsaved note initially remained present; rejected update did not change the cancellation snapshot.

However, the editor was then replaced by the dashboard Not Found boundary. Visual inspection of the French `rejected-draft` capture shows replacement already occurred before viewport resizing, so resizing is not established as the trigger. The authenticated edit route maps every non-DRAFT status to Not Found; the exact delayed RSC trigger is being investigated. The global mutation notification also exposes an English technical CANCELLED error. This run does not establish durable recovery or completed responsive failure behavior.

The English review capture is visually coherent and shows the exact amounts. The final failed captures are retained as failure evidence, not counted as successful draft-retention screenshots.

Safe read-only outcome receipt: `browser-partial-outcomes-ef30b99c-48b21da20a.json`.

| Source or copy | Current state | Total |
| --- | --- | --- |
| PO-000001 / cmtonkgag0007mabkqj4poqea | CANCELLED through the authorized real test operation |243.50|
| PO-000002 / cmtonkgdb000dmabkhof76ego | CANCELLED through the authorized real test operation |243.50|
| PO-000003 / cmtop4wde006hmac0xzyvdfyc | New DRAFT clone |243.50|
| PO-000004 / cmtop6se9007imac0fyec5d09 | New DRAFT clone |243.50|

Do not reset these states or blindly repeat the full driver. Their completed effects remain part of the evidence.

## Email verification

`email-recovery-48b21da20a.json` records two failed combined journeys, zero completed journeys, unchanged bound identity sources and unchanged existing users/roles/organization/configuration. All browser contexts closed and no external browser requests were allowed.

In both languages, real mismatched-email resend returned an honest unconfirmed-delivery message without changing the token or identity, and an incorrect code produced localized error feedback while preserving the field and token. Keyboard Tab/Enter submitted the invalid attempt. These partial checks do not prove full recovery.

English verification stopped before valid submission because mobile document width was394 at viewport390. French submitted a further attempt but never reached verified state or the expected sign-in route; the exact submitted code was not captured, so its correctness at the transport boundary remains unproven.

Read-only post-run diagnosis confirmed both owned identities remained unverified with an unexpired token, no success audit, and no session. French verification subject count was2, English1; shared IP count3, with no active block. Thus the French failure was not an observed rate-limit rejection or consumed-token navigation delay.

`otp-readonly-diagnosis-48b21da20a.json` identifies the actual layout cause in both languages: auth section/header/content width394 with min-width:auto. OTP row/input width312 plus card horizontal padding/borders42 plus shell padding40 imposes394px minimum. The invisible OTP input is312px, with no extra password-manager width. Screenshots show the visible OTP row itself fits within the expanded card. A blanket overflow-hidden patch would conceal the layout issue.

Pending: narrow responsive correction and a bounded real valid-code retry with rendered-value/submitted-value equality recorded only as booleans. No token, password, session or request body may be retained in evidence. Existing tokens must first be checked as unconsumed/unexpired; no counter reset or resend is authorized by this note.

## Limits

Development useful-review observations: EN31,331ms; FR15,976ms. OTP useful-resend observations: EN53,825ms including cold compilation; FR16,068ms. There is no approved performance budget or production performance claim.

These receipts are historical source-bound evidence. Later corrections require their own focused verification; preserved earlier failures must not be silently replaced.
