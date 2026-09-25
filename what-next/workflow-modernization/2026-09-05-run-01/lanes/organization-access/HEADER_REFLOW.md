# Header access with enlarged text — source v37

OA-F18 is corrected for the verified shared-header layouts. The account menu remains visible and keyboard-operable at 320, 390, 768 and 1440 pixels with normal and doubled CSS text size, in EN and FR. Native browser zoom, assistive technology and comprehensive contrast remain unverified. This is a layout correction; the complete shell/navigation workflow still needs review.

## Reproduction and correction

Source v36 used a nonwrapping header, an inflexible controls group, hidden overflow and a fixed desktop height. Enlarged controls could extend beyond the visible right edge while the document itself still reported no horizontal overflow. Therefore, the earlier document-width-only display assertion was insufficient.

The first explicit geometry run (`../environment/header-reflow-before-f5fc7591-fd2.json`, 9aaf93) reproduced clipping in EN but failed its FR assertion: the control sizes were measured during a CSS transition. The verifier now waits for finite animations and layout frames to settle. The repeat on unchanged application source (`../environment/header-reflow-before-599d173d-c07.json`, fd08b6) reproduced the account-trigger clipping in both languages.

Two class-list changes in `components/dashboard/Navbar.tsx` allow the header and its controls to wrap, preserve a minimum rather than fixed desktop height, and remove overflow clipping. Normal desktop layout remains a single row; narrow enlarged-text layouts gain space for the controls instead of hiding them. Colors, routes, permissions and business behavior are unchanged.

## Verification

`../environment/header-reflow-after-79221f08-8e5.json` (e21fc0) passed both languages: **16 width/text-size combinations**, with all visible header controls inside the viewport/header, no document overflow, account-trigger hit testing, keyboard opening, contained menu bounds and Escape focus return. Sixteen screenshots are retained. Visual inspection confirmed the account avatar fully visible at French 390px/200% text and the unchanged ordinary 1440px desktop composition.

The after-run checks specific control rectangles and hit targets; it does not infer accessibility from document width alone. CSS font enlargement is explicitly distinguished from native browser zoom. No business records were edited by the verifier; only independent synthetic reader sessions were used. No migration, deployment, external message or financial operation occurred.

Changed-file lint passed (eccd04). The final typecheck result and exact v37 source bindings are in `../../evidence/header-reflow-receipt.json`. No unit test was added for static class strings; the real browser geometry and keyboard checks verify the relevant behavior directly.

## Review and remaining scope

- Frontend/workflow/accessibility: concrete low-vision access defect repaired with responsive wrapping and keyboard/geometry evidence. Native zoom/AT/contrast and the complete shell still need review.
- Architecture/security/API: one existing header consumer; no service, authorization, endpoint or account-menu logic changed. Profile v36 functional evidence remains valid for its unchanged services, actions, hooks and form.
- Product/operations: all existing header controls stay available; no new configuration or approval is needed. Users can continue opening Profile from their existing account menu.
- Quality/release/SRE: preserved failed and corrected verifier attempts, source-bound before/after screenshots and no production-release claim.
- Database/finance/country compliance/providers/AI/commercial packaging: not applicable to this CSS layout correction; no records, financial rules, provider behavior or package terms change.

The generic mobile-navigation logout handler, English-only header/search labels, directory/search semantics, presence labels, mobile drawer accessibility and wider workflow register remain separate review work. This focused fix does not certify those paths. Rollback should preserve the wrapping/minimum-height correction; no data recovery or migration is involved.
