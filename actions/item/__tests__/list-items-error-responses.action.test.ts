import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { listItemsAction } from '@/actions/item/listItemsAction'
import { listItemsWithRelations } from '@/services/item/item.service'
import { requirePermission } from '@/lib/security/rbac'
import { logger } from '@/lib/logger'
import { ApplicationError, BusinessRuleError, NotFoundError } from '@/services/_shared/action-errors'
import { useListItems } from '@/hooks/itemsHooks/useItemHooks'

jest.mock('@/services/item/item.service', () => ({ listItemsWithRelations: jest.fn() }))
jest.mock('@/lib/security/rbac', () => ({ requirePermission: jest.fn() }))
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn() } }))
jest.mock('@/actions/item/items', () => ({}))
jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn(options => options), useMutation: jest.fn(), useQueryClient: jest.fn() }))

const sentinel = 'PRIVATE_R04_CANARY_customer_margin_42'
const guard = requirePermission as jest.Mock
const service = listItemsWithRelations as jest.Mock
const result = { data: [{ id: 'item-a', organizationId: 'server-org', nameEn: 'Rice' }], total: 1, page: 1, pageSize: 20, totalPages: 1 }
const styles = [
  { name: 'object', args: [{ organizationId: 'forged-org', q: ' rice ', page: 2, pageSize: 5 }] },
  { name: 'positional', args: ['forged-org', ' rice ', 2, 5] },
]
const failures = [
  ['plain service Error', () => new Error(sentinel)],
  ['thrown string', () => sentinel],
  ['unknown provider code', () => Object.assign(new Error(sentinel), { code: 'E_PROVIDER', status: 422 })],
  ['Prisma request error', () => new Prisma.PrismaClientKnownRequestError(sentinel, { code: 'P2022', clientVersion: '6.19.3', meta: { column: sentinel } })],
  ['Prisma missing record', () => new Prisma.PrismaClientKnownRequestError(sentinel, { code: 'P2025', clientVersion: '6.19.3' })],
  ['typed business error', () => new BusinessRuleError(sentinel)],
  ['typed not-found error', () => new NotFoundError(sentinel)],
  ['non-exposing typed error', () => new ApplicationError('INTERNAL_ERROR', sentinel, 500, false)],
  ['message-shaped object', () => ({ message: sentinel, code: 'NOT_FOUND', status: 404 })],
  ['null thrown value', () => null],
] as const

beforeEach(() => {
  jest.resetAllMocks()
  guard.mockResolvedValue({ orgId: 'server-org', userId: 'server-user' })
  service.mockResolvedValue(result)
  // The hook contract is exercised without rendering or a network transport.
  const { useQuery } = jest.requireMock('@tanstack/react-query')
  useQuery.mockImplementation((options: unknown) => options)
})

