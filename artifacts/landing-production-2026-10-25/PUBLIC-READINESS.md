# Public launch configuration and promise register

This is an implementation handoff, not commercial approval or certification of the application. No production deployment, business-data mutation or real enquiry was performed.

## Commercial route

The main landing-page actions and selected offers lead to `/en/contact` or `/fr/contact`. The interest is allowlisted and carried into the brief. Visitors may save a text brief locally. When an approved email is configured, they may open a populated email draft, review it and send it themselves. The page does not claim delivery or receipt. A booking link is optional. The form has no server-side lead store, automatic email sending or third-party tracking.

Configure the following with approved public values in the deployment environment:

| Setting | Owner / requirement |
|---|---|
| `STOQUIFY_PUBLIC_ENQUIRY_EMAIL` | Commercial owner: monitored sales/enquiry address; test receipt with authorized test data. |
| `STOQUIFY_PUBLIC_BOOKING_URL` | Commercial owner: optional HTTPS booking destination. Confirm the process for carrying the brief into the conversation. |
| `STOQUIFY_PUBLIC_COMPANY_NAME` | Business owner: approved public company identity. |
| `STOQUIFY_PUBLIC_PRIVACY_URL` | Privacy owner: approved HTTPS policy covering the chosen commercial process. |
| `STOQUIFY_PUBLIC_TERMS_URL` | Business/legal owner: approved HTTPS service terms. |
| `NEXT_PUBLIC_APP_URL` | Deployment owner: actual HTTPS canonical origin, used for EN/FR canonical and alternate metadata. |

Missing values are not replaced by invented addresses, policies, response times or prices. The unavailable-contact state explicitly says no request is sent. The public launch gate remains open until the destination and policies are approved and checked. No response from an owner is an approval.

## Promise register

| Promise or boundary | Evidence inspected | Accountable role / remaining acceptance |
|---|---|---|
| 23 connected workflows, including 3 accounting-firm journeys | `components/landing/landing-workflow-library.ts`, component tests and browser state sweeps | Product owner: retain the full library and confirm supported commercial scope. |
| 18 presentations: 17 available module entries plus HRIS workspace | `services/modules/module-catalog.service.ts`, `landing-module-catalog-data.ts`, coverage test | Product owner: code catalog status establishes presentation coverage, not release certification. |
| First 8 interactive product demonstrations; later entries are guided workflows | `cinematic-product.tsx`, `journey-preview.tsx`, fictional-data disclosure | Product/design: maintain the distinction; do not describe these as live customer data. |
| Accounting-firm access is granted separately by each client | Public workflow and invitation copy, existing scoped-access source references in the audit | Product/security owner: release checks for access controls remain separate from this UI pass. |
| Retail POS is a separately scoped extension | `cinematic-offers-data.ts`, visible offer scope notes and priority FAQ | Commercial owner: approve actual package inclusion, dependencies and quotation terms. |
| Payroll, providers, countries and statutory outputs require confirmation | Catalog availability note, HR/payroll control notes, cost guide and FAQ | Country/product owner: provide a current country/provider support register before making availability claims. No universal coverage claim added. |
| Tailored quotation covers software, setup, connections and support | Cost guide, quote checklist and enquiry brief | Commercial owner: approve pricing and service responsibilities; no price, trial or response-time promise invented. |
| Product artwork shows the current brand and sample records | Shared logo artwork, updated EN/FR dashboard captures and photo overlays | Brand/product owner: the screenshot fixture contains fictional records and no customer authentication. |

## Outcome measurement boundary

No approved public analytics or consent mechanism was found in the inspected landing composition. Do not introduce a tracking vendor without that decision. Once approved, measure locale, CTA location and allowlisted interest; keep organization names, country free text, priorities, employee and financial data out of analytics. Distinguish `brief_saved`, `email_draft_requested` and confirmed lead receipt. A mail-client launch must never count as a submitted or received enquiry. No conversion improvement is claimed from this implementation.

## Before broad acquisition

1. Supply and approve the commercial details above; verify the EN/FR handoff with authorized test data.
2. Approve the country/provider/package support register and policy copy.
3. Clear any production-build blockers recorded in the verification report, then measure the optimized candidate on staging. Development-browser checks are not Core Web Vitals evidence.
4. Check the native selector and mail/download behavior on real iOS and Android devices. Automated responsive Chrome checks do not certify those browsers.
5. Add genuine customer proof or a measured pilot result only when permission and evidence exist. Search/filter enhancements remain optional after usage evidence; no workflows were removed to simplify the page.
