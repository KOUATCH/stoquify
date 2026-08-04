const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SHA256 = /^[a-f0-9]{64}$/;
const ACCEPTED_SIGNATURE_METHODS = new Set([
  "PADES_SIGNED_PDF",
  "QUALIFIED_ELECTRONIC_SIGNATURE",
  "ADVANCED_ELECTRONIC_SIGNATURE",
  "ORGANIZATION_DIGITAL_CERTIFICATE",
  "CMS_PKCS7_DETACHED",
  "PGP_DETACHED",
  "HANDWRITTEN_WITH_CONTROLLED_IDENTITY_VERIFICATION",
]);

const isText = (value) => typeof value === "string" && value.trim().length > 0;
const validDate = (value) => isText(value) && !Number.isNaN(Date.parse(value));
const sha256File = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(stableValue(value));
}

function hasCompletedValues(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0 && value.every(hasCompletedValues);
  if (typeof value === "object") return Object.values(value).every(hasCompletedValues);
  return true;
}

function resolveContained(baseDir, relativeFile) {
  if (!isText(relativeFile)) return null;
  const resolved = path.resolve(baseDir, relativeFile);
  const evidenceRoot = path.resolve(baseDir, "..");
  if (resolved !== evidenceRoot && !resolved.startsWith(`${evidenceRoot}${path.sep}`)) return null;
  return resolved;
}

function verifyEvidenceIndex(packageDir) {
  const index = readJson(path.join(packageDir, "evidence-index.json"));
  const checks = (index.sourceArtifacts || []).map((artifact) => {
    const file = resolveContained(packageDir, artifact.file);
    const exists = Boolean(file && fs.existsSync(file) && fs.statSync(file).isFile());
    const actualSha256 = exists ? sha256File(file) : null;
    const actualByteLength = exists ? fs.statSync(file).size : null;
    return {
      legalRef: artifact.legalRef,
      file: artifact.file,
      expectedSha256: artifact.sha256,
      actualSha256,
      expectedByteLength: artifact.byteLength,
      actualByteLength,
      passed: exists && actualSha256 === artifact.sha256 && actualByteLength === artifact.byteLength,
    };
  });
  return {
    status: checks.length > 0 && checks.every((check) => check.passed)
      ? "SOURCE_BYTES_VERIFIED"
      : "SOURCE_VERIFICATION_FAILED",
    packageDir,
    checks,
  };
}

function fixtureTieOutHashes(workbookFile) {
  const workbook = readJson(workbookFile);
  const results = (workbook.fixtureFamilies || []).map((fixture) => {
    const complete = hasCompletedValues(fixture.independentReview);
    const hash = complete
      ? `sha256:${crypto.createHash("sha256").update(canonicalJson(fixture.independentReview)).digest("hex")}`
      : null;
    return {
      fixtureFamily: fixture.fixtureFamily,
      complete,
      independentFixtureTieOutHash: hash,
    };
  });
  return {
    status: results.length === 4 && results.every((result) => result.complete)
      ? "TIE_OUT_HASHES_READY"
      : "BLOCKED_INCOMPLETE_INDEPENDENT_REVIEW",
    results,
  };
}

function assessSignatureVerification({ evidenceDir, decisionFile }) {
  let decision;
  try {
    decision = readJson(decisionFile);
  } catch (error) {
    return { ready: false, blockers: ["decision_unreadable"], detail: error.message };
  }
  const reviewer = decision.reviewer || {};
  const signed = decision.signedApprovalArtifact || {};
  const verification = signed.signatureVerification || {};
  const blockers = [];

  if (!ACCEPTED_SIGNATURE_METHODS.has(signed.signatureMethod)) blockers.push("signature_method_not_accepted");
  if (!isText(signed.file) || path.basename(signed.file) !== signed.file || !SHA256.test(signed.sha256 || "")) {
    blockers.push("signed_artifact_metadata_invalid");
  } else {
    const signedFile = path.join(evidenceDir, signed.file);
    if (!fs.existsSync(signedFile) || sha256File(signedFile) !== signed.sha256) blockers.push("signed_artifact_hash_mismatch");
  }
  if (verification.status !== "VERIFIED") blockers.push("checker_verification_not_verified");
  if (!isText(verification.verifiedBy) || verification.verifiedBy.trim().toLowerCase() === String(reviewer.fullName || "").trim().toLowerCase()) {
    blockers.push("maker_checker_separation_invalid");
  }
  if (!isText(verification.verifierRole) || !validDate(verification.verifiedAt) || !isText(verification.verificationMethod)) {
    blockers.push("checker_verification_metadata_incomplete");
  }
  if (!isText(verification.conflictOfInterestDeclaration)) blockers.push("checker_conflict_declaration_missing");
  if (!isText(verification.evidenceFile) || path.basename(verification.evidenceFile) !== verification.evidenceFile || !SHA256.test(verification.evidenceSha256 || "")) {
    blockers.push("signature_evidence_metadata_invalid");
  } else {
    const evidenceFile = path.join(evidenceDir, verification.evidenceFile);
    if (!fs.existsSync(evidenceFile) || sha256File(evidenceFile) !== verification.evidenceSha256) blockers.push("signature_evidence_hash_mismatch");
  }

  return {
    ready: blockers.length === 0,
    status: blockers.length === 0
      ? "SIGNATURE_AND_CHECKER_EVIDENCE_VERIFIED"
      : "BLOCKED_SIGNATURE_VERIFICATION",
    blockers,
  };
}

function parseArgs(argv) {
  const options = { mode: argv[0] || "verify-sources", root: process.cwd() };
  for (let index = 1; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) continue;
    options[value.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = argv[++index];
  }
  return options;
}

function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const root = path.resolve(options.root);
  const evidenceDir = path.resolve(root, options.evidenceDir || "docs/HR-Payroll/evidence/country-packs/CM/2026-07-19");
  const packageDir = path.resolve(root, options.packageDir || path.join(evidenceDir, "review-package"));
  let result;

  if (options.mode === "verify-sources") {
    result = verifyEvidenceIndex(packageDir);
  } else if (options.mode === "fixture-hashes") {
    result = fixtureTieOutHashes(path.resolve(root, options.workbook || path.join(packageDir, "fixture-review-workbook.json")));
  } else if (options.mode === "verify-signature") {
    result = assessSignatureVerification({
      evidenceDir,
      decisionFile: path.resolve(root, options.decision || path.join(evidenceDir, "review-decision.json")),
    });
  } else {
    throw new Error(`Unsupported mode: ${options.mode}`);
  }

  console.log(JSON.stringify(result, null, 2));
  if (result.status.includes("FAILED") || result.status.includes("BLOCKED") || result.ready === false) process.exitCode = 1;
  return result;
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  ACCEPTED_SIGNATURE_METHODS,
  assessSignatureVerification,
  canonicalJson,
  fixtureTieOutHashes,
  run,
  verifyEvidenceIndex,
};
