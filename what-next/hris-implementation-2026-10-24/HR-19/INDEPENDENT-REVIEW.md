# HR-19 independent source review

25 October 2026. Reviewer: `/root/hr09_independent_review`, separate read-only agent. Final verdict **PASS_SCOPED_SOURCE_ONLY**. Reviewer inspected tests but did not execute them. Runtime results are separately recorded in evidence.json.

Findings fixed:

1. Existing explicit salary visibility required for operators and recipients, in addition to new handoff permissions.
2. Employee locks precede the period lock, matching native payroll lock order.
3. Referenced compensation definitions locked while gathering source values.
4. Employment, contract and compensation effective dates retained in exported inputs.
5. Collections sorted before fingerprinting.
6. Recipient freshness API returns status only; full current input projection is private and manager-only. Addressed retained package, organization and current authority checked first.
7. Additive database guard requires tenant-valid distinct issuer/recipient and exact version/predecessor linkage.
8. Downloads preserve recipient drafts only after successful authorization for the same package and scope; failures hide sensitive details.
9. Confirmed mutation outcomes remain distinguished from failed subsequent refresh. Retry reloads a known outcome; unknown outcomes retry the original payload/key.
10. Selected period's exact predecessor comes from the authorized preview, independently of capped global history.
11. Every combined workspace/preview/package response must match the mounted actor/company scope before display or download.

Final reviewer: “PASS_SCOPED — HR19 source review. The scope mismatch finding is closed: all sensitive response paths check the mounted scope before display, draft restoration, or download creation. No remaining source findings from the reviewed A/B/C changes.”

The reviewer also identified a synthetic fixture restoration problem (updatedAt changed with a temporary name) and requested transaction rollback/access regressions. Fixtures now restore their original synthetic timestamp; failed-event injection preserves the real event reader and overrides only creation. Historical failed logs are retained.