describe.each(styles)('$name list-action boundary', ({ args }) => {
  test.each(failures)('redacts %s', async (_name, makeError) => {
    service.mockRejectedValue(makeError())
    expect(await listItemsAction(...args)).toEqual({ success: false, error: 'Failed to list items' })
    expect(JSON.stringify((logger.error as jest.Mock).mock.calls)).not.toContain(sentinel)
    expect(logger.error).toHaveBeenCalledWith('List items action failed', expect.objectContaining({ code: expect.any(String), correlationId: expect.any(String) }))
  })

  test.each([
    ['UNAUTHENTICATED', 'Unauthenticated'], ['NO_ACTIVE_ORG', 'Unauthenticated'],
    ['FORBIDDEN', 'Forbidden'], ['ACCOUNT_LOCKED', 'Account is locked'],
    ['EMAIL_NOT_VERIFIED', 'Email verification required'],
  ])('denies %s with fixed recovery text and no service invocation', async (code, expected) => {
    guard.mockRejectedValue(Object.assign(new Error(sentinel), { code }))
    expect(await listItemsAction(...args)).toEqual({ success: false, error: expected })
    expect(service).not.toHaveBeenCalled()
    expect(JSON.stringify((logger.error as jest.Mock).mock.calls)).not.toContain(sentinel)
  })

  test('redacts arbitrary guard failures before reads', async () => {
    guard.mockRejectedValue(new Error(sentinel))
    expect(await listItemsAction(...args)).toEqual({ success: false, error: 'Failed to list items' })
    expect(service).not.toHaveBeenCalled()
  })

  test('preserves fresh-authentication recovery', async () => {
    guard.mockRejectedValue(Object.assign(new Error(sentinel), { name: 'FreshAuthRequiredError' }))
    expect(await listItemsAction(...args)).toEqual({ success: false, error: 'Fresh authentication required' })
    expect(service).not.toHaveBeenCalled()
  })

  test.each(['NEXT_REDIRECT;replace;/login;307;', 'NEXT_NOT_FOUND'])('preserves framework control flow %s', async digest => {
    const error = Object.assign(new Error(sentinel), { digest })
    guard.mockRejectedValue(error)
    await expect(listItemsAction(...args)).rejects.toBe(error)
    expect(service).not.toHaveBeenCalled()
  })

  test('preserves normalized inputs, server tenant and success envelope', async () => {
    expect(await listItemsAction(...args)).toEqual({ success: true, data: result })
    expect(guard).toHaveBeenCalledWith('inventory.items.read', { resource: 'Item', auditAllowed: false })
    expect(service).toHaveBeenCalledTimes(1)
    expect(service).toHaveBeenCalledWith({ organizationId: 'server-org', q: 'rice', page: 2, pageSize: 5, sortBy: 'createdAt', sortOrder: 'desc' })
  })

  test('keeps empty results successful', async () => {
    const empty = { data: [], total: 0, page: 2, pageSize: 5, totalPages: 1 }
    service.mockResolvedValue(empty)
    expect(await listItemsAction(...args)).toEqual({ success: true, data: empty })
  })

  test('redacts service validation issues and paths', async () => {
    service.mockRejectedValue(new ZodError([{ code: 'custom', path: [sentinel], message: sentinel }]))
    expect(await listItemsAction(...args)).toEqual({ success: false, error: 'Invalid input. Please review the form and try again.' })
    expect(JSON.stringify((logger.error as jest.Mock).mock.calls)).not.toContain(sentinel)
  })
})

test.each([
  [], [null], [42], [{}], [{ organizationId: 'org', page: 0 }],
  [{ organizationId: 'org', pageSize: 201 }], [{ organizationId: 'org', sortBy: sentinel }],
  ['org', 'q', 0, 5], ['org', 'q', 1, 201],
])('rejects malformed arguments %j before guard/service', async (...args) => {
  expect(await listItemsAction(...args)).toEqual({ success: false, error: 'Invalid input. Please review the form and try again.' })
  expect(guard).not.toHaveBeenCalled()
  expect(service).not.toHaveBeenCalled()
})

test('preserves all object filters, sorting and numeric coercion', async () => {
  await listItemsAction({ organizationId: 'foreign-org', page: '3', pageSize: '10', q: ' rice ', categoryId: 'category-a', brandId: 'brand-a', unitId: 'unit-a', taxRateId: 'tax-a', isActive: false, sortBy: 'sellingPrice', sortOrder: 'asc' })
  expect(service).toHaveBeenCalledWith({ organizationId: 'server-org', page: 3, pageSize: 10, q: 'rice', categoryId: 'category-a', brandId: 'brand-a', unitId: 'unit-a', taxRateId: 'tax-a', isActive: false, sortBy: 'sellingPrice', sortOrder: 'asc' })
})

test('preserves positional fallback defaults for nonmatching optional types', async () => {
  await listItemsAction('org', 99, '2', '5')
  expect(service).toHaveBeenCalledWith({ organizationId: 'server-org', page: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' })
})

test('hook query function passes successful action data through unchanged', async () => {
  const query = useListItems({ organizationId: 'org' }) as unknown as { queryFn: () => Promise<unknown>; enabled: boolean }
  expect(query.enabled).toBe(true)
  await expect(query.queryFn()).resolves.toBe(result)
})

test('hook query function exposes only the safe action message', async () => {
  guard.mockRejectedValue(Object.assign(new Error(sentinel), { code: 'FORBIDDEN' }))
  const query = useListItems({ organizationId: 'org' }) as unknown as { queryFn: () => Promise<unknown> }
  await expect(query.queryFn()).rejects.toThrow('Forbidden')
  expect(service).not.toHaveBeenCalled()
})

test('hook keeps queries disabled without organization context', () => {
  const query = useListItems({ organizationId: '' }) as unknown as { enabled: boolean }
  expect(query.enabled).toBe(false)
  expect(service).not.toHaveBeenCalled()
})
