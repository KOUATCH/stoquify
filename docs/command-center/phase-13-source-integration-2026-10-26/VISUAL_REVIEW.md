# Rendered HR password recovery fixture

The four retained PNGs were inspected directly: EN/FR, 390×1000 and 1440×1000, reduced motion, captured HR recovery hook and dialog primitives, captured theme CSS, synthetic password responses. This is a fixture route, without a signed-in role or connected business operation.

- The invalid-password dialog fits the viewport in all four images. French descriptions, labels, error text and buttons remain inside the dialog without clipping.
- The password field has a visible blue focus indicator. The entered password is cleared after the simulated unsuccessful response.
- The dimmed background distinguishes the modal; title, description, error and actions have a readable hierarchy in these images. Screenshots alone do not establish contrast conformance.
- Native browser checks separately passed keyboard opening, initial focus, cancellation/focus return, retained draft, no automatic business resubmission, pending-dialog protection and rejection of a late response after scope replacement.

Four automated accessibility scans reported no violations. All four retained incomplete `aria-hidden-focus` and `color-contrast` observations. Human screen-reader behavior, contrast review and native 200%/400% zoom remain open. No authenticated application journey, broader HR layout or all-page accessibility certification is claimed.

The English synthetic draft text in the French image is fixture input, not a product translation. Surrounding real recovery copy is localized. No product styling or wording changed in this phase.
