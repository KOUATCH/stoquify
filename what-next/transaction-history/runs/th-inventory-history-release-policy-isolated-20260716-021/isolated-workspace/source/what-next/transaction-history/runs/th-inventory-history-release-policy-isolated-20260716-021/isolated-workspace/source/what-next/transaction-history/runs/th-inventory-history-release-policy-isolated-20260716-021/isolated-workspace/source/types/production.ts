"use client"

import {
  Item,
  Location,
  User,
  Organization
} from '@prisma/client'

// Production system enums
export enum ProductionStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  QUALITY_CHECK = 'QUALITY_CHECK',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ON_HOLD = 'ON_HOLD'
}

export enum RecipeStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export enum ProductionPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum UnitOfMeasure {
  GRAMS = 'GRAMS',
  KILOGRAMS = 'KILOGRAMS',
  POUNDS = 'POUNDS',
  OUNCES = 'OUNCES',
  LITERS = 'LITERS',
  MILLILITERS = 'MILLILITERS',
  CUPS = 'CUPS',
  TABLESPOONS = 'TABLESPOONS',
  TEASPOONS = 'TEASPOONS',
  PIECES = 'PIECES',
  DOZEN = 'DOZEN'
}

export enum CostType {
  RAW_MATERIALS = 'RAW_MATERIALS',
  LABOR = 'LABOR',
  OVERHEAD = 'OVERHEAD',
  UTILITIES = 'UTILITIES',
  PACKAGING = 'PACKAGING',
  OTHER = 'OTHER'
}

// Core production types
export interface RawMaterial extends Item {
  unitOfMeasure: UnitOfMeasure
  costPerUnit: number
  minimumStock: number
  maximumStock: number
  reorderPoint: number
  supplierInfo?: {
    supplierId: string
    supplierName: string
    leadTimeDays: number
    minimumOrderQuantity: number
  }
  nutritionalInfo?: {
    caloriesPerUnit: number
    fatPerUnit: number
    proteinPerUnit: number
    carbsPerUnit: number
  }
}

export interface Recipe {
  id: string
  name: string
  description?: string
  category: string
  servingSize: number
  servingUnit: UnitOfMeasure
  preparationTime: number // in minutes
  cookingTime: number // in minutes
  totalTime: number // in minutes
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  status: RecipeStatus
  version: number
  yields: number // how many units this recipe produces
  yieldUnit: UnitOfMeasure

  // Recipe components
  ingredients: RecipeIngredient[]
  instructions: RecipeInstruction[]

  // Costing
  totalMaterialCost: number
  laborCost: number
  overheadCost: number
  totalCost: number
  costPerUnit: number
  suggestedSellingPrice: number
  targetMarginPercentage: number

  // Nutritional info
  caloriesPerServing?: number
  nutritionalInfo?: {
    fat: number
    protein: number
    carbs: number
    fiber: number
    sugar: number
    sodium: number
  }

  // Metadata
  organizationId: string
  createdById: string
  updatedById?: string
  createdAt: Date
  updatedAt: Date

  // Relations
  createdBy?: User
  updatedBy?: User
  productionBatches?: ProductionBatch[]
}

export interface RecipeIngredient {
  id: string
  recipeId: string
  rawMaterialId: string
  quantity: number
  unitOfMeasure: UnitOfMeasure
  cost: number
  notes?: string
  isOptional: boolean

  // Relations
  recipe?: Recipe
  rawMaterial?: RawMaterial
}

export interface RecipeInstruction {
  id: string
  recipeId: string
  stepNumber: number
  instruction: string
  estimatedTime: number // in minutes
  temperature?: number
  equipment?: string
  notes?: string

  // Relations
  recipe?: Recipe
}

export interface ProductionBatch {
  id: string
  batchNumber: string
  recipeId: string
  quantityPlanned: number
  quantityProduced: number
  quantityYield: number // actual yield vs planned
  yieldPercentage: number

