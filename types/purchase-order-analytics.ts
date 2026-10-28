export type PurchaseOrderAnalyticsStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "COMPLETED"
  | "CANCELLED"

export type PurchaseOrderAnalyticsExceptionType =
  | "OVERDUE"
  | "APPROVAL_WAIT"
  | "RECEIPT_WAIT"
  | "PARTIAL_RECEIPT"

export type PurchaseOrderAnalyticsException = {
  id: string
  orderNumber: string
  supplierName: string
  locationName: string
  status: PurchaseOrderAnalyticsStatus
  issue: PurchaseOrderAnalyticsExceptionType
  risk: "high" | "medium"
  orderDate: string
  expectedDeliveryDate: string | null
  daysOpen: number
  daysOverdue: number
  totalValue: number
  openCommitmentValue: number
  receiptRate: number
}

export type PurchaseOrderAnalyticsData = {
  generatedAt: string
  currency: string
  period: {
    from: string | null
    to: string | null
  }
  totals: {
    orders: number
    activeOrders: number
    totalSpend: number
    averageOrderValue: number
    openCommitmentValue: number
    overdueOrders: number
    overdueValue: number
    orderedUnits: number
    receivedUnits: number
    receiptRate: number
    cancellationRate: number
    completionRate: number
    onTimeRate: number
    onTimeSampleSize: number
    supplierConcentrationRate: number
    approvalCycle: {
      averageHours: number
      medianHours: number
      p90Hours: number
      sampleSize: number
    }
  }
  monthly: Array<{
    month: string
    orderCount: number
    totalSpend: number
    receivedOrders: number
  }>
  statusBreakdown: Array<{
    status: PurchaseOrderAnalyticsStatus
    orders: number
    totalValue: number
  }>
  supplierPerformance: Array<{
    supplierId: string
    name: string
    code: string
    orders: number
    totalSpend: number
    openCommitmentValue: number
    overdueOrders: number
    receiptRate: number
    onTimeRate: number
    onTimeSampleSize: number
  }>
  locationPerformance: Array<{
    locationId: string
    name: string
    orders: number
    totalSpend: number
    openCommitmentValue: number
    overdueOrders: number
    receiptRate: number
  }>
  itemPerformance: Array<{
    itemId: string
    sku: string
    nameEn: string
    nameFr: string | null
    orderedUnits: number
    receivedUnits: number
    totalSpend: number
    receiptRate: number
  }>
  aging: Array<{
    bucket: "0_7" | "8_30" | "31_60" | "61_PLUS"
    orders: number
    openCommitmentValue: number
  }>
  exceptions: PurchaseOrderAnalyticsException[]
  dataQuality: {
    expectedDeliveryCoverage: number
    approvalEvidenceCoverage: number
    deliveryEvidenceCoverage: number
    expectedDeliverySampleSize: number
    approvalEvidenceSampleSize: number
    deliveryEvidenceSampleSize: number
  }
}
