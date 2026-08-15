import "dotenv/config";

import { readFile } from "fs/promises";
import path from "path";

import { PrismaClient } from "@prisma/client";

import { verifyUserCredentialPassword } from "@/lib/security/auth-credentials";
import { db } from "@/prisma/db";
import {
  addPOSCartLine,
  commitPOSSale,
  listPOSCatalogItems,
} from "@/services/pos/pos.service";

const prisma = new PrismaClient();
const credentialPath = path.join(
  process.cwd(),
  ".seed-artifacts",
  "seed-login-credentials.json",
);

type Credential = {
  organizationId: string;
  email: string;
  password: string;
  role: string;
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
    !/(?:dev|test|local|reconcile)/i.test(databaseName)
  ) {
    throw new Error(
      "The realistic seed smoke test is restricted to an explicitly named local development/test database.",
    );
  }
}

function matchesRequiredPersona(role: string) {
  return /admin|manager|cashier|inventory|accountant/i.test(role);
}

async function verifyLoginPersonas(credentials: Credential[]) {
  const candidates = credentials.filter((credential) =>
    matchesRequiredPersona(credential.role),
  );
  const selected: Credential[] = [];
  const represented = new Set<string>();

  for (const credential of candidates) {
    const persona = credential.role.toLowerCase().includes("cashier")
      ? "cashier"
      : credential.role.toLowerCase().includes("inventory")
        ? "inventory"
        : credential.role.toLowerCase().includes("accountant")
          ? "accountant"
          : credential.role.toLowerCase().includes("manager")
            ? "manager"
            : "admin";
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

async function verifyPOSFlow(credentials: Credential[]) {
  const cashierCredential = credentials.find((credential) =>
    /cashier/i.test(credential.role),
  );
  if (!cashierCredential) throw new Error("Seeded cashier credential is missing.");

  const cashier = await prisma.user.findFirstOrThrow({
    where: {
      organizationId: cashierCredential.organizationId,
      email: cashierCredential.email,
    },
    select: { id: true },
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
  const terminal = await prisma.pOSStation.findFirstOrThrow({
    where: {
      organizationId: cashierCredential.organizationId,
      locationId: location.id,
      isActive: true,
    },
    select: { id: true, terminalNumber: true },
  });
  const session = await prisma.pOSSession.findFirstOrThrow({
    where: {
      organizationId: cashierCredential.organizationId,
      locationId: location.id,
      terminalId: terminal.id,
      userId: cashier.id,
      status: "ACTIVE",
    },
    select: { id: true, sessionNumber: true },
  });

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
    inventoryDecrementVerified: true,
  };
}

async function main() {
  assertDisposableTarget();
  const artifact = JSON.parse(
    await readFile(credentialPath, "utf8"),
  ) as CredentialArtifact;
  const loginPersonas = await verifyLoginPersonas(artifact.credentials);
  const pos = await verifyPOSFlow(artifact.credentials);
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

main()
  .catch((error) => {
    console.error("Realistic seed verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([prisma.$disconnect(), db.$disconnect()]);
  });
