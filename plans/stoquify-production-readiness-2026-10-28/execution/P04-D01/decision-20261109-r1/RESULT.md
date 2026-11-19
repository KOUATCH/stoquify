# P04-D01 — policy approved; implementation pending

9 November 2026. Kouatchoua Mark approved option **C: creator plus named, revocable delegates**, recorded for product/accounting and security. The policy applies to the packet's 14 finance report classes; no exceptions were stated.

The decision packet and its 12 acceptance cases were independently reviewed. The 11 inspected source files remained unchanged at the follow-up drift check. This closes the policy decision only. It does not implement access restrictions, qualify downloads or resolve global release-scope decision D01.

Current job-status inspection still uses same-tenant report-read authority without creator/delegate scoping. **P04-R05** is the bounded, unimplemented repair proposal for status inspection and explicit grants. Byte delivery remains subject to P27, provider, retention and release evidence. Approved historical status after artifact expiry must not expose a locator or bytes; aggregate queue visibility retains its separate authority.

## Evidence

- [Approved policy and class matrix](DECISION.md)
- [Machine-readable decision](decision-record.json)
- [Recorded user approval](user-approval.json)
- [Source recheck](source-drift-check-20261109.json)
- [Independent approval review](../../P04-V02/qualification-20261109-r1/independent-review/D01-APPROVAL-REVIEW.json)
- [Bounded repair proposal](REPAIR-PROPOSAL.md) and [package](repair-package.json)

P04 and its remaining surface qualification must depend on the unimplemented P04-R05 repair. No implementation, schema promotion, production flags, commit, push or deployment was authorized by this policy decision.
