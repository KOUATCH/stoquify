# Authentication client server-rendering correction

Date: 2026-09-05. This follow-up preserves all run01 evidence. The only application edit is removal of the `better-auth` entry from `serverExternalPackages` in `next.config.mjs`. The password-hashing library, Better Auth core, server adapters and Prisma remain external. Shared authentication hooks, domain controls, sessions and entitlement rules are not rewritten.

## Cause and evidence

The earlier actual transfer page logged `Cannot read properties of null (reading 'useRef')` at `lib/auth-client.ts:18` → `hooks/useClientAuth.ts:8` → `TransferDashboard.tsx:133`. Client rendering later recovered, which explained why an HTTP 200 and a successful action did not establish correct server rendering.

Inspection of the generated transfer SSR bundle found an external `better-auth/react` module implemented as `module.exports = import("better-auth/react")`. Other React consumers in the same SSR bundle resolved through Next's `vendored/ssr/react.js`. Better Auth's `react-store.mjs` imports `useRef` from `react` and calls it when `authClient.useSession()` runs.

The root package and Better Auth both resolve the same installed React 19.2.8 file. Next 15.5.23 renders with its distinct compiled React 19.2.0-canary-0bdb9206-20250818. This is a boundary created by externalizing the React client; reinstalling or deduplicating the application's React dependencies is not the indicated correction.

The reproducible probe in `diagnostics/auth-react-ssr-probe.cjs` renders the real Better Auth 1.6.26 session hook with two renderers. The native renderer produces `<span>pending</span>`. The Next renderer with the deliberately external client reproduces the exact `useRef` error. Network is disabled, with zero attempted network calls, database access or session mutation. Its JSON describes the deliberately mismatched condition; that expected error is not a failure of the corrected application.

The original bundle was read before the configuration edit, but the automatic Next restart removed it before its hash was retained. The recorded original import excerpt is a direct inspection observation. The configuration's before hash is explicitly reconstructed by reversing the exact one-line deletion, rather than represented as a pre-edit snapshot.

## Narrow correction

Next's installed default external-package list does not include `better-auth`. Removing this one explicit entry permits normal app-router bundling of the React client, allowing Next to resolve its hooks to the renderer's React. No `transpilePackages` override is necessary. Keeping the same package in both lists would trigger Next's explicit conflict check.

The owned server on 127.0.0.1:3107 automatically reloaded the configuration and reported ready in 11.2 seconds. No other application or prototype process was restarted. Configuration syntax validation passed.

## Application verification

`diagnostics/auth-bundling-browser.cjs` checks real password sign-in, the actual persisted session, server permission reads and a forged foreign-tenant header, server/client transfer rendering, module settings, and genuine password step-up by saving one draft in the exact owned French retailer fixture. It checks the active configuration is unchanged. It does not activate a configuration or create a transfer, and does not fabricate session assurance. Its results and new screenshots are saved only in run02.

Final execution passed all eight checks between 14:40:14 and 14:41:16 UTC, recorded in `diagnostics/auth-bundling-browser.json`. The actual transfer HTML contained none of the original `useRef` error, Webpack module-factory error, or client-render fallback markers. The hydrated page produced no browser errors. Its generated Better Auth vendor chunk imports React through Next's `vendored/ssr/react.js`; the transfer page no longer externalizes `better-auth/react`.

The final real password challenge created one additional synthetic draft and one genuinely assured session, while preserving the active configuration. An earlier attempt had already saved one draft before a test locator ambiguously matched both the workbench and closing dialog's success message. That attempt remains separately recorded; this report does not imply it was mutation-free. Neither attempt activated a configuration or wrote a transfer.

The first cold transfer compilation took 177.8 seconds and exceeded the initial browser's 120-second navigation timeout. A subsequent overlapping development compile exposed a different transient Webpack module-factory failure. Both failures are retained as separate receipts. After compilation completed, the serialized warm check passed without a manual restart, cache deletion or additional application correction; useful transfer content appeared in 11.045 seconds. These are observations of this constrained development environment, not a production performance budget or certification.

The retained final receipt binds the exact before/after source hashes and generated bundle hashes. The corrected configuration SHA-256 is `02fb9e080430eac700afa5dafa4faa2f170eaee303a1207662fac5cffd19ff19`. The transfer page bundle SHA-256 is `65f0f4c620dfdb058cbea2eb0a7b8d3ebc2a3fabab4708876d43f4a8692bbbc7`; its Better Auth vendor chunk SHA-256 is `b817042507204434966e4e4a6049d0d4b7415531fd37f5ea90e71d03a9ebb9a6`.

## Accounting scope preview

Two further real application checks passed in English and French between 14:42:08 and 14:42:46 UTC. `diagnostics/accounting-stop-preview-browser.json` binds the exact source versions. Both displayed the supported accounting stop, its explicit manual-journal-only scope, and an authoritative impact preview. Reconciliation remained selected and was not listed as a blocked dependent. The apply control was enabled but was never invoked; persisted configuration and command counts were unchanged.

All four accounting control/impact images and the transfer screenshot were visually inspected. They show actual application content with the expected scope and continuation explanation. This preview verification does not claim to execute the accounting stop or replace the separately owned domain tests.

Later history-pagination and manual-journal error-recovery improvements were assigned after these checks. Their coverage must be bound separately; these receipts are evidence for the exact versions they record. All run01 evidence remains unchanged, including its historical renderer failure. The compact artifact manifest is `diagnostics/AUTH_AND_ACCOUNTING_VERIFICATION_BINDINGS.json`.

## Recovery

If this configuration correction must be rolled back, restore only the exact `'better-auth',` entry after `'argon2',` in `serverExternalPackages`, then reload the intended application instance through the normal deployment process. That restores the former externalization and can reintroduce this SSR defect. Do not restore unrelated configuration changes, alter authentication hooks, or bypass freshness/permission checks. No database migration or data rollback is involved.
