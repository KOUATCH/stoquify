# PR-10 — authentication focus and recoverable failures

Source HEAD `62a56036a5ac9b37236a20c9b148052199069479`, branch `codex/migration-control-plane-release-2026-08-29`, with unrelated working-tree changes preserved. The preceding module-boundary milestone made verified progress. This milestone continues the same primary workflow; no workflow closure is claimed.

## Correction

Successful password confirmation removed the focused password input and left keyboard focus on the page body. The [regression receipt](evidence/sign-focus-checks-2ff6548b-126c-41ff-b777-7a45654f6b20.json) reproduces this: 97 tests passed and the new focus assertion failed. It does not represent an authorization failure or an automatic signature.

The sign-review component now returns focus to the enabled Retry action after successful authentication. If that action has become unavailable, it focuses the review region. It still requires explicit confirmation, retains the exact pending command and retires authentication responses when the component's authority session changes. No service, financial record, grant, credential rule or translation changed. Visual review then exposed misleading error handling: a rejected password displayed the uncertain-signature outcome message. Authentication now uses the existing localized identity-verification failure copy; actual signing failures keep their original recovery message. Returned authentication failures and thrown transport errors have focused regression coverage.

The [focus-stage verification](evidence/sign-focus-checks-de78bd05-c36a-4a72-abd6-cb96b0e0286f.json) passes 98 tests in four suites, changed-file lint and full TypeScript. The test confirms focus and verifies that authentication does not automatically submit another signing request or put the password in session storage.

## Verification scope and recovery guidance

The owned browser driver exercises actual login and password confirmation, a deliberately wrong password, and an explicitly intercepted signing request that fails before reaching the server. That controlled transport failure is distinct from the earlier verified response-loss-after-commit journey. Expected recovery retains the exact command across reload and creates one signature only after an explicit retry.

Operators and users open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation`. After confirming their password, keyboard users continue from Retry. A failed password attempt clears the password field; re-enter the password. After an interrupted signing request, retry the retained request to resolve its outcome. Do not create a replacement run to bypass an uncertain request.

No schema migration or deployment is required for this local correction. Existing release controls apply. The runtime environment is the guarded loopback database `stoquify_local_registration_20260906_01`, with owned synthetic identities and external network fencing. No migration, seed, live approval or external message is authorized or performed.

## Review and remaining scope

Frontend/workflow/accessibility: keyboard continuity and explicit confirmation. Security/privacy: password clearing, preserved authority-session retirement and no credential persistence. QA: focused regression plus actual authenticated journeys. Finance/backend/data: unchanged signing transaction, certificate and module evaluator; prior database evidence remains applicable. SRE: capture initial/warm entry and request timings without credentials or response bodies. Product/operations: recoverable failure and clear next action. Statutory/country rules, inventory/POS/offline, payroll, pricing/billing and AI behavior are not applicable because their policies and records are unchanged.

PR-10 remains In progress pending current full-closure evidence reconciliation and entry-latency attribution. Native screen-reader speech and browser-chrome zoom remain explicit verification limits. Live worker scheduling and general exhausted-message repair/requeue remain separate operational workflow boundaries. No professional or release certification is claimed.

## Full browser journey and evidence reuse

[Both EN/FR full journeys passed](lanes/environment/sign-auth-error-browser-5e77b952-01ad-4592-a1ec-e75feb85b1f7.json): actual wrong password, cleared/refocused field, successful authentication focused on explicit Retry, no automatic signature, a deliberately aborted signing request before server execution, unchanged unsigned run and retained command, reload, exact retry, one signature audit/event and no journal. The initial and rejected authentication states and transport failure have zero selected axe A/AA violations. Measured alert contrast is 4.69:1, label 13.51:1 and authentication-button text 5.17:1. An empty password field has no rendered text or placeholder, so text contrast is not applicable; label and focus are checked separately. Three-width screenshots and controlled 200% root-text enlargement pass in both languages. English authentication and French rejected-authentication mobile screenshots were visually inspected.

This receipt truthfully reports sourceStable:false: an independent shared-worktree edit added moduleComposition.catalog to both dictionaries during the run. [Exact byte reconstruction](evidence/sign-auth-independent-catalog-edit.json) proves that all other dictionary content, including reconciliation, stayed unchanged. The unrelated additions were preserved. This is an explicit scoped reuse, not a relabelled source-stable run.

The earlier [failed browser attempt](lanes/environment/sign-auth-error-browser-7e326fc6-1204-4870-b605-6526e8503c69.json) stopped because the text-contrast sampler tried to measure the empty password input. Its visible authentication text passed; the whole journey did not. The corrected verifier records the empty-field exception separately. It does not count it as a measured contrast pass.

[Focus-only impact proof](evidence/sign-auth-focus-impact.json) establishes that 14 of the preceding module milestone's 16 bound sources were byte-identical, and reconstructs the prior component/test bytes after removing the exact focus addition. [Final copy-only proof](evidence/sign-auth-copy-impact.json) establishes that the later correction only changes the message selected for authentication failures. This permits reuse of transaction/module and full transport-recovery evidence while separately checking the changed message.

Initial entries in the full browser run were 9,336ms EN and 11,621ms FR; warm reload-to-review was 10,044ms EN and 17,340ms FR. The earlier scanner attempt measured 81,941ms initial and 12,052ms warm EN. These developer-server observations are variable, not production performance or a demonstrated optimization. The receipts include navigation and completed-request timings; they do not include complete server-action/SQL attribution or every aborted/incomplete request. Latency diagnosis remains open.

The [final 100-test verification](evidence/sign-focus-checks-c0474747-2572-45ad-9f0a-b76c81bd84b1.json) passes all four suites, lint and full TypeScript with stable source hashes, including both returned and thrown authentication failures.

## Final corrected-copy result

[EN/FR corrected-copy verification](lanes/environment/sign-auth-error-browser-404bafd0-ad17-4e3a-b08d-6e5e97adb6d8.json) passed actual rejected-password wording, cleared/refocused field, successful authentication focus and an unchanged unsigned run. This focused run intentionally does not repeat signing after authentication. Both changed-message scans have zero selected axe violations and passing measured text contrast. The final French 320px error screenshot was visually inspected. The same independent catalogue work revised only its own dictionary section during this run; [final exact reconstruction](evidence/sign-auth-independent-catalog-edit-final.json) proves reconciliation and all other bytes unchanged. No browser receipt is falsely labelled source-stable.

[Current source and evidence binding](evidence/sign-auth-recovery-current-bindings.json) links final tests, corrected-copy browser and explicitly reused full recovery evidence. Application source changes are confined to the sign-review component and its tests. The owned local app was stopped after verification. No additional workflow closure was claimed.
