# P03-U02 discovery — command completion and refresh recovery

The sealed four-delta browser run reached real password confirmation and recovered the same committed grant after a deliberately lost response. Its next reviewer grant passed password confirmation and committed, but the UI remained Saving for the90-second observation window. The screenshot shows confirmed success text, no command-recovery subtree, and a stale table containing only preparer and manager.

Both the successful preparer refresh and failing reviewer refresh ended upstream with200 before Chromium reported ERR_ABORTED. That event alone does not identify the root cause. The component uses one useTransition pending flag for mutation/step-up and router.refresh. This is a bounded hypothesis to test, not a proven transport diagnosis.

A repair must preserve uncertain-command identity and duplicate prevention, release command busy state only when the command settles, and either show current committed rows or provide explicit read-only refresh recovery. Native acceptance must inspect visible reviewer state as well as DB commit and pending state.

Original and four-delta artifacts remain immutable. Final cleanup/integrity receipt for this run is pending.
