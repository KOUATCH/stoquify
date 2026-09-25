#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";

import { financeX1EvidenceBindingSchema } from "../components/DataTableComponents/finance-x1-evidence-binding";

const DEFAULT_MANIFEST =
  "what-next/evidence/finance-x1/finance-x1-evidence-manifest.pending.json";
const SAFE_IMAGE_EXTENSIONS = new Set([".jpeg", ".jpg", ".png", ".webp"]);
const PLACEHOLDER_REFERENCE =
  /(?:^|[-_])(example|pending|placeholder|replace-me|todo)(?:$|[-_])/i;

type ValidationMode = "report" | "fail";

export type FinanceX1EvidenceValidationFinding = {
  id: string;
  path: string;
  detail: string;
};

export type FinanceX1EvidenceValidationReport = {
  checkedAt: string;
  manifestPath: string;
  status: "blocked" | "ready-for-human-review";
  bindingStatus: string;
  artifactCount: number;
  blockerCount: number;
  certificationClaimed: false;
  findings: FinanceX1EvidenceValidationFinding[];
};

type ArtifactInspection = {
  exists: boolean;
  isFile: boolean;
  size: number;
};

type EvaluationOptions = {
  root?: string;
  manifestPath?: string;
  now?: Date;
  inspectArtifact?: (absolutePath: string) => ArtifactInspection;
};

export type FinanceX1EvidenceCliArgs = {
  root: string;
  manifest: string;
  mode: ValidationMode;
};

function normalizedRelative(root: string, target: string): string {
  return path.relative(root, target).replace(/\\/g, "/");
}

function isWithinRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function defaultInspectArtifact(absolutePath: string): ArtifactInspection {
  if (!fs.existsSync(absolutePath)) {
    return { exists: false, isFile: false, size: 0 };
  }
  const stat = fs.statSync(absolutePath);
  return { exists: true, isFile: stat.isFile(), size: stat.size };
}

function finding(
  id: string,
  targetPath: string,
  detail: string,
): FinanceX1EvidenceValidationFinding {
  return { id, path: targetPath, detail };
}

export function evaluateFinanceX1EvidenceBinding(
  input: unknown,
  options: EvaluationOptions = {},
): FinanceX1EvidenceValidationReport {
  const root = path.resolve(options.root ?? process.cwd());
  const manifestPath = options.manifestPath ?? DEFAULT_MANIFEST;
  const checkedAt = (options.now ?? new Date()).toISOString();
  const inspectArtifact = options.inspectArtifact ?? defaultInspectArtifact;
  const findings: FinanceX1EvidenceValidationFinding[] = [];
  const parsed = financeX1EvidenceBindingSchema.safeParse(input);

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      findings.push(
        finding(
          "manifest-schema",
          issue.path.join(".") || "manifest",
          issue.message,
        ),
      );
    }
    return {
      checkedAt,
      manifestPath,
      status: "blocked",
      bindingStatus: "invalid",
      artifactCount: 0,
      blockerCount: findings.length,
      certificationClaimed: false,
      findings,
    };
  }

  const binding = parsed.data;

  if (binding.budgetApproval.status !== "approved") {
    findings.push(
      finding(
        "product-budget-approval",
        "budgetApproval",
        "Traceable product approval of the X1 performance budgets is required.",
      ),
    );
  } else if (PLACEHOLDER_REFERENCE.test(binding.budgetApproval.approvalReference)) {
    findings.push(
      finding(
        "product-budget-approval-placeholder",
        "budgetApproval.approvalReference",
        "The product approval reference cannot be a placeholder.",
      ),
    );
  }

  if (binding.evidenceAuthorization.status !== "approved") {
    findings.push(
      finding(
        "evidence-authorization",
        "evidenceAuthorization",
        "Approved non-production credentials, fixture tenant, and seeded data are required.",
      ),
    );
  } else {
    for (const [field, value] of [
      [
        "credentialApprovalReference",
        binding.evidenceAuthorization.credentialApprovalReference,
      ],
      [
        "seededDataApprovalReference",
        binding.evidenceAuthorization.seededDataApprovalReference,
      ],
    ] as const) {
      if (PLACEHOLDER_REFERENCE.test(value)) {
        findings.push(
          finding(
            "evidence-authorization-placeholder",
            `evidenceAuthorization.${field}`,
            "Evidence authorization references cannot be placeholders.",
          ),
        );
      }
    }
  }

  if (binding.evidenceStatus !== "evidence-collected-awaiting-review") {
    findings.push(
      finding(
        "authenticated-evidence-matrix",
        "evidenceStatus",
        "A complete authenticated EN/FR desktop, tablet, and mobile matrix is required.",
      ),
    );
  }

  for (const [index, artifact] of binding.evidenceArtifacts.entries()) {
    const artifactPath = artifact.artifactPath;
    const absolutePath = path.resolve(root, artifactPath);
    const issuePath = `evidenceArtifacts.${index}.artifactPath`;

    if (path.isAbsolute(artifactPath) || !isWithinRoot(root, absolutePath)) {
      findings.push(
        finding(
          "artifact-outside-workspace",
          issuePath,
          "Evidence artifacts must use workspace-relative paths inside the repository.",
        ),
      );
      continue;
    }

    if (!SAFE_IMAGE_EXTENSIONS.has(path.extname(absolutePath).toLowerCase())) {
      findings.push(
        finding(
          "artifact-file-type",
          issuePath,
          "Evidence artifacts must be JPEG, PNG, or WebP images.",
        ),
      );
      continue;
    }

    const inspected = inspectArtifact(absolutePath);
    if (!inspected.exists || !inspected.isFile || inspected.size <= 0) {
      findings.push(
        finding(
          "artifact-file-missing",
          issuePath,
          `A non-empty artifact file is required at ${normalizedRelative(root, absolutePath)}.`,
        ),
      );
    }
  }

  return {
    checkedAt,
    manifestPath,
    status: findings.length === 0 ? "ready-for-human-review" : "blocked",
    bindingStatus: binding.evidenceStatus,
    artifactCount: binding.evidenceArtifacts.length,
    blockerCount: findings.length,
    certificationClaimed: false,
    findings,
  };
}

