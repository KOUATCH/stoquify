export const itemKeys = {
  all: ['items'] as const,
  // Use a stable serialized value for params so the key doesn't churn on object identity
  list: (params?: Record<string, unknown>) =>
    [...itemKeys.all, 'list', JSON.stringify(params ?? {})] as const,
  detail: (id?: string) => [...itemKeys.all, 'detail', id ?? ''] as const,
  org: (organizationId?: string) =>
    [...itemKeys.all, 'org', organizationId ?? ''] as const,
}
