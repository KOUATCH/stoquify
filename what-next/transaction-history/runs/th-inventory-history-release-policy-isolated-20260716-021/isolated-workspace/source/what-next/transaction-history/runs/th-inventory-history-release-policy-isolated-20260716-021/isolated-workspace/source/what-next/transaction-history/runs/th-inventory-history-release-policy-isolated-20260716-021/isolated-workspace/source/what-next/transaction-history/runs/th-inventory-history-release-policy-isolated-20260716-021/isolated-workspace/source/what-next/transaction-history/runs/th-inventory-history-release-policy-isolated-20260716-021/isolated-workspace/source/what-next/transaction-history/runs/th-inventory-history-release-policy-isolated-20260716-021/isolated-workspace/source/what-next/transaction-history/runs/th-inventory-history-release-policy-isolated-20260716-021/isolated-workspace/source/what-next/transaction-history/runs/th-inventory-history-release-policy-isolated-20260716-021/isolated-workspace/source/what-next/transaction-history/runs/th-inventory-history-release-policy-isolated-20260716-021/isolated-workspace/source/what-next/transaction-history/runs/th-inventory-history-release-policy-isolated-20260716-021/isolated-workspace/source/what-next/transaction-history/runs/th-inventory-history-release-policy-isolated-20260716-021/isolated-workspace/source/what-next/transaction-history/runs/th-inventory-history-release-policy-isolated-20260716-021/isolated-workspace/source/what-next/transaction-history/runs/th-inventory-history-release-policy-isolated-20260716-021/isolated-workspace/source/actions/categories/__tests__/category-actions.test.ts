jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("@/actions/_shared/safe-action-responses", () => ({
  safeActionErrorMessage: jest.fn(
    (_error: unknown, _context: unknown, fallback: string) => fallback,
  ),
}))

jest.mock("@/lib/security/rbac", () => ({
  assertCanUseOrganization: jest.fn(),
  requirePermission: jest.fn(),
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/category/category.service", () => ({
  createCategory: jest.fn(),
  deleteCategory: jest.fn(),
  getCategoryById: jest.fn(),
  listCategories: jest.fn(),
  updateCategory: jest.fn(),
}))

import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import {
  createCategory as createCategoryService,
  deleteCategory as deleteCategoryService,
  getCategoryById as getCategoryByIdService,
  listCategories,
  updateCategory as updateCategoryService,
} from "@/services/category/category.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  getOrgCategories,
  updateCategory,
} from "../getCategoriesAction"

const mockAssertCanUseOrganization = assertCanUseOrganization as jest.Mock
const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockCreateCategory = createCategoryService as jest.Mock
const mockDeleteCategory = deleteCategoryService as jest.Mock
const mockGetCategoryById = getCategoryByIdService as jest.Mock
const mockListCategories = listCategories as jest.Mock
const mockUpdateCategory = updateCategoryService as jest.Mock

const ctx = {
  orgId: "org-session",
  userId: "user-session",
  permissions: [
    "inventory.categories.read",
    "inventory.categories.create",
    "inventory.categories.update",
    "inventory.categories.delete",
  ],
}

const category = {
  id: "category-1",
  organizationId: "org-session",
  titleEn: "Food",
  titleFr: null,
  title: "Food",
  slug: "food",
  description: null,
  descriptionEn: null,
  descriptionFr: null,
  imageUrl: null,
  parentId: null,
  isActive: true,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  itemCount: 0,
}

describe("category action authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(ctx)
    mockAssertCanUseOrganization.mockResolvedValue(true)
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    mockListCategories.mockResolvedValue({ data: [category], total: 1, page: 1, pageSize: 100, totalPages: 1 })
    mockGetCategoryById.mockResolvedValue(category)
    mockCreateCategory.mockResolvedValue(category)
    mockUpdateCategory.mockResolvedValue(category)
    mockDeleteCategory.mockResolvedValue({ ...category, isActive: false })
  })

  it("uses canonical read permission, trusted tenant context, and module observation for lists", async () => {
    const result = await getOrgCategories("org-session")

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.categories.read", {
      resource: "Category",
    })
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(ctx, "org-session")
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      moduleSlug: "inventory",
      organizationId: "org-session",
      accessIntent: "read",
      surface: "actions/categories/getCategoriesAction.ts#getOrgCategories",
      mode: "observe",
    }))
    expect(mockListCategories).toHaveBeenCalledWith("org-session")
  })

  it("includes resource evidence when reading one category", async () => {
    const result = await getCategoryById("category-1", "org-session")

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.categories.read", {
      resource: "Category",
      resourceId: "category-1",
    })
    expect(mockGetCategoryById).toHaveBeenCalledWith("org-session", "category-1")
  })

  it("audits canonical create permission and writes through the trusted organization", async () => {
    const result = await createCategory({
      organizationId: "org-session",
      titleEn: "Food",
    } as any)

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.categories.create", {
      resource: "Category",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      accessIntent: "write",
      surface: "actions/categories/getCategoriesAction.ts#createCategory",
    }))
    expect(mockCreateCategory).toHaveBeenCalledWith(
      "org-session",
      expect.objectContaining({ titleEn: "Food" }),
    )
  })

  it("rejects cross-organization input before service access", async () => {
    mockAssertCanUseOrganization.mockRejectedValueOnce(new Error("Forbidden"))

    const result = await getOrgCategories("org-other")

    expect(result).toMatchObject({ success: false, error: "Failed to fetch categories", data: [] })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockListCategories).not.toHaveBeenCalled()
  })

  it("uses canonical audited permissions for update and delete mutations", async () => {
    const updated = await updateCategory("category-1", {
      organizationId: "org-session",
      titleEn: "Food Updated",
    } as any)
    const deleted = await deleteCategory("category-1")

    expect(updated.success).toBe(true)
    expect(deleted.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.categories.update", {
      resource: "Category",
      resourceId: "category-1",
      auditAllowed: true,
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.categories.delete", {
      resource: "Category",
      resourceId: "category-1",
      auditAllowed: true,
    })
    expect(mockUpdateCategory).toHaveBeenCalledWith(
      "org-session",
      "category-1",
      expect.objectContaining({ titleEn: "Food Updated" }),
    )
    expect(mockDeleteCategory).toHaveBeenCalledWith("org-session", "category-1")
  })
})
