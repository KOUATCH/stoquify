const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const argon2 = require("argon2");
const { PrismaClient } = require("@prisma/client");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(
  ROOT,
  "what-next",
  "evidence",
  "finance-x1",
  "local-simulation",
  "local-auth-preparation.json",
);
const EXPECTED_DATABASE = "stoquify_replay_next_20260830";
const EXPECTED_USER = {
  id: "rds_org_001_compliance_user_external_accountant",
  email: "external.accountant.rds-org001@stockflow.test",
  organizationId: "rds_org_001",
};

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

async function main() {
  if (process.env.X1_ALLOW_LOCAL_SIMULATION !== "true") {
    throw new Error("X1_ALLOW_LOCAL_SIMULATION=true is required.");
  }
  const password = process.env.X1_LOCAL_EXTERNAL_ACCOUNTANT_PASSWORD;
  if (!password || password.length < 20) {
    throw new Error("A temporary password of at least 20 characters is required in X1_LOCAL_EXTERNAL_ACCOUNTANT_PASSWORD.");
  }

  const prisma = new PrismaClient();
  try {
    const databaseRows = await prisma.$queryRawUnsafe("SELECT current_database() AS name");
    const databaseName = databaseRows[0] && databaseRows[0].name;
    if (databaseName !== EXPECTED_DATABASE) {
      throw new Error(`Refusing credential preparation on database ${databaseName || "unknown"}.`);
    }

    const user = await prisma.user.findUnique({
      where: { email: EXPECTED_USER.email },
      select: {
        id: true,
        email: true,
        organizationId: true,
        isActive: true,
        emailVerified: true,
        mfaEnabledAt: true,
      },
    });
    if (
      !user ||
      user.id !== EXPECTED_USER.id ||
      user.organizationId !== EXPECTED_USER.organizationId ||
      user.isActive !== true ||
      user.emailVerified !== true
    ) {
      throw new Error("The expected active and verified external-accountant fixture was not found.");
    }
    if (user.mfaEnabledAt) {
      throw new Error("The fixture has MFA enabled; local preparation will not disable an enrolled factor.");
    }

    const credentialAccount = await prisma.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
      select: { id: true, providerId: true },
    });

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    const result = await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: user.id },
        data: {
          password: passwordHash,
          isLocked: false,
          lockedUntil: null,
          failedLoginAttempts: 0,
          lastFailedLogin: null,
        },
      });
      if (credentialAccount) {
        await transaction.account.update({
          where: { id: credentialAccount.id },
          data: { password: passwordHash },
        });
      } else {
        await transaction.account.create({
          data: {
            id: "rds_org_001_compliance_account_external_accountant",
            accountId: user.id,
            providerId: "credential",
            userId: user.id,
            password: passwordHash,
          },
        });
      }
      const revokedSessions = await transaction.session.deleteMany({
        where: { userId: user.id },
      });
      return {
        credentialAccountCreated: !credentialAccount,
        sessionsRevoked: revokedSessions.count,
      };
    });

    const preparedAt = new Date().toISOString();
    const manifest = {
      schemaVersion: 1,
      classification: "LOCAL_SIMULATION_CREDENTIAL_PREPARATION",
      authoritative: false,
      database: databaseName,
      organizationId: user.organizationId,
      userId: user.id,
      email: user.email,
      providerId: "credential",
      credentialAccountCreated: result.credentialAccountCreated,
      sessionsRevoked: result.sessionsRevoked,
      passwordPersistedInManifest: false,
      preparedAt,
      preparationId: `LOCAL-AUTH-${crypto
        .createHash("sha256")
        .update(`${user.id}:${preparedAt}`)
        .digest("hex")
        .slice(0, 16)
        .toUpperCase()}`,
    };
    writeJson(OUTPUT_PATH, manifest);
    process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
