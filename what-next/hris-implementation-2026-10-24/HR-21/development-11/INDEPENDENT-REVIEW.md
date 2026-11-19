# Independent review — HR21 development11

Reviewer: `/root/hiring_independent_review`, independent agent explicitly requested by the user. The implementer made all changes; reviewer performed read-only source inspection.

## Findings and resolutions

1. P1 hiring authorization errors discarded structured codes and left private records visible. Canonical codes now reach the workspace; read, write, review and postcommit-refresh denials clear private records/drafts. Review callbacks are tied to the originating selection.
2. P1 protected-document clients discarded canonical codes/status, lacked password recovery, and retained private state after denial. All transport failures retain canonical codes/status; workspace password recovery preserves exact requests and requires explicit retry. Hard denials clear data/drafts, including denials from retention controls.
3. P2 uncertain hiring submissions remained editable. The full submitted envelope is frozen and reused; freshness/other preliminary refusal during recovery cannot unlock an unresolved request.
4. Implementation review found an overbroad denial callback on freshness/business refusal. Restricted to actual authority/session-loss codes; regressions assert no clearing and password focus.
5. Late original LIST/download responses could outlive authorization. Publication and download side effects now check mounted/access generation; deferred-response regressions cover concurrent retention denial.
6. Confirmed document upload/review/retention followed by failed refresh was misreported as an unknown mutation. All post-success refresh paths preserve “Saved” and direct status recovery without another mutation.
7. Harness assertions corrected: self-review denial clears workspace; self-service ignores injected employee IDs; rejected original grant is not-found; copied/expired grants assert canonical errors, not merely an HTTP denial; recovered hiring request compared with original dropped-success envelope.
8. Implementer rendered inspection found invisible refresh text at the document workspace theme boundary. Existing dashboard theme/content wrappers applied to documents and the hiring denied state; no token/palette change. Current rendered verification required after this correction.

Reviewer source verdict before final theme-only correction: **PASS_SCOPED**, all reported production findings addressed. Evidence closure remains pending the final source hashes, rendered journey, current component/type results and cleanup/shutdown verification. This is not employer, provider, statutory or deployment acceptance.

## Final evidence closure — 2026-10-28

**FINAL_EVIDENCE_PASS_SCOPED** — independent reviewer `/root/hiring_independent_review`.

The reviewer independently recomputed all78 source and7 runtime hashes with no differences, verified52 component tests,25 native PostgreSQL tests,12 browser stages with no failures/page errors and cleanup true, zero type diagnostics, both preflight denials, shutdown of ports35587/35588/55464 and absence of the temporary gateway key. Final theme source, EN reviewed-original and FR mobile-denied screenshots were inspected; the bounded contrast/keyboard/mobile claims match the saved harness evidence. No remaining material finding. Local HTTPS simulation and development-only limitations are accurate. Evidence sealing was explicitly identified as the implementer's final step.
