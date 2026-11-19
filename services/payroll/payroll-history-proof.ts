import { Prisma } from "@prisma/client";
import { ApplicationError } from "@/services/_shared/action-errors";
import { hashBusinessPayload } from "@/services/events/business-event.service";

// Version-2 observation integrity, not a definition of statutory history membership.
// Preserve the calculator's existing fiscal-year and strictly-earlier-pay-date policy.
export const HISTORY_AMOUNT_KEYS = [
  "grossAmount", "taxableBaseAmount", "socialBaseAmount",
  "employeePensionContributionAmount", "employerPensionContributionAmount",
  "familyAllowanceContributionAmount", "occupationalRiskContributionAmount",
  "incomeTaxWithholdingAmount", "overtimePremiumAmount", "payrollRubriqueGrossAmount",
  "payrollRubriqueTaxableBaseAmount", "payrollRubriqueSocialBaseAmount",
  "payrollRubriqueEmployeeDeductionAmount", "payrollRubriqueEmployerChargeAmount",
  "employeeDeductionAmount", "employerChargeAmount", "netPayableAmount",
] as const;
const STORED_AMOUNT_KEYS = new Set<string>([
  "grossAmount", "taxableBaseAmount", "socialBaseAmount", "employeeDeductionAmount",
  "employerChargeAmount", "netPayableAmount",
]);
const AMOUNT_KEYS = [...HISTORY_AMOUNT_KEYS, "statutoryPayableAmount"];
type RecordValue = Record<string, unknown>;
export type HistoryLine = {
  id: string; organizationId: string; payrollRunId: string; employeeId: string;
  currency: string; documentHash: string | null; calculationSnapshot: unknown;
} & Partial<Record<(typeof HISTORY_AMOUNT_KEYS)[number], Prisma.Decimal.Value>>;
export type HistoryRun = {
  id: string; organizationId: string; payrollPeriodId: string; runType: string;
  status: string; currency: string; documentHash: string | null; metadata: unknown;
  payrollPeriod: { payDate: Date }; lines: HistoryLine[];
};
const record = (value: unknown): RecordValue | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
const hash = (value: unknown) => `sha256:${hashBusinessPayload(value)}`;
const validHash = (value: unknown) => typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
function reject(reason: string, stale = false): never {
  throw new ApplicationError(stale ? "CONFLICT" : "PAYROLL_TRANSITION_EVIDENCE_MISSING",
    stale ? "Payroll history changed after calculation. Recalculate and obtain a new independent review."
      : "Payroll history evidence is incomplete or inconsistent. Recalculate from supported source records.",
    409, true, { domain: "payroll_history_proof", reason });
}
function amount(value: unknown): Prisma.Decimal {
  if (value == null || (typeof value === "string" && !value.trim())) reject("AMOUNT_MISSING");
  try {
    const result = new Prisma.Decimal(value as Prisma.Decimal.Value);
    if (!result.isFinite()) reject("AMOUNT_NONFINITE");
    return result.toDecimalPlaces(2);
  } catch (error) { if (error instanceof ApplicationError) throw error; return reject("AMOUNT_INVALID"); }
}
const date = (value: unknown) => {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) reject("DATE_INVALID");
  return new Date(value as string);
};
const utcDay = (value: Date) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())).toISOString();
export function hasPayrollHistoryV2Evidence(run: Pick<HistoryRun, "metadata" | "lines">) {
  if (Object.prototype.hasOwnProperty.call(record(run.metadata) ?? {}, "yearToDateProofVersion")) return true;
  return (run.lines ?? []).some(line => {
    const proof = record(record(line.calculationSnapshot)?.yearToDateProof);
    return proof && (proof.version === 2 || "priorLineEvidence" in proof || "observedHistoryHash" in proof);
  });
}
function snapshotAmounts(line: HistoryLine, allowBlockedCurrentTax = false) {
  const snapshot = record(line.calculationSnapshot);
  if (!snapshot || !validHash(line.documentHash) || hash(snapshot) !== line.documentHash) reject("LINE_SNAPSHOT_HASH_INVALID");
  const mapping = record(snapshot.componentMapping);
  // The calculator explicitly retains null tax on review-only ordinary snapshots.
  // Match its existing zero accumulator placeholder; this grants no production admission.
  const blockedTaxPlaceholder = allowBlockedCurrentTax && snapshot.incomeTaxWithholdingAmount === null
    && snapshot.incomeTaxApplied === false && snapshot.incomeTaxCalculationStatus === "BLOCKED_REQUIRES_EXPERT_REVIEW"
    && mapping?.incomeTaxApplied === false && mapping.incomeTaxWithholdingEnabled === false
    && mapping.reviewStatus === "BLOCKED_REQUIRES_EXPERT_REVIEW" && amount(mapping.incomeTaxWithholdingAmount).isZero();
  const values = Object.fromEntries(HISTORY_AMOUNT_KEYS.map(key => [key,
    blockedTaxPlaceholder && key === "incomeTaxWithholdingAmount" ? new Prisma.Decimal(0) : amount(snapshot[key])]));
  for (const key of HISTORY_AMOUNT_KEYS) {
    if (STORED_AMOUNT_KEYS.has(key) && !values[key].eq(amount(line[key]))) reject("LINE_AMOUNT_SNAPSHOT_MISMATCH");
  }
  values.statutoryPayableAmount = amount(record(snapshot.componentMapping)?.statutoryPayableAmount ?? snapshot.statutoryPayableAmount);
  return values;
}
function observation(run: HistoryRun, line: HistoryLine) {
  return {
    runId: run.id, lineId: line.id, employeeId: line.employeeId, currency: line.currency,
    payDate: run.payrollPeriod.payDate.toISOString(), runStatus: run.status,
    runDocumentHash: run.documentHash, lineDocumentHash: line.documentHash,
    calculationSnapshotHash: hash(line.calculationSnapshot),
    recordedLineAmounts: Object.fromEntries(HISTORY_AMOUNT_KEYS.map(key => [key,
      STORED_AMOUNT_KEYS.has(key) ? amount(line[key]).toString() : null])),
  };
}

