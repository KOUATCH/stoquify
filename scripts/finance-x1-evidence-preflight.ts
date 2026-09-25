#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";

import { financeX1EvidenceBindingSchema } from "../components/DataTableComponents/finance-x1-evidence-binding";

const DEFAULT_APPROVAL_MANIFEST =
  "what-next/evidence/finance-x1/finance-x1-evidence-manifest.pending.json";
const SAFE_RUN_ID = /^[a-z0-9][a-z0-9._-]{5,80}$/i;
const PLACEHOLDER_REFERENCE =
  /(?:^|[-_])(example|pending|placeholder|replace-me|todo)(?:$|[-_])/i;

type StorageStateInspection = {
  exists: boolean;
  nonEmpty: boolean;
  hasAuthenticatedState: boolean;
};

type PreflightOptions = {
  root?: string;
  manifestPath?: string;
  inspectStorageState?: (storageStatePath: string) => StorageStateInspection;
};

export type FinanceX1EvidencePreflightFinding = {
  id: string;
  path: string;
  detail: string;
};

export type FinanceX1EvidencePreflightReport = {
  checkedAt: string;
  status: "blocked" | "ready-for-capture";
  approvalManifestPath: string;
  runId: string | null;
  targetOrigin: string | null;
  storageStateConfigured: boolean;
  blockerCount: number;
  certificationClaimed: false;
  findings: FinanceX1EvidencePreflightFinding[];
};

function finding(
  id: string,
  targetPath: string,
  detail: string,
): FinanceX1EvidencePreflightFinding {
  return { id, path: targetPath, detail };
}

function isWithinRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function defaultInspectStorageState(
  storageStatePath: string,
): StorageStateInspection {
  if (!fs.existsSync(storageStatePath)) {
    return { exists: false, nonEmpty: false, hasAuthenticatedState: false };
  }
  const stat = fs.statSync(storageStatePath);
  if (!stat.isFile() || stat.size === 0) {
    return { exists: true, nonEmpty: false, hasAuthenticatedState: false };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(storageStatePath, "utf8")) as {
      cookies?: unknown[];
      origins?: unknown[];
    };
    return {
      exists: true,
      nonEmpty: true,
      hasAuthenticatedState:
        (parsed.cookies?.length ?? 0) > 0 || (parsed.origins?.length ?? 0) > 0,
    };
  } catch {
    return { exists: true, nonEmpty: true, hasAuthenticatedState: false };
  }
}

