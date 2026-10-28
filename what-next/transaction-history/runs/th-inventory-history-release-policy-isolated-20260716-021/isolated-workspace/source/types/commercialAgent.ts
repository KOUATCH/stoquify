import {
  CommercialAgentStatus,
  AgentTransactionStatus,
  AgentTransactionType,
  PaymentMethod
} from "@prisma/client";

// Base Types
export interface CommercialAgent {
  id: string;
  agentCode: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  employeeId?: string;
  commissionRate: number;
  creditLimit: number;
  currentBalance: number;
  status: CommercialAgentStatus;
  notes?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentTransaction {
  id: string;
  transactionNumber: string;
  agentId: string;
  type: AgentTransactionType;
  status: AgentTransactionStatus;

  // Transaction Details
  dispatchDate: Date;
  expectedReturnDate?: Date;
  actualReturnDate?: Date;

  // Financial Summary
  totalDispatchValue: number;
  totalSalesValue: number;
  totalReturnValue: number;
  commissionAmount: number;
  amountDue: number;

  // Quantities
  totalQuantityDispatched: number;
  totalQuantitySold: number;
  totalQuantityReturned: number;

  notes?: string;
  organizationId: string;
  locationId?: string;
  createdById?: string;
  reconciledById?: string;
  reconciledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentTransactionLine {
  id: string;
  transactionId: string;
  itemId: string;

  // Item Details
  itemName: string;
  itemSku: string;
  costPrice: number;
  sellingPrice: number;

  // Dispatch Quantities
  quantityDispatched: number;
  quantitySold: number;
  quantityReturned: number;

  // Financial Calculations
  dispatchValue: number;
  salesValue: number;
  returnValue: number;
  profit: number;
  commission: number;

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentSettlement {
  id: string;
  settlementNumber: string;
  agentId: string;
  transactionId: string;

  // Settlement Details
  settlementDate: Date;
  totalAmountDue: number;
  paidAmount: number;
  outstandingAmount: number;
  discountGiven: number;

  // Payment Details
  paymentMethod?: PaymentMethod;
  paymentReference?: string;

  notes?: string;
  organizationId: string;
  processedById?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Extended Types with Relations
export interface AgentTransactionWithLines extends AgentTransaction {
  agent: CommercialAgent;
  transactionLines: (AgentTransactionLine & {
    item: {
      id: string;
      name: string;
      sku: string;
      costPrice: number;
      sellingPrice: number;
    };
  })[];
  settlement?: AgentSettlement;
  createdBy?: {
    id: string;
    name: string;
  };
  reconciledBy?: {
    id: string;
    name: string;
  };
}

export interface CommercialAgentWithStats extends CommercialAgent {
  employee?: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    transactions: number;
    settlements: number;
  };
  totalSales: number;
  totalCommission: number;
  pendingAmount: number;
}

// Form Types
export interface CreateCommercialAgentData {
  agentCode: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  employeeId?: string;
  commissionRate: number;
  creditLimit: number;
  notes?: string;
}

export interface UpdateCommercialAgentData extends Partial<CreateCommercialAgentData> {
  status?: CommercialAgentStatus;
}

export interface CreateAgentTransactionData {
  agentId: string;
  expectedReturnDate?: Date;
  locationId?: string;
  notes?: string;
  transactionLines: CreateAgentTransactionLineData[];
}

export interface CreateAgentTransactionLineData {
  itemId: string;
  quantityDispatched: number;
  sellingPrice?: number; // Optional, defaults to item's selling price
}

export interface ReconcileAgentTransactionData {
  transactionId: string;
  actualReturnDate?: Date;
  transactionLines: ReconcileTransactionLineData[];
  notes?: string;
}

export interface ReconcileTransactionLineData {
  lineId: string;
  quantitySold: number;
  quantityReturned: number;
  actualSellingPrice?: number;
}

export interface CreateAgentSettlementData {
  transactionId: string;
  paidAmount: number;
  discountGiven?: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  notes?: string;
}

// Analytics Types
export interface AgentPerformanceMetrics {
  agentId: string;
  agentName: string;
  totalTransactions: number;
  totalDispatchValue: number;
  totalSalesValue: number;
  totalReturnValue: number;
  salesEfficiency: number; // percentage of goods sold vs dispatched
  averageCommission: number;
  outstandingBalance: number;
}

export interface AgentTransactionSummary {
  beginningStock: {
    totalQuantity: number;
    totalValue: number;
  };
  finalStock: {
    totalQuantity: number;
    totalValue: number;
  };
  amountSold: {
    totalQuantity: number;
    totalValue: number;
  };
  costOfGoodsSold: number;
  totalMoneyToBePaid: number;
  commissionEarned: number;
  netAmountDue: number;
}

// Filter and Search Types
export interface AgentTransactionFilters {
  agentId?: string;
  status?: AgentTransactionStatus;
  startDate?: Date;
  endDate?: Date;
  locationId?: string;
}

export interface CommercialAgentFilters {
  status?: CommercialAgentStatus;
  search?: string; // search by name, code, email, phone
}