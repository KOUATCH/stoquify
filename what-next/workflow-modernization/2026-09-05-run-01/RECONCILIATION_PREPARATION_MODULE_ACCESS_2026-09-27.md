# PR-19: preparation authority and recovery

Delivered 2026-09-27 on `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`, with unrelated working-tree changes preserved. PR-19 remains **In progress**.

The reproduced defect allowed preparation after reconciliation access changed to read-only following outer action admission. The service now checks canonical module authority inside the same transaction as its reads, transition and retained replay. Denied writes commit a security audit without a preparation receipt. Read-denied callers cannot discover runs or private history; read-only callers retain authorized history and get a clear preparation blocker. Required finance/accounting dependencies use the existing module evaluator.

The UI disables preparation/retry after a read-only preview and preserves the pending command. After access is restored, refreshing the review permits the original retry. No financial postings, certificate algorithms, subscription terms, schema, migrations or live tenant configuration changed.

## Verified evidence

All five receipts and ten actual application screenshots are hash-bound in [the impact receipt](evidence/preparation-module-impact-2026-09-27.json). It preserves the original signing closure, checks all other signing source hashes, and proves that removing the single new blocker restores each original reconciliation translation namespace hash.

| Check | Result |
|---|---|
| Focused Jest, changed-file ESLint, full TypeScript | 90 tests in five suites, lint and typecheck passed; [receipt](evidence/preparation-module-checks-489b6628-2364-42a6-808d-aa6f7daa96aa.json) |
| Actual PostgreSQL module states | Ten cases passed: read-only status/flag, suspension, expiry status/interval, future grant, suspended finance, read-only accounting, explicit empty grants and restore/replay/sign handoff; [receipt](lanes/environment/preparation-module-boundary-c205af1f-641e-48c3-bbcb-f6d37b2c5be8.json) |
| Actual concurrent withdrawal | Both authority-lock orderings passed. Withdrawal first prevents preparation; preparation first commits once and subsequent retry is denied; [receipt](lanes/environment/preparation-module-ordering-8fb31772-bcba-4f54-ab70-0ed6e565b96e.json). Harness labels retain “sign” from its predecessor, but calls and assertions target preparation. |
| EN/FR real application | Read-only explanation, disabled retry, retained command, authentication, withdrawal/restore, response dropped after server commit, reload/exact retry, one receipt/audit, no journal, keyboard return, three widths and controlled text enlargement passed; [receipt](lanes/environment/preparation-module-browser-97a38ad3-6488-4ae4-aa2c-d9a58cc3a1c1.json) |
| Downstream signing | Actual callback and statement recovery, corruption/provider drift denial, atomic rollback, retained certificates, close invalidation, fresh preparation, independent signing/export passed; [receipt](lanes/environment/signed-source-boundaries-21987f3a-d9e3-482f-9c3a-7d7bceb2cd9b.json) |

Browser entry observations were 46,030 ms EN and 11,633 ms FR on the owned development instance, including compilation/session/data work. These are observations, not production budgets or certification. Automated axe checks found no violations in the new preview region but could not determine contrast for two paragraphs because the dashboard uses pseudo-elements. This remains an open accessibility check; screenshots alone do not certify contrast. Native screen-reader speech and browser-chrome zoom were not exercised.

The impact recorder initially failed before creating its output because the older downstream verifier uses `sourcesBefore`, while newer receipts use `sourceBefore`. The recorder now validates both known schemas. The successful immutable receipt records the completed binding. No product change was needed for that recorder error. The original defect reproduction remains historical evidence, not a passing acceptance test.

### Contrast follow-up and report recovery

After the immutable impact receipt was recorded, a focused [EN/FR browser follow-up](lanes/environment/preparation-module-browser-8f133387-8f32-409a-a1c6-7ad72f6e0cf5.json) resolved both preview contrast incompletes. The existing measurement helper retained actual layout, gradients and pseudo-elements, temporarily suppressed glyph paint, sampled backgrounds under text boxes, and compared them with computed foreground colors. Both paragraphs measured a minimum **13.51:1**, exceeding 4.5:1, at 320 and 1440 pixels in each language. This resolves the specific pending contrast item in the earlier impact receipt; it does not establish full accessibility certification. Product source and translation hashes remained stable.

The progress writer also encountered Windows' mapped-file truncation restriction on the payments register. Native writing confirmed the mapped-section error. The writer now retains the original file, stages the complete replacement in the same report directory, atomically replaces it and checks exact bytes. Historical evidence was preserved; no ACL or application changes were made for this reporting issue.

## Operating instructions

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation`, then the reviewed-run preparation workflow. Select a run, inspect its evidence, enter the review reason, and check preparation conditions. A workspace administrator must restore the required reconciliation and dependency access when the read-only explanation appears; do not change evidence or fabricate approval to bypass it. Refresh the review after restoration.

If preparation reports a transport failure, keep the pending command and use Retry. Reloading retains it for the same tenant, actor and run. The service returns the original receipt after a committed response was lost. Preparation does not sign the run: use an independently authorized signer for that handoff. Historical records remain subject to current read permission.

No deployment or migration is needed for isolated verification. Production rollout, customer activation and operational notification scheduling retain their existing controls. Reverting this correction would restore the demonstrated write-authority defect and is not a safe recovery plan; contain affected writes and diagnose before rollout changes.

## Remaining closure work

Conflicting reviewers, more than 20 genuine retained-history entries, remaining legacy source-evidence compatibility, broader denial/error/history accessibility and final preparation guidance/source audit remain. See [closure checklist](RECONCILIATION_PREPARATION_CLOSURE.md). Existing signing closure and original deployment/native-accessibility/notification-operation limits are preserved by the explicit impact review. Statutory rules, payroll/POS, AI behavior and commercial pricing changes are not applicable to this access correction because none of their behavior or records changed.
