/**
 * Advanced Monitoring and Alerting Infrastructure for StockFlow
 *
 * Provides comprehensive system monitoring including:
 * - Real-time health checks and system metrics
 * - Performance monitoring and alerting
 * - Business metrics tracking
 * - Threshold-based alerting
 * - Dashboard analytics
 * - Error trend analysis
 * - SLA monitoring and reporting
 */

import { errorHandler } from './error-handler'
import { resilientDb } from './database-resilience'
import { financialSafety } from './financial-safety'
import { ErrorCategory, ErrorSeverity } from './types'
import { EventEmitter } from 'events'

// Monitoring configuration
export interface MonitoringConfig {
  enableRealTimeMonitoring: boolean
  enablePerformanceTracking: boolean
  enableBusinessMetrics: boolean
  enableAlerts: boolean
  healthCheckInterval: number
  metricsRetentionDays: number
  alertCooldownMs: number
  performanceThresholds: PerformanceThresholds
  businessThresholds: BusinessThresholds
}

// Performance monitoring thresholds
export interface PerformanceThresholds {
  responseTimeMs: {
    warning: number
    critical: number
  }
  errorRate: {
    warning: number // percentage
    critical: number // percentage
  }
  memoryUsage: {
    warning: number // MB
    critical: number // MB
  }
  cpuUsage: {
    warning: number // percentage
    critical: number // percentage
  }
  databaseConnections: {
    warning: number
    critical: number
  }
}

// Business monitoring thresholds
export interface BusinessThresholds {
  inventoryLevels: {
    lowStock: number
    outOfStock: number
  }
  salesMetrics: {
    minDailyRevenue: number
    maxRefundRate: number // percentage
  }
  financialMetrics: {
    maxCashVariance: number
    maxAccountsReceivableAge: number // days
  }
  operationalMetrics: {
    maxSessionDuration: number // minutes
    maxProcessingTime: number // seconds
  }
}

// System health status
export interface SystemHealth {
  overall: HealthStatus
  database: HealthStatus
  application: HealthStatus
  financial: HealthStatus
  business: HealthStatus
  lastCheck: Date
  uptime: number // seconds
  version: string
}

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  UNKNOWN = 'UNKNOWN'
}

// Performance metrics
export interface PerformanceMetrics {
  timestamp: Date
  responseTime: number
  memoryUsage: number
  cpuUsage: number
  activeConnections: number
  requestsPerMinute: number
  errorRate: number
  throughput: number
}

// Business metrics
export interface BusinessMetrics {
  timestamp: Date
  activeSessions: number
  dailyRevenue: number
  transactionVolume: number
  lowStockItems: number
  outOfStockItems: number
  refundRate: number
  cashVariance: number
  averageTransactionValue: number
  customerSatisfactionScore?: number
}

// Alert types
export enum AlertType {
  PERFORMANCE = 'PERFORMANCE',
  ERROR = 'ERROR',
  BUSINESS = 'BUSINESS',
  SECURITY = 'SECURITY',
  SYSTEM = 'SYSTEM',
  SYSTEM_EVENT = 'SYSTEM_EVENT',
  SYSTEM_FAILURE = 'SYSTEM_FAILURE',
  PERFORMANCE_DEGRADATION = 'PERFORMANCE_DEGRADATION',
  BUSINESS_CRITICAL = 'BUSINESS_CRITICAL'
}

export enum AlertSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY'
}

// Alert data structure
export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  timestamp: Date
  source: string
  metadata: Record<string, unknown>
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: Date
}

export interface CreateAlertInput {
  type: AlertType
  severity: AlertSeverity
  message: string
  source: string
  title?: string
  metadata?: Record<string, unknown>
}

// SLA metrics
export interface SLAMetrics {
  uptime: number // percentage
  availability: number // percentage
  averageResponseTime: number
  errorBudget: number // remaining error budget percentage
  slaTarget: number // target uptime percentage
  breachCount: number
  lastBreach?: Date
}

