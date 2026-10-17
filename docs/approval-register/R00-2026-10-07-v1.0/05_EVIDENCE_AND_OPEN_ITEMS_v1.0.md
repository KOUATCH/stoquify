# R00 evidence and open items

R00 EVIDENCE | Revision 1.0 | 7 October 2026

DRAFT — AWAITING HUMAN VALIDATION

Organization or project legal owner: [To complete]

The delivery lead maintains this checklist and the associated structured decision data. It records progress and missing evidence; it cannot supply a human approval. Store private supporting records outside the public repository.

| Check | Evidence needed before acceptance |

| --- | --- |

| Scope and baseline | Exact candidate/baseline, migration/toolchain references, cohort, currencies, modules, exclusions and existing findings. [S2, S3] |

| Decisions | Each D01–D08 has a selected decision or valid bounded deferral, rationale, owner, due gate and evidence location. |

| People | Verified names, appointments, authority scope, qualification where needed, acceptance and independence assessment. |

| Decision recording | Exact revision and reviewed evidence; authentic decision outcome; signing and verification records; conditions and restrictions. |

| Acceptance scenarios | For every in-scope capability, identify the workflow/test/example that would demonstrate success and the responsible reviewer. |

| Records integrity | All links resolve; signed records are private and preserved; supersession/revocation does not overwrite original history. |

| R00 review | Delivery lead prepares; product owner and QA lead assess the complete scope/owner/decision evidence. R00 remains PARTIAL until acceptance is actually met. |

Current evidence limits

October 7 engineering evidence records 59 focused tests, four isolated PostgreSQL tests, targeted lint and full typecheck passing. That does not qualify the full product. Shared leave-balance concurrency, authenticated browser workflows, integrated build/package, recovery and statutory validation remain open. [S3]

Statuses used in this pack

Templates: DRAFT / AWAITING HUMAN VALIDATION. Unmade decisions and identities are null in decision-data.json. Future outcomes must be supported by real records; conditional or deferred items retain their restrictions. Canonical R00 stays PARTIAL and humanAssignment stays UNCONFIRMED until verified updates are justified.

Unresolved decisions and completion review

<!-- page break -->

| Item | Still needed | Owner and due gate |

| --- | --- | --- |

| D01 | Initial segment, locations, currencies, enabled modules and capability promises | Product owner + delivery lead<br>R00 before the release-scope baseline; R33 still controls actual release.<br>Named person/date: __________ |

| D02 | Functional currency, rate/rounding, partial-year, close and year-end policies | Accounting owner + qualified accountant<br>R02, R06, R07 and R20 before financial implementation acceptance.<br>Named person/date: __________ |

| D03 | Offline devices, storage/eviction, supported tenders, fiscal limits and recovery | POS/product + security + country owner<br>R04/R05 design; finalize before R32 offline admission.<br>Named person/date: __________ |

| D04 | Role matrix, legal holds, retention and HR/workforce disclosure | Privacy/records + HR + AppSec<br>R08, R10, R16 and R28 before enforcement acceptance and sensitive launch.<br>Named person/date: __________ |

| D05 | Named country experts, rule versions, providers and submission authority | Country/integration leads + business approvers<br>Begin appointments at R00; complete per capability at R18/R19 before activation.<br>Named person/date: __________ |

| D06 | Which optional lot/landed-cost/assets/budget/cohort features are required | Product + actual customer + domain owner<br>R34–R37 before committing implementation capacity; earlier if promised to the first cohort.<br>Named person/date: __________ |

| D07 | Deployment workload, latency, error, backlog, cost, RPO/RTO and alert objectives | SRE + product + finance<br>R23/R30 before measuring operational acceptance against agreed limits.<br>Named person/date: __________ |

| D08 | Pilot cohorts, minimum volume, business-cycle coverage and observation window | Release owner + pilot operations<br>Before R32/R33; criteria must not be invented after results.<br>Named person/date: __________ |

For each open item add: secure evidence reference, missing action, named responsible person, target date, operating restriction, resolution evidence and reviewer. Reuse this row structure in the structured register rather than marking an empty field approved.

R00 review conclusion: [ ] Continue preparation  [ ] Request revision  [ ] Recommend acceptance for stated scope
Prepared by/date: __________________  Product/QA review references: ___________
Unresolved restrictions: __________________________________________________

No R00 conclusion bypasses R18/R19 country/provider gates, R31 release evidence, R32 offline pilot requirements or R33 release authority. A later final release decision must identify the exact candidate and permitted cohort/capabilities.

Capability and open item worksheet

<!-- page break -->

Copy this page for each in-scope capability or unresolved condition. Use separate entries for online, offline, accounting and HR/payroll cohorts. This links your choices to the evidence required by R00.

| Field | Your entry |

| --- | --- |

| Decision and package IDs | D___ / R___  __________________________________________ |

| Capability and module | ________________________________________________________ |

| Country provider and customer cohort | ________________________________________________________ |

| Operating boundary | [ ] Demo  [ ] Proposed pilot  [ ] Future release  [ ] Excluded |

| Named accountable owner | ________________________________________________________ |

| Required authority and reviewer | ________________________________________________________ |

| Acceptance scenario and expected result | ________________________________________________________<br>________________________________________________________ |

| Evidence location version and date | ________________________________________________________<br>________________________________________________________ |

| Missing decision or evidence | ________________________________________________________ |

| Remediation owner and due date or gate | ________________________________________________________ |

| Restriction until resolved | ________________________________________________________ |

| Resolution evidence and reviewed date | ________________________________________________________ |

| Status and linked decision record | ________________________________________________________ |

Baseline binding for this scope: commit/revision ______________________________
Relevant uncommitted files/manifest ________________________________________
Migration/toolchain evidence reference ______________________________________
Known findings and changed-evidence triage __________________________________
