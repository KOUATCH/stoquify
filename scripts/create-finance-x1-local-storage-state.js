const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { request } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "..");
const EMAIL = "external.accountant.rds-org001@stockflow.test";
const USER_ID = "rds_org_001_compliance_user_external_accountant";
const ORGANIZATION_ID = "rds_org_001";
const FOREIGN_ORGANIZATION_ID = "rds_org_002";
const OUTPUT_PATH = path.join(
  os.tmpdir(),
  "stoquify-finance-x1",
  "external-accountant.storage-state.json",
);
const MANIFEST_PATH = path.join(
  ROOT,
  "what-next",
  "evidence",
  "finance-x1",
  "local-simulation",
  "local-storage-state-preparation.json",
);

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.renameSync(temporaryPath, filePath);
}

async function main() {
  if (process.env.X1_ALLOW_LOCAL_SIMULATION !== "true") {
    throw new Error("X1_ALLOW_LOCAL_SIMULATION=true is required.");
  }
  const password = process.env.X1_LOCAL_EXTERNAL_ACCOUNTANT_PASSWORD;
  if (!password || password.length < 20) {
    throw new Error("X1_LOCAL_EXTERNAL_ACCOUNTANT_PASSWORD is missing or too short.");
  }
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
  const parsedOrigin = new URL(baseURL);
  if (!["127.0.0.1", "localhost"].includes(parsedOrigin.hostname)) {
    throw new Error("Local storage-state preparation permits only localhost origins.");
  }

  const context = await request.newContext({ baseURL });
  try {
    const signIn = await context.post("/api/auth/sign-in/email", {
      data: { email: EMAIL, password, rememberMe: false },
    });
    if (!signIn.ok()) {
      throw new Error(`External-accountant sign-in failed with HTTP ${signIn.status()}.`);
    }

    const permissionsResponse = await context.get("/api/auth/permissions");
    if (!permissionsResponse.ok()) {
      throw new Error(`Authenticated permissions probe failed with HTTP ${permissionsResponse.status()}.`);
    }
    const permissions = await permissionsResponse.json();
    const roleCodes = (permissions.roles || []).map((role) => role.code);
    if (permissions.organizationId !== ORGANIZATION_ID || !roleCodes.includes("external_accountant")) {
      throw new Error("The authenticated session does not resolve to the required tenant and persona.");
    }

    const isolationResponse = await context.get("/api/auth/permissions", {
      headers: { "x-organization-id": FOREIGN_ORGANIZATION_ID },
    });
    if (!isolationResponse.ok()) {
      throw new Error(`Tenant-isolation probe failed with HTTP ${isolationResponse.status()}.`);
    }
    const isolation = await isolationResponse.json();
    if (isolation.organizationId !== ORGANIZATION_ID) {
      throw new Error("The authenticated session accepted a foreign tenant override.");
    }

    const state = await context.storageState();
    if (!Array.isArray(state.cookies) || state.cookies.length === 0) {
      throw new Error("Authentication succeeded without a persisted browser session cookie.");
    }
    writeJson(OUTPUT_PATH, state);

    const preparedAt = new Date().toISOString();
    const manifest = {
      schemaVersion: 1,
      classification: "LOCAL_SIMULATION_AUTHENTICATED_STORAGE_STATE",
      authoritative: false,
      authenticated: true,
      approvedForReleaseEvidence: false,
      baseURL,
      organizationId: ORGANIZATION_ID,
      foreignIsolationProbeTenantId: FOREIGN_ORGANIZATION_ID,
      userId: USER_ID,
      personaRole: "external_accountant",
      cookieCount: state.cookies.length,
      storageStatePath: OUTPUT_PATH,
      plaintextPasswordPersisted: false,
      preparedAt,
    };
    writeJson(MANIFEST_PATH, manifest);
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  } finally {
    await context.dispose();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
