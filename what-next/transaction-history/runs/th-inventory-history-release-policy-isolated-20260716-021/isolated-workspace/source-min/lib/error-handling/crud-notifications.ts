import type { NotificationCategory } from '@/components/notifications/NotificationSystem'

export const CRUD_MUTATION_NOTIFICATION_EVENT = 'stockflow:crud-mutation-notification'

export type CrudOperation =
  | 'create'
  | 'update'
  | 'delete'
  | 'archive'
  | 'restore'
  | 'add'
  | 'toggle'
  | 'start'
  | 'stop'
  | 'approve'
  | 'cancel'
  | 'close'
  | 'open'
  | 'receive'
  | 'reserve'
  | 'release'
  | 'resolve'
  | 'reconcile'
  | 'submit'
  | 'finalize'
  | 'complete'
  | 'generate'
  | 'export'
  | 'process'
  | 'login'
  | 'logout'

export type CrudNotificationType = 'success' | 'error' | 'warning' | 'info'

export interface CrudMutationMeta extends Record<string, unknown> {
  operation?: CrudOperation
  entity?: string
  notify?: boolean
  successTitle?: string
  successMessage?: string
  errorTitle?: string
  errorMessage?: string
  category?: NotificationCategory
  priority?: 'low' | 'normal' | 'high'
  duration?: number
  suppressSuccessNotification?: boolean
  suppressErrorNotification?: boolean
}

export interface CrudMutationNotification {
  type: CrudNotificationType
  title: string
  message: string
  category: NotificationCategory
  priority: 'low' | 'normal' | 'high'
  duration: number
}

const OPERATION_LABELS: Record<CrudOperation, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  archive: 'Archived',
  restore: 'Restored',
  add: 'Added',
  toggle: 'Updated',
  start: 'Started',
  stop: 'Stopped',
  approve: 'Approved',
  cancel: 'Cancelled',
  close: 'Closed',
  open: 'Opened',
  receive: 'Received',
  reserve: 'Reserved',
  release: 'Released',
  resolve: 'Resolved',
  reconcile: 'Reconciled',
  submit: 'Submitted',
  finalize: 'Finalized',
  complete: 'Completed',
  generate: 'Generated',
  export: 'Exported',
  process: 'Processed',
  login: 'Signed In',
  logout: 'Signed Out',
}

const ERROR_OPERATION_LABELS: Record<CrudOperation, string> = {
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  archive: 'Archive',
  restore: 'Restore',
  add: 'Add',
  toggle: 'Update',
  start: 'Start',
  stop: 'Stop',
  approve: 'Approve',
  cancel: 'Cancel',
  close: 'Close',
  open: 'Open',
  receive: 'Receive',
  reserve: 'Reserve',
  release: 'Release',
  resolve: 'Resolve',
  reconcile: 'Reconcile',
  submit: 'Submit',
  finalize: 'Finalize',
  complete: 'Complete',
  generate: 'Generate',
  export: 'Export',
  process: 'Process',
  login: 'Sign In',
  logout: 'Sign Out',
}

const DELETE_OPERATIONS = new Set<CrudOperation>(['delete', 'archive', 'cancel'])

function titleCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

export function createCrudMutationMeta(
  operation: CrudOperation,
  entity: string,
  overrides: Omit<CrudMutationMeta, 'operation' | 'entity'> = {}
): CrudMutationMeta {
  return {
    operation,
    entity,
    category: DELETE_OPERATIONS.has(operation) ? 'warning' : 'operation',
    ...overrides,
  }
}

function safeString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (value instanceof Error && value.message.trim()) {
    return value.message.trim()
  }

  if (typeof value === 'object' && value !== null) {
    const maybeError = value as {
      userMessage?: unknown
      message?: unknown
      error?: unknown
    }

    return safeString(maybeError.userMessage) ||
      safeString(maybeError.message) ||
      safeString(maybeError.error)
  }

  return undefined
}

export function getFriendlyErrorMessage(error: unknown, fallback = 'The operation could not be completed. Please try again.'): string {
  const message = safeString(error)

  if (!message || message === '[object Object]') {
    return fallback
  }

  return message
}

export function getFailedActionResultError(result: unknown): unknown {
  if (typeof result !== 'object' || result === null) {
    return undefined
  }

  const maybeResult = result as {
    success?: unknown
    error?: unknown
  }

  return maybeResult.success === false ? maybeResult.error || result : undefined
}

export function buildCrudMutationNotification(
  type: CrudNotificationType,
  meta: CrudMutationMeta | undefined,
  error?: unknown
): CrudMutationNotification | null {
  if (meta?.notify === false) {
    return null
  }

  if (type === 'success' && (!meta?.operation || meta.suppressSuccessNotification)) {
    return null
  }

  if (type === 'error' && meta?.suppressErrorNotification) {
    return null
  }

  const operation = meta?.operation
  const entity = titleCase(meta?.entity || 'Operation')
  const hasOperationContext = Boolean(operation || meta?.entity)
  const category = meta?.category || (type === 'error' ? 'error' : 'operation')
  const priority = meta?.priority || (type === 'error' ? 'high' : 'normal')
  const duration = meta?.duration || (type === 'error' ? 9000 : 5000)

  if (type === 'success' && operation) {
    const action = OPERATION_LABELS[operation]

    return {
      type,
      title: meta?.successTitle || `${entity} ${action}`,
      message: meta?.successMessage || `${entity} has been ${action.toLowerCase()} successfully.`,
      category,
      priority,
      duration,
    }
  }

  if (type === 'error') {
    const action = operation ? ERROR_OPERATION_LABELS[operation] : 'Operation'

    return {
      type,
      title: meta?.errorTitle || (hasOperationContext ? `${action} ${entity} Failed` : 'Operation Failed'),
      message: meta?.errorMessage || getFriendlyErrorMessage(error),
      category,
      priority,
      duration,
    }
  }

  return null
}

export function dispatchCrudMutationNotification(notification: CrudMutationNotification | null) {
  if (!notification || typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<CrudMutationNotification>(CRUD_MUTATION_NOTIFICATION_EVENT, {
      detail: notification,
    })
  )
}
