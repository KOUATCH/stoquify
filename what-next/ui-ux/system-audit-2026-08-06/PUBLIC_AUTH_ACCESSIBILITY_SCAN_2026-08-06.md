# Public and Authentication Accessibility Scan

**Checked:** 2026-08-06  
**Target:** local development server at `http://127.0.0.1:3000`  
**Engine:** Playwright Chromium with `@axe-core/playwright`  
**Rules:** WCAG A/AA axe rule set  
**Status:** **Failed — serious violations present**

| Route | Serious violations | Affected nodes | Summary |
|---|---:|---:|---|
| `/en` | 2 rule groups | 3 | `aria-prohibited-attr` on two workflow-selection containers; one text contrast failure |
| `/fr` | 1 rule group | 1 | Text contrast failure |
| `/en/login` | 1 rule group | 4 | Four small status-chip text contrast failures |
| `/fr/login` | 1 rule group | 4 | Four small status-chip text contrast failures |
| `/en/register` | 1 rule group | 4 | Four small status-chip text contrast failures |
| `/fr/register` | 1 rule group | 4 | Four small status-chip text contrast failures |

## Confirmed issue details

### Invalid ARIA use on the English landing page

- `div[aria-label="Choose a workflow module"]`
- `div[aria-label="Choose a use case"]`

The elements expose an accessible name through `aria-label` without a semantic role that supports it. Use an appropriate semantic group/region with a valid label relationship, or remove the unsupported attribute.

### Landing supporting-text contrast

The small blue supporting label ending in “one controlled chain” measured approximately **3.64:1** against its dark background, below the **4.5:1** minimum for normal-size text.

### Authentication status-chip contrast

The small labels “Checkout,” “Stock proof,” “Suspense,” and “People” are approximately 10.24 px and measured roughly **3.50–3.61:1** on `#eef4f5`, below the **4.5:1** requirement for normal-size text.

## Source-level form semantics gap

The active login and registration forms were also scanned in source for validation semantics. Their controls did not expose:

- `aria-invalid` when validation fails;
- an error relationship through `aria-describedby`;
- a submit/server-error announcement through `aria-live` or `role="alert"`;
- appropriate `autocomplete` metadata.

This source scan is a contract finding. Manual screen-reader testing is still required after remediation.

## Required re-test

Certification requires zero critical/serious axe violations plus keyboard-only and screen-reader completion of login, registration, forgot/reset password, and invited-user flows in EN and FR. Axe passing alone is not an accessibility certification.
