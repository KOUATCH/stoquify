# ID-05 final engineering audit

The supported password-change workflow is verified in the owned local environment: discover the permitted action, confirm current credentials, change credentials atomically, revoke target sessions, retain audit/history and sign in with the new password. The existing administrative service/action branch is included; no dedicated administrator target-reset screen is claimed.

## Correction and current evidence

Actual English mobile rendering exposed error text at **3.86:1** against its painted danger background. The message and recovery link now use the existing dashboard text token. The danger border and icon, focused alert and explanatory text retain failure semantics. This is a two-token presentation change; exact reverse reconstruction reproduces the original verified form hash. No password policy, permission, audit, credential or session rule changed.

The retained failed browser receipt is `lanes/environment/password-current-browser-35bf3785-6fc7-44d8-a4c4-b8c3108f868e.json`. It passed normal-state measurements and stopped on wrong-password contrast; it is not counted as a successful journey. The corrected run is `lanes/environment/password-current-browser-27dc050a-456c-4b62-805e-7dfeccd8bd68.json`.

| Criterion | Current evidence |
|---|---|
| Entry and authority | EN/FR account-menu entry and direct-route denial, protected action tests, current actor/role/workspace/session checks. Unknown legacy permission and foreign targets fail. |
| Persisted outcome | Actual user/account credential synchronization, one added password-history record, one security audit, reset-link invalidation and two prior sessions revoked in each browser journey. Old password rejected; new password accepted. |
| Concurrency and authority changes | Nineteen current PostgreSQL cases include one concurrent winner, seven revocations during hashing/preparation and five final-lock checks. Administrator session remains valid while target sessions are revoked. |
| Failure and recovery | Audit/credential failure rolls back all effects; exact unchanged state before retry. Wrong/reused passwords fail. Actual browser transport failure retains both fields and focuses recovery guidance. Successful self-service redirects to localized sign-in. |
| EN/FR and accessibility | Three widths (320/768/1440), keyboard submission/error focus, reduced motion and controlled enlarged-text reflow. Ninety rendered text measurements per locale across ready, wrong-password and transport-recovery states pass; minimum **5.17:1** across measured text. Thirty-two masked screenshots retained. |
| Admin branch | Current action regression and PostgreSQL verify current same-tenant administrative authority, fresh authentication and retained acting session. No unsupported UI completion claim. |
| Static versus runtime controls | Current scanner output is retained separately. The action's self/admin conditional permission and route's delegated server guard are verified from current source and actual denial. Scanner output is not relabeled passing. |
| Regression and operations | `run-password-current-checks.cjs` reran eight focused suites, changed-form lint and full TypeScript; all steps passed with stable sources. Current guide supplies owners, inputs, uncertain-outcome recovery and rollout boundaries. |

The [immutable closure receipt](evidence/password-closure-2026-09-27.json) hashes current source, translations, receipts and screenshots. The fresh database receipt is `lanes/environment/password-change-074ffe12-a22.json`; it passed 19 cases, preserved original authority and blocked external fetch. Focused regression is `evidence/password-current-checks-41e69f07-e427-4da3-85ba-32b4444e0663.json`: 165 tests in eight suites passed.

## Revalidation and review accountability

The original password service, input schema, protected action, route guard/data, credential synchronization, password policy and assurance service still matched their earlier password-specific bindings. Navigation, login, shared identity/permissions, schema and dictionaries had changed, so historical full-journey evidence was not blindly reused: current database, action/route regressions and actual browser journeys refreshed the affected behavior. The exact form reconstruction supports continued relevance of earlier masked POST/no-JavaScript checks. The first final audit correctly stopped when dictionary hashes changed after browser verification. Removing only the separately hashed moduleComposition.experience addition reconstructs both earlier full dictionary hashes exactly; password/reconciliation text and every other byte remain unchanged. The independent edit was preserved and the exact comparison retained before retrying the audit.

Graph app community 83 identifies `locale_dashboard_dashboard_change_password_page_tsx` and `change_password_page_changepass`; community 82 identifies its error boundary. The action/component graphs contain no matching password node. Current source, not missing historical graph coverage, establishes `ChangePass` → delegated route guard → form → protected action → re-exported password service.

Architecture/backend/data/security: credential ownership, locked current authority, transactional audit and target-session revocation are preserved. Frontend/UX/localization: existing shared controls, semantic danger cues, readable error text and EN/FR recovery are verified. Product/QA/SRE/support: explicit success versus uncertain outcome, current evidence binding and safe recovery guidance are retained. Audit/records: one audit and durable password history remain; credentials are masked in screenshots. SaaS: settings module observation remains the existing policy, with no new entitlement, price or provider. Finance/statutory, POS/offline, inventory, purchasing/AP, payroll, ledger, analytics and AI are not applicable because this credential mutation changes none of their business records or rules.

The scanner's conditional-permission/delegated-wrapper recognition is an engineering diagnostic limitation, tracked under existing cross-domain access workflow MC-11. The runtime contract is explicit and verified; no guard was removed to silence a report. Public reset delivery and invitation transport retain their own workflow scope.

## Rollout and limits

Use [the operating guide](PASSWORD_CHANGE_OPERATING_GUIDE.md). No schema migration is needed. Deploy only through existing authorized controls; rolling back presentation does not restore old credentials or sessions. Do not restore old hashes or erase security history as a recovery shortcut.

Local observed entry/save times were EN 12.7/24.6 seconds and FR 5.7/11.0 seconds. Different local environments and compilation make the old timings unsuitable as a performance comparison; no production budget or improvement claim is made.

Native screen-reader speech and browser-chrome zoom remain unverified. Tests establish semantic/keyboard behavior, text contrast, responsive reflow and controlled enlargement, not accessibility certification. No production account, provider notification, full-build/release, X1 or professional certification is claimed. The complete platform assignment remains active.
