// Documentation generator only: reads repository evidence, never changes approval registers or data.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const root = path.resolve(__dirname, '../../../..')
const out = path.dirname(__dirname)
const prefix = 'docs/pos-enterprise-grade-audit/'
const contractPath = prefix + 'EXECUTION_06_G1_CONTRACT_FREEZE_V0_2_0.json'
const registerPath = prefix + 'EXECUTION_06_G1_CONTRACT_APPROVAL_REGISTER.json'
const programPath = prefix + 'EXECUTION_07_G2_G9_GATE_CLOSURE_PROGRAM.json'
const prior = 'what-next/pos-enterprise-modernization/2026-09-23/'
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))
const digest = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex')
const contract = read(contractPath), register = read(registerPath), program = read(programPath)
const generatedAt = new Date().toISOString()
const write = (name, content) => fs.writeFileSync(path.join(out, name), content)
const json = (name, data) => write(name, JSON.stringify(data, null, 2) + '\n')
const bullets = list => (list || []).map(value => '- ' + value).join('\n')
const source = p => '[' + p + '](' + path.relative(out, path.join(root, p)).replaceAll('\\', '/') + ')'
const notes = {
  'D-01': {
    rationale: 'Retain the selected disabled store-credit scope until issuance, redemption, liability, expiry, refund and reconciliation controls have approved evidence.',
    alternatives: 'Implement a separately approved store-credit product, or exclude it from the release. Enabling an existing UI option alone is insufficient.',
    impact: 'Cashiers cannot redeem store credit; finance avoids an unproven liability and reconciliation path.',
    acceptance: 'UI hides unsupported tender and server rejects crafted store-credit requests before sale, inventory, cash or journal consequences.',
    rollback: 'Keep store-credit tender disabled at the service boundary and preserve previously recorded facts.',
  },
  'D-02': {
    rationale: 'Retain the selected terminal/session claim design for review, with explicit evidence of drawer-ownership limits rather than implying a stronger database invariant.',
    alternatives: 'Introduce a dedicated unique active-drawer claim through a separately reviewed migration, or restrict operations to the demonstrated terminal/drawer allocation.',
    impact: 'Cashier handover, duplicate tabs, supervisor recovery and cash responsibility depend on one authoritative active owner.',
    acceptance: 'Race concurrent open, handover, close, sale and recovery commands; prove one owner and no mutation through a stale session across organizations and locations.',
    rollback: 'Block new affected sessions; reconcile and close existing sessions through their recorded owner without rewriting cash history.',
  },
  'D-03': {
    rationale: 'Approve only the explicit disabled electronic-tender scope until a named provider and its real contract have been reviewed.',
    alternatives: 'Select a provider and complete G3A sandbox and treasury review; defer electronic tenders entirely.',
    impact: 'Cash-only operation is narrower but avoids mapping uncertain or fabricated provider results to paid sales.',
    acceptance: 'Unsupported electronic tenders fail before mutation. Later activation needs signed callback/replay, unknown/late-capture, settlement and reversal evidence.',
    rollback: 'Disable new electronic attempts and retain investigation/reconciliation of existing provider references.',
  },
  'D-04': {
    rationale: 'Keep offline capture disabled under the frozen decision; reference synchronization or replay scaffolding does not prove safe offline sale acceptance.',
    alternatives: 'Approve a bounded offline policy with device identity, limits, fiscal timing and replay/conflict controls, or require network connectivity.',
    impact: 'Disconnection interrupts new checkout but retained uncertain requests remain recoverable without duplicate sale creation.',
    acceptance: 'Network loss cannot produce a false recorded sale; reconnect preserves the original request identity and resolves uncertain outcomes safely.',
    rollback: 'Disable new offline capture; preserve queued evidence and route unresolved records to a scoped operator workflow.',
  },
  'D-05': {
    rationale: 'Treat the exact frozen simulated-desktop/PDF option as development scope only. Its declared browser/OS labels require reconciliation with an actual supported device matrix before broader approval.',
    alternatives: 'Approve explicit peripheral exclusions for a bounded release, or test named browser/OS/scanner/printer/drawer combinations.',
    impact: 'Defines support promises, cashier ergonomics and recovery procedures; a rendered printer label is not a hardware test.',
    acceptance: 'Record actual versions and viewport dimensions, EN/FR, keyboard, screen-reader, touch, zoom/reflow, disconnect/retry and each included physical device.',
    rollback: 'Withdraw unsupported matrix entries and show unavailable device capability accurately; preserve browser receipt access where verified.',
  },
  'D-06': {
    rationale: 'Retain source-linked compensating full-sale corrections as the reviewed target; do not imply partial returns or maker-checker are complete.',
    alternatives: 'Restrict release to approved correction scenarios, or implement and prove partial-line disposition and materiality/approval controls in a later approved slice.',
    impact: 'Protects inventory, customer balances, cash and ledger provenance while keeping operator responsibilities explicit.',
    acceptance: 'Fresh-auth denial, permissions, original-drawer ownership, insufficient cash, duplicate correction and unsupported electronic reversal have no unintended effects; approved paths balance.',
    rollback: 'Disable affected new correction paths and preserve original and compensating records for controlled resolution.',
  },
  'D-07': {
    rationale: 'Retain Cameroon/XAF/EN/FR development-only scope until qualified country review and independent checking supply dated authoritative provenance.',
    alternatives: 'Approve a narrower nonproduction scope, or obtain country-specific fiscal numbering, tax, submission, retention and correction approval.',
    impact: 'Defines what receipts and country behavior may claim; zero-tax synthetic tests do not establish statutory compliance.',
    acceptance: 'Qualified reviewer and independent checker bind dated sources and supported/unsupported rules to the country-pack version and release candidate.',
    rollback: 'Keep unapproved statutory issuance disabled; preserve immutable evidence and route existing submission exceptions to their owner.',
  },
  'D-08': {
    rationale: 'Retain the decision not to claim a production SLO until D-05 and measured workload baselines exist.',
    alternatives: 'Measure and approve targets for a bounded workstation/cohort, or retain development-only service expectations.',
    impact: 'Support staffing, timeout/retry budgets and expansion decisions must match observed capacity and failure recovery.',
    acceptance: 'Record workload, concurrency, duration, latency percentiles, errors, recovery time, alert acknowledgement and explicitly approved thresholds.',
    rollback: 'Stop expansion when the approved budget is exceeded; retain observability and incident ownership during rollback.',
  },
  'D-09': {
    rationale: 'Review the selected delivery-based recognition target with the controller and qualified accounting reviewer; ordinary immediate POS tests do not prove a complete delivery/invoice aggregate.',
    alternatives: 'Keep delivery invoicing excluded, or approve a separately specified advance/deposit policy with its own recognition controls.',
    impact: 'Prevents duplicate billing and premature revenue/receivable recognition across confirmation, delivery and invoicing.',
    acceptance: 'Confirmation remains non-posting; eligible accepted delivery quantities, partial invoices and retries cannot create duplicate invoices, revenue or tax.',
    rollback: 'Disable new unsupported delivery invoice creation; preserve posted documents and use approved linked corrections.',
  },
  'D-10': {
    rationale: 'Retain availability-only reservations and stock/COGS ownership at physical issue as the proposed policy; define negative-stock, UOM, lot and serial exclusions explicitly. The frozen evidence pointer postStockReservation names an unimplemented target, not a function verified in current source.',
    alternatives: 'Limit release to immediate POS goods issue, or implement and approve reservation/fulfillment aggregates and unsupported-combination handling.',
    impact: 'Aligns cashier availability, warehouse responsibility and finance valuation without double stock or COGS effects.',
    acceptance: 'Concurrent reservation, partial issue, backorder, cancellation and reversal prove no oversell or duplicate COGS; reservation alone leaves on-hand and COGS unchanged.',
    rollback: 'Disable unsupported reservation/fulfillment combinations and preserve source-linked stock events and commitments.',
  },
  'D-11': {
    rationale: 'Retain separation of session, drawer, business day, statement, reconciliation and accounting close; a working drawer page does not prove end-to-end business-day close.',
    alternatives: 'Limit supported close scope explicitly, or implement missing aggregates and obtain controller/treasury approval for the full close cycle.',
    impact: 'Cashier declarations, supervisor variances, settlement matching and accountant period controls remain independently attributable.',
    acceptance: 'Prove blind declaration where required, no self-approved material variance, cash/provider/ledger/bank tie-out and late-correction invalidation.',
    rollback: 'Stop close finalization on unresolved differences; retain evidence and reopen through a typed, audited correction procedure.',
  },
}

