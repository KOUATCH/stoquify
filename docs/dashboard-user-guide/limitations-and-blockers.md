# Limitations and verification blockers

[Guide home](README.md) · [Coverage](coverage.csv) · [Control inventory](controls.csv)

## What was and was not verified

The browser entry to the dashboard redirected to /en/login. **Zero authenticated dashboard pages were inspected and zero business controls were exercised.** All 130 route patterns were documented from source, but remain blocked for runtime verification. No authorized representative dynamic record was available. No business-data screenshots were captured, credentials sought, guard bypassed or successful walkthrough invented.

Source coverage is 108 source-only; 7 redirect; 7 partial; 7 shared implementation; 1 placeholder. These classifications concern implementation, while runtime blocking is an overlapping dimension. Source-only means code-backed explanation without a demonstrated runtime outcome; it does not certify the feature.

The control CSV contains static candidates as well as reviewed controls. Unknown translation/icon labels, conditional branches, table configuration and shared barrel exports can inflate candidates or hide runtime-specific controls. Their explicit uncertainties remain open. This package completes the independent documentation work; it does not claim full interactive acceptance testing.

## Material implementation limits

| Area | Current limitation | Practical consequence |
|---|---|---|
| Global account menu | Profile, Settings root and Billing routes have no discovered page; account labels include hardcoded User/Stoquify/Pro. | Use specific working sidebar/settings paths; do not infer commercial/access truth from the menu. |
| Legacy notification drawer | Mark it Read only produces a toast; server update is commented out. | Do not treat it as durable acknowledgement. |
| Notifications settings | Session-memory tests; only sound persists. | Not a production email/push preference center. |
| Users/invitations | Email transport disabled. | Recording or replacing an invite is not emailing a colleague. |
| Security | No finished MFA enrolment/challenge route or toggle. | The account-menu 2FA description exceeds current functionality. |
| Item others route | Placeholder sentence only. | Use actual item/supplier pages. |
| POS | Cash/No receipt only; Park/Override warnings; hardware readiness presentation values. | Do not promise alternate checkout channels, parking or connectivity validation. |
| Transfers | Approval immediately posts both legs; no staged ship/receive; priority/internal notes omitted; bounded lookup. | Follow the current posting model and check movement evidence; older detail can remain loading. |
| AP controls | Read-only with navigation only. | No complete invoice approval/post/payment operation from this dashboard. |
| Supplier acknowledgement | No send-email/inline fresh-auth form; acceptance records decision only. | Share the copied link through an authorized process; separately handle authoritative PO changes. |
| Customer statements | Generate/queue are writes; no wired dashboard revoke/export control. | Queue success is not delivery; descriptive copy does not supply missing actions. |
| Cash/payment history | Search not applied; Export prepares authorization without file; proof drawer unavailable. | Use implemented filters and source evidence; do not expect an export download here. |
| Finance summaries | Bounded datasets, mixed scopes, pending payments and operational profit formulas. | Avoid whole-company/settled/ledger claims from a card. |
| Landing inventory change | Previous inventory value equals current. | Zero displayed change is not an observed historical trend. |
| HR/payroll source pages | Several workbenches are read-only and some source-authoring steps are absent. | Resolve prerequisites through supported owner processes rather than invented buttons. |
| Payroll/Compliance | Preparation/release/queue states need external settlement/authority evidence. | No automatic certification or external acceptance from a readiness label. |
| Module composition | Requested and active revisions can differ; certain stop scopes unsupported. | Inspect preparation/grants/permissions and the precise stop policy. |

These are documentation findings, not a request for application changes. The source references are in page chapters, control notes and the evidence register. Ordinary read-only reporting is not itself a defect; the limit is what users can accomplish from that specific page.

## Runtime checks still outstanding

With authorized sign-in, check actual desktop/mobile labels, navigation, forms, validation copy, keyboard/focus behavior, accessible names, responsive layout and translations. Use approved records to inspect dynamic details. Compare rendered branches with the candidate controls and mark unavailable/dormant rows accordingly. Verify read-only filters and file outputs without submitting consequential commands unless separately authorized.

Live end-to-end transaction, permission-matrix, concurrency, provider, hardware, performance and accessibility testing was outside the completed source inspection. Tests were read for behavioral evidence, not executed. There is no claim of legal, tax, accounting, security, privacy, accessibility or production-release certification.

## Evidence freshness and unresolved questions

The source manifest records file hashes and the final verification compares them to the files present at publication. Graph reports dated 2026-08-09 provide older relationships, not current behavior. Live organizations may have different grants, locations, data volume, country-pack readiness or retained records. Exact conditional labels and every action's runtime success remain unresolved until that access is available.
