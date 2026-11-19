# Command Center localization review

24 October 2026. Scope: the three existing Command Center pages, including both tenant and location Manager variants, their rendered BI/evidence controls, and their current source adapters. English and French. This closes the outstanding source-copy inventory review from CC-03.4; it does not certify every downstream workspace or future source message.

## Inventory and disposition

| Rendered region | Copy owner / evidence | Review result |
|---|---|---|
| Page headings, modes, recovery, filters, pagination, roles, urgency and empty states | Page-local EN/FR dictionaries; shared mode/recovery/queue primitives | Bilingual names and selected states exercised in the rendered fixtures. Location authority now uses a business label rather than `Location.managerId`. |
| Priorities, source dates and reporting periods | `command-center-context`, source date kinds, page formatters | Existing UTC policy retained. Evidence expiry remains distinct from a work deadline. No deadline, amount, rank or source value translated into a different fact. |
| Manager generated summaries, source links, missing-proof fallbacks and assurance actions | `manager-action-center-presentation` | Canonical action labels and incomplete request/response explanations covered. Unknown authored request/finding text remains verbatim. |
| Manager source coverage | `ManagerCoverage` and optional assurance coverage DTO | EN/FR distinguishes loaded incidents, the 25-row pre-permission source cap, possible partial coverage, unavailable reads and unconfirmed coverage. Existing accountant-request disclosure retained. |
| Branch snapshot blockers | `snapshot-source-blocker-presentation`; current branch producer | All six canonical blocker objects reviewed: location required, unavailable and inactive; payroll cost allocation missing; attendance proof missing; unallocated payroll lines. Translation requires matching ID, gate and original field text. Severity uses the existing localized BI labels. |
| Tenant/payment/inventory/close/loss blockers | Existing snapshot presentation maps and current producers | Source-derived tests inspect 28 further literal blocker objects and require translation of each static title/detail/next-action field. Together with branch coverage, [inventory](source-copy-inventory.json) records 34 objects across six current producers. |
| Dynamic counts, amounts, currencies and payroll forecast evidence | Existing snapshot-blocker presentation tests | Narrow canonical patterns retain numeric values, currency codes, blocker identities, severity, provenance and uncertainty. Custom wording, malformed numbers and unknown evidence are preserved. These cases supplement the static source inventory; they are not counted as static literals. |
| Freshness and unavailable destinations | New `command-center-source-copy` helper used by the three adapters | Canonical stale/expired/suppressed/resolved/dismissed explanations, blocked/missing destinations and source age are translated. Available/disabled state and destinations are unchanged. |
| Daily Digest templates and source actions | Digest presentation and signal presentation | Seven existing template families retain their meanings and locale-correct routes. Freshness and unavailable-action reasons now use the shared canonical-copy helper. |
| Owner summaries, signal details, controls and queue | Owner copy and signal presenters | Existing source-specific titles/actions remain; signal detail and freshness now receive canonical translations. Module-control mode labels are localized. Command shows every supplied authorized action with a loaded count. |
| Proof drawer, loading/error/empty states and evidence badges | Existing evidence presenter/drawer plus BI host | EN/FR drawer names, close names, generic error and loading status exercised. Errors do not expose the mocked internal exception. Actual initiating control receives focus on close, including a pending read. |
| Technical provenance and authored evidence | Source-owned | Record identifiers, permission keys, hashes, table names, customer/organization/site names and custom notes are not machine-translated or rewritten. They remain evidence, not UI vocabulary. |

## Verification and limits

The added Phase 4 test file checks source-derived canonical objects without executing snapshot services or querying a database. It also checks unknown/custom wording preservation, evidence immutability, unavailable drill-through, EN/FR queue reachability, coverage states and proof focus restoration. Existing signal, blocker, proof and service tests remain in the selected regression lane.

Rendered checks cover all three modes on each page variant in both languages at 375×1000, 768×1000 and 1440×1000, with reduced motion and a separate 200% CSS zoom reflow check. Synthetic evidence deliberately includes authored text; an English source note in a French fixture is not automatically a missing UI translation.

The current inventory is bounded to these adapters and their producers. Upstream assurance/customer-authored incident messages, future canonical wording, and downstream workspaces need their own source-owner review. The presenters fail safely to the original evidence rather than guessing a translation. This report is not a professional human French-language sign-off, a screen-reader audit, or live-role authorization certification.