let packets = '# POS decision review packets\n\nGenerated ' + generatedAt + '. These packets are proposals awaiting real accountable review; they are not approval records. No owner identity has been inferred.\n\n'
packets += 'Frozen contract: ' + source(contractPath) + '; version `' + contract.contractVersion + '`; SHA-256 `' + digest(contractPath) + '`. Register: ' + source(registerPath) + '.\n\n'
packets += 'The selected options below are copied exactly. If a reviewer chooses another option, create a reviewed contract revision and collect affected approvals against its new hash; do not edit the existing frozen file or transplant old signatures. The supplementary artifact-verifier contract in this run specifies how signed evidence is checked.\n\n'
for (const d of contract.decisions) {
  const n = notes[d.id]
  packets += `## ${d.id}: ${d.title}\n\n- Status: PENDING; actual accountable people: not supplied.\n- Exact proposed option: \`${d.selectedOption}\`.\n- Required roles: ${d.requiredApproverRoles.join('; ')}.\n- Frozen implementation declaration (historical, not a fresh test result): ${d.implementationStatus}.\n- Recommendation: ${n.rationale}\n- Alternatives: ${n.alternatives}\n- Impact: ${n.impact}\n- Acceptance: ${n.acceptance}\n- Rollback/disable: ${n.rollback}\n- Known limitations: ${(d.limitations || ['Consult the gate preflight and evidence limits; no production approval is inferred.']).join(' ')}\n- Source pointers: ${(d.evidence || []).map(p => '`' + p + '`').join('; ') || 'Measured baseline and approved support matrix still required.'}\n\n`
}
packets += '## Approval intake\n\nReviewers must supply the exact decision, selected option, rationale, affected capabilities, effective version, review/expiry time and rollback policy. Each required role must provide a real authority reference, fresh-authentication and approval timestamps (approval within ten minutes), and externally verifiable detached evidence bound to the full decision and contract. The gate verifier requires an operator-managed trusted public key and the signed artifact envelope documented in [approval-verifier-contract.md](approval-verifier-contract.md). No keys, signatures, identities or approvals were created by this review.\n\nThe existing register describes these fields:\n\n```json\n' + JSON.stringify(register.decisionApprovalRecordSchema, null, 2) + '\n```\n\nTemplates and typed names are not proof. Existing compliance authorization material was previously assessed as unverified identity/scope declaration only; this run does not override that assessment. Submit evidence through the established controlled repository review process; this task has not contacted any owner.\n'
write('approval-packets.md', packets)
json('decision-packets.json', { generatedAt, contractPath, contractSha256: digest(contractPath), contractVersion: contract.contractVersion, status: 'PENDING_AUTHENTIC_REVIEW', decisions: contract.decisions.map(d => ({ ...d, historicalDeclaration: true, actualOwners: null, packet: notes[d.id] })) })

