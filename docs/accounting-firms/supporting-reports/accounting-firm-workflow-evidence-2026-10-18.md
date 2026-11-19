# Accounting firm workflow copy — 18 October 2026

Scope: landing and workflow presentation only. No invitation, access-control, posting or database behavior changed.

Source revision: `6ee84a90c760d2864f6aef672d8b393ac2b65971`, plus the shared working-tree changes present during inspection.

## Source inspection

The firm reviews accounting evidence connected to operational records already in Stoquify. This supports a message of less reconstitution and more review of exceptions. It does not establish that all records are generated internally, every operation posts automatically, or no external evidence is needed.

- `services/accounting/data-trust.service.ts`: the accountant portal uses posted journals, ledger balances, source links and evidence from payments, purchasing, payroll and other modules. `LEDGER_BACKED_DATA_TRUST` identifies its evidence basis.
- `services/accounting/accountant-access.service.ts`: client grants, dates, capabilities and organization state govern portfolio/portal access. Access is client-specific, not unrestricted access to every operational or HR record.
- `actions/accounting/accountant-access.actions.ts`: the invite action requires the accountant-invite permission and fresh authentication; it passes the current organization and actor to the invitation service.
- `services/accounting/accountant-client-invite.service.ts`: `inviteOrGrantAccountantAccess` grants scoped access to an existing active accountant or queues an invitation to the supplied accountant email. The input includes client consent evidence, role and validity dates. Acceptance creates the client access grant.
- `services/communication/accountant-client-invite-worker.service.ts`: queued invitations have a delivery worker and explicit sent/deferred/failed states. Source inspection is not a live email-delivery test.
- `services/referrals/referral-attribution.service.ts`: the accountant referral proceeds to accountant registration with the invitation token. A referral attribution record alone does not establish a different invitation direction.

| Proposed capability | Source finding | Public presentation |
| --- | --- | --- |
| Client workspace invites an accountant | Implemented action, service, acceptance and delivery path | Describe client-authorized accountant access |
| Accountant reviews authorized clients | Client grants, portfolio and portal read models | Describe scoped client review |
| Firm invites an SME to create a new client organization | No dedicated journey found in the inspected invitation/referral routes and services | Omit claim and CTA |
| Firm invites another independent firm | No dedicated journey found in the inspected invitation/referral routes and services | Omit claim and CTA |

An organization inviting an accountant to review its own books is not evidence of a firm onboarding another firm or a new client organization. The latter two capabilities remain unverified, not proven impossible.

## Presentation

- Six sale-to-accounting story steps and eight product previews show the operation’s existing records and the firm’s review contribution.
- The workflow page includes an accounting firm photo example, and existing workflow handoffs describe the authorized firm’s role.
- The firm story starts with recorded operations, source-linked accounting and exceptions. External statements and supplier evidence remain acknowledged where needed.
- English/French and existing light/dark tokens are retained. No market exclusivity claim is made.

## Verification scope

Source inspection establishes implemented code paths only. Component checks use mocked browser/locale APIs. Rendered checks use the local public pages; they do not exercise tenant accounting or authenticated invitations. No real database or live email-delivery test was performed for this presentation change.

- Contract check: `npm run agent:workflow:check` passed; 196 unclassified commands remain outside its registry coverage.
- Mocked component checks: 82 tests passed across `CinematicLanding`, `ProductWorkflowDemo` and `workflow-atlas`; four bilingual context tests passed again after changing the repeated contextual landmarks to labeled groups.
- Static checks: scoped ESLint and `git diff --check` passed. The Windows Git line-ending notices are informational.
- Rendered checks: signed-out public `/en`, `/fr`, `/en/workflows` and `/fr/workflows` at 1440×1000 and 390×844, both light and dark. Six story steps and eight product selections kept their accounting context aligned; the firm scene used its correct image and workflow destinations. No horizontal overflow or page errors were found.
- Accessibility: the final axe scan reported zero violations within the story, firm section and product accounting context in all eight locale/viewport/theme combinations. This is scoped automated evidence, not a whole-site accessibility certification. Desktop and French mobile screenshots were also visually inspected.

Check scripts and screenshots are in the task's visualization directory:
`C:/Users/J COMPUTER/.codex/visualizations/2026/10/18/01a14fd1-a2ee-7572-8b3c-6e64854cf6a0/`.

Commands used:

```text
node node_modules/jest/bin/jest.js --config "C:/Users/J COMPUTER/.codex/visualizations/2026/10/18/01a14fd1-a2ee-7572-8b3c-6e64854cf6a0/jest.accounting-workflow.config.cjs" --runInBand --no-cache
node node_modules/jest/bin/jest.js --config "C:/Users/J COMPUTER/.codex/visualizations/2026/10/18/01a14fd1-a2ee-7572-8b3c-6e64854cf6a0/jest.accounting-workflow.config.cjs" --runInBand --no-cache --testNamePattern "six story screens|keeps accounting context"
node node_modules/eslint/bin/eslint.js components/landing/accounting-workflow-context.tsx components/landing/cinematic-business-story.tsx components/landing/cinematic-product.tsx components/landing/product-workflow-demo.tsx components/landing/workflow-story.tsx components/landing/public-product-copy.ts components/landing/__tests__/CinematicLanding.test.tsx components/landing/__tests__/ProductWorkflowDemo.test.tsx components/landing/__tests__/workflow-atlas.test.tsx
node "C:/Users/J COMPUTER/.codex/visualizations/2026/10/18/01a14fd1-a2ee-7572-8b3c-6e64854cf6a0/check-integrated-accounting.cjs"
node "C:/Users/J COMPUTER/.codex/visualizations/2026/10/18/01a14fd1-a2ee-7572-8b3c-6e64854cf6a0/check-accounting-accessibility.cjs"
```

The first isolated workflow test run lacked jsdom's media-query mock; the isolated setup was corrected without changing production behavior. The first accessibility scan identified repeated complementary landmarks; these were changed to contextual groups. Browser scripts wait for hydration before exercising controls.

This is a shared dirty checkout. Rollback must reverse only this change's context component, context insertions/styles, firm example/copy and associated test assertions; do not restore whole shared files or remove unrelated untracked work. No commit, deployment or schema change was made.
