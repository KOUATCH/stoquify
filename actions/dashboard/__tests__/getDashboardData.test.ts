jest.mock('@/lib/security/rbac', () => ({
  assertCanUseOrganization: jest.fn(),
  requirePermission: jest.fn(),
}))

jest.mock('@/services/dashboard/dashboard-read-model.service', () => ({
  getAllDashboardData: jest.fn(),
  getDashboardMetrics: jest.fn(),
}))

import { assertCanUseOrganization, requirePermission } from '@/lib/security/rbac'
import {
  getAllDashboardData as getAllDashboardDataFromService,
  getDashboardMetrics as getDashboardMetricsFromService,
} from '@/services/dashboard/dashboard-read-model.service'
import { getAllDashboardData, getDashboardMetrics } from '../getDashboardData'

const mockRequirePermission = requirePermission as jest.Mock
const mockAssertCanUseOrganization = assertCanUseOrganization as jest.Mock
const mockGetAllDashboardDataFromService = getAllDashboardDataFromService as jest.Mock
const mockGetDashboardMetricsFromService = getDashboardMetricsFromService as jest.Mock

const rbacContext = {
  userId: 'user-1',
  orgId: 'org-session',
  permissions: ['dashboard.read'],
  isSuperUser: false,
}

const dashboardData = {
  organization: { id: 'org-session', name: 'Tenant A', currency: 'XAF' },
  period: {
    key: '30d',
    from: '2026-06-01T00:00:00.000Z',
    to: '2026-06-18T00:00:00.000Z',
    previousFrom: '2026-05-14T00:00:00.000Z',
    previousTo: '2026-05-31T00:00:00.000Z',
  },
  filters: {},
  generatedAt: '2026-06-18T12:00:00.000Z',
  kpis: {},
  stockHealth: {},
  salesTrend: [],
  topProducts: [],
  locations: [],
  alerts: [],
  activities: [],
  pendingActions: [],
  counts: {},
}

describe('dashboard data actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(rbacContext)
    mockAssertCanUseOrganization.mockResolvedValue(true)
    mockGetAllDashboardDataFromService.mockResolvedValue(dashboardData)
    mockGetDashboardMetricsFromService.mockResolvedValue({ revenue: { current: 0 } })
  })

  it('enforces dashboard RBAC and tenant access before returning the service DTO', async () => {
    const result = await getAllDashboardData('org-session', { period: '7d', locationId: 'loc-1' })

    expect(result).toBe(dashboardData)
    expect(mockRequirePermission).toHaveBeenCalledWith('dashboard.read', {
      resource: 'Dashboard',
      resourceId: 'org-session',
    })
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(rbacContext, 'org-session')
    expect(mockGetAllDashboardDataFromService).toHaveBeenCalledWith({
      context: {
        organizationId: 'org-session',
        actorId: 'user-1',
        actorPermissions: ['dashboard.read'],
        isSuperUser: false,
      },
      filters: { period: '7d', locationId: 'loc-1' },
    })
  })

  it('derives blank organization input from the verified RBAC context', async () => {
    await getAllDashboardData('   ')

    expect(mockRequirePermission).toHaveBeenCalledWith('dashboard.read', {
      resource: 'Dashboard',
      resourceId: undefined,
    })
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(rbacContext, 'org-session')
    expect(mockGetAllDashboardDataFromService).toHaveBeenCalledWith({
      context: expect.objectContaining({ organizationId: 'org-session' }),
      filters: {},
    })
  })

  it('does not call the dashboard service when tenant access is denied', async () => {
    mockAssertCanUseOrganization.mockRejectedValue(new Error('Forbidden'))

    await expect(getAllDashboardData('org-attacker')).rejects.toThrow('Forbidden')

    expect(mockGetAllDashboardDataFromService).not.toHaveBeenCalled()
  })

  it('uses the same action-edge guard for legacy dashboard metrics', async () => {
    const result = await getDashboardMetrics('org-session')

    expect(result).toEqual({ revenue: { current: 0 } })
    expect(mockRequirePermission).toHaveBeenCalledWith('dashboard.read', {
      resource: 'Dashboard',
      resourceId: 'org-session',
    })
    expect(mockGetDashboardMetricsFromService).toHaveBeenCalledWith({
      context: {
        organizationId: 'org-session',
        actorId: 'user-1',
        actorPermissions: ['dashboard.read'],
        isSuperUser: false,
      },
    })
  })
})
