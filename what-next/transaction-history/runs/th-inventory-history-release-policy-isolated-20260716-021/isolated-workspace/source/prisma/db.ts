import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

// Standard Prisma client for Node.js runtime (API routes, server actions)
export const db =
  globalThis.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
    transactionOptions: {
      maxWait: 10000, // default: 2000
      timeout: 15000, // default: 5000
    },
  });

// Export as both 'db' and 'prisma' for compatibility
export const prisma = db;

export default db;

if (process.env.NODE_ENV !== "production") globalThis.prisma = db;