/** Pure validation over the exact database observation selected by the adapter. */
export function validatePayrollHistoryProof(run: HistoryRun, priorRuns: HistoryRun[]) {
  if (!hasPayrollHistoryV2Evidence(run)) return { legacyOnly: true, proofCount: 0 };
  const metadata = record(run.metadata) ?? {};
  if (metadata.yearToDateProofVersion !== undefined && metadata.yearToDateProofVersion !== 2) reject("PROOF_VERSION_INVALID");
  if (!run.lines?.length) reject("RUN_LINES_MISSING");
  const employeeIds = new Set(run.lines.map(line => line.employeeId));
  if (employeeIds.size !== run.lines.length) reject("CURRENT_EMPLOYEE_DUPLICATE");
  const policy = record(metadata.yearToDatePolicy);
  if (!policy) reject("POLICY_MISSING");
  const { ytdPolicyHash, ...policyPayload } = policy;
  if (!validHash(ytdPolicyHash) || hash(policyPayload) !== ytdPolicyHash || metadata.yearToDatePolicyHash !== ytdPolicyHash) reject("POLICY_HASH_INVALID");
  const start = date(policy.periodStart), payDate = run.payrollPeriod.payDate;
  if (start > payDate || policy.periodEnd !== utcDay(payDate)) reject("POLICY_SCOPE_INVALID");
  const seenRuns = new Set<string>(), seenLines = new Set<string>();
  const prior = new Map<string, Array<{ run: HistoryRun; line: HistoryLine; amounts: ReturnType<typeof snapshotAmounts> }>>();
  for (const source of priorRuns) {
    if (seenRuns.has(source.id) || source.id === run.id) reject("PRIOR_RUN_DUPLICATE");
    seenRuns.add(source.id);
    if (source.organizationId !== run.organizationId || source.currency !== run.currency || !["POSTED", "PAID"].includes(source.status)
      || source.payrollPeriod.payDate < start || source.payrollPeriod.payDate >= payDate || !validHash(source.documentHash)) reject("PRIOR_RUN_SCOPE_INVALID");
    for (const line of source.lines) {
      if (seenLines.has(line.id)) reject("PRIOR_LINE_DUPLICATE");
      seenLines.add(line.id);
      if (line.organizationId !== run.organizationId || line.payrollRunId !== source.id || !employeeIds.has(line.employeeId)
        || line.currency !== run.currency) reject("PRIOR_LINE_SCOPE_INVALID");
      const values = snapshotAmounts(line), list = prior.get(line.employeeId) ?? [];
      list.push({ run: source, line, amounts: values }); prior.set(line.employeeId, list);
    }
  }
  const hashes: string[] = [];
  for (const line of run.lines) {
    if (line.organizationId !== run.organizationId || line.payrollRunId !== run.id || line.currency !== run.currency) reject("CURRENT_LINE_SCOPE_INVALID");
    const currentAmounts = snapshotAmounts(line, run.runType !== "CORRECTION"), snapshot = record(line.calculationSnapshot)!;
    const proof = record(snapshot.yearToDateProof);
    if (!proof || proof.version !== 2 || proof.kind !== "AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_ACCUMULATOR_PROOF") reject("MIXED_OR_INVALID_PROOF_VERSION");
    const { ytdAccumulatorHash, ...payload } = proof;
    if (!validHash(ytdAccumulatorHash) || hash(payload) !== ytdAccumulatorHash || snapshot.yearToDateAccumulatorHash !== ytdAccumulatorHash) reject("ACCUMULATOR_HASH_INVALID");
    if (proof.employeeId !== line.employeeId || proof.currency !== line.currency || proof.currentPeriodId !== run.payrollPeriodId
      || proof.currentPayDate !== utcDay(payDate) || proof.correctionRun !== (run.runType === "CORRECTION")
      || proof.yearToDatePolicyHash !== ytdPolicyHash || !record(proof.policy) || hash(proof.policy) !== hash(policy)
      || snapshot.yearToDatePolicyHash !== ytdPolicyHash || !record(snapshot.yearToDatePolicy) || hash(snapshot.yearToDatePolicy) !== hash(policy)
      || proof.accumulatorBasis !== "POSTED_PAID_PRIOR_LINES_PLUS_CURRENT_EFFECTIVE_LINE") reject("PROOF_SCOPE_INVALID");
    if (proof.missingPriorCalculationSnapshotCount !== 0 || proof.missingPriorLineDocumentHashCount !== 0) reject("PRIOR_EVIDENCE_INCOMPLETE");
    if (!Array.isArray(proof.priorLineEvidence) || hash(proof.priorLineEvidence) !== proof.observedHistoryHash) reject("OBSERVED_HISTORY_HASH_INVALID");
    const sources = (prior.get(line.employeeId) ?? []).sort((a,b) =>
      a.run.payrollPeriod.payDate.toISOString().localeCompare(b.run.payrollPeriod.payDate.toISOString()) || a.run.id.localeCompare(b.run.id) || a.line.id.localeCompare(b.line.id));
    const observed = sources.map(source => observation(source.run, source.line));
    if (hash(observed) !== proof.observedHistoryHash) reject("OBSERVED_HISTORY_CHANGED", true);
    if (proof.priorLineCount !== sources.length || !Array.isArray(proof.priorRunIds) || !Array.isArray(proof.priorRunDocumentHashes) || !Array.isArray(proof.priorRunLineDocumentHashes)
      || hash(proof.priorRunIds) !== hash([...new Set(sources.map(source=>source.run.id))].sort())
      || hash(proof.priorRunDocumentHashes) !== hash([...new Set(sources.map(source=>source.run.documentHash))].sort())
      || hash(proof.priorRunLineDocumentHashes) !== hash(sources.map(source=>source.line.documentHash).sort())) reject("PRIOR_SUMMARY_INVALID");
    const priorAmounts = record(proof.priorAmounts), retainedCurrent = record(proof.currentAmounts), ytdAmounts = record(proof.yearToDateAmounts);
    if (!priorAmounts || !retainedCurrent || !ytdAmounts) reject("ACCUMULATOR_AMOUNTS_MISSING");
    for (const key of AMOUNT_KEYS) {
      const sum = sources.reduce((total, source) => total.plus(source.amounts[key]).toDecimalPlaces(2), new Prisma.Decimal(0));
      if (!sum.eq(amount(priorAmounts[key])) || !currentAmounts[key].eq(amount(retainedCurrent[key]))
        || !sum.plus(currentAmounts[key]).toDecimalPlaces(2).eq(amount(ytdAmounts[key]))) reject("ACCUMULATOR_AMOUNTS_INVALID");
    }
    hashes.push(ytdAccumulatorHash as string);
  }
  if (!Array.isArray(metadata.yearToDateAccumulatorHashes) || hash([...metadata.yearToDateAccumulatorHashes].sort()) !== hash(hashes.sort())) reject("RUN_ACCUMULATOR_BINDING_INVALID");
  return { legacyOnly: false, proofCount: hashes.length };
}