export function parseFinanceX1EvidenceArgs(
  argv: string[] = process.argv.slice(2),
): FinanceX1EvidenceCliArgs {
  const args: FinanceX1EvidenceCliArgs = {
    root: process.cwd(),
    manifest: DEFAULT_MANIFEST,
    mode: "report",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") args.root = path.resolve(argv[++index]);
    else if (arg === "--manifest") args.manifest = argv[++index];
    else if (arg === "--mode") args.mode = argv[++index] as ValidationMode;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!new Set<ValidationMode>(["report", "fail"]).has(args.mode)) {
    throw new Error("--mode must be report or fail");
  }
  return args;
}

export function validateFinanceX1EvidenceManifest(
  args: FinanceX1EvidenceCliArgs,
): FinanceX1EvidenceValidationReport {
  const root = path.resolve(args.root);
  const absoluteManifest = path.resolve(root, args.manifest);
  if (!isWithinRoot(root, absoluteManifest)) {
    return {
      checkedAt: new Date().toISOString(),
      manifestPath: args.manifest,
      status: "blocked",
      bindingStatus: "invalid",
      artifactCount: 0,
      blockerCount: 1,
      certificationClaimed: false,
      findings: [
        finding(
          "manifest-outside-workspace",
          "manifest",
          "The manifest must be inside the repository.",
        ),
      ],
    };
  }
  if (!fs.existsSync(absoluteManifest)) {
    return {
      checkedAt: new Date().toISOString(),
      manifestPath: args.manifest,
      status: "blocked",
      bindingStatus: "missing",
      artifactCount: 0,
      blockerCount: 1,
      certificationClaimed: false,
      findings: [
        finding(
          "manifest-missing",
          "manifest",
          "The X1 evidence manifest does not exist.",
        ),
      ],
    };
  }

  let input: unknown;
  try {
    input = JSON.parse(fs.readFileSync(absoluteManifest, "utf8"));
  } catch {
    return {
      checkedAt: new Date().toISOString(),
      manifestPath: args.manifest,
      status: "blocked",
      bindingStatus: "invalid",
      artifactCount: 0,
      blockerCount: 1,
      certificationClaimed: false,
      findings: [
        finding("manifest-json", "manifest", "The manifest is not valid JSON."),
      ],
    };
  }

  return evaluateFinanceX1EvidenceBinding(input, {
    root,
    manifestPath: args.manifest,
  });
}

function main(): void {
  const args = parseFinanceX1EvidenceArgs();
  const report = validateFinanceX1EvidenceManifest(args);
  console.log(JSON.stringify(report, null, 2));
  if (args.mode === "fail" && report.status !== "ready-for-human-review") {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
