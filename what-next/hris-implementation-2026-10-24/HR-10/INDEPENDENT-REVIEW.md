# HR-10 independent review

Reviewer: `/root/hr09_independent_review`, reused as a fresh follow-up independent of implementation. Read-only source and test-definition review; the primary agent ran the verification lanes. Final review: all R1–R7 closed, no remaining concrete blocker in bounded follow-up. This does not substitute for qualified employer/legal approval.

| Finding | Repair | Regression evidence |
|---|---|---|
| R1 P1: employee switch retargeted uncontrolled sensitive drafts | Every form key includes employee identity | Component test switches A to B and verifies empty payment draft |
| R2 P1: refresh advanced concurrency token while preserving stale values | Profile form remounts with updatedAt, adopting values and version together | Component newer-version refresh; PostgreSQL stale update rejection |
| R3 P2: profile edits erased omitted legalName | Owner preserves omitted legalName, explicit value/null retains semantics | PostgreSQL edit preserves legal name |
| R4 P2: salary review without visible amounts | Approval/application controls require no source-owner redactions | Component denial and browser limited role during pending salary review |
| R5 P2: replay conflated omission with explicit clearing | Explicit create/edit hash includes schema-field presence | PostgreSQL changed semantic retry conflicts |
| R6 P1: payment application could overwrite concurrent lifecycle metadata or use stale employee status | Existing operational advisory lock, employee row lock, then request/employee re-read | Deterministic PostgreSQL paused-read race retains lifecycle and destination; terminated employee rejects |
| R7 P2: stale async loads/saves took over selected employee; switch-then-save ordering remained | Latest navigation generation, save completion checks, synchronous navigation submission guard, disabled forms while loading | Component reverse loads, save-then-switch and switch-then-save |

Additional accepted repairs: exact contract-create recovery with current redaction and mismatched-payload rejection; currently effective contract selection; explicit unsupported correction workflows; server whitelist for document review data. Source inspection uses existing HRIS/payroll graph relationships only as discovery, with current owner code controlling behavior.

Automatic approval review rejected a proposed combined mutation adapter because it centralized sensitive writes and added delegated permissions. That adapter was not created. The implemented alternative is a client dispatch to existing protected actions, a read composition, and two narrow contract request actions; existing permission boundaries remain authoritative.