/** Must run within the lifecycle caller's transaction, before any new transition. */
export async function assertPayrollHistoryCurrent(tx: Prisma.TransactionClient, organizationId: string, payrollRunId: string, loadedRun?: HistoryRun) {
  const current = loadedRun ?? await tx.payrollRun.findFirst({ where: { id: payrollRunId, organizationId, deletedAt: null },
    include: { payrollPeriod: { select: { payDate: true } }, lines: true } });
  if (!current) reject("RUN_MISSING");
  const run = current as HistoryRun;
  if (!hasPayrollHistoryV2Evidence(run)) return { legacyOnly: true, proofCount: 0 };
  if (run.id !== payrollRunId || run.organizationId !== organizationId) reject("RUN_SCOPE_INVALID");
  const policy = record(record(run.metadata)?.yearToDatePolicy);
  const start = date(policy?.periodStart);
  const employees = run.lines.map(line => line.employeeId);
  const priorRuns = await tx.payrollRun.findMany({ where: { organizationId, deletedAt: null,
    status: { in: ["POSTED", "PAID"] }, payrollPeriod: { payDate: { gte: start, lt: run.payrollPeriod.payDate } },
    lines: { some: { employeeId: { in: employees } } } }, include: {
      payrollPeriod: { select: { payDate: true } }, lines: { where: { employeeId: { in: employees } }, orderBy: { createdAt: "asc" } },
    }, orderBy: { createdAt: "asc" } });
  return validatePayrollHistoryProof(run, priorRuns as HistoryRun[]);
}
