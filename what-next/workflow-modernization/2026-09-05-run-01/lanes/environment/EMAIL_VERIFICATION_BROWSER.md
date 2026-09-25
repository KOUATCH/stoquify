# Email verification — final bounded browser result

Final valid-code receipt: `email-valid-recovery-89401f67.json`,2passed/0failed. Both existing synthetic identities were verified through the real application, their codes were consumed, exactly one success audit was retained for each, and neither received a session. No resend, token rotation, counter reset, extra invalid attempt or email delivery occurred in this retry. Source hashes before/after match.

Both actual rendered values and outgoing user/code arguments matched the stored values, recorded only as booleans. Each identity sent exactly one verification request. English action status200 was captured. The French response-body diagnostic raced the successful navigation and was unavailable; that diagnostic failure is retained in the receipt. French correctness is established by the real destination route, verified database state, consumed code and single audit, without inventing a captured status.

The corrected verification layout measured exact document/viewport widths320/320,390/390 and1440/1440 in both languages. The parent changed only the verification layout/shell copy for this retry; identity service, verification action and abuse controls retain their earlier hashes. This run supplies no evidence that an authentication-service correction was needed.

## Preceding checks and failures retained

`email-recovery-48b21da20a.json` retains the initial two incomplete combined journeys. Both languages passed genuine mismatched-email resend and invalid-code feedback, field/token preservation, and keyboard Tab/Enter submission. English then stopped on394px document width at390px viewport. French's subsequent attempt did not verify; the original request value was not captured, so its cause remains unclassified. No consumed code was retried.

`otp-readonly-diagnosis-48b21da20a.json` identifies the fixed minimum-width overflow and proves both initial codes remained unconsumed/unexpired with no rate-limit block. The final two valid attempts deliberately used those existing codes; no new identity fixture or replacement evidence was introduced.

## Actual images

Visually inspected valid captures:

- `en-email-valid-empty-1440-89401f67.png`: full English verification form and corrected verification-only shell wording.
- `fr-email-valid-empty-390-89401f67.png`: French mobile verification fields and controls within the viewport.
- `en-email-valid-recovered-mobile-89401f67.png`: fully rendered English sign-in destination after genuine verification.
- `fr-email-valid-recovered-mobile-89401f67.png`: fully rendered French sign-in destination with actual verification-success notification.

Additional native desktop/mobile images are listed in the final receipt. `en-email-valid-recovered-desktop-89401f67.png` shows the destination's loading skeleton and must be retained as loading evidence, not described as completed-form proof. The subsequent mobile capture rendered correctly. Existing notification metadata contains English text and a development issue indicator is visible; these do not establish full-product localization or production readiness.

## Scope and timing

The browser's outbound requests were restricted to localhost. Mismatched-email resend deliberately exercised the actual early-return path before provider delivery; no email transport reliability or real mailbox delivery is claimed.

Valid-code-to-destination observations were31,579ms for the cold English sign-in route and3,964ms for the warm French route. These are development observations with no approved performance budget. All browser contexts are closed; the owned local server remains running for subsequent authorized verification.
