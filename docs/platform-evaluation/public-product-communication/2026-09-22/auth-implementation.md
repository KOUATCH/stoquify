# Login and registration communication

Date: 2026-09-22

## Result

Login and registration now place an educational workspace guide beside the form at desktop widths. On smaller screens the unchanged form appears first, followed by the existing registration next steps (where applicable), then the guide. The guide explains a sales journey through named teams: cashier and stock team, finance, then accountant and manager. Both surfaces link to the localized public workflow page.

Only presentation was changed:

- `components/auth/AuthLayout.tsx`: responsive form/guide arrangement; existing language-switch query handling and registration steps preserved.
- `components/auth/public-auth-copy.ts`: equivalent English/French educational copy; existing form and next-step copy preserved.
- `components/auth/public-workspace-guide.tsx`: new static semantic aside with a labeled ordered journey, localized link and visible availability condition.
- `components/auth/EnhancedLoginForm.tsx` and `components/auth/BeautifulRegisterForm.tsx`: narrowly scoped link/consent text color classes following actual browser contrast findings; no behavior changes.

No form fields, form handlers, credential flow, registration workflow, validation, redirects, sessions, consent, referral handling or loading/error behavior were changed. Recovery and verification pages do not receive the new guide. There is no new client state, animation, dependency, authenticated request or mandatory tour.

## Claim boundaries and evidence

The guide describes records and review responsibilities; it does not promise automatic financial posting or instantaneous activation. Its final qualification states that workflows depend on enabled modules, access and setup.

- Sales/stock and payment review are existing public journeys in `components/landing/workflow-atlas-data.ts` (`sellToCash`, `stockToSale`, `customerToCollection`).
- Existing accounting/close journeys distinguish review of entries, exceptions and closing; the new copy uses the same scope rather than claiming certification.
- Registration's existing email-verification sequence was confirmed against `components/auth/BeautifulRegisterForm.tsx` (successful submission redirects to localized `/verify/<id>`), `hooks/useRegisterWorkflow.ts` (requires `verificationRequired === true`) and `actions/auth.ts` (delegates account creation to the identity service).
- Broader purchasing/customer/people content is offered through exploration of `/workflows`, with availability qualifications rather than activation claims.

## Copy hierarchy

| Surface | English heading | French heading |
| --- | --- | --- |
| Login guide | Your work carries forward. | Votre travail fait avancer l’équipe. |
| Registration guide | Give your team a clearer view. | Une vision plus claire pour votre équipe. |
| Shared journey | A sales journey, across teams | Le parcours d’une vente, entre équipes |
| Exploration link | See how the workflows connect | Comprendre les liens entre les parcours |

Complete final English/French guide copy is kept together in `components/auth/public-auth-copy.ts`, under `workspaceGuide`. Existing account-creation expectations remain visible above the registration form, and existing verification/setup/team-access steps remain below it.

## Verification

- Baseline focused authentication tests: 2 suites passed, 9 tests passed. The first successful baseline run could not write JSON in the report directory because of an EPERM filesystem error; assertions completed successfully before the report-write failure.
- After implementation: `node node_modules/jest/bin/jest.js --runInBand --runTestsByPath components/auth/__tests__/LoginSubmissionSafety.test.tsx components/auth/v2/__tests__/BeautifulRegisterForm.workflow.test.tsx`: 2 suites passed, 9 tests passed, exit 0 (12.684 seconds).
- Focused lint: `node node_modules/eslint/bin/eslint.js components/auth/AuthLayout.tsx components/auth/public-auth-copy.ts components/auth/public-workspace-guide.tsx`: exit 0, no warnings/errors.
- These mocked component regressions cover disabled server-rendered credential controls, POST form fallback, auth-client submission and retained failure values, bilingual registration field/step behavior, referral retention, masked credentials, uncertain-outcome recovery and duplicate-submission protection. They do not prove live account creation or successful live sign-in.
- New small blue guide text uses the existing action token (`#2563eb`) on the auth surface (`#eef4f5`), calculated contrast 4.65:1. Muted body text (`#58707a`) calculates to 4.71:1 on the same surface. Dark-mode variants use the existing lighter auth ink token. These calculations are limited to the new guide, not whole-page accessibility certification.
- Root task owns screenshots, responsive/browser verification, links, keyboard behavior and integrated build/type checks.

## Baseline preservation

Exact pre-edit copies were saved under `baseline-source/auth/` and verified by SHA-256 before edits:

- `AuthLayout.tsx`: `11ECDC27C5E5540B9283BB21FA2FF9441AD4171B363A983993EE428C14FEBA0D`
- `public-auth-copy.ts`: `1E2E64D27B66FAD50C320F76511D5EA4C4284C4166071DAC0DD3DAD5C24E09E9`

The repository was already dirty. Compare to these captured copies to isolate this task's additions; a comparison to Git HEAD includes prior work.

## Browser contrast follow-up

The integrated browser scan found existing form text/link contrast failures on both login and registration. The intended light form background class `bg-[#eef4f5]/86` was not generated, leaving form text on the darker canvas. The fix applies the existing `--auth-surface` token directly, restoring the intended light surface and sufficient muted-text contrast.

The five authentication text links now use the existing `--product-brand-action-hover` token (`#1d4ed8`) and underline on hover, retaining their dark-mode text color. Registration's next-step text outside the card uses `--auth-text-soft` for a calculated 5.39:1 ratio on the canvas. The consent text uses the same token; its links retain sufficient contrast on the existing tinted consent background. Root task will recheck actual browser contrast after these corrections.

After the contrast correction, the same two focused authentication suites passed again: 9 tests passed, exit 0 (92.401 seconds). Focused lint across all five changed auth files also passed with exit 0. Root reported zero axe violations on the English and French login recheck; registration and remaining integrated results are recorded in the root browser evidence.

The only changes to both form files are class strings, verified by comparison with newly captured exact baselines:

- `EnhancedLoginForm.tsx`: `6F161B9D0CC71ECA10D7BC85503E765181C176A29ADF660708A28599E6B1EC5A`
- `BeautifulRegisterForm.tsx`: `66BABC9E000D8C58548B40CD4ABE54032E63D598C0FC32961DE65A14D8AC8B6D`