const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enableRealTimeMonitoring: true,
  enablePerformanceTracking: true,
  enableBusinessMetrics: true,
  enableAlerts: true,
  healthCheckInterval: 30000, // 30 seconds
  metricsRetentionDays: 30,
  alertCooldownMs: 300000, // 5 minutes
  performanceThresholds: {
    responseTimeMs: { warning: 1000, critical: 3000 },
    errorRate: { warning: 2.0, critical: 5.0 },
    memoryUsage: { warning: 1024, critical: 2048 },
    cpuUsage: { warning: 70, critical: 90 },
    databaseConnections: { warning: 80, critical: 95 }
  },
  businessThresholds: {
    inventoryLevels: { lowStock: 10, outOfStock: 0 },
    salesMetrics: { minDailyRevenue: 1000, maxRefundRate: 5.0 },
    financialMetrics: { maxCashVariance: 10.00, maxAccountsReceivableAge: 60 },
    operationalMetrics: { maxSessionDuration: 480, maxProcessingTime: 30 }
  }
}

function getNodePackageVersion(fallback = '1.0.0'): string {
  return typeof process !== 'undefined' && process.env?.npm_package_version
    ? process.env.npm_package_version
    : fallback
}

function getNodeMemoryUsage(): NodeJS.MemoryUsage | null {
  return typeof process !== 'undefined' && typeof process.memoryUsage === 'function'
    ? process.memoryUsage()
    : null
}

/**
 * System Monitoring and Alerting Manager
 */
export class SystemMonitor extends EventEmitter {
  private static instance: SystemMonitor
  private config: MonitoringConfig
  private isMonitoring: boolean = false
  private alerts: Alert[] = []
  private metrics: PerformanceMetrics[] = []
  private businessMetrics: BusinessMetrics[] = []
  private systemHealth: SystemHealth
  private startTime: Date
  private alertCooldowns: Map<string, Date> = new Map()

