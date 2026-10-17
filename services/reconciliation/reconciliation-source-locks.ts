import "server-only"
import { Prisma } from "@prisma/client"
import { NotFoundError } from "@/services/_shared/action-errors"

export async function lockReconciliationProviderInTx(
  tx: Prisma.TransactionClient, organizationId: string, providerAccountId: string,
) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT id FROM provider_accounts WHERE id = ${providerAccountId}
    AND "organizationId" = ${organizationId} FOR UPDATE`)
  if (rows.length !== 1) throw new NotFoundError("Provider account not found")
}

/** Acquire after the provider (and existing run, if any), before reading sources.
 * Serializable transactions retain their snapshot while waiting for a provider.
 * A row lock makes a payment changed since that snapshot abort with 40001;
 * otherwise a withdrawn supplier payment could still be matched from old data.
 */
export async function lockReconciliationPaymentSourcesInTx(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; providerAccountId: string } & (
    { paymentTransactionId: string } | { periodStart: Date; periodEnd: Date }
  ),
) {
  const selection = "paymentTransactionId" in input
    ? Prisma.sql`AND id = ${input.paymentTransactionId}`
    : Prisma.sql`AND state IN ('CONFIRMED', 'SETTLED')
        AND "occurredAt" >= ${input.periodStart} AND "occurredAt" < ${input.periodEnd}`
  await tx.$queryRaw(Prisma.sql`
    SELECT id FROM payment_transactions WHERE "organizationId" = ${input.organizationId}
    AND "providerAccountId" = ${input.providerAccountId} ${selection}
    ORDER BY id FOR SHARE`)
}
