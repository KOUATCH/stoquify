# Public discovery and authentication contract

Owner: frontend/auth lead; design-system lead reviews visual exceptions. Reviewed: 2026-10-07. Read [MASTER](../MASTER.md) first; its brand, access and evidence rules remain binding.

## Scope and references

Covers public landing to sign-in/register/recovery and organization-entry feedback. Inspect [public page composition](../../../app/[locale]/(home)/page.tsx), [AuthLayout](../../../components/auth/AuthLayout.tsx), [EnhancedLoginForm](../../../components/auth/EnhancedLoginForm.tsx), [BeautifulRegisterForm](../../../components/auth/BeautifulRegisterForm.tsx), [auth copy](../../../components/auth/auth-copy.ts) and [public auth copy](../../../components/auth/public-auth-copy.ts). Check the actual route before selecting a v2 form; parallel v2 components do not imply route replacement.

## Layout and interaction

Public pages may be spacious and product-led; auth should remain calm, concise and task-focused. Retain `.auth-shell`, its light/dark semantics and product-blue aliases. Preserve existing gold/chestnut Button variants where used; do not apply dashboard darkness to every auth overlay without checking the shell context.

Keep the main form and primary action clear on narrow screens. Labels remain visible; password visibility toggles have accessible names; password managers, paste and keyboard submission continue to work. Localize validation and recovery copy in EN/FR. Maintain the user's selected locale across navigation and authentication recovery. Preserve a clear keyboard focus location after validation and dialog dismissal.

## States and content

| State | Required behavior / example wording to localize |
|---|---|
| Submitting | Prevent accidental duplicate submission; expose progress without shifting the form |
| Invalid input | Associate a concise error with its field and provide a reachable correction path |
| Server rejection | Safe existing auth error; do not expose account existence or internals |
| Uncertain network outcome | Explain that the request could not be confirmed; follow existing retry/recovery logic |
| Expired verification/recovery | Provide the authorized resend or restart action |
| No active organization / denied access | Use the authorized organization-entry or access recovery path; do not display tenant data |

Suggested copy is illustrative, not a replacement for existing auth disclosure rules. Never convert a network timeout into an authentication success or discard the underlying error distinction.

## Evidence required for changes

Inspect [login submission safety tests](../../../components/auth/__tests__/LoginSubmissionSafety.test.tsx) and the changed form's tests. Record actual public/auth routes, locale, viewport and theme exercised. Verify keyboard-only completion, label/error association, long French copy, 200% text zoom, narrow-screen reflow and light/dark overlay readability. Test account/session behavior only in an authorized isolated environment. A static color-contract pass does not prove rendered contrast, authentication safety or a completed user journey.
