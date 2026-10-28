import { PrismaClient } from "@prisma/client";

declare global {
  var prismaEdge: PrismaClient | undefined;
}

// Edge-compatible Prisma client for Prisma 6
export const dbEdge =
  globalThis.prismaEdge ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  });

// Export as both 'dbEdge' and 'prismaEdge' for compatibility
export const prismaEdge = dbEdge;

if (process.env.NODE_ENV !== "production") globalThis.prismaEdge = dbEdge;