const procedures = {
  'EXT-G1-APPROVALS': ['Product, finance, security and domain approvers listed per decision', 'ARTIFACT_BOUND_APPROVAL',
    ['Review all 11 packets and resolve scope disagreements before signing.', 'Confirm authority for each required role using the approved identity/authority system.', 'Perform fresh authentication and approve the exact decision within the required time window.', 'Export the detached signed artifact, record its byte hash and evidence reference, and have the gate verify it with an independently managed trusted key.', 'Run G1 fail mode; missing, expired, mismatched or untrusted artifacts must remain blocked.']],
  'EXT-PROVIDER-SANDBOX': ['Payments, treasury, accounting and security owners', 'PROVIDER_SANDBOX',
    ['Name the provider and merchant sandbox; provide official callback/signature and settlement specifications and a managed secret reference without exposing credentials.', 'Prepare synthetic orders and provider test cases for success, decline, timeout, unknown, duplicate, late capture, reversal, refund, dispute and chargeback.', 'Execute only provider-documented sandbox operations; verify signed callbacks, replay rejection and provider-authoritative transitions.', 'Tie out sale/payment/settlement/fee and bank-statement evidence; inject a statement mismatch and confirm owned exception handling.', 'Capture redacted request/callback/statement references and actual results; provider placeholders and local mocks are insufficient.']],
  'EXT-CM-QUALIFIED-REVIEW': ['Qualified Cameroon country reviewer, independent checker and financial controller', 'QUALIFIED_HUMAN_REVIEW',
    ['Identify reviewer and checker authority and the exact country-pack/release scope.', 'Assemble dated official source citations for each enabled fiscal/tax/numbering/submission/retention/correction requirement; have qualified reviewers verify them.', 'Review immutable receipt snapshots, numbering and correction lineage against the supported scope; document explicit unsupported decisions.', 'Exercise authority outage/rejection and delivery retry in the approved nonproduction environment.', 'Return signed findings, exclusions, required remediation and approval bound to the exact artifact. This procedure asserts no legal rule or compliance result.']],
  'EXT-HARDWARE-MATRIX': ['Retail operations, QA, accessibility/French reviewers and support owner', 'PHYSICAL_HARDWARE',
    ['Record actual OS/browser versions and each scanner, printer and drawer model/connection; obtain explicit signed exclusions for omitted hardware.', 'Sign in with an existing authorized cashier and separately verify prohibited-role denial without widening access.', 'Measure actual desktop/tablet/mobile viewport dimensions; exercise EN/FR checkout recovery, keyboard-only navigation, focus, screen reader, touch, 200% zoom and 320px reflow.', 'On included physical devices, test scan/print/drawer operations, disconnect, retry, duplicate input and fallback using synthetic data.', 'Capture device/operator identity and redacted evidence. Browser PDF, simulated device status and ineffective viewport overrides cannot qualify as physical coverage.']],
  'EXT-CLOSE-CYCLE': ['Store supervisor, controller and treasury owner', 'PRODUCTION_LIKE_OPERATIONS',
    ['Prepare a guarded production-like environment with synthetic sales, sessions, declarations, settlements and bank statements.', 'Run a complete business-day cycle across multiple sessions with an explicit included-session manifest.', 'Exercise blind declarations, approved variance thresholds and no-self-approval rules; reconcile cash/provider/ledger/bank differences.', 'Introduce a late correction and prove close evidence is invalidated and routed for review.', 'Capture statement hashes, tie-outs, exception ownership, approval records and reopen history; a drawer-rendering test does not complete this cycle.']],
  'EXT-INVENTORY-POLICY': ['Inventory controller, fulfillment owner and accounting owner', 'ARTIFACT_BOUND_APPROVAL',
    ['Declare negative-stock, unit conversion, lot, serial, reservation, issue and reversal scope with explicit unsupported combinations.', 'Review immediate POS goods issue separately from delivery reservations and fulfillment.', 'In a guarded synthetic database, race reservations and issues, then exercise partial fulfillment, backorder, cancellation and reversal.', 'Verify no oversell, no duplicate stock/COGS, and no on-hand/COGS movement from reservation alone.', 'Return signed policy and scope evidence; attach actual integration results without treating policy approval as proof of implementation.']],
  'EXT-AR-RETURNS-POLICY': ['Controller, qualified accounting reviewer, treasury and returns owner', 'ARTIFACT_BOUND_APPROVAL',
    ['Specify delivery recognition, advance/deposit exclusions, invoice eligibility, allocation/unapplied cash, refunds and return disposition policies.', 'Trace partial delivery through invoice, collection, allocation, return receipt/inspection/disposition and source-linked credit/refund.', 'Exercise duplicates, undelivered billing attempts, unauthorized corrections and restock-before-disposition attempts in synthetic tests.', 'Tie out receivables/revenue/tax/cash/stock and prove maker-checker and fresh-auth behavior where required.', 'Return signed policy and reviewed scenarios bound to scope; unsupported workflows stay disabled.']],
  'EXT-OPS-DRILLS': ['SRE, security/privacy, QA, support and incident owners', 'PRODUCTION_LIKE_OPERATIONS',
    ['Freeze the candidate, environment, workload and approved SLO/error thresholds; retain a complete successful build and redacted secret-configuration evidence.', 'Run bounded load/soak, network loss, provider outage and worker-backlog scenarios without real customer transactions.', 'Execute backup restore, point-in-time recovery and failover in designated disposable recovery targets; verify evidence/data consistency.', 'Exercise managed secret rotation, alert delivery/acknowledgement and an incident drill with named owners/runbooks.', 'Attach independent security/privacy and accessibility review within stated scope; record measured outcomes, rollback and unresolved findings.']],
  'EXT-PILOT-COHORTS': ['Product, controller, security, country reviewer, rollout and support owners', 'CONTROLLED_PILOT',
    ['Do not start until prerequisite gates and separate pilot authorization are complete.', 'Name the cohort/design partner, agreement, supported capabilities, operating limits and daily review owner.', 'Capture an entry snapshot for each R0-R6 stage; define measured stop conditions and rollback/support capacity.', 'During each authorized stage record service-level/error-budget, close/reconciliation, incidents and support load.', 'Obtain artifact-bound expansion or rollback decisions for each cohort; never infer permission for R1-R6 from an R0 local pass.']],
}
let external = '# External verification procedures\n\nGenerated ' + generatedAt + '. Procedures and capture templates only; no external test or approval is claimed. Actual owner identities, provider credentials, devices and production-like environments have not been supplied.\n\n'
external += 'For every returned artifact record: requirement ID, gate, evidence class, exact release/contract/country scope, source revision and source-manifest hash, environment and synthetic-data provenance, operator/reviewer authority, start/end times, scenario, expected/actual result, redacted artifact paths and hashes, defects, exclusions, expiry, stop-condition evaluation and detached authenticated approval. Follow [approval-verifier-contract.md](approval-verifier-contract.md) for machine-verifiable envelopes and trust configuration.\n\n'
for (const e of program.externalEvidenceRegister) {
 const [roles, evidenceClass, steps] = procedures[e.id]
 external += `## ${e.id} — ${e.gate}\n\nRequired: ${e.required}.\n\nDeclared status: ${e.status}; actual completion: not established. Accountable roles: ${roles}; named people: not supplied. Evidence class: ${evidenceClass}.\n\n` + steps.map((s,i) => `${i+1}. ${s}`).join('\n') + '\n\nAcceptance: all applicable gate requirements and stop conditions below must be evaluated; any failure, missing prerequisite, unverifiable approval or expired evidence prevents release credit.\n\n'
 const gate = program.gates.find(g => g.id === e.gate)
 external += bullets(gate.requiredEvidence || ['All 11 decisions approved by every required role against the exact frozen contract.']) + '\n\nStop conditions:\n\n' + bullets(gate.stopConditions || ['Missing or unverifiable accountable approval.']) + '\n\n'
}
write('external-verification-procedures.md', external)
json('external-evidence-capture-template.json', { templateOnly: true, status: 'NOT_EXECUTED', requirementId: null, gate: null, evidenceClass: null, candidateHead: null, sourceManifestSha256: null, environment: null, syntheticDataProvenance: null, actualOwner: null, reviewerAuthorityReference: null, startedAt: null, completedAt: null, cases: [], evidence: [], exclusions: [], defects: [], reviewedAt: null, reviewOrExpiryAt: null, signedEnvelopeReference: null })