  status: ProductionStatus
  priority: ProductionPriority

  // Scheduling
  scheduledStartTime: Date
  scheduledEndTime: Date
  actualStartTime?: Date
  actualEndTime?: Date

  // Location and staff
  locationId: string
  assignedToId?: string
  supervisorId?: string

  // Costing
  materialCosts: ProductionCost[]
  laborCosts: ProductionCost[]
  overheadCosts: ProductionCost[]
  totalMaterialCost: number
  totalLaborCost: number
  totalOverheadCost: number
  totalCost: number
  costPerUnit: number

  // Quality control
  qualityCheckNotes?: string
  qualityScore?: number // 1-10 scale
  qualityCheckBy?: string
  qualityCheckDate?: Date

  // Notes and tracking
  productionNotes?: string
  issuesEncountered?: string
  wasteAmount?: number
  wasteReason?: string

  // Metadata
  organizationId: string
  createdById: string
  updatedById?: string
  createdAt: Date
  updatedAt: Date

  // Relations
  recipe?: Recipe
  location?: Location
  assignedTo?: User
  supervisor?: User
  createdBy?: User
  updatedBy?: User
  rawMaterialUsage?: RawMaterialUsage[]
  finishedProducts?: FinishedProduct[]
}

export interface ProductionCost {
  id: string
  productionBatchId: string
  costType: CostType
  description: string
  amount: number
  quantity?: number
  rate?: number // cost per unit/hour
  notes?: string

  // Relations
  productionBatch?: ProductionBatch
}

export interface RawMaterialUsage {
  id: string
  productionBatchId: string
  rawMaterialId: string
  quantityUsed: number
  unitCost: number
  totalCost: number
  notes?: string

  // Relations
  productionBatch?: ProductionBatch
  rawMaterial?: RawMaterial
}

export interface FinishedProduct {
  id: string
  productionBatchId: string
  itemId: string // final product item
  quantityProduced: number
  unitCost: number
  totalCost: number
  qualityGrade?: 'A' | 'B' | 'C' | 'REJECT'
  expiryDate?: Date
  batchCode?: string

  // Relations
  productionBatch?: ProductionBatch
  item?: Item
}

// Production planning and analytics
export interface ProductionPlan {
  id: string
  name: string
  planDate: Date
  status: 'DRAFT' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED'

  // Planning details
  plannedBatches: PlannedBatch[]
  totalEstimatedCost: number
  totalEstimatedRevenue: number
  estimatedProfit: number
  estimatedMargin: number

  // Capacity planning
  totalProductionTime: number
  requiredStaff: number
  equipmentUtilization: number

  // Metadata
  organizationId: string
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export interface PlannedBatch {
  id: string
  productionPlanId: string
  recipeId: string
  quantityToProduce: number
  scheduledDate: Date
  estimatedDuration: number
  estimatedCost: number
  priority: ProductionPriority
  notes?: string

  // Relations
  productionPlan?: ProductionPlan
  recipe?: Recipe
}

export interface ProductionAnalytics {
  totalBatches: number
  totalUnitsProduced: number
  totalCosts: number
  totalRevenue: number
  grossProfit: number
  grossMargin: number

  // Efficiency metrics
  averageYieldPercentage: number
  averageCostPerUnit: number
  averageProductionTime: number
  capacityUtilization: number

  // Cost breakdown
  materialCostsTotal: number
  laborCostsTotal: number
  overheadCostsTotal: number

  // Performance by recipe
  recipePerformance: RecipePerformance[]

  // Waste analysis
  totalWaste: number
  wastePercentage: number
  wasteByReason: { reason: string; amount: number; percentage: number }[]

  // Quality metrics
  averageQualityScore: number
  qualityDistribution: { grade: string; count: number; percentage: number }[]
}

export interface RecipePerformance {
  recipeId: string
  recipeName: string
  batchesProduced: number
  totalUnitsProduced: number
  totalCost: number
  averageCostPerUnit: number
  averageYield: number
  averageQualityScore: number
  profitability: number
  marginPercentage: number
}

// Profitability analysis types
export interface ProfitabilityReport {
  periodStart: Date
  periodEnd: Date

