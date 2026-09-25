"use strict";

// Local manual approvals: cryptography verifies the controller's attestation,
// not the appearance or legal effect of a handwritten signature in a PDF.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const BASE = "docs/X1/approval-register";
const CONTRACT = "docs/X1/X1_CONTRACT_ARTIFACT_MANIFEST_2026-09-05.json";
const KINDS = ["adoption", "product", "evidence", "independent"];
const ROLES = { adoption: "owner", product: "product_approver", evidence: "security_owner", independent: "qa_owner" };
const TITLES = { adoption: "Local register adoption and bounded automation", product: "X1 product performance budget approval", evidence: "X1 credential tenant and evidence authorization", independent: "X1 independent review delegation" };
const REQUIRED_REVIEW = ["reviewerName", "identityVerification", "authorityVerification", "signatureVerification", "signingTimeVerification"];
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const serialize = value => JSON.stringify(stable(value), null, 2) + "\n";
const digest = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const fileHash = name => digest(fs.readFileSync(name));
const read = name => JSON.parse(fs.readFileSync(name, "utf8").replace(/^\uFEFF/, ""));
function required(value, label) {
  if (typeof value !== "string" || !value.trim() || /^(\[FILL|TODO|PENDING|PLACEHOLDER|_+$)/i.test(value.trim())) throw new Error(`Complete ${label}.`);
  return value.trim();
}
function timestamp(value, label) {
  required(value, label);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error(`${label} must be an ISO-8601 timestamp with timezone.`);
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() + 1 !== month || calendar.getUTCDate() !== day) throw new Error(`${label} has an invalid calendar date.`);
  return new Date(value).toISOString();
}
function exclusive(name, value) {
  fs.mkdirSync(path.dirname(name), { recursive: true });
  fs.writeFileSync(name, serialize(value), { flag: "wx" });
}
function replace(name, value) {
  const temporary = `${name}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, serialize(value), { flag: "wx" });
  fs.renameSync(temporary, name);
}
function inside(root, relative) {
  if (typeof relative !== "string" || path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) throw new Error("Unsafe register path.");
  const result = path.resolve(root, relative);
  if (!result.startsWith(path.resolve(root) + path.sep)) throw new Error("Path must remain inside the register.");
  let cursor = result;
  while (cursor !== path.resolve(root)) {
    if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) throw new Error("Register paths cannot use symbolic links or junctions.");
    cursor = path.dirname(cursor);
  }
  return result;
}
function createRegister(repositoryRoot, now = () => new Date()) {
  const root = path.resolve(repositoryRoot);
  const base = inside(root, BASE);
  const at = relative => inside(base, relative);
  const config = () => read(at("register.json"));
  const recordPath = (kind, name) => {
    if (!KINDS.includes(kind)) throw new Error("Choose adoption, product, evidence, or independent.");
    const id = config().records[kind];
    if (!/^X1-[A-Z]+-[0-9A-F-]{36}$/.test(id)) throw new Error("Invalid issued record ID.");
    return at(`records/${id}/${name}`);
  };
  const record = kind => read(recordPath(kind, "approval-record.json"));
  function audit() {
    const directory = at("events");
    const names = fs.readdirSync(directory).filter(name => /^\d{8}\.json$/.test(name)).sort();
    let previousHash = null;
    for (let i = 0; i < names.length; i++) {
      const event = read(at(`events/${names[i]}`));
      const { hash, ...body } = event;
      if (names[i] !== `${String(i + 1).padStart(8, "0")}.json` || body.sequence !== i + 1 || body.previousHash !== previousHash || hash !== digest(serialize(body))) throw new Error("Register audit history is inconsistent.");
      previousHash = hash;
    }
    const head = read(at("audit-head.json"));
    if (head.count !== names.length || head.hash !== previousHash) throw new Error("Register audit checkpoint does not match history.");
    return head;
  }
  function event(type, detail) {
    const head = audit();
    const body = { sequence: head.count + 1, previousHash: head.hash, occurredAt: now().toISOString(), type, detail };
    const value = { ...body, hash: digest(serialize(body)) };
    exclusive(at(`events/${String(body.sequence).padStart(8, "0")}.json`), value);
    replace(at("audit-head.json"), { count: body.sequence, hash: value.hash });
    return value.hash;
  }
  function initialize(context) {
    if (fs.existsSync(at("register.json"))) return { status: "EXISTING_REGISTER_PRESERVED", records: config().records };
    const manifest = read(inside(root, CONTRACT));
    const roles = context.roles || [];
    const ids = Object.fromEntries(KINDS.map(kind => [kind, `X1-${kind.toUpperCase()}-${crypto.randomUUID().toUpperCase()}`]));
    const settings = {
      schemaVersion: 1, name: "Stoquify Local Development Approval Register", mode: "LOCAL_MANUAL_VERIFIED",
      registeredAt: now().toISOString(), adoptionStatus: "AWAITING_SIGNED_ADOPTION", records: ids,
      scope: { environment: "non-production", database: "stoquify_replay_next_20260830", organizationId: "rds_org_001", foreignProbeOrganizationId: "rds_org_002", origin: "http://127.0.0.1:3000", personaRole: "external_accountant", personaUserId: "rds_org_001_compliance_user_external_accountant", locales: ["en", "fr"], viewports: ["desktop", "tablet", "mobile"], readOnlyCapture: true, productionReleaseAuthorized: false },
      contract: { path: CONTRACT, sha256: fileHash(inside(root, CONTRACT)), bundlePath: manifest.reviewBundleUri.replace("repository://stoquify/", ""), bundleSha256: manifest.reviewBundleSha256 },
      sourceContext: { status: context.status, retrievedAt: context.retrievedAt || null, technicalIdentitiesOnly: true },
      identityAssignments: Object.fromEntries(KINDS.map(kind => {
        const role = roles.find(r => r.code === ROLES[kind]);
        if (!role || role.users.length !== 1) throw new Error(`Exactly one candidate is required for ${ROLES[kind]}; reconcile identity explicitly.`);
        return [kind, { roleCode: role.code, roleId: role.id, userId: role.users[0].id, name: role.users[0].name }];
      })),
    };
    for (const folder of ["records", "controllers", "events", "exports"]) fs.mkdirSync(at(folder), { recursive: true });
    exclusive(at("register.json"), settings);
    exclusive(at("audit-head.json"), { count: 0, hash: null });
    for (const kind of KINDS) {
      const definition = { schemaVersion: 1, recordId: ids[kind], kind, title: TITLES[kind], createdAt: now().toISOString(), allocationStatus: "DRAFT_RECORD_ALLOCATED", registerName: settings.name, recordUri: `repository://stoquify/${BASE}/records/${ids[kind]}/approval-record.json`, signedRecordUri: `repository://stoquify/${BASE}/records/${ids[kind]}/signed-approval.pdf`, authorityRecordId: kind === "adoption" ? null : ids.adoption, candidate: settings.identityAssignments[kind], scope: settings.scope, contract: settings.contract, settingsSha256: digest(serialize(settings)) };
      exclusive(recordPath(kind, "approval-record.json"), definition);
      exclusive(recordPath(kind, "signature-verification.json"), { schemaVersion: 1, recordId: ids[kind], status: "AWAITING_DOCUMENT_CONTROLLER_REVIEW", signature: null });
      exclusive(recordPath(kind, "approver-input.json"), { decision: null, approverName: definition.candidate.name, approverUserId: definition.candidate.userId, authorityReference: kind === "adoption" ? null : ids.adoption, signedAt: null, expiresAt: null, reason: null, controllerCertificateSha256: kind === "adoption" ? null : "SEE_ADOPTION", retentionDays: kind === "adoption" ? null : "SEE_ADOPTION", backupLocation: kind === "adoption" ? null : "SEE_ADOPTION" });
      exclusive(recordPath(kind, "verification-input.json"), Object.fromEntries(REQUIRED_REVIEW.map(key => [key, null])));
    }
    event("DRAFT_RECORDS_ALLOCATED", { records: ids, settingsSha256: digest(serialize(settings)), approvalGranted: false });
    return { status: "DRAFT_RECORDS_ALLOCATED", records: ids, approvalGranted: false };
  }
  function certificate() {
    const enrollment = read(at("controllers/controller-public.json"));
    const cert = new crypto.X509Certificate(enrollment.certificatePem);
    if (digest(cert.raw) !== enrollment.certificateSha256) throw new Error("Controller certificate fingerprint mismatch.");
    if (Date.parse(cert.validFrom) > now().getTime() || Date.parse(cert.validTo) <= now().getTime()) throw new Error("Controller certificate is not currently valid.");
    return { enrollment, cert };
  }
  function enroll(input) {
    audit();
    if (fs.existsSync(at("controllers/controller-public.json"))) throw new Error("An enrolled controller already exists. Do not replace a trusted key in place.");
    const cert = new crypto.X509Certificate(input.certificatePem);
    const value = { schemaVersion: 1, name: required(input.name, "controller name"), windowsSid: required(input.windowsSid, "Windows SID"), thumbprint: required(input.thumbprint, "certificate thumbprint"), certificatePem: cert.toString(), certificateSha256: digest(cert.raw), enrolledAt: now().toISOString(), trust: "PROVISIONAL_UNTIL_SIGNED_REGISTER_ADOPTION" };
    if (cert.publicKey.asymmetricKeyType !== "rsa" || cert.publicKey.asymmetricKeyDetails.modulusLength < 3072) throw new Error("The controller certificate needs an RSA key of at least 3072 bits.");
    exclusive(at("controllers/controller-public.json"), value);
    event("CONTROLLER_PUBLIC_KEY_ENROLLED", { certificateSha256: value.certificateSha256, name: value.name, approvalGranted: false });
    return { status: "CONTROLLER_ENROLLED_ADOPTION_PENDING", certificateSha256: value.certificateSha256 };
  }
  function artifacts() {
    const settings = config();
    if (settings.scope.database !== "stoquify_replay_next_20260830" || settings.scope.organizationId !== "rds_org_001" || settings.scope.foreignProbeOrganizationId !== "rds_org_002" || settings.scope.origin !== "http://127.0.0.1:3000" || settings.scope.productionReleaseAuthorized !== false) throw new Error("Local register scope has changed.");
    if (fileHash(inside(root, settings.contract.path)) !== settings.contract.sha256) throw new Error("The approved contract manifest changed; issue a new approval package.");
    if (fileHash(inside(root, settings.contract.bundlePath)) !== settings.contract.bundleSha256) throw new Error("The contract review bundle changed.");
    const manifest = read(inside(root, settings.contract.path));
    for (const item of manifest.files) if (fileHash(inside(root, item.path)) !== item.sha256) throw new Error(`Contract source changed: ${item.path}`);
    return settings;
  }
  function inputFor(kind) {
    const input = read(recordPath(kind, "approver-input.json"));
    const definition = record(kind);
    const candidate = config().identityAssignments[kind];
    const decision = required(input.decision, "decision").toUpperCase();
    if (!["APPROVE", "REJECT", "REVISE"].includes(decision)) throw new Error("Decision must be APPROVE, REJECT or REVISE.");
    const name = required(input.approverName, "approver name");
    if (name !== candidate.name || input.approverUserId !== candidate.userId) throw new Error("Approver identity differs from the issued candidate mapping; reconcile and issue a new record.");
    const approvedAt = timestamp(input.signedAt, "actual signing time");
    const expiresAt = timestamp(input.expiresAt, "expiry time");
    if (Date.parse(approvedAt) > now().getTime() || Date.parse(approvedAt) < Date.parse(definition.createdAt) || Date.parse(expiresAt) <= Date.parse(approvedAt)) throw new Error("Signing must follow record creation, cannot be future-dated, and needs a later expiry.");
    if (Date.parse(expiresAt) > Date.parse(certificate().cert.validTo)) throw new Error("Approval expiry cannot exceed controller certificate validity.");
    if (decision !== "APPROVE") required(input.reason, "reason for rejection or revision");
    required(input.authorityReference, "authority reference");
    if (kind === "adoption") {
      if (input.controllerCertificateSha256 !== certificate().enrollment.certificateSha256) throw new Error("The adoption form must identify the enrolled controller fingerprint.");
      if (!Number.isSafeInteger(Number(input.retentionDays)) || Number(input.retentionDays) <= 0) throw new Error("Choose a positive retention period in days.");
      required(input.backupLocation, "separate backup location");
    } else if (input.authorityReference !== config().records.adoption) throw new Error("Use the issued adoption record as the authority reference.");
    return { ...input, decision, approverName: name, signedAt: approvedAt, expiresAt };
  }
  function evidenceFiles(kind) {
    const names = ["approval-form.docx", "controller-review.docx", "signed-approval.pdf"];
    if (kind === "adoption") names.push("authority-evidence.pdf");
    return Object.fromEntries(names.map(name => {
      const file = recordPath(kind, name);
      const bytes = fs.readFileSync(file);
      if (name.endsWith(".pdf") && (bytes.length < 100 || !bytes.subarray(0, 5).equals(Buffer.from("%PDF-")))) throw new Error(`Supply a real PDF for ${name}.`);
      return [name, digest(bytes)];
    }));
  }
  function prepare(kind) {
    audit(); artifacts();
    if (read(recordPath(kind, "signature-verification.json")).signature) throw new Error("This record is already sealed. Preserve it; revoke and issue a new package if needed.");
    const { enrollment } = certificate();
    const input = inputFor(kind);
    const review = read(recordPath(kind, "verification-input.json"));
    for (const key of REQUIRED_REVIEW) required(review[key], key);
    if (review.reviewerName !== enrollment.name) throw new Error("The document reviewer must match the enrolled controller.");
    if (kind !== "adoption") {
      const adoption = verifyRecord("adoption");
      if (Date.parse(input.signedAt) < Date.parse(adoption.input.signedAt)) throw new Error("This decision predates register adoption.");
      if (Date.parse(input.expiresAt) > Date.parse(adoption.input.expiresAt)) throw new Error("Decision validity cannot exceed register adoption validity.");
    }
    const payload = { schemaVersion: 1, purpose: "MANUAL_SIGNATURE_VERIFICATION", recordId: record(kind).recordId, kind, recordSha256: fileHash(recordPath(kind, "approval-record.json")), input, review, files: evidenceFiles(kind), controllerCertificateSha256: enrollment.certificateSha256, verifiedAt: now().toISOString(), independentLegalSignatureValidation: false };
    replace(recordPath(kind, "pending-attestation.json"), payload);
    return { status: "READY_FOR_CONTROLLER_ATTESTATION", recordId: payload.recordId, decision: input.decision, signer: input.approverName, signedPdfSha256: payload.files["signed-approval.pdf"], payloadPath: recordPath(kind, "pending-attestation.json"), instruction: "The enrolled controller must personally check the original signature, identity, authority, scope and signing time before sealing." };
  }
  function verifyEnvelope(envelope) {
    const { cert, enrollment } = certificate();
    if (envelope.payload.controllerCertificateSha256 !== enrollment.certificateSha256 || typeof envelope.signature !== "string" || !crypto.verify("sha256", Buffer.from(serialize(envelope.payload)), cert.publicKey, Buffer.from(envelope.signature, "base64"))) throw new Error("The controller attestation signature is invalid or missing.");
    const verifiedAt = timestamp(envelope.payload.verifiedAt, "controller verification time");
    if (Date.parse(verifiedAt) > now().getTime()) throw new Error("Controller verification cannot be future-dated.");
    return envelope.payload;
  }
  function verifyRecord(kind, requireApprove = true) {
    const definition = record(kind);
    if (definition.settingsSha256 !== digest(serialize(config()))) throw new Error("Register settings changed after record allocation.");
    const envelope = read(recordPath(kind, "signature-verification.json"));
    if (!envelope.signature) throw new Error(`${kind}: signed PDF and controller attestation are required.`);
    const payload = verifyEnvelope(envelope);
    if (payload.purpose !== "MANUAL_SIGNATURE_VERIFICATION" || payload.recordId !== definition.recordId || payload.kind !== kind || payload.recordSha256 !== fileHash(recordPath(kind, "approval-record.json"))) throw new Error("Verification is not bound to this approval record.");
    if (serialize(payload.input) !== serialize(inputFor(kind)) || serialize(payload.review) !== serialize(read(recordPath(kind, "verification-input.json"))) || serialize(payload.files) !== serialize(evidenceFiles(kind))) throw new Error("The filled forms, signed PDF, input, or verification evidence changed after sealing.");
    for (const key of REQUIRED_REVIEW) required(payload.review[key], key);
    if (payload.review.reviewerName !== certificate().enrollment.name) throw new Error("Controller identity mismatch.");
    if (Date.parse(payload.verifiedAt) < Date.parse(payload.input.signedAt)) throw new Error("Verification predates the signature.");
    if (fs.existsSync(recordPath(kind, "revocation.json"))) {
      const revoked = verifyEnvelope(read(recordPath(kind, "revocation.json")));
      if (revoked.purpose !== "REVOKE_APPROVAL" || revoked.recordId !== definition.recordId) throw new Error("Invalid revocation record.");
      throw new Error(`${kind}: approval has been revoked.`);
    }
    if (requireApprove && payload.input.decision !== "APPROVE") throw new Error(`${kind}: decision is ${payload.input.decision}.`);
    if (Date.parse(payload.input.expiresAt) <= now().getTime()) throw new Error(`${kind}: decision has expired.`);
    return payload;
  }
  function seal(kind, signature) {
    audit(); artifacts();
    if (read(recordPath(kind, "signature-verification.json")).signature) throw new Error("Record is already sealed.");
    const payload = read(recordPath(kind, "pending-attestation.json"));
    const envelope = { schemaVersion: 1, status: "SEALED_MANUAL_REVIEW", payload, signature: required(signature, "controller signature") };
    verifyEnvelope(envelope);
    if (payload.kind !== kind || payload.recordSha256 !== fileHash(recordPath(kind, "approval-record.json")) || serialize(payload.input) !== serialize(inputFor(kind)) || serialize(payload.files) !== serialize(evidenceFiles(kind)) || serialize(payload.review) !== serialize(read(recordPath(kind, "verification-input.json")))) throw new Error("Inputs changed after preparation; prepare and review again.");
    replace(recordPath(kind, "signature-verification.json"), envelope);
    event("MANUAL_REVIEW_SEALED", { recordId: payload.recordId, decision: payload.input.decision, envelopeSha256: digest(serialize(envelope)), controllerCertificateSha256: payload.controllerCertificateSha256 });
    return { status: "MANUAL_REVIEW_SEALED", decision: payload.input.decision, recordId: payload.recordId, releaseGranted: false };
  }
  function report() {
    const findings = [];
    try { audit(); artifacts(); } catch (error) { findings.push({ record: "register", detail: error.message }); }
    try { certificate(); } catch (error) { findings.push({ record: "controller", detail: "Enroll the document controller through manager option 1, or resolve the certificate error: " + error.message }); }
    for (const kind of KINDS) try { verifyRecord(kind); } catch (error) {
      const missing = [];
      try {
        const input = read(recordPath(kind, "approver-input.json"));
        const review = read(recordPath(kind, "verification-input.json"));
        const keys = ["decision", "approverName", "approverUserId", "authorityReference", "signedAt", "expiresAt", ...(kind === "adoption" ? ["controllerCertificateSha256", "retentionDays", "backupLocation"] : [])];
        for (const key of keys) if (input[key] == null || String(input[key]).trim() === "") missing.push(key);
        for (const key of REQUIRED_REVIEW) if (!review[key]) missing.push(key);
        for (const name of ["signed-approval.pdf", ...(kind === "adoption" ? ["authority-evidence.pdf"] : [])]) if (!fs.existsSync(recordPath(kind, name))) missing.push(name);
      } catch { /* The original validation failure remains the primary finding. */ }
      findings.push({ record: kind, detail: error.message, missing });
    }
    if (!findings.length) {
      const adoption = verifyRecord("adoption");
      for (const kind of KINDS.slice(1)) {
        const current = verifyRecord(kind);
        if (Date.parse(current.input.signedAt) < Date.parse(adoption.input.signedAt) || Date.parse(current.input.expiresAt) > Date.parse(adoption.input.expiresAt)) findings.push({ record: kind, detail: "Decision falls outside the adopted authority window." });
      }
      const assignments = config().identityAssignments;
      if (new Set([assignments.product.userId, assignments.evidence.userId, assignments.independent.userId]).size !== 3) findings.push({ record: "register", detail: "Product, security and independent reviewer mappings must be distinct." });
    }
    return { schemaVersion: 1, checkedAt: now().toISOString(), channel: "LOCAL_MANUAL_VERIFIED", status: findings.length ? "AWAITING_HUMAN_COMPLETION" : "APPROVALS_READY_FOR_NONPRODUCTION_CAPTURE", findings, approvalCount: KINDS.length - findings.filter(f => KINDS.includes(f.record)).length, productionReleaseAuthorized: false, browserEvidenceCollectedByThisCommand: false };
  }
  function bindingForApprovedRecords() {
    const product = verifyRecord("product"), evidence = verifyRecord("evidence");
    const binding = read(inside(root, "what-next/evidence/finance-x1/finance-x1-evidence-manifest.pending.json"));
    binding.budgetApproval = { status: "approved", budgetContractVersion: 1, approvalReference: product.recordId, approvedByUserId: product.input.approverUserId, approvedByRole: "product_approver", approvedAt: product.input.signedAt, scope: "X1-finance-accounting-performance-budgets" };
    binding.evidenceAuthorization = { status: "approved", environment: "non-production", credentialApprovalReference: `${evidence.recordId}#credential-use`, seededDataApprovalReference: `${evidence.recordId}#seeded-data`, authorizedFixtureTenantId: config().scope.organizationId, approvedByUserId: evidence.input.approverUserId, approvedAt: evidence.input.signedAt };
    binding.evidenceStatus = "approved-awaiting-evidence";
    binding.claims = { screenshotsAvailable: false, measurementsAvailable: false, productionBudgetsApproved: true };
    binding.evidenceArtifacts = []; binding.evidenceArtifactPaths = [];
    return binding;
  }
  function synchronize() {
    const readiness = report();
    if (readiness.findings.length) throw new Error(readiness.findings.map(f => `${f.record}: ${f.detail}`).join("\n"));
    const binding = bindingForApprovedRecords();
    const exportId = `X1-BINDING-${crypto.randomUUID()}`;
    const folder = at(`exports/${exportId}`);
    fs.mkdirSync(folder);
    exclusive(path.join(folder, "finance-x1-approval-binding.json"), binding);
    const refs = Object.fromEntries(KINDS.map(kind => [kind, { recordId: record(kind).recordId, recordUri: record(kind).recordUri, signedRecordUri: record(kind).signedRecordUri, verificationUri: record(kind).recordUri.replace("approval-record.json", "signature-verification.json"), signedPdfSha256: verifyRecord(kind).files["signed-approval.pdf"], signatureReference: `${record(kind).recordId}#controller-attestation`, expiresAt: verifyRecord(kind).input.expiresAt }]));
    exclusive(path.join(folder, "approval-manifest.json"), { schemaVersion: 1, generatedAt: now().toISOString(), channel: "LOCAL_MANUAL_VERIFIED", bindingSha256: fileHash(path.join(folder, "finance-x1-approval-binding.json")), contract: config().contract, scope: config().scope, records: refs, approvalSemantics: "Accepted local manual process with a cryptographically sealed document-controller attestation", gate: "AWAITING_FRESH_AUTHENTICATED_EVIDENCE_AND_INDEPENDENT_REVIEW", legacyBudgetBooleanExplanation: "productionBudgetsApproved is required by the existing schema when budgets are approved; it does not grant production deployment authority." });
    event("APPROVAL_BINDING_EXPORTED", { exportId, bindingSha256: fileHash(path.join(folder, "finance-x1-approval-binding.json")) });
    return { status: readiness.status, bindingPath: path.relative(root, path.join(folder, "finance-x1-approval-binding.json")), approvalManifestPath: path.relative(root, path.join(folder, "approval-manifest.json")), requiredNextAction: "Rerun register checks immediately before capture, then use a new authenticated EN/FR run after both actual signing times.", releaseGranted: false };
  }
  function validateExport(relativePath) {
    const target = inside(root, relativePath);
    if (!target.startsWith(at("exports") + path.sep) || path.basename(target) !== "finance-x1-approval-binding.json") throw new Error("Choose an approval binding generated by this register.");
    const readiness = report();
    if (readiness.findings.length) throw new Error(readiness.findings.map(f => `${f.record}: ${f.detail}`).join("\n"));
    const sidecar = read(path.join(path.dirname(target), "approval-manifest.json"));
    if (fileHash(target) !== sidecar.bindingSha256 || serialize(read(target)) !== serialize(bindingForApprovedRecords())) throw new Error("The exported approval binding no longer matches the verified decisions.");
    return config().scope;
  }
  function prepareRevocation(kind, reason) {
    audit(); verifyRecord(kind, false);
    const payload = { schemaVersion: 1, purpose: "REVOKE_APPROVAL", recordId: record(kind).recordId, kind, reason: required(reason, "revocation reason"), controllerCertificateSha256: certificate().enrollment.certificateSha256, verifiedAt: now().toISOString() };
    replace(recordPath(kind, "pending-revocation.json"), payload);
    return { payloadPath: recordPath(kind, "pending-revocation.json"), recordId: payload.recordId };
  }
  function revoke(kind, signature) {
    audit();
    const payload = read(recordPath(kind, "pending-revocation.json"));
    const envelope = { payload, signature };
    verifyEnvelope(envelope);
    if (payload.recordId !== record(kind).recordId || payload.purpose !== "REVOKE_APPROVAL") throw new Error("Wrong revocation target.");
    exclusive(recordPath(kind, "revocation.json"), envelope);
    event("APPROVAL_REVOKED", { recordId: payload.recordId, reason: payload.reason });
    return { status: "REVOKED", recordId: payload.recordId };
  }
  function locked(operation) {
    return (...args) => {
      fs.mkdirSync(base, { recursive: true });
      const lock = at(".write-lock");
      try { fs.mkdirSync(lock); } catch (error) { if (error.code === "EEXIST") throw new Error("Another register write is in progress. Investigate any abandoned lock before recovery."); throw error; }
      try { return operation(...args); } finally { fs.rmdirSync(lock); }
    };
  }
  return { initialize: locked(initialize), enroll: locked(enroll), prepare: locked(prepare), seal: locked(seal), report, synchronize: locked(synchronize), validateExport, prepareRevocation: locked(prepareRevocation), revoke: locked(revoke), verifyRecord, recordPath, config, record, audit, artifacts };
}
module.exports = { createRegister, serialize, digest, fileHash, inside, KINDS, TITLES, BASE };
