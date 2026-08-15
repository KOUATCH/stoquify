import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test, type Browser, type Page } from "@playwright/test"
import { PrismaClient } from "@prisma/client"

type Fixture = {
  runId: string
  organizationId: string
  purchaseOrderId: string
  purchaseOrderLineId: string
  orderNumber: string
  supplierId: string
  locationId: string
  itemId: string
  inventoryLevelId: string
  evidenceDir: string
}

const fixturePath = resolve(process.cwd(), "playwright/.auth/supplier-po-ack-fixture.json")

function fixture() {
  return JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture
}

function refreshBuyerAssurance() {
  execFileSync(process.execPath, ["scripts/supplier-po-ack-e2e-fixture.js", "assure"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  })
}

function serialize(value: unknown) {
  return JSON.parse(JSON.stringify(value, (_key, current) =>
    current && typeof current === "object" && typeof current.toString === "function" && current.constructor?.name === "Decimal"
      ? current.toString()
      : current,
  ))
}

async function authoritativeFingerprint(prisma: PrismaClient, input: Fixture) {
  const [purchaseOrder, inventoryLevel, inventoryTransactions, supplierInvoices, journalEntries, journalEntryLines, postingBatches, sourceLinks] = await Promise.all([
    prisma.purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderDate: true,
        expectedDeliveryDate: true,
        actualDeliveryDate: true,
        paymentTerms: true,
        notes: true,
        internalNotes: true,
        subtotal: true,
        taxAmount: true,
        shippingCost: true,
        discount: true,
        total: true,
        supplierId: true,
        locationId: true,
        approvedById: true,
        approvedAt: true,
        updatedAt: true,
        lines: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            orderedQuantity: true,
            receivedQuantity: true,
            unitCost: true,
            taxAmount: true,
            lineTotal: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.inventoryLevel.findUnique({
      where: { id: input.inventoryLevelId },
      select: {
        id: true,
        quantityOnHand: true,
        quantityReserved: true,
        quantityAvailable: true,
        quantityInTransit: true,
        quantityOnOrder: true,
        averageCost: true,
        totalValue: true,
        version: true,
        updatedAt: true,
      },
    }),
    prisma.inventoryTransaction.findMany({
      where: {
        organizationId: input.organizationId,
        OR: [{ itemId: input.itemId }, { referenceId: input.purchaseOrderId }],
      },
      orderBy: { id: "asc" },
      select: { id: true, type: true, quantity: true, balanceAfter: true, referenceType: true, referenceId: true },
    }),
    prisma.supplierInvoice.findMany({
      where: { organizationId: input.organizationId, purchaseOrderId: input.purchaseOrderId },
      orderBy: { id: "asc" },
      select: { id: true, status: true, total: true, amountPaid: true, updatedAt: true },
    }),
    prisma.journalEntry.count({ where: { organizationId: input.organizationId } }),
    prisma.journalEntryLine.count({ where: { organizationId: input.organizationId } }),
    prisma.ledgerPostingBatch.count({ where: { organizationId: input.organizationId } }),
    prisma.accountingSourceLink.count({ where: { organizationId: input.organizationId } }),
  ])
  return serialize({
    purchaseOrder,
    inventoryLevel,
    inventoryTransactions,
    supplierInvoices,
    accounting: { journalEntries, journalEntryLines, postingBatches, sourceLinks },
  })
}

async function evidenceCounts(prisma: PrismaClient, input: Fixture) {
  const [envelopeCount, tokenCount, proposalCount, stateCount] = await Promise.all([
    prisma.supplierPoEnvelope.count({ where: { organizationId: input.organizationId, purchaseOrderId: input.purchaseOrderId } }),
    prisma.supplierPoAccessToken.count({ where: { organizationId: input.organizationId, envelope: { purchaseOrderId: input.purchaseOrderId } } }),
    prisma.supplierPoProposal.count({ where: { organizationId: input.organizationId, envelope: { purchaseOrderId: input.purchaseOrderId } } }),
    prisma.supplierPoProposalState.count({ where: { organizationId: input.organizationId, proposal: { envelope: { purchaseOrderId: input.purchaseOrderId } } } }),
  ])
  return { envelopeCount, tokenCount, proposalCount, stateCount }
}

async function issueInvitation(page: Page) {
  refreshBuyerAssurance()
  const invitation = page.getByTestId("supplier-po-invite-url")
  const previousValue = await invitation.isVisible().then(
    (visible) => visible ? invitation.inputValue() : Promise.resolve(""),
  )
  await page.getByTestId("issue-supplier-po-invite").click()
  await expect(invitation).toBeVisible()
  await expect.poll(() => invitation.inputValue()).not.toBe(previousValue)
  const value = await invitation.inputValue()
  expect(value).toContain("/supplier-purchase-order/")
  return new URL(value, page.url()).toString()
}

async function openPublic(browser: Browser, url: string) {
  const context = await browser.newContext({ locale: "en-US" })
  const page = await context.newPage()
  await page.goto(url)
  return { context, page }
}

