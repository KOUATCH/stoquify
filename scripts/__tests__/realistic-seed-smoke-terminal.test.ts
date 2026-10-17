/** @jest-environment node */
jest.mock("@/lib/security/auth-credentials", () => ({ verifyUserCredentialPassword: jest.fn() }));
jest.mock("@/prisma/db", () => ({ db: { $disconnect: jest.fn() } }));
jest.mock("@/services/pos/pos.service", () => ({ addPOSCartLine: jest.fn(), closePOSShift: jest.fn(), commitPOSSale: jest.fn(), listPOSCatalogItems: jest.fn(), openPOSShift: jest.fn() }));
jest.mock("@/services/pos/terminal-management.service", () => ({ createTerminalForManagement: jest.fn() }));

import { PrismaClient } from "@prisma/client";
import { createTerminalForManagement } from "@/services/pos/terminal-management.service";
import { selectSmokeTerminal } from "../verify-realistic-development-seed";

const input = { organizationId: "org", locationId: "location", databaseName: "stoquify_reseed_smoke_local_20260927", actorPermissions: ["pos.session.start"] };
const client = (findFirst: jest.Mock) => ({ pOSStation: { findFirst } }) as unknown as Pick<PrismaClient, "pOSStation">;
const create = createTerminalForManagement as jest.MockedFunction<typeof createTerminalForManagement>;

beforeEach(() => jest.clearAllMocks());

test("selects an unclaimed station without touching existing sessions or drawers", async () => {
  const findFirst = jest.fn(async () => ({ id: "vacant", terminalNumber: "VACANT-01" }));
  expect(await selectSmokeTerminal(input, client(findFirst))).toEqual({ id: "vacant", terminalNumber: "VACANT-01" });
  expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org", locationId: "location", isActive: true, currentSessionId: null, sessions: { none: { status: { in: ["ACTIVE", "SUSPENDED"] } } }, cashDrawers: { none: { isOpen: true } } }) }));
  expect(create).not.toHaveBeenCalled();
});

test("creates an explicitly synthetic terminal through its owning service in the smoke clone", async () => {
  create.mockResolvedValue({ id: "new", terminalNumber: "RESEED-SMOKE-TEST" } as Awaited<ReturnType<typeof createTerminalForManagement>>);
  expect(await selectSmokeTerminal(input, client(jest.fn(async () => null)))).toEqual({ id: "new", terminalNumber: "RESEED-SMOKE-TEST" });
  expect(create).toHaveBeenCalledWith("org", { locationId: "location", terminalNumber: expect.stringMatching(/^RESEED-SMOKE-/), name: "Synthetic reseed smoke station", isActive: true, hasCashDrawer: true });
});

test.each(["stoquify_reseed_local_20260927_1500", "stoquify_replay_next_20260830"])("does not create or disturb stations on %s", async (databaseName) => {
  await expect(selectSmokeTerminal({ ...input, databaseName }, client(jest.fn(async () => null)))).rejects.toThrow("Prepare an isolated smoke database");
  expect(create).not.toHaveBeenCalled();
});

test("requires the real terminal-creation permission even in a smoke clone", async () => {
  await expect(selectSmokeTerminal({ ...input, actorPermissions: ["pos.read"] }, client(jest.fn(async () => null)))).rejects.toThrow("lacks pos.session.start");
  expect(create).not.toHaveBeenCalled();
});