  // Revenue breakdown
  totalRevenue: number
  revenueByProduct: ProductRevenue[]

  // Cost breakdown
  totalCosts: number
  rawMaterialCosts: number
  laborCosts: number
  overheadCosts: number
  otherCosts: number

  // Profitability
  grossProfit: number
  grossMargin: number
  netProfit: number
  netMargin: number

  // Unit economics
  averageSellingPrice: number
  averageCostPerUnit: number
  averageProfitPerUnit: number
  averageMarginPerUnit: number

  // Operational metrics
  totalUnitsProduced: number
  totalUnitsSold: number
  inventoryTurnover: number
  productionEfficiency: number
}

export interface ProductRevenue {
  itemId: string
  itemName: string
  unitsSold: number
  totalRevenue: number
  averageSellingPrice: number
  totalCost: number
  grossProfit: number
  marginPercentage: number
}

// Form data types
export interface CreateRecipeFormData {
  name: string
  description?: string
  category: string
  servingSize: number
  servingUnit: UnitOfMeasure
  preparationTime: number
  cookingTime: number
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  yields: number
  yieldUnit: UnitOfMeasure
  targetMarginPercentage: number
  ingredients: {
    rawMaterialId: string
    quantity: number
    unitOfMeasure: UnitOfMeasure
    isOptional: boolean
    notes?: string
  }[]
  instructions: {
    stepNumber: number
    instruction: string
    estimatedTime: number
    temperature?: number
    equipment?: string
    notes?: string
  }[]
}

export interface UpdateRecipeFormData {
  name: string
  description?: string
  category: string
  servingSize: number
  servingUnit: UnitOfMeasure
  preparationTime: number
  cookingTime: number
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  yields: number
  yieldUnit: UnitOfMeasure
  targetMarginPercentage: number
  ingredients: {
    rawMaterialId: string
    quantity: number
    unitOfMeasure: UnitOfMeasure
    isOptional: boolean
    notes?: string
  }[]
  instructions: {
    stepNumber: number
    instruction: string
    estimatedTime: number
    temperature?: number
    equipment?: string
    notes?: string
  }[]
}

export interface CreateProductionBatchFormData {
  recipeId: string
  quantityToProduce: number
  scheduledStartTime: Date
  scheduledEndTime: Date
  locationId: string
  assignedToId?: string
  supervisorId?: string
  priority: ProductionPriority
  productionNotes?: string
}

// Filter and search types
export interface ProductionFilters {
  status?: ProductionStatus[]
  priority?: ProductionPriority[]
  recipeId?: string
  locationId?: string
  assignedToId?: string
  dateFrom?: Date
  dateTo?: Date
  searchTerm?: string
}

export interface RecipeFilters {
  status?: RecipeStatus[]
  category?: string
  difficulty?: string[]
  searchTerm?: string
}

// UI helpers and constants
export const PRODUCTION_STATUS_COLORS = {
  [ProductionStatus.PLANNED]: 'bg-blue-100 text-blue-700 border-blue-200',
  [ProductionStatus.IN_PROGRESS]: 'bg-orange-100 text-orange-700 border-orange-200',
  [ProductionStatus.QUALITY_CHECK]: 'bg-purple-100 text-purple-700 border-purple-200',
  [ProductionStatus.COMPLETED]: 'bg-green-100 text-green-700 border-green-200',
  [ProductionStatus.CANCELLED]: 'bg-red-100 text-red-700 border-red-200',
  [ProductionStatus.ON_HOLD]: 'bg-gray-100 text-gray-700 border-gray-200'
} as const

export const PRODUCTION_PRIORITY_COLORS = {
  [ProductionPriority.LOW]: 'bg-gray-100 text-gray-700 border-gray-200',
  [ProductionPriority.MEDIUM]: 'bg-blue-100 text-blue-700 border-blue-200',
  [ProductionPriority.HIGH]: 'bg-orange-100 text-orange-700 border-orange-200',
  [ProductionPriority.URGENT]: 'bg-red-100 text-red-700 border-red-200'
} as const

export const UNIT_OF_MEASURE_LABELS = {
  [UnitOfMeasure.GRAMS]: 'Grams (g)',
  [UnitOfMeasure.KILOGRAMS]: 'Kilograms (kg)',
  [UnitOfMeasure.POUNDS]: 'Pounds (lb)',
  [UnitOfMeasure.OUNCES]: 'Ounces (oz)',
  [UnitOfMeasure.LITERS]: 'Liters (L)',
  [UnitOfMeasure.MILLILITERS]: 'Milliliters (mL)',
  [UnitOfMeasure.CUPS]: 'Cups',
  [UnitOfMeasure.TABLESPOONS]: 'Tablespoons (tbsp)',
  [UnitOfMeasure.TEASPOONS]: 'Teaspoons (tsp)',
  [UnitOfMeasure.PIECES]: 'Pieces (pcs)',
  [UnitOfMeasure.DOZEN]: 'Dozen (doz)'
} as const

// Helper functions
export const getProductionStatusLabel = (status: ProductionStatus): string => {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

export const getPriorityLabel = (priority: ProductionPriority): string => {
  return priority.charAt(0) + priority.slice(1).toLowerCase()
}

export const calculateRecipeCost = (ingredients: RecipeIngredient[]): number => {
  return ingredients.reduce((total, ingredient) => total + ingredient.cost, 0)
}

export const calculateMarginPercentage = (sellingPrice: number, cost: number): number => {
  if (sellingPrice === 0) return 0
  return ((sellingPrice - cost) / sellingPrice) * 100
}

export const calculateMarkupPercentage = (sellingPrice: number, cost: number): number => {
  if (cost === 0) return 0
  return ((sellingPrice - cost) / cost) * 100
}

export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount)
}

