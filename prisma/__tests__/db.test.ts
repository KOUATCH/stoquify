jest.mock("@prisma/client", () => ({ PrismaClient: jest.fn() }));

import { PrismaClient } from "@prisma/client";

const mockPrismaClient = jest.mocked(PrismaClient);
const createClient = () => ({
  organization: { findFirst: jest.fn() },
  tenantModuleConfiguration: { findUnique: jest.fn() },
  tenantModuleGrant: { findMany: jest.fn() },
  tenantModuleConfigurationCommand: { count: jest.fn() },
}) as unknown as PrismaClient;

const loadDatabase = () => {
  let database!: typeof import("../db");
  jest.isolateModules(() => {
    database = jest.requireActual<typeof import("../db")>("../db");
  });
  return database;
};

describe("Prisma client cache", () => {
  const originalClient = globalThis.prisma;

  beforeEach(() => {
    delete globalThis.prisma;
    mockPrismaClient.mockReset();
    mockPrismaClient.mockImplementation(() => createClient());
  });

  afterEach(() => {
    globalThis.prisma = originalClient;
  });

  it("creates one client and reuses it across module reloads", () => {
    const first = loadDatabase();
    const second = loadDatabase();

    expect(mockPrismaClient).toHaveBeenCalledTimes(1);
    expect(globalThis.prisma).toBe(first.db);
    expect(second.db).toBe(first.db);
    expect(first.prisma).toBe(first.db);
    expect(first.default).toBe(first.db);
  });

  it("reuses a cached client that has the module models", () => {
    const cached = createClient();
    globalThis.prisma = cached;

    expect(loadDatabase().db).toBe(cached);
    expect(mockPrismaClient).not.toHaveBeenCalled();
  });

  it.each([
    "tenantModuleConfiguration",
    "tenantModuleGrant",
    "tenantModuleConfigurationCommand",
  ] as const)("replaces a cached client missing %s", async (model) => {
    const cached = createClient();
    delete (cached as Partial<PrismaClient>)[model];
    globalThis.prisma = cached;

    const { db } = loadDatabase();

    expect(db).not.toBe(cached);
    expect(globalThis.prisma).toBe(db);
    expect(mockPrismaClient).toHaveBeenCalledTimes(1);
    await db.tenantModuleConfiguration.findUnique({ where: { organizationId: "org-1" } });
    await db.tenantModuleGrant.findMany({ where: { organizationId: "org-1" } });
    await db.tenantModuleConfigurationCommand.count({ where: { organizationId: "org-1" } });
    expect(loadDatabase().db).toBe(db);
    expect(mockPrismaClient).toHaveBeenCalledTimes(1);
  });
});
