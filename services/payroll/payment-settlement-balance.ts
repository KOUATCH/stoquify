import { Prisma } from "@prisma/client";
import { BusinessRuleError } from "@/services/_shared/action-errors";

export type SettlementBalance = {
  version: 1;
  sequence: number;
  previousEventId: string | null;
  currency: string;
  batchAmount: string;
  settlementAmount: string;
  cumulativeSettledAmount: string;
  remainingAmount: string;
};

export type SettlementBalanceEvent = {
  id: string;
  organizationId: string;
  sourceId: string | null;
  status: string;
  payload: unknown;
};

export function settlementMoney(value: unknown): Prisma.Decimal {
  try {
    if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Prisma.Decimal)) throw new Error();
    const amount = new Prisma.Decimal(value);
    if (!amount.isFinite() || amount.lt(0) || amount.decimalPlaces() > 2) throw new Error();
    return amount;
  } catch {
    throw new BusinessRuleError("Settlement amounts must be finite, non-negative values with at most two decimal places.");
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

// Read the complete applied-event chain. Legacy events lacking amounts cannot
// establish a balance; never infer their missing value from the batch status.
export function resolveSettlementBalance(
  batch: { id: string; organizationId: string; currency: string; amount: Prisma.Decimal; status: string },
  events: SettlementBalanceEvent[],
): { settled: Prisma.Decimal; remaining: Prisma.Decimal; sequence: number; previousEventId: string | null } | null {
  try {
    const total = settlementMoney(batch.amount);
    if (total.lte(0)) return null;
    let settled = new Prisma.Decimal(0), previousEventId: string | null = null;
    const sorted = events.map(event => ({event, balance: record(record(event.payload).settlementBalance)}))
      .sort((a,b) => Number(a.balance.sequence) - Number(b.balance.sequence));
    for (const [index, {event, balance}] of sorted.entries()) {
      const payload = record(event.payload);
      if (event.organizationId !== batch.organizationId || event.sourceId !== batch.id || event.status !== "APPLIED" ||
          payload.payrollPaymentBatchId !== batch.id || balance.version !== 1 || balance.sequence !== index + 1 ||
          balance.previousEventId !== previousEventId || balance.currency !== batch.currency ||
          !settlementMoney(balance.batchAmount).eq(total)) return null;
      const delta = settlementMoney(balance.settlementAmount);
      if (delta.lte(0)) return null;
      settled = settled.plus(delta);
      const remaining = total.minus(settled);
      if (remaining.lt(0) || !settlementMoney(balance.cumulativeSettledAmount).eq(settled) ||
          !settlementMoney(balance.remainingAmount).eq(remaining) ||
          payload.nextStatus !== (remaining.isZero() ? "SETTLED" : "PARTIALLY_SETTLED")) return null;
      previousEventId = event.id;
    }
    const expectedStatus = !events.length ? "RELEASED" : settled.eq(total) ? "SETTLED" : "PARTIALLY_SETTLED";
    if (batch.status !== expectedStatus) return null;
    return {settled, remaining: total.minus(settled), sequence: events.length, previousEventId};
  } catch { return null; }
}

export function nextSettlementBalance(
  batch: { currency: string; amount: Prisma.Decimal },
  previous: NonNullable<ReturnType<typeof resolveSettlementBalance>>,
  amount: unknown,
  status: "settled" | "partially_settled",
): SettlementBalance {
  if (amount === undefined && status === "partially_settled") throw new BusinessRuleError("A partial settlement requires the amount settled by this evidence.");
  const delta = settlementMoney(amount === undefined ? previous.remaining : amount);
  const remaining = previous.remaining.minus(delta);
  if (delta.lte(0) || remaining.lt(0)) throw new BusinessRuleError("Settlement amount must be positive and cannot exceed the remaining payroll obligation.");
  if ((status === "settled") !== remaining.isZero()) throw new BusinessRuleError("Settlement status must agree with the remaining payroll obligation.");
  return {version:1, sequence:previous.sequence+1, previousEventId:previous.previousEventId, currency:batch.currency,
    batchAmount:batch.amount.toFixed(2), settlementAmount:delta.toFixed(2), cumulativeSettledAmount:previous.settled.plus(delta).toFixed(2), remainingAmount:remaining.toFixed(2)};
}
