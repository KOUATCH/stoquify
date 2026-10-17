# Close authentication and setup-denial recovery

FA-CASH-COMMAND remains In progress. This is a verified recovery correction, not complete close certification or platform completion.

## Finding and delivered behavior

An actual browser attempt to export an older READY assessment stopped at “Fresh authentication required”; the close page had no recovery control. The action already enforced fresh authentication, but the hook discarded its machine-readable code. The hook now preserves that code. The page offers the existing server-owned password verification action, clears the password on submission, retains review notes, and returns keyboard focus to the original action after success. The user must retry explicitly: identity verification never repeats certification or a review automatically.

Certified-export setup denials now provide EN/FR guidance in both the notification and page error. An incomplete current setup continues to deny certification even when an older assessment says READY. No server authority, eligibility, signing or accounting control was relaxed.

## Verification and limits

- 27 tests across the hook and close component, changed-file lint and repository TypeScript checks passed: [receipt](evidence/close-setup-copy-checks-e7b7aef3-59a2-4e2f-be0e-520d499b5e3d.json). Covers EN/FR guidance, preserved fresh-auth codes, explicit retry, retained review notes, focus return, incorrect credentials, rate limiting and transport rejection.
- Actual Chromium EN desktop (1440) and FR narrow mobile (320), with reduced motion: wrong-password recovery, cleared field, real password verification and persisted tenant-bound assurance, explicit keyboard retry, localized setup denial, no download, unchanged journals/payments/pack exports and retained READY assessment: [receipt](lanes/environment/close-setup-denial-browser-b02d0644-32c8-420a-8b40-a21f7eab0add.json). Both pages fit the viewport without horizontal overflow.
- Development timings: en route 42710 ms; password recovery 17903 ms; setup denial 6794 ms / fr route 12544 ms; password recovery 9954 ms; setup denial 4833 ms. These include cold development compilation and automation; no production latency claim.
- Earlier failed browser attempt is retained at [failure](lanes/environment/close-setup-denial-browser-331712bb-ce47-46df-a412-1b7c98d2b580.json); it exposed the missing recovery control. An initial check run passed Jest/lint/TypeScript but could not save its receipt (EPERM, tool session 41358); the successful rerun above retained the output. No automatic approval review rejected the rerun.
- Native screen-reader operation, browser zoom and complete eligible close certification remain unverified. The broader close, payroll and provider lifecycles remain open.

## How to use it

Open /en/dashboard/accounting/close or /fr/dashboard/accounting/close, then the relevant period. Use an account with the required current close permission. If asked to confirm identity, enter your own current account password and choose Verify identity / Vérifier l’identité. A wrong password can be corrected; after too many attempts wait for the server lock to expire. No password belongs in support records. After identity is verified, review and explicitly select the original action again.

If accounting setup is incomplete, the authorized accounting setup owner must complete its actual journals, mappings, period and posting rules and run a new assessment. The password comes from the account holder; permissions come from the organization administrator; accounting configuration comes from the responsible accountant and source setup records. Neither this form nor an identity check supplies an accounting approval. Four required posting purposes still lack default templates and remain an engineering dependency; do not insert placeholder rules to pass the gate.

## Impact, design and rollout

Architecture/API/security: existing action and session-verification service reused; identity/tenant are server derived and existing failure limits remain effective. The additive error code reaches the UI without creating client authority. Backend/domain/data: no changes this checkpoint; actual financial-record hashes were unchanged. Frontend/UX: shared Input and Button, inherited dashboard tokens, inline named form, password label, focus management, polite status, EN/FR and reduced-motion spinner; no new shell, portal or success-as-certification presentation. Product/support: recovery occurs on the page and preserves the chosen work; explicit retry prevents surprise effects. Audit: source bindings, original sources, failed attempt, tests and screenshots retained. Quality/SRE: local owned disposable database only; no production performance or full accessibility certification.

Finance/ledger/setup controls were verified at the denial boundary; no statutory/accounting professional approval is asserted. Packaging/billing, AI/agents, offline, provider integration, POS/inventory/AP writes and database migrations are not applicable to this UI correction because none of their behavior changes. Their existing parent-workflow obligations remain tracked.

No migration, deployment, live activation or external transmission. For a controlled release, use the normal release gates and monitor verification failures and certified-export denials. A targeted rollback restores only this checkpoint's hook/component changes from the retained source archives; preserve earlier working-tree corrections and the server setup gate. Do not roll back the shared checkout wholesale.
