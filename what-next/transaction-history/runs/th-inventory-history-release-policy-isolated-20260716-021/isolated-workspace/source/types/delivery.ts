// Enhanced delivery status enum
export enum DeliveryStatus {
  DRAFT = "DRAFT",
  SCHEDULED = "SCHEDULED",
  IN_TRANSIT = "IN_TRANSIT",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  FAILED_DELIVERY = "FAILED_DELIVERY",
  RETURNED = "RETURNED",
  CANCELLED = "CANCELLED",
}

// Delivery priority levels
export enum DeliveryPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

// Delivery vehicle types
export enum DeliveryVehicleType {
  MOTORCYCLE = "MOTORCYCLE",
  CAR = "CAR",
  VAN = "VAN",
  TRUCK = "TRUCK",
  BICYCLE = "BICYCLE",
  WALKING = "WALKING",
}

export interface Customer {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
}

export interface Item {
  id: string
  name?: string
  nameEn?: string
  nameFr?: string | null
  sku?: string
  costPrice?: number
}

export interface User {
  id: string
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

export interface Location {
  id: string
  name: string
}

export interface OrderLine {
  id: string
  itemId: string
  itemName: string
  itemSku?: string
  quantity: number
  deliveredQuantity: number
  unitPrice: number
  item?: Item
}

export interface ClientOrder {
  id: string
  orderNumber: string
  customerId?: string
  customerName: string
  customerPhone?: string | null
  customerAddress?: string | null
  status?: string
  locationId?: string | null
  deliveryDate?: Date | null
  completedDate?: Date | null
  customer?: Customer
  location?: Location
  orderLines: OrderLine[]
}

export interface DeliveryItem {
  id: string
  deliveryId: string
  orderLineId: string
  quantityDelivered: number
  notes?: string | null
  specialHandling?: string | null
}

export interface OrderDelivery {
  id: string
  orderId: string
  deliveryNumber: string
  deliveryDate: Date
  deliveryAddress?: string | null
  recipientName?: string | null
  recipientPhone?: string | null
  deliveryNotes?: string | null
  status: DeliveryStatus
  priority: DeliveryPriority
  estimatedDeliveryTime?: Date | null
  actualDeliveryDate?: Date | null
  specialInstructions?: string | null
  requiresSignature: boolean
  requiresProofOfDelivery: boolean
  failureReason?: string | null
  rescheduleDate?: Date | null
  organizationId: string
  deliveredById?: string | null
  driverId?: string | null
  deliveryFee?: number
  createdAt?: Date
  updatedAt?: Date
}

// Extended delivery types with relations
export interface ExtendedOrderDelivery extends OrderDelivery {
  order: ClientOrder & {
    customer: Customer
    orderLines: (OrderLine & {
      item: Item
    })[]
  }
  deliveryItems: (DeliveryItem & {
    orderLine: OrderLine & {
      item: Item
    }
  })[]
  deliveredBy?: User
  driver?: DeliveryDriver
  route?: DeliveryRoute
  trackingUpdates: DeliveryTrackingUpdate[]
  proofOfDelivery?: ProofOfDelivery
}

// Delivery driver information
export interface DeliveryDriver {
  id: string
  name: string
  phone: string
  email?: string
  licenseNumber?: string
  vehicleType: DeliveryVehicleType
  vehicleRegistration?: string
  isActive: boolean
  currentLocation?: {
    latitude: number
    longitude: number
    timestamp: Date
  }
  rating?: number
  totalDeliveries: number
  organizationId: string
}

// Delivery route optimization
export interface DeliveryRoute {
  id: string
  name: string
  driverId: string
  date: Date
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED"
  totalDistance: number
  estimatedDuration: number
  actualDuration?: number
  deliveries: DeliveryWaypoint[]
  organizationId: string
}

export interface DeliveryWaypoint {
  id: string
  routeId: string
  deliveryId: string
  sequence: number
  address: string
  latitude?: number
  longitude?: number
  estimatedArrival: Date
  actualArrival?: Date
  status: "PENDING" | "ARRIVED" | "DELIVERED" | "FAILED"
  notes?: string
}

// Delivery tracking system
export interface DeliveryTrackingUpdate {
  id: string
  deliveryId: string
  status: DeliveryStatus
  location?: {
    latitude: number
    longitude: number
    address: string
  }
  timestamp: Date
  notes?: string
  updatedBy: string
  updatedByUser?: Pick<User, "name" | "email">
  isSystemGenerated: boolean
}

// Proof of delivery
export interface ProofOfDelivery {
  id: string
  deliveryId: string
  deliveredAt: Date
  recipientName: string
  recipientSignature?: string
  photos?: string[]
  notes?: string
  deliveredById: string
}

// Delivery form data types
export interface CreateDeliveryFormData {
  orderId: string
  deliveryDate: Date
  deliveryAddress: string
  recipientName: string
  recipientPhone: string
  deliveryNotes?: string
  priority: DeliveryPriority
  estimatedDeliveryTime?: Date
  specialInstructions?: string
  requiresSignature: boolean
  requiresProofOfDelivery: boolean
  driverId?: string
  vehicleType?: DeliveryVehicleType
  deliveryItems: {
    orderLineId: string
    quantityToDeliver: number
    specialHandling?: string
    notes?: string
  }[]
}

export interface UpdateDeliveryFormData {
  status: DeliveryStatus
  actualDeliveryDate?: Date
  deliveryNotes?: string
  failureReason?: string
  rescheduleDate?: Date
  location?: {
    latitude: number
    longitude: number
  }
  proofOfDelivery?: {
    recipientName: string
    recipientSignature?: string
    photos?: File[]
    notes?: string
  }
}

// Delivery filters and search
export interface DeliveryFilters {
  status?: DeliveryStatus[]
  priority?: DeliveryPriority[]
  driverId?: string
  dateFrom?: Date
  dateTo?: Date
  customerId?: string
  locationId?: string
  searchTerm?: string
  requiresProofOfDelivery?: boolean
}

// Delivery analytics
export interface DeliveryAnalytics {
  totalDeliveries: number
  deliveriesByStatus: Record<DeliveryStatus, number>
  deliveriesByPriority: Record<DeliveryPriority, number>
  averageDeliveryTime: number
  onTimeDeliveryRate: number
  failedDeliveryRate: number
  totalDistanceCovered: number
  totalDeliveryFees: number
  driverPerformance: {
    driverId: string
    driverName: string
    totalDeliveries: number
    onTimeRate: number
    averageRating: number
    totalDistance: number
  }[]
  peakDeliveryTimes: {
    hour: number
    deliveryCount: number
  }[]
  deliveryHeatmap: {
    area: string
    deliveryCount: number
    averageTime: number
  }[]
}

// Delivery dashboard data
export interface DeliveryDashboardData {
  todaysDeliveries: {
    total: number
    completed: number
    pending: number
    inTransit: number
    failed: number
  }
  upcomingDeliveries: ExtendedOrderDelivery[]
  activeDrivers: (DeliveryDriver & {
    currentDelivery?: ExtendedOrderDelivery
  })[]
  deliveryMetrics: {
    onTimeRate: number
    averageDeliveryTime: number
    customerSatisfaction: number
    totalRevenue: number
  }
  recentFailures: (ExtendedOrderDelivery & {
    failureReason: string
  })[]
}

// Status colors for UI
export const DELIVERY_STATUS_COLORS = {
  [DeliveryStatus.DRAFT]: "bg-gray-100 text-gray-700 border-gray-200",
  [DeliveryStatus.SCHEDULED]: "bg-blue-100 text-blue-700 border-blue-200",
  [DeliveryStatus.IN_TRANSIT]: "bg-yellow-100 text-yellow-700 border-yellow-200",
  [DeliveryStatus.OUT_FOR_DELIVERY]: "bg-orange-100 text-orange-700 border-orange-200",
  [DeliveryStatus.DELIVERED]: "bg-green-100 text-green-700 border-green-200",
  [DeliveryStatus.FAILED_DELIVERY]: "bg-red-100 text-red-700 border-red-200",
  [DeliveryStatus.RETURNED]: "bg-purple-100 text-purple-700 border-purple-200",
  [DeliveryStatus.CANCELLED]: "bg-gray-100 text-gray-700 border-gray-200",
} as const

export const DELIVERY_PRIORITY_COLORS = {
  [DeliveryPriority.LOW]: "bg-gray-100 text-gray-700 border-gray-200",
  [DeliveryPriority.MEDIUM]: "bg-blue-100 text-blue-700 border-blue-200",
  [DeliveryPriority.HIGH]: "bg-orange-100 text-orange-700 border-orange-200",
  [DeliveryPriority.URGENT]: "bg-red-100 text-red-700 border-red-200",
} as const

// Helper functions
export const getDeliveryStatusLabel = (status: DeliveryStatus): string => {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export const getPriorityLabel = (priority: DeliveryPriority): string => {
  return priority.charAt(0) + priority.slice(1).toLowerCase()
}

export const calculateDeliveryTime = (scheduledDate: Date, deliveredDate?: Date): number => {
  if (!deliveredDate) return 0
  return Math.abs(deliveredDate.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60)
}

export const isDeliveryOnTime = (scheduledDate: Date, deliveredDate: Date, toleranceMinutes = 30): boolean => {
  const diffMinutes = Math.abs(deliveredDate.getTime() - scheduledDate.getTime()) / (1000 * 60)
  return diffMinutes <= toleranceMinutes
}

export const canEditDelivery = (status: DeliveryStatus): boolean => {
  return [DeliveryStatus.DRAFT, DeliveryStatus.SCHEDULED].includes(status)
}

export const canCancelDelivery = (status: DeliveryStatus): boolean => {
  return [DeliveryStatus.DRAFT, DeliveryStatus.SCHEDULED, DeliveryStatus.IN_TRANSIT].includes(status)
}

export const canRescheduleDelivery = (status: DeliveryStatus): boolean => {
  return [DeliveryStatus.SCHEDULED, DeliveryStatus.FAILED_DELIVERY].includes(status)
}

export const getNextDeliveryStatus = (currentStatus: DeliveryStatus): DeliveryStatus[] => {
  switch (currentStatus) {
    case DeliveryStatus.DRAFT:
      return [DeliveryStatus.SCHEDULED, DeliveryStatus.CANCELLED]
    case DeliveryStatus.SCHEDULED:
      return [DeliveryStatus.IN_TRANSIT, DeliveryStatus.CANCELLED]
    case DeliveryStatus.IN_TRANSIT:
      return [DeliveryStatus.OUT_FOR_DELIVERY, DeliveryStatus.FAILED_DELIVERY, DeliveryStatus.CANCELLED]
    case DeliveryStatus.OUT_FOR_DELIVERY:
      return [DeliveryStatus.DELIVERED, DeliveryStatus.FAILED_DELIVERY]
    case DeliveryStatus.FAILED_DELIVERY:
      return [DeliveryStatus.SCHEDULED, DeliveryStatus.RETURNED, DeliveryStatus.CANCELLED]
    case DeliveryStatus.DELIVERED:
      return [DeliveryStatus.RETURNED]
    default:
      return []
  }
}