  constructor(config: Partial<MonitoringConfig> = {}) {
    super()
    this.config = { ...DEFAULT_MONITORING_CONFIG, ...config }
    this.startTime = new Date()
    this.systemHealth = this.initializeSystemHealth()
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<MonitoringConfig>): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor(config)
    }
    return SystemMonitor.instance
  }

  /**
   * Start system monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return

    this.isMonitoring = true
    console.log('Starting system monitoring...')

    // Start performance monitoring
    if (this.config.enablePerformanceTracking) {
      setInterval(() => this.collectPerformanceMetrics(), this.config.healthCheckInterval)
    }

    // Start business metrics collection
    if (this.config.enableBusinessMetrics) {
      setInterval(() => this.collectBusinessMetrics(), this.config.healthCheckInterval * 2)
    }

    // Start health checks
    setInterval(() => this.performHealthCheck(), this.config.healthCheckInterval)

    // Start metrics cleanup
    setInterval(() => this.cleanupOldMetrics(), 24 * 60 * 60 * 1000) // Daily cleanup

    console.log('System monitoring started successfully')
  }

  /**
   * Stop system monitoring
   */
  async stopMonitoring(): Promise<void> {
    this.isMonitoring = false
    console.log('System monitoring stopped')
  }

  /**
   * Get current system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    await this.performHealthCheck()
    return { ...this.systemHealth }
  }

  /**
   * Get recent performance metrics
   */
  getPerformanceMetrics(hours: number = 24): PerformanceMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.metrics.filter(metric => metric.timestamp >= cutoff)
  }

  /**
   * Get recent business metrics
   */
  getBusinessMetrics(hours: number = 24): BusinessMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.businessMetrics.filter(metric => metric.timestamp >= cutoff)
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  /**
   * Get SLA metrics
   */
  async getSLAMetrics(days: number = 30): Promise<SLAMetrics> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const recentMetrics = this.metrics.filter(metric => metric.timestamp >= cutoff)

    if (recentMetrics.length === 0) {
      return {
        uptime: 100,
        availability: 100,
        averageResponseTime: 0,
        errorBudget: 100,
        slaTarget: 99.9,
        breachCount: 0
      }
    }

    const totalTime = Date.now() - cutoff.getTime()
    const downtime = recentMetrics.filter(m => m.errorRate > 50).length * this.config.healthCheckInterval
    const uptime = ((totalTime - downtime) / totalTime) * 100

    const averageResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
    const averageErrorRate = recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length

    const slaTarget = 99.9
    const errorBudget = Math.max(0, slaTarget - averageErrorRate)
    const breachCount = recentMetrics.filter(m => m.errorRate > (100 - slaTarget)).length

    return {
      uptime,
      availability: uptime,
      averageResponseTime,
      errorBudget,
      slaTarget,
      breachCount,
      lastBreach: breachCount > 0 ? recentMetrics[recentMetrics.length - 1].timestamp : undefined
    }
  }

  /**
   * Subscribe to real-time alert events.
   */
  onAlert(handler: (alert: Alert) => void | Promise<void>): () => void {
    const listener = (alert: Alert) => {
      Promise.resolve(handler(alert)).catch((error) => {
        console.error('Error in alert handler:', error)
      })
    }

    this.on('alert', listener)
    return () => this.off('alert', listener)
  }

  /**
   * Create and emit an alert
   */
  async createAlert(input: CreateAlertInput): Promise<Alert>
  async createAlert(
    type: AlertType,
    severity: AlertSeverity,
    title: string,
    message: string,
    source: string,
    metadata?: Record<string, unknown>
  ): Promise<Alert>
  async createAlert(
    typeOrInput: AlertType | CreateAlertInput,
    severity?: AlertSeverity,
    title?: string,
    message?: string,
    source?: string,
    metadata: Record<string, unknown> = {}
  ): Promise<Alert> {
    const alertInput = typeof typeOrInput === 'object'
      ? typeOrInput
      : {
          type: typeOrInput,
          severity: severity!,
          title: title!,
          message: message!,
          source: source!,
          metadata
        }

    const normalizedTitle = alertInput.title || alertInput.message
    const alertKey = `${alertInput.type}_${alertInput.source}_${normalizedTitle}`

    // Check cooldown to prevent alert spam
    if (this.isInCooldown(alertKey)) {
      const existingAlert = this.alerts.find(a => a.title === normalizedTitle && a.source === alertInput.source && !a.resolved)
      if (existingAlert) return existingAlert
    }

    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: alertInput.type,
      severity: alertInput.severity,
      title: normalizedTitle,
      message: alertInput.message,
      timestamp: new Date(),
      source: alertInput.source,
      metadata: alertInput.metadata || {},
      acknowledged: false,
      resolved: false
    }

    this.alerts.push(alert)
    this.alertCooldowns.set(alertKey, new Date(Date.now() + this.config.alertCooldownMs))

    // Emit alert event
    this.emit('alert', alert)

    // Handle high-severity alerts
    if (alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.EMERGENCY) {
      await this.handleCriticalAlert(alert)
    }

    return alert
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, userId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true
      alert.acknowledgedBy = userId
      alert.acknowledgedAt = new Date()
      this.emit('alertAcknowledged', alert)
      return true
    }
    return false
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, userId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedBy = userId
      alert.resolvedAt = new Date()
      this.emit('alertResolved', alert)
      return true
    }
    return false
  }

  // Private methods

  private initializeSystemHealth(): SystemHealth {
    return {
      overall: HealthStatus.UNKNOWN,
      database: HealthStatus.UNKNOWN,
      application: HealthStatus.UNKNOWN,
      financial: HealthStatus.UNKNOWN,
      business: HealthStatus.UNKNOWN,
      lastCheck: new Date(),
      uptime: 0,
      version: getNodePackageVersion()
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const uptime = (Date.now() - this.startTime.getTime()) / 1000

      // Check database health
      const dbHealth = await resilientDb.performHealthCheck()
      const databaseStatus = this.mapHealthStatus(dbHealth.isHealthy, dbHealth.averageResponseTime)

      // Check application health when Node process metrics are available.
      const memoryUsage = getNodeMemoryUsage()
      const applicationStatus = memoryUsage
        ? this.checkApplicationHealth(memoryUsage)
        : HealthStatus.UNKNOWN

      // Check financial system health
      const financialStatus = await this.checkFinancialSystemHealth()

      // Check business health
      const businessStatus = await this.checkBusinessHealth()

      // Determine overall health
      const statuses = [databaseStatus, applicationStatus, financialStatus, businessStatus]
      const overallStatus = this.calculateOverallHealth(statuses)

      this.systemHealth = {
        overall: overallStatus,
        database: databaseStatus,
        application: applicationStatus,
        financial: financialStatus,
        business: businessStatus,
        lastCheck: new Date(),
        uptime,
        version: this.systemHealth.version
      }

      // Create alerts for health issues
      await this.checkHealthAlerts()

    } catch (error) {
      await errorHandler.handle(error as Error, {
        notifyAdmin: true,
        businessImpact: 'medium'
      })
    }
  }

  private async collectPerformanceMetrics(): Promise<void> {
    try {
      const memoryUsage = getNodeMemoryUsage()
      const dbHealth = resilientDb.getHealth()
      const dbMetrics = resilientDb.getMetrics()

      const metric: PerformanceMetrics = {
        timestamp: new Date(),
        responseTime: dbHealth.averageResponseTime,
        memoryUsage: memoryUsage ? memoryUsage.heapUsed / 1024 / 1024 : 0, // Convert to MB
        cpuUsage: await this.getCpuUsage(),
        activeConnections: dbHealth.connectionCount,
        requestsPerMinute: this.calculateRequestsPerMinute(),
        errorRate: dbMetrics.failedQueries / Math.max(dbMetrics.totalQueries, 1) * 100,
        throughput: dbMetrics.successfulQueries
      }

      this.metrics.push(metric)

      // Check performance thresholds
      await this.checkPerformanceAlerts(metric)

    } catch (error) {
      console.error('Error collecting performance metrics:', error)
    }
  }

  private async collectBusinessMetrics(): Promise<void> {
    try {
      const metric: BusinessMetrics = {
        timestamp: new Date(),
        activeSessions: await this.getActiveSessions(),
        dailyRevenue: await this.getDailyRevenue(),
        transactionVolume: await this.getTransactionVolume(),
        lowStockItems: await this.getLowStockItemCount(),
        outOfStockItems: await this.getOutOfStockItemCount(),
        refundRate: await this.getRefundRate(),
        cashVariance: await this.getCashVariance(),
        averageTransactionValue: await this.getAverageTransactionValue()
      }

      this.businessMetrics.push(metric)

      // Check business thresholds
      await this.checkBusinessAlerts(metric)

    } catch (error) {
      console.error('Error collecting business metrics:', error)
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(metricName: string, data: Record<string, unknown>): void {
    try {
      // Create a timestamp for the metric
      const timestamp = new Date()

      // Store the metric data
      const metric = {
        name: metricName,
        timestamp,
        data,
        id: `metric_${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`
      }

      // Emit the metric event for real-time monitoring
      this.emit('metricRecorded', metric)

      // Log the metric for debugging
      console.log(`[SystemMonitor] Recorded metric: ${metricName}`, data)
    } catch (error) {
      console.error('Error recording metric:', error)
    }
  }

  private mapHealthStatus(isHealthy: boolean, responseTime: number): HealthStatus {
    if (!isHealthy) return HealthStatus.CRITICAL
    if (responseTime > this.config.performanceThresholds.responseTimeMs.critical) return HealthStatus.CRITICAL
    if (responseTime > this.config.performanceThresholds.responseTimeMs.warning) return HealthStatus.WARNING
    return HealthStatus.HEALTHY
  }

  private checkApplicationHealth(memoryUsage: NodeJS.MemoryUsage): HealthStatus {
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024

    if (heapUsedMB > this.config.performanceThresholds.memoryUsage.critical) {
      return HealthStatus.CRITICAL
    }
    if (heapUsedMB > this.config.performanceThresholds.memoryUsage.warning) {
      return HealthStatus.WARNING
    }
    return HealthStatus.HEALTHY
  }

  private async checkFinancialSystemHealth(): Promise<HealthStatus> {
    // This would integrate with financial safety checks
    // For now, return healthy if no critical financial errors in the last hour
    try {
      const recentErrors = await errorHandler.getMetrics()
      const financialErrorRate = recentErrors.errorsByCategory['financial'] || 0

      if (financialErrorRate > 5) return HealthStatus.CRITICAL
      if (financialErrorRate > 2) return HealthStatus.WARNING
      return HealthStatus.HEALTHY
    } catch {
      return HealthStatus.WARNING
    }
  }

  private async checkBusinessHealth(): Promise<HealthStatus> {
    try {
      const outOfStockCount = await this.getOutOfStockItemCount()
      const lowStockCount = await this.getLowStockItemCount()
      const cashVariance = await this.getCashVariance()

      if (outOfStockCount > 10 || Math.abs(cashVariance) > 50) {
        return HealthStatus.CRITICAL
      }
      if (lowStockCount > 20 || Math.abs(cashVariance) > 10) {
        return HealthStatus.WARNING
      }
      return HealthStatus.HEALTHY
    } catch {
      return HealthStatus.WARNING
    }
  }

  private calculateOverallHealth(statuses: HealthStatus[]): HealthStatus {
    if (statuses.includes(HealthStatus.CRITICAL)) return HealthStatus.CRITICAL
    if (statuses.includes(HealthStatus.WARNING)) return HealthStatus.WARNING
    return HealthStatus.HEALTHY
  }

  private async checkHealthAlerts(): Promise<void> {
    if (this.systemHealth.overall === HealthStatus.CRITICAL) {
      await this.createAlert(
        AlertType.SYSTEM,
        AlertSeverity.CRITICAL,
        'System Health Critical',
        'One or more system components are in critical state',
        'HealthMonitor',
        { health: this.systemHealth }
      )
    }
  }

  private async checkPerformanceAlerts(metric: PerformanceMetrics): Promise<void> {
    const thresholds = this.config.performanceThresholds

    if (metric.responseTime > thresholds.responseTimeMs.critical) {
      await this.createAlert(
        AlertType.PERFORMANCE,
        AlertSeverity.CRITICAL,
        'High Response Time',
        `Response time ${metric.responseTime}ms exceeds critical threshold`,
        'PerformanceMonitor',
        { metric }
      )
    }

    if (metric.errorRate > thresholds.errorRate.critical) {
      await this.createAlert(
        AlertType.ERROR,
        AlertSeverity.CRITICAL,
        'High Error Rate',
        `Error rate ${metric.errorRate}% exceeds critical threshold`,
        'PerformanceMonitor',
        { metric }
      )
    }

    if (metric.memoryUsage > thresholds.memoryUsage.critical) {
      await this.createAlert(
        AlertType.PERFORMANCE,
        AlertSeverity.CRITICAL,
        'High Memory Usage',
        `Memory usage ${metric.memoryUsage}MB exceeds critical threshold`,
        'PerformanceMonitor',
        { metric }
      )
    }
  }

  private async checkBusinessAlerts(metric: BusinessMetrics): Promise<void> {
    const thresholds = this.config.businessThresholds

    if (metric.outOfStockItems > thresholds.inventoryLevels.outOfStock) {
      await this.createAlert(
        AlertType.BUSINESS,
        AlertSeverity.WARNING,
        'Items Out of Stock',
        `${metric.outOfStockItems} items are out of stock`,
        'BusinessMonitor',
        { metric }
      )
    }

    if (metric.refundRate > thresholds.salesMetrics.maxRefundRate) {
      await this.createAlert(
        AlertType.BUSINESS,
        AlertSeverity.WARNING,
        'High Refund Rate',
        `Refund rate ${metric.refundRate}% exceeds threshold`,
        'BusinessMonitor',
        { metric }
      )
    }

    if (Math.abs(metric.cashVariance) > thresholds.financialMetrics.maxCashVariance) {
      await this.createAlert(
        AlertType.BUSINESS,
        AlertSeverity.CRITICAL,
        'Cash Variance Alert',
        `Cash variance $${metric.cashVariance} exceeds threshold`,
        'BusinessMonitor',
        { metric }
      )
    }
  }

  private async handleCriticalAlert(alert: Alert): Promise<void> {
    console.error(`CRITICAL ALERT: ${alert.title} - ${alert.message}`)

    // In a production environment, this would:
    // - Send emails/SMS to administrators
    // - Post to Slack/Teams channels
    // - Create incident tickets
    // - Trigger automated responses
  }

  private isInCooldown(alertKey: string): boolean {
    const cooldownEnd = this.alertCooldowns.get(alertKey)
    return cooldownEnd ? new Date() < cooldownEnd : false
  }

  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - this.config.metricsRetentionDays * 24 * 60 * 60 * 1000)

    this.metrics = this.metrics.filter(metric => metric.timestamp >= cutoff)
    this.businessMetrics = this.businessMetrics.filter(metric => metric.timestamp >= cutoff)
    this.alerts = this.alerts.filter(alert => alert.timestamp >= cutoff)
  }

  // Helper methods for business metrics (would integrate with actual data sources)
  private async getCpuUsage(): Promise<number> {
    // In a real implementation, this would use process.cpuUsage() or external monitoring
    return Math.random() * 30 + 10 // Mock value
  }

  private calculateRequestsPerMinute(): number {
    // Calculate from recent performance metrics
    return this.metrics.length > 0 ? this.metrics.slice(-10).length : 0
  }

  private async getActiveSessions(): Promise<number> {
    try {
      return await resilientDb.withResilience(
        async (db) => {
          return await db.pOSSession.count({
            where: { status: 'ACTIVE' }
          })
        },
        { operationName: 'get_active_sessions' }
      )
    } catch {
      return 0
    }
  }

  private async getDailyRevenue(): Promise<number> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      return await resilientDb.withResilience(
        async (db) => {
          const result = await db.salesOrder.aggregate({
            where: {
              createdAt: { gte: today },
              status: 'COMPLETED'
            },
            _sum: { total: true }
          })
          return Number(result._sum.total ?? 0)
        },
        { operationName: 'get_daily_revenue' }
      )
    } catch {
      return 0
    }
  }

  private async getTransactionVolume(): Promise<number> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      return await resilientDb.withResilience(
        async (db) => {
          return await db.salesOrder.count({
            where: {
              createdAt: { gte: today }
            }
          })
        },
        { operationName: 'get_transaction_volume' }
      )
    } catch {
      return 0
    }
  }

  private async getLowStockItemCount(): Promise<number> {
    try {
      return await resilientDb.withResilience(
        async (db) => {
          return await db.inventoryLevel.count({
            where: {
              quantityOnHand: { lte: 10 }
            }
          })
        },
        { operationName: 'get_low_stock_items' }
      )
    } catch {
      return 0
    }
  }

  private async getOutOfStockItemCount(): Promise<number> {
    try {
      return await resilientDb.withResilience(
        async (db) => {
          return await db.inventoryLevel.count({
            where: {
              quantityOnHand: { lte: 0 }
            }
          })
        },
        { operationName: 'get_out_of_stock_items' }
      )
    } catch {
      return 0
    }
  }

  private async getRefundRate(): Promise<number> {
    // Mock implementation - would calculate actual refund rate
    return Math.random() * 3 + 1 // 1-4% mock refund rate
  }

  private async getCashVariance(): Promise<number> {
    // Mock implementation - would calculate actual cash variance
    return (Math.random() - 0.5) * 20 // -10 to +10 dollar variance
  }

  private async getAverageTransactionValue(): Promise<number> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      return await resilientDb.withResilience(
        async (db) => {
          const result = await db.salesOrder.aggregate({
            where: {
              createdAt: { gte: today },
              status: 'COMPLETED'
            },
            _avg: { total: true }
          })
          return Number(result._avg.total ?? 0)
        },
        { operationName: 'get_average_transaction_value' }
      )
    } catch {
      return 0
    }
  }
}

// Export singleton instance
export const systemMonitor = SystemMonitor.getInstance()

// Export convenience functions
export const startSystemMonitoring = (): Promise<void> => systemMonitor.startMonitoring()
export const getSystemHealth = (): Promise<SystemHealth> => systemMonitor.getSystemHealth()
export function createAlert(input: CreateAlertInput): Promise<Alert>
export function createAlert(
  type: AlertType,
  severity: AlertSeverity,
  title: string,
  message: string,
  source: string,
  metadata?: Record<string, unknown>
): Promise<Alert>
export function createAlert(
  typeOrInput: AlertType | CreateAlertInput,
  severity?: AlertSeverity,
  title?: string,
  message?: string,
  source?: string,
  metadata?: Record<string, unknown>
): Promise<Alert> {
  return typeof typeOrInput === 'object'
    ? systemMonitor.createAlert(typeOrInput)
    : systemMonitor.createAlert(typeOrInput, severity!, title!, message!, source!, metadata)
}
