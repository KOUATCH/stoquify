import {
  AccountingPostingPurpose,
  AccountingSourceType,
  PostingRuleAmountSource,
  PostingRuleLineSide,
  type Prisma,
} from "@prisma/client"

export type DefaultPostingRuleLineTemplate = {
  lineNumber: number
  side: PostingRuleLineSide
  mappingKey: string
  amountSource: PostingRuleAmountSource
  condition?: Prisma.InputJsonValue | null
  description: string
}

export type DefaultPostingRuleTemplate = {
  code: string
  nameEn: string
  nameFr: string
  descriptionEn: string
  descriptionFr: string
  sourceType: AccountingSourceType
  postingPurpose: AccountingPostingPurpose
  priority: number
  lines: DefaultPostingRuleLineTemplate[]
}

export const DEFAULT_POS_POSTING_RULES: DefaultPostingRuleTemplate[] = [
  {
    code: "POS-SALE-COMPLETION",
    nameEn: "POS sale completion",
    nameFr: "Validation vente POS",
    descriptionEn: "Recognizes completed POS sales, output VAT, and inventory cost when available.",
    descriptionFr: "Comptabilise les ventes POS validees, la TVA collectee et le cout du stock si disponible.",
    sourceType: AccountingSourceType.POS_SALE,
    postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
    priority: 10,
    lines: [
      {
        lineNumber: 1,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "ACCOUNTS_RECEIVABLE",
        amountSource: PostingRuleAmountSource.GROSS_AMOUNT,
        description: "Recognize customer receivable",
      },
      {
        lineNumber: 2,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "SALES_REVENUE",
        amountSource: PostingRuleAmountSource.NET_AMOUNT,
        description: "Recognize sales revenue",
      },
      {
        lineNumber: 3,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "OUTPUT_VAT",
        amountSource: PostingRuleAmountSource.TAX_AMOUNT,
        description: "Recognize output VAT",
      },
      {
        lineNumber: 4,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "COGS",
        amountSource: PostingRuleAmountSource.COST_AMOUNT,
        description: "Recognize cost of goods sold",
      },
      {
        lineNumber: 5,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "INVENTORY",
        amountSource: PostingRuleAmountSource.COST_AMOUNT,
        description: "Relieve inventory asset",
      },
    ],
  },
  {
    code: "POS-PAYMENT-RECEIPT",
    nameEn: "POS payment receipt",
    nameFr: "Encaissement POS",
    descriptionEn: "Clears customer receivables through the captured POS tender or clearing account.",
    descriptionFr: "Solde les creances clients par le moyen d'encaissement ou le compte de transit POS.",
    sourceType: AccountingSourceType.POS_PAYMENT,
    postingPurpose: AccountingPostingPurpose.PAYMENT_RECEIPT,
    priority: 10,
    lines: [
      {
        lineNumber: 1,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "CASH_ON_HAND",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "CASH" },
        description: "Receive cash tender",
      },
      {
        lineNumber: 2,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "CARD_CLEARING",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "CARD" },
        description: "Receive card tender into clearing",
      },
      {
        lineNumber: 3,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "MOBILE_MONEY_CLEARING",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "MOBILE_MONEY" },
        description: "Receive mobile money tender into clearing",
      },
      {
        lineNumber: 4,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "BANK",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "BANK_TRANSFER" },
        description: "Receive bank transfer tender",
      },
      {
        lineNumber: 5,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "CHEQUE_CLEARING",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "CHEQUE" },
        description: "Receive cheque tender into clearing",
      },
      {
        lineNumber: 6,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "STORE_CREDIT_LIABILITY",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "STORE_CREDIT" },
        description: "Apply store credit liability",
      },
      {
        lineNumber: 7,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "ACCOUNTS_RECEIVABLE",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        description: "Clear customer receivable",
      },
    ],
  },
  {
    code: "POS-REFUND",
    nameEn: "POS refund",
    nameFr: "Remboursement POS",
    descriptionEn: "Reverses POS sale revenue, output VAT, inventory cost, and the refunded tender amount.",
    descriptionFr: "Extourne le chiffre d'affaires POS, la TVA collectee, le cout du stock et le montant rembourse.",
    sourceType: AccountingSourceType.POS_REFUND,
    postingPurpose: AccountingPostingPurpose.REFUND,
    priority: 10,
    lines: [
      {
        lineNumber: 1,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "SALES_REVENUE",
        amountSource: PostingRuleAmountSource.NET_AMOUNT,
        description: "Reverse sales revenue",
      },
      {
        lineNumber: 2,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "OUTPUT_VAT",
        amountSource: PostingRuleAmountSource.TAX_AMOUNT,
        description: "Reverse output VAT",
      },
      {
        lineNumber: 3,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "INVENTORY",
        amountSource: PostingRuleAmountSource.COST_AMOUNT,
        description: "Restore inventory asset",
      },
      {
        lineNumber: 4,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "COGS",
        amountSource: PostingRuleAmountSource.COST_AMOUNT,
        description: "Reverse cost of goods sold",
      },
      {
        lineNumber: 5,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "CASH_ON_HAND",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "CASH" },
        description: "Refund cash tender",
      },
      {
        lineNumber: 6,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "CARD_CLEARING",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "CARD" },
        description: "Refund card tender from clearing",
      },
      {
        lineNumber: 7,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "MOBILE_MONEY_CLEARING",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "MOBILE_MONEY" },
        description: "Refund mobile money tender from clearing",
      },
      {
        lineNumber: 8,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "BANK",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "BANK_TRANSFER" },
        description: "Refund bank transfer tender",
      },
      {
        lineNumber: 9,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "CHEQUE_CLEARING",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "CHEQUE" },
        description: "Refund cheque tender from clearing",
      },
      {
        lineNumber: 10,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "STORE_CREDIT_LIABILITY",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "STORE_CREDIT" },
        description: "Restore store credit liability",
      },
    ],
  },
  {
    code: "POS-VOID",
    nameEn: "POS sale void",
    nameFr: "Annulation vente POS",
    descriptionEn: "Voids a completed POS sale by reversing sale recognition, inventory cost, and tender settlement.",
    descriptionFr: "Annule une vente POS validee en extournant la vente, le cout du stock et le reglement.",
    sourceType: AccountingSourceType.POS_VOID,
    postingPurpose: AccountingPostingPurpose.VOID,
    priority: 10,
    lines: [
      {
        lineNumber: 1,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "SALES_REVENUE",
        amountSource: PostingRuleAmountSource.NET_AMOUNT,
        description: "Void sales revenue",
      },
      {
        lineNumber: 2,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "OUTPUT_VAT",
        amountSource: PostingRuleAmountSource.TAX_AMOUNT,
        description: "Void output VAT",
      },
      {
        lineNumber: 3,
        side: PostingRuleLineSide.DEBIT,
        mappingKey: "INVENTORY",
        amountSource: PostingRuleAmountSource.COST_AMOUNT,
        description: "Restore inventory asset",
      },
      {
        lineNumber: 4,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "COGS",
        amountSource: PostingRuleAmountSource.COST_AMOUNT,
        description: "Void cost of goods sold",
      },
      {
        lineNumber: 5,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "CASH_ON_HAND",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "CASH" },
        description: "Void cash tender",
      },
      {
        lineNumber: 6,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "CARD_CLEARING",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "CARD" },
        description: "Void card tender from clearing",
      },
      {
        lineNumber: 7,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "MOBILE_MONEY_CLEARING",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "MOBILE_MONEY" },
        description: "Void mobile money tender from clearing",
      },
      {
        lineNumber: 8,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "BANK",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "BANK_TRANSFER" },
        description: "Void bank transfer tender",
      },
      {
        lineNumber: 9,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "CHEQUE_CLEARING",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "CHEQUE" },
        description: "Void cheque tender from clearing",
      },
      {
        lineNumber: 10,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "STORE_CREDIT_LIABILITY",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "STORE_CREDIT" },
        description: "Void store credit tender",
      },
      {
        lineNumber: 11,
        side: PostingRuleLineSide.CREDIT,
        mappingKey: "ACCOUNTS_RECEIVABLE",
        amountSource: PostingRuleAmountSource.SOURCE_AMOUNT,
        condition: { paymentMethod: "CREDIT" },
        description: "Void on-account receivable",
      },
    ],
  },
]