async function reviewProposal(
  buyerPage: Page,
  proposalLabel: string,
  decision: "ACCEPT" | "REJECT",
  reason: string,
) {
  await buyerPage.reload()
  const card = buyerPage.locator("article").filter({ hasText: proposalLabel }).last()
  await expect(card).toBeVisible()
  await card.locator("textarea").fill(reason)
  refreshBuyerAssurance()
  await card.getByTestId(
    decision === "ACCEPT"
      ? "buyer-accept-supplier-proposal"
      : "buyer-reject-supplier-proposal",
  ).click()
  await expect(buyerPage.getByRole("status")).toContainText("Buyer decision recorded")
  await buyerPage.reload()
  const reviewed = buyerPage.locator("article").filter({ hasText: proposalLabel }).last()
  await expect(reviewed.getByTestId("buyer-proposal-status")).toContainText(
    decision === "ACCEPT" ? "accepted" : "rejected",
  )
}

test("certifies the invite-only supplier acknowledgement proposal boundary", async ({ page, browser }) => {
  const data = fixture()
  const prisma = new PrismaClient()
  const evidence = {
    runId: data.runId,
    startedAt: new Date().toISOString(),
    flow: [] as string[],
    checks: {} as Record<string, unknown>,
  }
  mkdirSync(data.evidenceDir, { recursive: true })

  try {
    const before = await authoritativeFingerprint(prisma, data)
    const countsBefore = await evidenceCounts(prisma, data)
    const workbenchUrl = `/en/dashboard/purchase-orders/${data.purchaseOrderId}/supplier-acknowledgement`
    await page.goto(workbenchUrl)
    await expect(page.getByTestId("supplier-po-buyer-workbench")).toBeVisible()
    await expect(page.getByTestId("buyer-authoritative-boundary")).toContainText("remain authoritative")
    evidence.flow.push("protected buyer workbench loaded")

    const changeInvitation = await issueInvitation(page)
    const englishInvitation = changeInvitation.replace("/fr/supplier-purchase-order/", "/en/supplier-purchase-order/")
    const changeAccess = await openPublic(browser, englishInvitation)
    await expect(changeAccess.page.getByTestId("supplier-po-order-number")).toContainText(data.orderNumber)
    await expect(changeAccess.page.getByTestId("proposal-boundary")).toContainText("does not change")
    await expect(changeAccess.page.locator("body")).not.toContainText("PRIVATE INTERNAL APPROVAL NOTE")
    await expect(changeAccess.page.locator("body")).not.toContainText("PRIVATE SUPPLIER ADDRESS")
    await changeAccess.page.screenshot({ path: resolve(data.evidenceDir, "01-redacted-envelope-en.png"), fullPage: true })

    const frenchUrl = englishInvitation.replace("/en/supplier-purchase-order/", "/fr/supplier-purchase-order/")
    await changeAccess.page.goto(frenchUrl)
    await expect(changeAccess.page.getByTestId("supplier-po-order-number")).toContainText("Bon de commande")
    await expect(changeAccess.page.getByTestId("proposal-boundary")).toContainText("ne modifie")
    await changeAccess.page.getByTestId("proposal-type-request_change").click()
    const requestedDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    await changeAccess.page.locator('input[type="date"]').fill(requestedDate)
    await changeAccess.page.locator('input[type="number"]').first().fill("12")
    await changeAccess.page.locator("#supplier-note").fill("Livraison décalée et quantité portée à douze unités.")
    await changeAccess.page.getByTestId("submit-supplier-po-proposal").click()
    await expect(changeAccess.page.getByTestId("supplier-po-proposal-recorded")).toBeVisible()
    await expect(changeAccess.page.getByTestId("supplier-po-proposal-status")).toContainText("En attente")
    await changeAccess.page.screenshot({ path: resolve(data.evidenceDir, "02-change-request-fr.png"), fullPage: true })
    evidence.flow.push("French date and quantity change proposal submitted")

    await reviewProposal(page, "Request date or quantity changes", "ACCEPT", "Accepted for procurement planning; no PO mutation is authorized here.")
    await page.screenshot({ path: resolve(data.evidenceDir, "03-buyer-accepted-change-proposal.png"), fullPage: true })
    await changeAccess.page.reload()
    await expect(changeAccess.page.getByTestId("supplier-po-proposal-status")).toContainText("acceptée")
    evidence.flow.push("buyer explicitly accepted change proposal")

    const acceptInvitation = await issueInvitation(page)
    const acceptAccess = await openPublic(browser, acceptInvitation)
    await acceptAccess.page.getByTestId("proposal-type-accept").click()
    await acceptAccess.page.getByTestId("submit-supplier-po-proposal").click()
    await expect(acceptAccess.page.getByTestId("supplier-po-proposal-recorded")).toBeVisible()
    await reviewProposal(page, "Accept as ordered", "ACCEPT", "Supplier acceptance reviewed and recorded as evidence only.")
    evidence.flow.push("supplier acceptance and buyer acceptance certified")

    const rejectInvitation = await issueInvitation(page)
    const rejectAccess = await openPublic(browser, rejectInvitation)
    await rejectAccess.page.getByTestId("proposal-type-reject").click()
    await rejectAccess.page.locator("#supplier-note").fill("Capacity is unavailable for the requested delivery window.")
    await rejectAccess.page.getByTestId("submit-supplier-po-proposal").click()
    await expect(rejectAccess.page.getByTestId("supplier-po-proposal-recorded")).toBeVisible()
    await reviewProposal(page, "Reject order", "REJECT", "Buyer rejects this proposal; internal PO remains authoritative.")
    evidence.flow.push("supplier rejection and explicit buyer rejection certified")

    const token = new URL(changeInvitation).searchParams.get("token")!
    const invalidToken = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a")
    const invalidUrl = englishInvitation.replace(encodeURIComponent(token), encodeURIComponent(invalidToken))
    const invalidAccess = await openPublic(browser, invalidUrl)
    await expect(invalidAccess.page.getByTestId("supplier-po-access-unavailable")).toBeVisible()
    await expect(invalidAccess.page.getByRole("heading", { name: "Access unavailable" })).toBeVisible()
    const invalidApi = await invalidAccess.context.request.get(invalidUrl.replace(/\/(?:en|fr)\/supplier-purchase-order\/([^?]+)/, "/api/supplier-po-envelopes/$1"))
    expect(invalidApi.status()).toBe(404)
    await invalidAccess.page.screenshot({ path: resolve(data.evidenceDir, "04-invalid-access.png"), fullPage: true })
    evidence.flow.push("tampered signed access denied without disclosure")

    await page.reload()
    const rejectToken = new URL(rejectInvitation).searchParams.get("token")!
    const rejectHashPrefix = createHash("sha256").update(rejectToken).digest("hex").slice(0, 12)
    const tokenRow = page.locator('[data-testid^="supplier-po-token-"]').filter({ hasText: rejectHashPrefix })
    await expect(tokenRow).toBeVisible()
    await tokenRow.getByLabel("Revocation reason").fill("Supplier access closed after completed review.")
    refreshBuyerAssurance()
    await tokenRow.getByRole("button", { name: "Revoke access" }).click()
    await expect(page.getByRole("status")).toContainText("invitation access revoked")
    await rejectAccess.page.reload()
    await expect(rejectAccess.page.getByTestId("supplier-po-access-unavailable")).toBeVisible()
    const revokedApiUrl = rejectInvitation.replace(/\/(?:en|fr)\/supplier-purchase-order\/([^?]+)/, "/api/supplier-po-envelopes/$1")
    const revokedApi = await rejectAccess.context.request.get(revokedApiUrl)
    expect(revokedApi.status()).toBe(404)
    await rejectAccess.page.screenshot({ path: resolve(data.evidenceDir, "05-revoked-access.png"), fullPage: true })
    evidence.flow.push("revoked access denied with the same public state")

    const proposal = await prisma.supplierPoProposal.findFirstOrThrow({
      where: { organizationId: data.organizationId, envelope: { purchaseOrderId: data.purchaseOrderId } },
      include: { states: { orderBy: { version: "asc" } } },
    })
    await expect(
      prisma.supplierPoProposal.update({ where: { id: proposal.id }, data: { supplierNote: "mutation must fail" } }),
    ).rejects.toThrow(/append-only/i)
    await expect(
      prisma.supplierPoProposalState.update({ where: { id: proposal.states[0].id }, data: { reason: "mutation must fail" } }),
    ).rejects.toThrow(/append-only/i)
    evidence.flow.push("database rejected proposal and state mutation")

    const after = await authoritativeFingerprint(prisma, data)
    expect(after).toEqual(before)
    const countsAfter = await evidenceCounts(prisma, data)
    expect(countsAfter).toEqual({
      envelopeCount: 1,
      tokenCount: countsBefore.tokenCount + 3,
      proposalCount: countsBefore.proposalCount + 3,
      stateCount: countsBefore.stateCount + 6,
    })
    evidence.checks = {
      bilingualUi: "passed",
      redaction: "passed",
      signedInvalidAccess: "passed",
      revokedAccess: "passed",
      supplierChoices: ["ACCEPT", "REJECT", "REQUEST_CHANGE"],
      buyerDecisions: ["BUYER_ACCEPTED", "BUYER_REJECTED"],
      immutableDatabaseGuards: "passed",
      authoritativeFingerprintUnchanged: before,
      evidenceCounts: { before: countsBefore, after: countsAfter },
    }
    evidence.flow.push("PO, stock, AP, and accounting fingerprints unchanged")
    writeFileSync(
      resolve(data.evidenceDir, "supplier-po-acknowledgement-certification.json"),
      JSON.stringify({ ...evidence, completedAt: new Date().toISOString(), status: "passed" }, null, 2) + "\n",
    )

    await Promise.all([
      changeAccess.context.close(),
      acceptAccess.context.close(),
      rejectAccess.context.close(),
      invalidAccess.context.close(),
    ])
  } finally {
    await prisma.$disconnect()
  }
})
