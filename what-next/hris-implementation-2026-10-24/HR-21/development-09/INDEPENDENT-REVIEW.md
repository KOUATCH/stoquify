# HR21 development09 independent review

Reviewer: `/root/hr09_independent_review`, separate agent. Source review only; the reviewer did not execute the database or browser tests. Runtime evidence is produced by the primary agent and reviewed separately below.

Final source verdict: **PASS_SCOPED**. No remaining material finding in the reviewed changes.

| Finding | Resolution and verification |
| --- | --- |
| Native termination ends sources that the handoff reader previously discarded | Include bounded approved ENDED sources intersecting employment and the selected period. Native before/after regression and final-period browser export. |
| Closing assignments could extend prior end dates or revive draft/future intentions | Preserve earlier end dates; record explicit cancellation provenance; exclude cancelled intentions. Native regression. |
| Termination boundary equality admitted a person who did not work in the period | Treat termination date as the first date no longer employed; cutoff equal to period start excludes. Native regression. |
| Partial-day timestamps were silently reduced to calendar dates | Require midnight UTC at request and application. Native denial regression. |
| Previously suspended sources could become exportable after closure | Retain previous status and require review for suspended contract/compensation closure. Native suspended-contract regression. |
| Attendance could not be certified after termination, while termination rejects frozen overlapping inputs | Admit dated leavers whose employment intersects the period; retain existing locks and certification controls. Positive and seven negative native probes verify no snapshot/event/period writes on rejection. |
| Browser capture matched a client-only request discriminator | Match the actual serialized TERMINATE request. Failed attempt retained with successful fixture cleanup. |
| Final workflow summary included unasserted counts | Assert due completed/open codes, four future OPEN tasks, future ACTIVE status, 900 exported worked minutes and 480 leaver minutes before writing the outcome. |
| Terminated employee wording still referred to onboarding | English/French copy now directs users to departure tasks and final-period inputs, explains the exclusive date, and separates account access. Eight authoring component checks passed. |
| Screenshot still instructed a terminated employee to create an active contract | Terminated-only guidance now says no active contract is expected and directs review of retained approved contracts/final-period inputs. Readiness validation remains unchanged. Reviewer PASS_SCOPED after rereview. |
| Browser task-list refresh encountered a pending password dialog after a committed task outcome | Attempt02 retained as FAILED at ten stages with cleanup complete. Subsequent task reloads re-enter the actual protected route and use its existing password gate. This qualifies route re-entry, not in-place modal-refresh recovery. Reviewer PASS_SCOPED. |
| Retained task-command replay can cross the five-minute assurance boundary | Attempt03 retained as FAILED at ten stages with cleanup complete. Replay now handles native FRESH_AUTH_REQUIRED through the actual read/password UI and retries the identical envelope once. Final history must still contain one approval. No server freshness or clock change. |
| Full-resolution task screenshot showed unreadable refresh text | Attempt04 functional pass retained. Both task branches now use the existing dashboard theme/content wrappers; no global token changes. Final runtime checks require readable EN/FR refresh/filter controls and a denied-state refresh control, with no private task rows after synthetic permission removal. |

The reviewer also checked source-bound regression hashes, the thirteen-case original-source run versus twenty-one-case final run, replay semantics, and preservation of independent approval and current authorization. Review does not certify statutory calculations, external account revocation or live employer acceptance.

The screenshot's payment display does not qualify payment authoring: the declared prerequisite fixture carries approved destination provenance but omits payment-method/masked display fields used by this separate projection. Handoff prerequisite checks and exact export are verified separately. No production payment owner was modified in this slice.

Final evidence consistency review: **PASS_SCOPED**. The independent reviewer verified the current thirteen-stage browser pass with no failures/page errors and cleanup, twenty-one native passes, bounded original-source thirteen checks with eleven expected failures, current source/runtime hashes, five contrast samples, 96+8 mocked/component results, six-root TypeScript0, final workflow/diff and stopped-port evidence. Current French normal/denied screenshots were inspected: readable controls and no task cards after denial. RESULT, register and seal preserve the synthetic prerequisites, separate account deactivation, manual attestation and development-only limits. No residual material inconsistency found. The reviewer did not run application tests, database commands or seal.cjs.
