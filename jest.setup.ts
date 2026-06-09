import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock Prisma
jest.mock('@/prisma/db', () => ({
  db: {
    $transaction: jest.fn(),
    item: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    brand: {
      findMany: jest.fn(),
    },
    unit: {
      findMany: jest.fn(),
    },
    taxRate: {
      findMany: jest.fn(),
    },
  },
}))

// Mock file upload utilities
jest.mock('@uploadthing/react', () => ({
  useUploadThing: jest.fn(() => ({
    startUpload: jest.fn(),
    isUploading: false,
  })),
}))

// Mock notification system
jest.mock('@/components/notifications/NotificationProvider', () => ({
  useNotifications: () => ({
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    operationStart: jest.fn(() => 'test-operation-id'),
    operationComplete: jest.fn(),
  }),
}))

// Mock SKU generation
jest.mock('@/lib/generateSKU', () => ({
  generateSimpleSKU: jest.fn(() => 'TEST-SKU-123'),
}))

// Mock slug generation
jest.mock('@/lib/generateSlug', () => ({
  generateSlug: jest.fn(() => 'test-product-slug'),
}))

// Mock inventory utilities
jest.mock('@/lib/inventory/update-inventory-levels', () => ({
  updateInventoryLevels: jest.fn(),
}))

// Mock revalidation
jest.mock('@/lib/item/revalidation', () => ({
  revalidateItem: jest.fn(),
}))

// Suppress console warnings in tests
const originalConsoleError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalConsoleError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalConsoleError
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve('')),
  },
  writable: true,
})

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))