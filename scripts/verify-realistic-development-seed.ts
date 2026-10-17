import "dotenv/config";

import { readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import { PrismaClient } from "@prisma/client";

import { verifyUserCredentialPassword } from "@/lib/security/auth-credentials";
import { hasRbacPermission } from "@/lib/security/rbac-permissions";
import { db } from "@/prisma/db";
import {
  addPOSCartLine,
  closePOSShift,
  commitPOSSale,
  listPOSCatalogItems,
  openPOSShift,
} from "@/services/pos/pos.service";
import { createTerminalForManagement } from "@/services/pos/terminal-management.service";

const prisma = new PrismaClient();
const credentialPath = process.env.STOQUIFY_SEED_CREDENTIAL_ARTIFACT?.trim()
  ? path.resolve(process.env.STOQUIFY_SEED_CREDENTIAL_ARTIFACT.trim())
  : path.join(
  process.cwd(),
  ".seed-artifacts",
  "seed-login-credentials.json",
);

type Credential = {
  organizationId: string;
  email: string;
  password: string;
  role: string;
  roleCodes?: string[];
};

type CredentialArtifact = {
  credentials: Credential[];
};

function assertDisposableTarget() {
  const configured = process.env.DATABASE_URL?.trim();
  if (!configured) throw new Error("DATABASE_URL is required.");

  const target = new URL(configured);
  const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ""));
  if (
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      target.hostname.toLowerCase(),
    ) ||
    !/(?:dev|test|local|reconcile|replay|disposable)/i.test(databaseName)
  ) {
    throw new Error(
      "The realistic seed smoke test is restricted to an explicitly named local development/test database.",
    );
  }
  return databaseName;
}

function credentialPersona(credential: Credential): string | undefined {
  const roles = credential.roleCodes?.length
    ? credential.roleCodes.map((code) => code.toLowerCase())
    : credential.role.toLowerCase().split(",").map((name) => name.trim().replaceAll(" ", "_"));
  if (roles.some((role) => role.includes("cashier"))) return "cashier";
  if (roles.some((role) => role.includes("inventory"))) return "inventory";
  if (roles.some((role) => role.includes("accountant"))) return "accountant";
  if (roles.some((role) => role.includes("manager"))) return "manager";
  if (roles.some((role) => ["owner", "admin", "administrator", "super_admin", "super_administrator"].includes(role))) return "admin";
  return undefined;
}

async function verifyLoginPersonas(credentials: Credential[]) {
  const candidates = credentials.filter((credential) =>
    credentialPersona(credential),
  );
  const selected: Credential[] = [];
  const represented = new Set<string>();

  for (const credential of candidates) {
    const persona = credentialPersona(credential)!;
    if (!represented.has(persona)) {
      represented.add(persona);
      selected.push(credential);
    }
  }

  if (selected.length < 5) {
    throw new Error(`Expected five distinct login personas, found ${selected.length}.`);
  }

  const results = [];
  for (const credential of selected) {
    const user = await prisma.user.findFirst({
      where: {
        organizationId: credential.organizationId,
        email: credential.email,
        isActive: true,
        isVerified: true,
      },
      select: { id: true },
    });
    if (!user) throw new Error(`Login persona is not usable: ${credential.email}`);
    const valid = await verifyUserCredentialPassword(user.id, credential.password);
    if (!valid) throw new Error(`Credential verification failed: ${credential.email}`);
    results.push({ email: credential.email, role: credential.role, valid });
  }
  return results;
}

export async function selectSmokeTerminal(
  input: { organizationId: string; locationId: string; databaseName: string; actorPermissions: string[] },
  client: Pick<PrismaClient, "pOSStation"> = prisma,
  createTerminal: typeof createTerminalForManagement = createTerminalForManagement,
) {
  const vacant = await client.pOSStation.findFirst({
    where: {
      organizationId: input.organizationId,
      locationId: input.locationId,
      isActive: true,
      hasCashDrawer: true,
      currentSessionId: null,
      sessions: { none: { status: { in: ["ACTIVE", "SUSPENDED"] } } },
      cashDrawers: { none: { isOpen: true } },
    },
    orderBy: { terminalNumber: "asc" },
    select: { id: true, terminalNumber: true },
  });
  if (vacant) return vacant;
  // Never close a preserved shift, reset a station link, or reuse its drawer.
  // Creating a dedicated test station is limited to an explicitly named clone.
  if (!/(?:^|_)smoke(?:_|$)/i.test(input.databaseName)) {
    throw new Error("No vacant cash-drawer station exists. Prepare an isolated smoke database before creating a synthetic verification station.");
  }
  if (!hasRbacPermission(input.actorPermissions, "pos.session.start")) {
    throw new Error("The smoke actor lacks pos.session.start for terminal creation.");
  }
  const created = await createTerminal(input.organizationId, {
    locationId: input.locationId,
    terminalNumber: `RESEED-SMOKE-${randomUUID().slice(0, 8)}`,
    name: "Synthetic reseed smoke station",
    isActive: true,
    hasCashDrawer: true,
  });
  return { id: created.id, terminalNumber: created.terminalNumber };
}

