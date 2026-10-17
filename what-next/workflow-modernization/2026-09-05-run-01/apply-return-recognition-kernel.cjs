const fs = require('node:fs'), assert = require('node:assert/strict');
const file = 'services/purchasing/ap-control.service.ts';
let text = fs.readFileSync(file, 'utf8');
const newline = text.includes('\r\n') ? '\r\n' : '\n';
function replace(from, to) { from = from.replace(/\n/g, newline); to = to.replace(/\n/g, newline); assert.equal(text.split(from).length, 2, from); text = text.replace(from, to); }
replace('  if (input.sourceType === AccountingSourceType.SUPPLIER_INVOICE && input.conditionContext?.receiptRecognition === "ACCRUAL") {', `  if (input.sourceType === AccountingSourceType.PURCHASE_RETURN) {
    const zero = new Prisma.Decimal(0), cost = input.amounts.costAmount ?? zero
    const grni = input.amounts.varianceAmount ?? zero
    const expected = new Map([
      ["INVENTORY", { debit: zero, credit: cost }],
      ["SUPPLIER_RETURN_CLAIM", { debit: input.amounts.netAmount, credit: zero }],
      ["GRNI", { debit: grni, credit: zero }],
    ])
    const matches = input.postingPurpose === AccountingPostingPurpose.PURCHASE_RETURN &&
      input.conditionContext?.receiptReturnRecognition === "VERIFIED" &&
      typeof input.conditionContext.receiptReturnRecognitionHash === "string" &&
      input.conditionContext.receiptReturnRecognitionHash.length > 0 &&
      cost.gt(0) && input.amounts.netAmount.gte(0) && grni.gte(0) &&
      input.amounts.sourceAmount.eq(cost) && input.amounts.grossAmount.eq(cost) &&
      input.amounts.netAmount.plus(grni).eq(cost) && input.amounts.taxAmount.eq(0) &&
      postingLines.every(line => !!line.resolvedMappingKey && expected.has(line.resolvedMappingKey)) &&
      [...expected].every(([key, amount]) => {
        const lines = postingLines.filter(line => line.resolvedMappingKey === key)
        return lines.reduce((sum, line) => sum.plus(line.debit), zero).eq(amount.debit) &&
          lines.reduce((sum, line) => sum.plus(line.credit), zero).eq(amount.credit)
      })
    if (!matches) {
      const blockerCode = "PURCHASE_RETURN_RECOGNITION_RULE_REVIEW"
      const message = "Return rules must release only verified inventory cost, supplier claims and goods-received accruals. Review the source allocation and resolved accounts."
      const ledgerBatch = await createLedgerBlocker(tx, {
        organizationId: input.organizationId, periodId: input.periodId, sourceType: input.sourceType,
        sourceId: input.sourceId, postingPurpose: input.postingPurpose, actorId: input.actorId,
        documentHash: input.documentHash, blockerCode, message,
        metadata: safeJson({ ...input.metadata, postingRuleId: rule.id, postingRuleCode: rule.code }),
      })
      return { ledgerBatch, ledgerStatus: "BLOCKED_PENDING_RULES", blockerCode, blockerMessage: message }
    }
  }

  if (input.sourceType === AccountingSourceType.SUPPLIER_INVOICE && input.conditionContext?.receiptRecognition === "ACCRUAL") {`);
replace('  varianceAmount?: Prisma.Decimal.Value\n  metadata: Record<string, unknown>\n}', '  varianceAmount?: Prisma.Decimal.Value\n  metadata: Record<string, unknown>\n  sourceReviewBlocker?: { code: string; message: string }\n  receiptReturnRecognitionHash?: string\n}');
replace('  const isReturn = input.sourceType === AccountingSourceType.PURCHASE_RETURN\n\n  return createAPLedgerPosting(tx, {', `  const isReturn = input.sourceType === AccountingSourceType.PURCHASE_RETURN

  if (isReturn && (input.sourceReviewBlocker || !input.receiptReturnRecognitionHash)) {
    const blockerCode = input.sourceReviewBlocker?.code ?? "PURCHASE_RETURN_SOURCE_REVIEW"
    const blockerMessage = input.sourceReviewBlocker?.message ?? "Verify the original inventory recognition and exact return allocation before accounting release."
    const ledgerBatch = await createLedgerBlocker(tx, {
      organizationId: input.organizationId, periodId: period.id, sourceType: input.sourceType,
      sourceId: input.sourceId, postingPurpose: AccountingPostingPurpose.PURCHASE_RETURN,
      actorId: input.actorId, documentHash: input.documentHash, blockerCode, message: blockerMessage,
      metadata: safeJson(input.metadata),
    })
    return { ledgerBatch, ledgerStatus: "BLOCKED_PENDING_RULES", blockerCode, blockerMessage }
  }

  return createAPLedgerPosting(tx, {`);
replace('    conditionContext: { correctionDirection: "CORRECTION" },', `    conditionContext: { correctionDirection: "CORRECTION", ...(isReturn ? {
      receiptReturnRecognition: "VERIFIED", receiptReturnRecognitionHash: input.receiptReturnRecognitionHash,
    } : {}) },`);
const fd = fs.openSync(file, 'r+');
try { fs.writeFileSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); } finally { fs.closeSync(fd); }
console.log('Applied source-bound return accounting kernel and explicit review blocker');
