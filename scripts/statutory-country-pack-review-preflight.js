const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { assessSignatureVerification } = require("./statutory-country-pack-review-package");

const SHA256 = /^[a-f0-9]{64}$/;
const TIE_OUT_HASH = /^sha256:[a-f0-9]{64}$/;
const DECISIONS = new Set(["APPROVED", "REJECTED", "CHANGES_REQUIRED", "MORE_EVIDENCE_REQUIRED"]);
const REVIEWED_STATUSES = new Set(["EXPERT_REVIEWED", "REGULATOR_CONFIRMED"]);
const isText = (value) => typeof value === "string" && value.trim().length > 0;
const validDate = (value) => isText(value) && !Number.isNaN(Date.parse(value));
const validInterval = (from, to) => validDate(from) && (to == null || (validDate(to) && Date.parse(to) >= Date.parse(from)));
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function readJson(file) {
  try { return { value: JSON.parse(fs.readFileSync(file, "utf8")), error: null }; }
  catch (error) { return { value: null, error: error.message }; }
}

function latestEvidenceDirectory(root) {
  const countryRoot = path.join(root, "docs", "HR-Payroll", "evidence", "country-packs", "CM");
  const dirs = fs.existsSync(countryRoot)
    ? fs.readdirSync(countryRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
    : [];
  return dirs.length ? path.join(countryRoot, dirs[dirs.length - 1]) : countryRoot;
}

function assessPacket({ evidenceDir, decisionFile }) {
  const manifestRead = readJson(path.join(evidenceDir, "manifest.json"));
  const decisionRead = readJson(decisionFile);
  const manifest = manifestRead.value || {};
  const decision = decisionRead.value || {};
  const requiredFamilies = manifest.requiredApproval?.fixtureFamilies || [];
  const fixtureDecisions = decision.fixtureFamilyDecisions || [];
  const checks = [];
  const add = (id, passed, owner, requiredEvidence, detail) => checks.push({ id, passed: Boolean(passed), owner, requiredEvidence, detail });

  add("manifest_present_and_parseable", !manifestRead.error, "Engineering", "Parseable manifest.json", manifestRead.error || "Manifest parsed.");
  add("decision_present_and_parseable", !decisionRead.error, "Qualified reviewer", "Parseable review decision JSON", decisionRead.error || "Decision packet parsed.");

  const artifactFailures = [];
  for (const artifact of manifest.artifacts || []) {
    const file = path.join(evidenceDir, path.basename(artifact.file || ""));
    if (!artifact.file || !fs.existsSync(file)) { artifactFailures.push(`${artifact.legalRef || "unknown"}: file missing`); continue; }
    if (fs.statSync(file).size !== artifact.byteLength || sha256(file) !== artifact.sha256) artifactFailures.push(`${artifact.legalRef}: byte length or SHA-256 mismatch`);
  }
  add("source_artifact_integrity", !manifestRead.error && (manifest.artifacts || []).length > 0 && artifactFailures.length === 0, "Engineering", "Captured sources match manifest byte length and SHA-256", artifactFailures.join("; ") || "All manifest source artifacts match.");

  const reviewer = decision.reviewer || {};
  const missingReviewer = ["fullName", "professionalCapacity", "organization", "qualificationReference", "conflictOfInterestDeclaration"].filter((field) => !isText(reviewer[field]));
  add("reviewer_identity_complete", missingReviewer.length === 0, "Compliance/legal owner", "Reviewer identity, qualifications, organization, and conflict declaration", missingReviewer.length ? `Missing: ${missingReviewer.join(", ")}` : "Reviewer record complete.");

  const window = decision.reviewWindow || {};
  const validWindow = validDate(window.startedAt) && validDate(window.completedAt) && Date.parse(window.completedAt) >= Date.parse(window.startedAt);
  add("review_window_complete", validWindow, "Qualified reviewer", "Valid review start and completion timestamps", validWindow ? "Review window valid." : "Review timestamps are missing, invalid, or reversed.");

  const sourceDecisions = decision.sourceArtifacts || [];
  const digestFailures = (manifest.artifacts || []).filter((artifact) => {
    const reviewed = sourceDecisions.find((item) => item.legalRef === artifact.legalRef && item.file === artifact.file);
    return !reviewed || reviewed.sha256 !== artifact.sha256 || reviewed.digestRecomputedByReviewer !== true;
  });
  add("reviewer_recomputed_source_digests", !manifestRead.error && digestFailures.length === 0 && (manifest.artifacts || []).length > 0, "Qualified reviewer", "Reviewer independently recomputes every source SHA-256", digestFailures.length ? `Incomplete: ${digestFailures.map((item) => item.legalRef).join(", ")}` : "Reviewer digest attestations align.");

  const familyFailures = requiredFamilies.filter((family) => {
    const item = fixtureDecisions.find((candidate) => candidate.fixtureFamily === family);
    return !item || !DECISIONS.has(item.decision) || !isText(item.sourceProvision) || !validInterval(item.effectiveFrom, item.effectiveTo) || !TIE_OUT_HASH.test(item.independentFixtureTieOutHash || "");
  });
  const unexpected = fixtureDecisions.filter((item) => !requiredFamilies.includes(item.fixtureFamily)).map((item) => item.fixtureFamily);
  add("fixture_family_decisions_complete", requiredFamilies.length > 0 && familyFailures.length === 0 && unexpected.length === 0, "Qualified reviewer", "Decision, source provision, dates, and independent tie-out hash for every family", [...familyFailures.map((item) => `incomplete ${item}`), ...unexpected.map((item) => `unexpected ${item}`)].join("; ") || "All required fixture decisions are complete.");

  const approved = fixtureDecisions.filter((item) => item.decision === "APPROVED").map((item) => item.fixtureFamily).sort();
  const allApproved = requiredFamilies.length > 0 && requiredFamilies.every((family) => approved.includes(family)) && fixtureDecisions.length === requiredFamilies.length;
  add("all_required_fixture_families_approved", allApproved, "Qualified reviewer", "Explicit APPROVED decision for every required fixture family", allApproved ? "All required families approved." : "One or more required families are not approved.");

  const final = decision.finalDecision || {};
  const withinReviewedIntervals = fixtureDecisions.every((item) => Date.parse(final.effectiveFrom) >= Date.parse(item.effectiveFrom)
    && (item.effectiveTo == null || (final.effectiveTo != null && Date.parse(final.effectiveTo) <= Date.parse(item.effectiveTo))));
  const finalConsistent = final.decision === "APPROVED" && decision.decisionStatus === "APPROVED" && decision.productionUseAllowed === true && validInterval(final.effectiveFrom, final.effectiveTo) && withinReviewedIntervals && JSON.stringify([...(final.approvedFixtureFamilies || [])].sort()) === JSON.stringify([...requiredFamilies].sort()) && (final.excludedFixtureFamilies || []).length === 0;
  add("final_decision_consistent", finalConsistent, "Qualified reviewer", "Approved final decision consistent with every fixture decision and effective date", finalConsistent ? "Final decision is internally consistent." : "Final approval is absent or inconsistent.");

  const signed = decision.signedApprovalArtifact || {};
  const metadataComplete = isText(signed.file) && path.basename(signed.file) === signed.file && SHA256.test(signed.sha256 || "") && validDate(signed.signedAt) && isText(signed.signatureMethod);
  add("signed_approval_metadata_complete", metadataComplete, "Qualified reviewer", "Signed artifact filename, SHA-256, signature timestamp, and method", metadataComplete ? "Signed-artifact metadata complete." : "Signed-artifact metadata is incomplete or invalid.");
  const signedFile = metadataComplete ? path.join(evidenceDir, signed.file) : null;
  const signatureVerification = assessSignatureVerification({ evidenceDir, decisionFile });
  const signedVerified = Boolean(signedFile && fs.existsSync(signedFile) && sha256(signedFile) === signed.sha256 && signatureVerification.ready);
  add("signed_approval_artifact_verified", signedVerified, "Authorized checker", "Matching signed artifact, accepted signature method, and separate checker with retained verification evidence", signedVerified ? "Artifact bytes and checker evidence verified; signature authenticity is the checker's attestation." : `Signature/checker evidence incomplete: ${signatureVerification.blockers.join(", ")}`);

  const acceptanceComplete = checks.slice(0, 11).every((check) => check.passed);
  const approval = manifest.requiredApproval || {};
  const pendingManifest = manifest.productionUseAllowed === false && manifest.reviewStatus === "PENDING_EXPERT_REVIEW"
    && (manifest.artifacts || []).every((artifact) => artifact.productionUseAllowed !== true && !REVIEWED_STATUSES.has(artifact.reviewStatus));
  const reviewedManifest = manifest.productionUseAllowed === true && REVIEWED_STATUSES.has(manifest.reviewStatus)
    && approval.reviewerIdentity === reviewer.fullName && approval.reviewedAt === window.completedAt
    && approval.effectiveFrom === final.effectiveFrom && (approval.effectiveTo ?? null) === (final.effectiveTo ?? null)
    && approval.approvalArtifactFile === signed.file && approval.approvalArtifactHash === signed.sha256
    && JSON.stringify([...(approval.approvedFixtureFamilies || [])].sort()) === JSON.stringify([...requiredFamilies].sort())
    && (manifest.artifacts || []).every((artifact) => artifact.productionUseAllowed === true && REVIEWED_STATUSES.has(artifact.reviewStatus));
  const safeManifest = pendingManifest || (acceptanceComplete && reviewedManifest);
  add("manifest_transition_not_premature", safeManifest, "Authorized maker/checker", "Manifest remains fail-closed until review evidence is complete", safeManifest ? "Manifest state is safe for the packet state." : "Manifest claims approval before evidence acceptance is complete.");

  const ready = acceptanceComplete && checks.every((check) => check.passed);
  return {
    generatedAt: new Date().toISOString(), countryCode: manifest.countryCode || decision.countryCode || "CM", countryPackVersion: decision.countryPackVersion || null,
    status: ready ? "READY_FOR_AUTHORIZED_MANIFEST_TRANSITION" : "BLOCKED_PENDING_QUALIFIED_REVIEW",
    operatorUpdatesAllowed: ready, productionUseAllowed: manifest.productionUseAllowed === true,
    evidenceDirectory: evidenceDir, decisionFile, checks,
    blockers: checks.filter((check) => !check.passed).map((check) => check.id),
    nonClaims: ["This preflight validates evidence structure and integrity; it does not perform legal interpretation.", "Development authorization is not qualified statutory approval.", "A passing preflight authorizes a controlled manifest transition, not production release by itself."]
  };
}

function renderMarkdown(result) {
  const rows = result.checks.map((check) => `| ${check.id} | ${check.passed ? "PASS" : "BLOCKED"} | ${check.owner} | ${check.requiredEvidence} | ${check.detail} |`).join("\n");
  return `# Statutory country-pack qualified-review preflight\n\nGenerated: ${result.generatedAt}\n\nStatus: **${result.status}**  \nOperator manifest update allowed: **${result.operatorUpdatesAllowed}**  \nManifest production use allowed: **${result.productionUseAllowed}**\n\n| Condition | Result | Owner | Required evidence | Detail |\n|---|---|---|---|---|\n${rows}\n\n## Non-claims\n\n${result.nonClaims.map((claim) => `- ${claim}`).join("\n")}\n`;
}

function parseArgs(argv) {
  const result = { mode: "report", root: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith("--")) continue;
    result[argv[index].slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = argv[index + 1]; index += 1;
  }
  return result;
}

function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const root = path.resolve(options.root || process.cwd());
  const evidenceDir = path.resolve(root, options.evidenceDir || latestEvidenceDirectory(root));
  const defaultDecision = fs.existsSync(path.join(evidenceDir, "review-decision.json")) ? "review-decision.json" : "review-decision.template.json";
  const decisionFile = path.resolve(root, options.decision || path.join(evidenceDir, defaultDecision));
  const result = assessPacket({ evidenceDir, decisionFile });
  for (const [key, renderer] of [["out", renderMarkdown], ["jsonOut", (value) => `${JSON.stringify(value, null, 2)}\n`]]) {
    if (!options[key]) continue;
    const output = path.resolve(root, options[key]); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, renderer(result));
  }
  console.log(`${result.status}: ${result.checks.filter((check) => check.passed).length}/${result.checks.length} conditions passed.`);
  if (options.mode === "fail" && !result.operatorUpdatesAllowed) process.exitCode = 1;
  return result;
}

if (require.main === module) run();
module.exports = { assessPacket, renderMarkdown, run };
