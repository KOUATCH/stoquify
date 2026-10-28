# Stoquify blocker and gate control plane — plain-language guide

Prepared: 2026-08-18  
Scope: design and assessment only; no release authorization is claimed

## The short answer

Stoquify already has many of the technical pieces needed to automate blocker and gate administration. It can read governed system records, find the relevant artifact, calculate its hash, determine which checks and approvals are required, identify candidate role holders, show missing evidence, and rerun a gate.

It cannot safely decide that a person has governance authority merely because their account has a similarly named application role. It also cannot press **Approve** for that person. Authority and deliberate approval are human governance decisions; everything around them can be made much easier and more reliable.

The recommended product is not a new DocuSign clone. It is an extension of Stoquify's existing **Workflow Assurance** module with four missing capabilities:

1. an authoritative role and delegation registry;
2. a versioned decision and approval-policy catalog;
3. an authenticated approval and immutable evidence-envelope workflow; and
4. an independent verifier that feeds verified results into the existing assurance and gate engine.

## A simple analogy

Think of a gate as an airport boarding gate.

- A **technical check** confirms that the aircraft, route and boarding equipment are ready.
- A **blocker** is a reason boarding cannot continue, such as a missing passport check.
- A **role** is the job title printed in the operating plan.
- **Authority** proves that this particular person is officially performing that job for this flight.
- **Authentication** proves the person controlling the account is really present now.
- An **approval** is the person's deliberate decision to allow boarding.
- **Evidence** is the audit record showing who decided what, when, under which rules, for which exact flight.
- **Certification** is a stronger formal claim that may require an independent qualified reviewer or external authority.

The computer can check the aircraft and paperwork, assemble the passenger list and point out missing items. It must not impersonate the captain or border officer.

## What the important words mean

### Blocker

A blocker is a specific unresolved condition that prevents a gate from passing. It should contain a stable code, an explanation, an owner, the affected evidence and the next permitted action.

Example: `d-07_accountable_approval` means D-07 is missing one or more authentic approvals, including a qualified Cameroon country-pack reviewer.

### Gate

A gate is a versioned set of conditions that must all be satisfied before a controlled activity can proceed. A gate may combine automatic checks, human approvals and external evidence.

Gates are evaluated in dependency order. Stoquify must not evaluate a later step as passed when an earlier dependency is still blocked.

### Identity, role and authority

- **Identity** answers: which stable user is this?
- **Role** answers: what application or operational role is assigned to that user?
- **Authority** answers: is that user formally empowered to make this particular decision for this organization, scope and time period?

A user can have access to a finance screen without being the organization's Financial Controller. Application access and approval authority must therefore be stored and checked separately.

### Authentication and fresh authentication

Authentication proves that the user controls the account. Fresh authentication requires the user to authenticate again shortly before a sensitive action. Stoquify already supports a five-minute fresh-authentication window, which is stricter than the ten-minute G1 requirement.

Fresh authentication does not create authority. It proves presence and account control, not permission to make the decision.

### Approval and attestation

An approval is an explicit **Approve** or **Reject** decision on exact displayed content. An attestation is the evidence statement that records the identity, authority, authentication, decision, artifact and time.

Opening a document, receiving a notification, typing a name or having a signature image in a file is not approval intent.

### Artifact, path and hash

An artifact is the exact file or governed record being reviewed. Its path tells the system where it was found. The path is not proof because the content at that location can change.

A SHA-256 hash is a content fingerprint. If one byte changes, the hash changes. Approvals bind to the hash, not just the filename. Material artifact or policy drift must invalidate affected approvals.

### Evidence and certification

Evidence is a durable record supporting a claim. Certification is a formal conclusion made under a defined policy by an authorized and sometimes qualified reviewer. Stoquify may assemble evidence automatically; it must not claim legal, accounting, statutory or security certification without the required qualified decision.

## How G1 works today

The live, non-writing checks on 2026-08-18 showed:

- G1 technical checks: **13/13 passed**.
- G1 authenticated decisions: **0/11 approved**.
- Required decision-role entries: **33** — three role approvals for each of D-01 through D-11.
- POS gates: **0/10 passed** because G1 is the first blocking dependency.
- Program controller: **ready**.
- Production authorization: **false**.

Frozen G1 contract:

- Artifact ID: `STOQUIFY-POS-G1-CONTRACT-FREEZE-0.2.0-20260817`
- Version: `0.2.0`
- Path: `docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json`
- Independently verified SHA-256: `11434eb3e1af1826516426e90d2d53a2faa47ade361d91191b5f3e0c950a36db`
- Approval register: `docs/pos-enterprise-grade-audit/EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json`
- Approval register status: `OPEN_NO_APPROVALS`

