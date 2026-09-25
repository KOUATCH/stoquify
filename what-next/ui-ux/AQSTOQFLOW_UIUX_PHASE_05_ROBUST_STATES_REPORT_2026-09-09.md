# Robust states: suspense review and recovery

Scope: workflow modernization v89, PR-08/PR-09 on `/en/dashboard/finance/reconciliation` and `/fr/dashboard/finance/reconciliation`. The `aqstoqflow-uiux-05-robust-states` skill informs this bounded queue correction. Existing dashboard error, not-found and route states remain the shared page-level patterns. This report does not establish completion of the platform-wide UI phase.

## State and design mapping

| State or interaction | Existing component/treatment | Meaning |
| --- | --- | --- |
| Loaded queue / retained item | Shared Badge, `--dash-surface`, border/text tokens | Literal lifecycle text; selection does not establish success. |
| Editable proposal | Shared Select/Textarea, `.dashboard-control` | Unsaved draft; server revision and request identity bind submission. |
| Review | Inline named region, `--dash-gold`/`--dash-gold-soft` | Attention to saved evidence before a consequential action. |
| Main action | Shared Button, `.dashboard-button-primary` | User action; no approval implied before server success. |
| Refresh/cancel/assignment | Shared Button, `.dashboard-button-secondary` | Recover, leave review or perform allowed ownership change. |
| Error | `role=alert`, icon/text and `--dash-danger` | Safe localized failure guidance; draft and frozen review remain available. |
| Retained outcome | `role=status`, explicit already-posted/proposed text | Verified service result; not a claim that unrelated conditions are healthy. |
| Reauthentication | Shared password Input and labeled form | Password is cleared immediately on submit; successful verification requires a separate posting confirmation. |
| Select overlay | Existing Radix Select / `.enterprise-floating-surface` | Existing shared portal primitive, with dashboard border/surface/text classes. |

The inherited authenticated shell, navigation and organization context are reused. No second theme, route shell or modal system was added. Inline review receives focus; Escape returns it to its opener. It is a region, so modal focus containment is not claimed.

All new labels, lifecycle terms, stale/error/retry guidance and successful outcomes have EN/FR messages. Recorded monetary values in the queue/review use two decimal places and the item's own currency code. Visual inspection found the inherited XAF formatter rounded a stored 100.25 to 100; the queue now shows that recorded precision. The rest of the finance dashboard's formatting still needs its separate domain review.

## Evidence and limits

See [operator guide](../workflow-modernization/2026-09-05-run-01/SUSPENSE_REVIEW_GUIDE.md) and [verification](../workflow-modernization/2026-09-05-run-01/SUSPENSE_REVIEW_VERIFICATION_V89.md) for source-bound receipts and exact results.

Nine initial focused UI checks passed, including failed draft retry, explicit revision adoption, saved versus unsaved review, fresh-auth separation, denied controls, keyboard return and actual EN/FR message text. Two exact-amount regression cases were subsequently added. The initial test harness failed on an ESM icon import; its failed receipt is retained.

The first complete real-browser EN/FR run passed proposal, review, password step-up, stale rejection, lost committed response/replay and revoked-role denial with no page errors. Its screenshot inspection found the amount display defect and showed mobile captures did not frame the review. A follow-up run verifies the corrected amount and confirms review actions are in the viewport; use the final verification record for its status.

Full screen-reader/contrast audit, refresh/session draft restoration, queue pagination, complete retained-history navigation and the wider workflow lifecycle remain incomplete. Development route timings are observations, not approved performance budgets. No statutory, security, accessibility or release certification is asserted.


## v90 — Suspense recovery across reload and expired sessions

Tab-scoped proposal drafts and pending approval references now survive reload and normal reauthentication. Protected organization/actor scope binds dashboard reads/cache and stored recovery; restored facts come from the server. Submissions require successful local request retention and all existing server controls. A browser-observed permission-refresh loading loop was corrected without keeping permissions active during refresh.

Verified: 82 tests/seven suites, actual EN/FR draft and response-loss/session recovery with one journal/audit, final typecheck and changed-file lint. [Guide](../workflow-modernization/2026-09-05-run-01/SUSPENSE_SESSION_RECOVERY_GUIDE.md), [verification](../workflow-modernization/2026-09-05-run-01/SUSPENSE_SESSION_RECOVERY_VERIFICATION_V90.md), [receipt](../workflow-modernization/2026-09-05-run-01/evidence/suspense-recovery-v90.json).

Remaining: full history/pagination, account labels, screen-reader/contrast, notification lifecycle, retained posting presentation/close obligations and other query families/platform workflows. Coverage 226 provisional workflows / 0 whole verified / 209 unmapped sources. No deployment, migration, live payment, external message or X1 clearance. v90 supersedes only the reload/session-recovery limitations explicitly addressed here.