const localEvidence = {
 G1: ['Fresh gate reports and hardening regressions from this run; detached register remains empty.'],
 G2: [prior + 'evidence/full-commit-readiness.md', prior + 'verification-matrix.md', 'services/pos/cart-revision.ts', 'services/pos/cart-write-access.ts', 'services/pos/__tests__/checkout-lifecycle.postgres.test.ts'],
 G3A: [prior + 'evidence/payment-gate.json', 'services/payments/'],
 G3B: [prior + 'evidence/security-review.md', prior + 'evidence/receipt-config-gate.json'],
 G4: [prior + 'evidence/browser-completion-2026-09-24.md', prior + 'evidence/localization-parity.json'],
 G5: [prior + 'evidence/services-review.md', prior + 'verification-matrix.md'],
 G6: ['services/inventory/inventory-stock-event.service.ts', prior + 'evidence/full-commit-readiness.md'],
 G7: [prior + 'evidence/full-commit-readiness.md', prior + 'evidence/security-review.md'],
 G8: [prior + 'evidence/build-isolated-outcome.json', prior + 'rollout-and-support.md'],
 G9: ['No pilot execution or expansion approval has been established.'],
}
const matrix = program.gates.map(g => ({
 id: g.id, purpose: g.name, dependencies: g.dependencies, historicalDeclaredStatus: g.status,
 disposition: g.id === 'G1' ? 'BLOCKED_AUTHENTIC_APPROVALS' : 'BLOCKED_DEPENDENCY; INDEPENDENT_PREFLIGHT_PARTIAL',
 acceptanceCriteria: g.requiredEvidence || ['11 decision approvals with role-complete authentic evidence bound to exact contract.'],
 stopConditions: g.stopConditions || ['Unverified or missing approval'],
 implementationSource: programPath, evidencePointers: localEvidence[g.id], externalRequirements: g.externalRequirements || [],
 accountableRoles: g.id === 'G1' ? [...new Set(contract.decisions.flatMap(d => d.requiredApproverRoles))] : procedures[program.externalEvidenceRegister.find(e => e.gate === g.id)?.id]?.[0] || 'POS engineering, security and QA',
 actualOwners: null, currentLocalEvidenceIsProductionProof: false,
 permittedNow: 'Gate tooling, evidence preparation, existing development-control corrections and read-only later-gate preflight.',
 nextAction: g.id === 'G1' ? 'Review decision packets and supply authentic role-complete approvals; rerun hardened gate.' : 'Resolve prerequisite gates; then execute the recorded local closure order and external procedures.',
 residualRisk: 'Source/test foundations do not establish the complete required scenario matrix or external operating scope.',
 workPackages: g.workPackages || null, localClosureOrder: g.localClosureOrder || [],
}))
json('gate-closure-matrix.json', { generatedAt, sourceProgram: programPath, sourceProgramSha256: digest(programPath), gates: matrix, decisions: contract.decisions.map(d => ({ id:d.id, title:d.title, exactSelectedOption:d.selectedOption, requiredRoles:d.requiredApproverRoles, actualOwners:null, status:'PENDING_AUTHENTIC_REVIEW', packet:'approval-packets.md', acceptance:notes[d.id].acceptance })), externalEvidence: program.externalEvidenceRegister.map(e => ({...e, actualOwners:null, procedure:'external-verification-procedures.md', classification:'EXTERNAL_REQUIREMENT_NOT_SUPPLIED'})) })
write('gate-closure-matrix.md', '# Gate closure matrix\n\nGenerated ' + generatedAt + '. The full machine-readable criteria, stop conditions and next actions are in [gate-closure-matrix.json](gate-closure-matrix.json). Current gate pass counts are reported separately by fresh gate output. Historical program declarations are not silently overwritten.\n\n| Gate | Purpose | Dependencies | Disposition |\n|---|---|---|---|\n' + matrix.map(g=>`| ${g.id} | ${g.purpose} | ${g.dependencies.join(', ') || 'None'} | ${g.disposition} |`).join('\n') + '\n\nThe frozen August program contains implementation descriptions older than the September POS corrections. In particular, current cart version/revision checks and durable commit-result recovery exist; older NOT_IMPLEMENTED labels cannot be treated as fresh source findings. Neither their existence nor the prior 21 PostgreSQL cases proves all G2 requirements. Reconcile every work package against the current source and complete scenario matrix after G1.\n\nThe application postingCycle migration is recorded complete in ' + source(prior+'evidence/application-migration-result.json') + '. It must not be applied again. French drawer rendering/filter/keyboard and null-balance correction evidence is retained; cashier, actual multi-viewport, screen-reader and physical hardware coverage remains separate.\n\nInventory callsite dispositions are supplied by the inventory review in this run. No governance status, selected option or frozen approval register was changed.\n')
json('evidence/packet-provenance.json', { generatedAt, sources:[contractPath,registerPath,programPath,prior+'implementation-summary.md',prior+'evidence/application-migration-result.json'].map(p=>({path:p,sha256:digest(p)})), contractHashMatchesRegister:digest(contractPath)===register.contractSha256, decisionPackets:contract.decisions.length, externalProcedures:program.externalEvidenceRegister.length, gates:matrix.length, actualApprovalsWritten:0 })
console.log(JSON.stringify({decisionPackets:11,externalProcedures:9,gates:10,contractHashMatchesRegister:digest(contractPath)===register.contractSha256}))
