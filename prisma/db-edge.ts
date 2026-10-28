import { PrismaClient } from "@prisma/client";

declare global {
  var prismaEdge: PrismaClient | undefined;
}

const expandDatabaseUrl = (value: string) =>
  value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_match, key: string) => process.env[key] ?? "");

const stripWrappers = (value: string) => value.replace(/^"|"$/g, "").replace(/^'|'$/g, "").trim();

const normalizeDatabaseUrl = (rawValue: string | undefined) => {
  if (!rawValue) return undefined;

  const expanded = rawValue.includes("${") ? expandDatabaseUrl(rawValue) : rawValue;
  const normalized = stripWrappers(expanded);

  if (normalized.startsWith("prisma://") || normalized.startsWith("prisma+postgres://")) {
    return normalized;
  }

  if (normalized.startsWith("postgres://") || normalized.startsWith("postgresql://")) {
    return normalized.replace(/^postgres(?:ql)?:\/\//, "prisma+postgres://");
  }

  return normalized;
};

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL || process.env.DIRECT_URL);

const prismaEdgeOptions: ConstructorParameters<typeof PrismaClient>[0] = {
  log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
};

if (databaseUrl) {
  prismaEdgeOptions.datasources = {
    db: { url: databaseUrl },
  };
}

// Edge-compatible Prisma client for Prisma 6
export const dbEdge =
  globalThis.prismaEdge || new PrismaClient(prismaEdgeOptions);

// Export as both 'dbEdge' and 'prismaEdge' for compatibility
export const prismaEdge = dbEdge;

if (process.env.NODE_ENV !== "production") globalThis.prismaEdge = dbEdge;