export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`
}

export const convertUnits = (
  quantity: number,
  fromUnit: UnitOfMeasure,
  toUnit: UnitOfMeasure
): number => {
  // Implementation for unit conversion
  // This would need a comprehensive conversion table
  // For now, return the original quantity if units are the same
  return fromUnit === toUnit ? quantity : quantity
}

export const canEditRecipe = (status: RecipeStatus): boolean => {
  return [RecipeStatus.DRAFT, RecipeStatus.INACTIVE].includes(status)
}

export const canStartProduction = (status: ProductionStatus): boolean => {
  return status === ProductionStatus.PLANNED
}

export const canCancelProduction = (status: ProductionStatus): boolean => {
  return [ProductionStatus.PLANNED, ProductionStatus.IN_PROGRESS, ProductionStatus.ON_HOLD].includes(status)
}

export const getNextProductionStatus = (currentStatus: ProductionStatus): ProductionStatus[] => {
  switch (currentStatus) {
    case ProductionStatus.PLANNED:
      return [ProductionStatus.IN_PROGRESS, ProductionStatus.ON_HOLD, ProductionStatus.CANCELLED]
    case ProductionStatus.IN_PROGRESS:
      return [ProductionStatus.QUALITY_CHECK, ProductionStatus.COMPLETED, ProductionStatus.ON_HOLD, ProductionStatus.CANCELLED]
    case ProductionStatus.QUALITY_CHECK:
      return [ProductionStatus.COMPLETED, ProductionStatus.IN_PROGRESS, ProductionStatus.CANCELLED]
    case ProductionStatus.ON_HOLD:
      return [ProductionStatus.IN_PROGRESS, ProductionStatus.CANCELLED]
    case ProductionStatus.COMPLETED:
    case ProductionStatus.CANCELLED:
      return []
    default:
      return []
  }
}