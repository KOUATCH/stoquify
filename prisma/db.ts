import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const expandDatabaseUrl = (value: string) =>
  value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_match, key: string) => process.env[key] ?? "");

const stripWrappers = (value: string) => value.replace(/^"|"$/g, "").replace(/^'|'$/g, "").trim();

const normalizeDatabaseUrl = (rawValue: string | undefined) => {
  if (!rawValue) return undefined;

  const expanded = rawValue.includes("${") ? expandDatabaseUrl(rawValue) : rawValue;
  const normalized = stripWrappers(expanded);

  return normalized;
};

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL || process.env.DIRECT_URL);

const prismaOptions: ConstructorParameters<typeof PrismaClient>[0] = {
  log: process.env.NODE_ENV === "development" ? ["query"] : ["error"],
  transactionOptions: {
    maxWait: 10000, // default: 2000
    timeout: 15000, // default: 5000
  },
};

if (databaseUrl) {
  prismaOptions.datasources = {
    db: { url: databaseUrl },
  };
}

// Standard Prisma client for Node.js runtime (API routes, server actions)
// Hot reload can retain a client created before the module models were generated.
const cachedPrisma = globalThis.prisma;
const hasModuleModels = cachedPrisma?.pictureAsset
  && cachedPrisma.tenantModuleConfiguration
  && cachedPrisma.tenantModuleGrant
  && cachedPrisma.pOSCheckoutWorkspace
  && cachedPrisma.tenantModuleConfigurationCommand;

export const db = (hasModuleModels && cachedPrisma) || new PrismaClient(prismaOptions);

// Export as both 'db' and 'prisma' for compatibility
export const prisma = db;

export default db;

if (process.env.NODE_ENV !== "production") globalThis.prisma = db;