The remaining G1 blockers are D-01 through D-11 accountable approvals. The earlier handwritten images receive zero approval credit because they do not prove authenticated identity, authority, explicit intent, exact decision binding or artifact-hash binding.

## What the proposed module will do automatically

For a registered gate, the module can:

1. load the current versioned gate and decision policy;
2. obtain the registered artifact through a bounded connector;
3. canonicalize and hash the artifact;
4. detect drift from the approved artifact version;
5. generate required checks and approval obligations;
6. look up candidate users and active authority assignments;
7. detect missing, expired or conflicting authority;
8. route approval requests to eligible people;
9. require fresh authentication before a decision;
10. bind each decision to the exact artifact and policy hashes;
11. write append-only approval and business-event evidence;
12. independently verify completeness and segregation of duties;
13. create or update assurance incidents for unresolved blockers;
14. produce a gate result with plain-language next actions; and
15. export redacted JSON and PDF evidence for authorized reviewers.

## What must remain human

Humans must:

- appoint the authoritative Product Owner, Financial Controller, Security Owner and other governance roles;
- confirm qualified reviewers and the evidence of their qualifications;
- resolve role conflicts and temporary delegations;
- choose a decision option where business judgment is required;
- deliberately approve or reject;
- accept or reject residual risk and waivers;
- perform independent checking where segregation of duties applies; and
- determine legal or jurisdiction-specific enforceability.

The system should make these actions clear, fast and traceable. It should never silently replace them.

## Why Stoquify should extend the existing assurance module

The repository already contains:

- organization-scoped Workflow Assurance definitions, runs, findings, incidents, alerts and waivers;
- a control-tower user interface;
- server-side permission and module-entitlement enforcement;
- fresh-authentication controls;
- business events, outbox delivery and idempotency hashing;
- domain sign-off examples with source-hash drift detection;
- maker-checker examples that reject self-approval; and
- evidence grading, redaction and proof-trail services.

Building a parallel control plane would duplicate those capabilities and create two versions of operating truth. The safer route is to add the missing approval and authority capabilities to `services/assurance/`, while domain services continue to own their business rules and records.

## Do we need our own e-signature service?

Not for ordinary internal operational approvals. Stoquify can create strong internal evidence using verified accounts, fresh authentication, server-side authority checks, explicit intent, immutable records and exact artifact hashes.

Use an external provider-neutral e-signature adapter when a contract must be portable outside Stoquify, presented to a regulator or court, or requires certificate-based or jurisdiction-specific legal signatures. The provider's envelope ID, audit certificate and final document hash should be attached to the same Stoquify evidence envelope.

## What happens after G1 passes

1. The verifier confirms all 33 required role entries across D-01 through D-11.
2. The G1 gate reruns against the unchanged contract hash and current approval-policy version.
3. If every condition is valid, G1 becomes passed.
4. G2 becomes eligible for evaluation.
5. G2 may still expose its own technical, approval or external-evidence blockers.
6. G3A through G9 remain dependency-controlled; no later gate passes automatically.

## Value to Stoquify

### Benefits

- Less manual copying of names, paths and hashes.
- Faster explanation and routing of blockers.
- Consistent approval behavior across POS, payroll, finance, inventory and releases.
- Stronger tenant isolation and maker-checker enforcement.
- Clear evidence for audits and customer assurance.
- Automatic invalidation when an artifact or policy changes.
- Reusable approval inbox and control-tower experiences.
- Reduced opportunity for false, stale or ambiguous approval claims.
- A safe boundary for AI: agents may gather evidence but cannot perform human approval.

### Costs and mitigations

| Cost or risk | Mitigation |
| --- | --- |
| A central policy error could affect many modules | Version policies, use staged rollout, require domain-owner review and retain domain-level fail-closed rules. |
| Authority data may become stale | Add effective dates, expiry, delegation, source evidence and recurring revalidation. |
| More governance work is required | Provide an authority workbench, reminders and clear ownership rather than hiding the requirement. |
| Sensitive evidence creates privacy risk | Minimize stored personal data, use stable IDs, apply RBAC/redaction and control exports. |
| Automation may create false confidence | Display source, freshness, evidence grade and unresolved human decisions; never equate populated fields with approval. |
| The module becomes operationally important | Add metrics, alert recovery, reconciliation jobs, backup/restore tests and fail-closed behavior. |

## Recommended next move

Start with a narrow G1 pilot inside the existing assurance module:

1. freeze governance terminology and identify authoritative source owners;
2. add the authority/delegation registry;
3. add versioned G1 decision requirements;
4. implement authenticated approval entries and evidence envelopes;
5. implement independent verification and drift invalidation;
6. connect verified results to the existing G1 gate script; and
7. only then generalize the pattern to other Stoquify domains.

This approach solves the immediate G1 problem while building a reusable platform capability without pretending that software can replace accountable human judgment.