function nonProductionOrigin(rawBaseUrl: string): string | null {
  try {
    const url = new URL(rawBaseUrl);
    const host = url.hostname.toLowerCase();
    const local = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
    const namedNonProduction =
      /(?:^|[.-])(dev|development|test|testing|qa|stage|staging|preview|sandbox|nonprod)(?:[.-]|$)/i.test(
        host,
      );
    if (
      !new Set(["http:", "https:"]).has(url.protocol) ||
      (!local.has(host) && !namedNonProduction)
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function evaluateFinanceX1EvidencePreflight(
  input: unknown,
  environment: Record<string, string | undefined>,
  options: PreflightOptions = {},
): FinanceX1EvidencePreflightReport {
  const root = path.resolve(options.root ?? process.cwd());
  const manifestPath =
    options.manifestPath ??
    environment.FINANCE_X1_EVIDENCE_APPROVAL_MANIFEST ??
    DEFAULT_APPROVAL_MANIFEST;
  const inspectStorageState =
    options.inspectStorageState ?? defaultInspectStorageState;
  const findings: FinanceX1EvidencePreflightFinding[] = [];
  const parsed = financeX1EvidenceBindingSchema.safeParse(input);
  const runId = environment.FINANCE_X1_EVIDENCE_RUN_ID?.trim() || null;
  const targetOrigin = nonProductionOrigin(
    environment.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
  );
  const storageStatePath =
    environment.PLAYWRIGHT_FINANCE_X1_STORAGE_STATE?.trim() || null;

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      findings.push(
        finding(
          "approval-manifest-schema",
          issue.path.join(".") || "manifest",
          issue.message,
        ),
      );
    }
  } else {
    const binding = parsed.data;
    if (
      binding.evidenceStatus !== "approved-awaiting-evidence" ||
      binding.budgetApproval.status !== "approved" ||
      binding.evidenceAuthorization.status !== "approved"
    ) {
      findings.push(
        finding(
          "traceable-approvals",
          "evidenceStatus",
          "The input manifest must contain approved budgets and evidence authorization before capture.",
        ),
      );
    } else {
      for (const [targetPath, value] of [
        ["budgetApproval.approvalReference", binding.budgetApproval.approvalReference],
        [
          "evidenceAuthorization.credentialApprovalReference",
          binding.evidenceAuthorization.credentialApprovalReference,
        ],
        [
          "evidenceAuthorization.seededDataApprovalReference",
          binding.evidenceAuthorization.seededDataApprovalReference,
        ],
      ] as const) {
        if (PLACEHOLDER_REFERENCE.test(value)) {
          findings.push(
            finding(
              "approval-reference-placeholder",
              targetPath,
              "Approval references cannot be placeholders.",
            ),
          );
        }
      }

      const foreignTenantId =
        environment.FINANCE_X1_FOREIGN_TENANT_ID?.trim() || null;
      if (
        !foreignTenantId ||
        foreignTenantId ===
          binding.evidenceAuthorization.authorizedFixtureTenantId
      ) {
        findings.push(
          finding(
            "foreign-tenant-probe",
            "FINANCE_X1_FOREIGN_TENANT_ID",
            "A distinct approved foreign tenant ID is required for the read-only isolation probe.",
          ),
        );
      }
    }
  }

  if (!runId || !SAFE_RUN_ID.test(runId) || PLACEHOLDER_REFERENCE.test(runId)) {
    findings.push(
      finding(
        "run-id",
        "FINANCE_X1_EVIDENCE_RUN_ID",
        "A non-placeholder run ID of 6 to 81 safe characters is required.",
      ),
    );
  } else {
    const runDirectory = path.resolve(
      root,
      "what-next",
      "evidence",
      "finance-x1",
      runId,
    );
    if (!isWithinRoot(path.resolve(root, "what-next", "evidence", "finance-x1"), runDirectory)) {
      findings.push(
        finding(
          "run-directory",
          "FINANCE_X1_EVIDENCE_RUN_ID",
          "The run ID must resolve inside the bounded finance X1 evidence directory.",
        ),
      );
    }
  }

  if (!targetOrigin) {
    findings.push(
      finding(
        "non-production-target",
        "PLAYWRIGHT_BASE_URL",
        "The browser target must be localhost or an explicitly named non-production host.",
      ),
    );
  }

  if (!storageStatePath) {
    findings.push(
      finding(
        "approved-storage-state",
        "PLAYWRIGHT_FINANCE_X1_STORAGE_STATE",
        "An explicitly approved external-accountant storage-state path is required.",
      ),
    );
  } else {
    const inspected = inspectStorageState(path.resolve(root, storageStatePath));
    if (!inspected.exists || !inspected.nonEmpty || !inspected.hasAuthenticatedState) {
      findings.push(
        finding(
          "approved-storage-state",
          "PLAYWRIGHT_FINANCE_X1_STORAGE_STATE",
          "The approved storage state must exist, be non-empty, and contain authenticated browser state.",
        ),
      );
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    status: findings.length === 0 ? "ready-for-capture" : "blocked",
    approvalManifestPath: manifestPath,
    runId,
    targetOrigin,
    storageStateConfigured: Boolean(storageStatePath),
    blockerCount: findings.length,
    certificationClaimed: false,
    findings,
  };
}

export function loadFinanceX1ApprovalManifest(
  root: string,
  manifestPath: string,
): unknown {
  const absoluteRoot = path.resolve(root);
  const absoluteManifest = path.resolve(absoluteRoot, manifestPath);
  if (!isWithinRoot(absoluteRoot, absoluteManifest)) {
    throw new Error("The approval manifest must be inside the repository.");
  }
  const manifestRelative = path.relative(absoluteRoot, absoluteManifest).split(path.sep).join("/");
  const input = JSON.parse(fs.readFileSync(absoluteManifest, "utf8"));
  const localRecordReference = /^X1-(PRODUCT|EVIDENCE)-[0-9A-F-]{36}(?:#.*)?$/;
  if (manifestRelative.startsWith("docs/X1/approval-register/exports/") ||
      localRecordReference.test(input?.budgetApproval?.approvalReference ?? "") ||
      localRecordReference.test(input?.evidenceAuthorization?.credentialApprovalReference ?? "")) {
    const { createRegister } = require("../services/governance/approval-providers/local-manual-register");
    createRegister(absoluteRoot).validateExport(manifestRelative);
  }
  return input;
}

function main(): void {
  const root = process.cwd();
  const manifestPath =
    process.env.FINANCE_X1_EVIDENCE_APPROVAL_MANIFEST ??
    DEFAULT_APPROVAL_MANIFEST;
  let input: unknown;
  try {
    input = loadFinanceX1ApprovalManifest(root, manifestPath);
    const manifestRelative = path.relative(root, path.resolve(root, manifestPath)).split(path.sep).join("/");
    if (manifestRelative.startsWith("docs/X1/approval-register/exports/")) {
      const { createRegister } = require("../services/governance/approval-providers/local-manual-register");
      const scope = createRegister(root).config().scope;
      if ((process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000") !== scope.origin || process.env.FINANCE_X1_FOREIGN_TENANT_ID !== scope.foreignProbeOrganizationId) {
        throw new Error("Use the exact origin and foreign tenant authorized by the local register.");
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }
  const report = evaluateFinanceX1EvidencePreflight(input, process.env, {
    root,
    manifestPath,
  });
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "ready-for-capture") process.exitCode = 1;
}

if (require.main === module) main();