async function verifyPOSFlow(credentials: Credential[], databaseName: string) {
  const cashierCredential = credentials.find((credential) =>
    credentialPersona(credential) === "cashier",
  );
  if (!cashierCredential) throw new Error("Seeded cashier credential is missing.");

  const cashier = await prisma.user.findFirstOrThrow({
    where: {
      organizationId: cashierCredential.organizationId,
      email: cashierCredential.email,
    },
    select: { id: true, roles: { select: { permissions: true } } },
  });
  const location = await prisma.location.findFirstOrThrow({
    where: {
      organizationId: cashierCredential.organizationId,
      isDefault: true,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true, name: true },
  });
  const terminal = await selectSmokeTerminal({
    organizationId: cashierCredential.organizationId,
    locationId: location.id,
    databaseName,
    actorPermissions: cashier.roles.flatMap((role) => role.permissions),
  });
  const session = await openPOSShift({
    organizationId: cashierCredential.organizationId,
    userId: cashier.id,
    locationId: location.id,
    terminalId: terminal.id,
    openingBalance: 20_000,
    notes: "Automated realistic seed verification shift.",
  });
  if (!session) throw new Error("The POS service did not return the newly opened shift.");

  const catalog = await listPOSCatalogItems({
    organizationId: cashierCredential.organizationId,
    locationId: location.id,
    take: 120,
  });
  const stockedItems = catalog.items.filter(
    (item) => item.trackInventory && item.stock.quantityAvailable >= 20,
  );
  if (stockedItems.length < 10) {
    throw new Error(
      `Expected at least 10 POS-ready stocked items, found ${stockedItems.length}.`,
    );
  }

  const saleItems = stockedItems.slice(0, 7);
  const beforeLevels = new Map(
    (
      await prisma.inventoryLevel.findMany({
        where: {
          locationId: location.id,
          itemId: { in: saleItems.map((item) => item.id) },
        },
        select: { itemId: true, quantityAvailable: true },
      })
    ).map((level) => [level.itemId, Number(level.quantityAvailable)]),
  );

  let cart: Awaited<ReturnType<typeof addPOSCartLine>> = null;
  for (const item of saleItems) {
    cart = await addPOSCartLine({
      organizationId: cashierCredential.organizationId,
      userId: cashier.id,
      locationId: location.id,
      terminalId: terminal.id,
      sessionId: session.id,
      itemId: item.id,
      quantity: 1,
    });
  }
  if (!cart || cart.lines.length !== 7 || cart.total <= 0) {
    throw new Error("The POS service did not create a seven-line payable cart.");
  }

  const committed = await commitPOSSale({
    organizationId: cashierCredential.organizationId,
    userId: cashier.id,
    clientCommitId: `seed:${cart.id}`,
    expectedCartRevision: cart.revision,
    salesOrderId: cart.id,
    locationId: location.id,
    terminalId: terminal.id,
    sessionId: session.id,
    tenders: [{ method: "CASH", amount: cart.total }],
    receipt: { channel: "NONE" },
    notes: "Automated realistic seed multi-item POS smoke test.",
  });

  const afterLevels = await prisma.inventoryLevel.findMany({
    where: {
      locationId: location.id,
      itemId: { in: saleItems.map((item) => item.id) },
    },
    select: { itemId: true, quantityAvailable: true },
  });
  for (const level of afterLevels) {
    const before = beforeLevels.get(level.itemId);
    if (before === undefined || Number(level.quantityAvailable) !== before - 1) {
      throw new Error(`Inventory did not decrement exactly once for ${level.itemId}.`);
    }
  }

  const persisted = await prisma.salesOrder.findUnique({
    where: { id: committed.saleId },
    select: {
      status: true,
      paymentStatus: true,
      lines: { select: { id: true } },
      payments: { select: { status: true, method: true } },
    },
  });
  if (
    persisted?.status !== "COMPLETED" ||
    persisted.paymentStatus !== "PAID" ||
    persisted.lines.length !== 7 ||
    !persisted.payments.some(
      (payment) => payment.status === "PAID" && payment.method === "CASH",
    )
  ) {
    throw new Error("The seven-item POS sale did not persist as completed and paid.");
  }

  const closingSession = await prisma.pOSSession.findUniqueOrThrow({
    where: { id: session.id },
    select: { expectedBalance: true },
  });
  const closedSession = await closePOSShift({
    organizationId: cashierCredential.organizationId,
    userId: cashier.id,
    sessionId: session.id,
    actualBalance: String(closingSession.expectedBalance ?? 0),
    notes: "Automated realistic seed verification close.",
  });
  const closedState = await prisma.pOSSession.findUniqueOrThrow({
    where: { id: closedSession.sessionId },
    select: { status: true },
  });
  if (closedState.status !== "CLOSED") {
    throw new Error(`The POS shift remained ${closedState.status} after close.`);
  }

  return {
    organizationId: cashierCredential.organizationId,
    location,
    terminal,
    session,
    catalogItemCount: catalog.items.length,
    stockedItemCount: stockedItems.length,
    distinctItemsSold: saleItems.length,
    saleId: committed.saleId,
    orderNumber: committed.orderNumber,
    total: committed.total,
    status: committed.status,
    paymentStatus: committed.paymentStatus,
    shiftCloseStatus: closedState.status,
    inventoryDecrementVerified: true,
  };
}

async function main() {
  const databaseName = assertDisposableTarget();
  const artifact = JSON.parse(
    await readFile(credentialPath, "utf8"),
  ) as CredentialArtifact;
  const loginPersonas = await verifyLoginPersonas(artifact.credentials);
  const pos = await verifyPOSFlow(artifact.credentials, databaseName);
  console.log(
    JSON.stringify(
      {
        status: "PASS",
        credentialChecks: loginPersonas.map(({ email, role, valid }) => ({
          email,
          role,
          valid,
        })),
        pos,
      },
      null,
      2,
    ),
  );
}

if (require.main === module) main()
  .catch((error) => {
    console.error("Realistic seed verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([prisma.$disconnect(), db.$disconnect()]);
  });
