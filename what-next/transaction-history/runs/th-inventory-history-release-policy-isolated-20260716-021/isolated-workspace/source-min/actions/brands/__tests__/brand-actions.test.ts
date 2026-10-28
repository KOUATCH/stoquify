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

jest.mock("@/services/brand/brand.service", () => ({
  createBrand: jest.fn(),
  deleteBrand: jest.fn(),
  getBrandById: jest.fn(),
  listBrands: jest.fn(),
  updateBrand: jest.fn(),
}))

import { assertCanUseOrganization, requirePermission } from "@/lib/security/rbac"
import {
  createBrand as createBrandService,
  deleteBrand as deleteBrandService,
  getBrandById as getBrandByIdService,
  listBrands,
  updateBrand as updateBrandService,
} from "@/services/brand/brand.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  createBrand,
  deleteBrand,
  getBrandById,
  getOrgBrands,
  updateBrand,
} from "../getBrandsAction"

const mockAssertCanUseOrganization = assertCanUseOrganization as jest.Mock
const mockRequirePermission = requirePermission as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockCreateBrand = createBrandService as jest.Mock
const mockDeleteBrand = deleteBrandService as jest.Mock
const mockGetBrandById = getBrandByIdService as jest.Mock
const mockListBrands = listBrands as jest.Mock
const mockUpdateBrand = updateBrandService as jest.Mock

const ctx = {
  orgId: "org-session",
  userId: "user-session",
  permissions: [
    "inventory.brands.read",
    "inventory.brands.create",
    "inventory.brands.update",
    "inventory.brands.delete",
  ],
}

const brand = {
  id: "brand-1",
  organizationId: "org-session",
  nameEn: "Acme",
  nameFr: null,
  brandName: "Acme",
  slug: "acme",
  descriptionEn: null,
  descriptionFr: null,
  logoUrl: null,
  isActive: true,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  itemCount: 0,
}

describe("brand action authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(ctx)
    mockAssertCanUseOrganization.mockResolvedValue(true)
    mockObserveModuleAccess.mockResolvedValue({ allowed: true })
    mockListBrands.mockResolvedValue({ data: [brand], total: 1, page: 1, pageSize: 100, totalPages: 1 })
    mockGetBrandById.mockResolvedValue(brand)
    mockCreateBrand.mockResolvedValue(brand)
    mockUpdateBrand.mockResolvedValue(brand)
    mockDeleteBrand.mockResolvedValue({ ...brand, isActive: false })
  })

  it("uses canonical read permission, trusted tenant context, and module observation for lists", async () => {
    const result = await getOrgBrands("org-session")

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.brands.read", {
      resource: "Brand",
    })
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(ctx, "org-session")
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      moduleSlug: "inventory",
      organizationId: "org-session",
      accessIntent: "read",
      surface: "actions/brands/getBrandsAction.ts#getOrgBrands",
      mode: "observe",
    }))
    expect(mockListBrands).toHaveBeenCalledWith("org-session")
  })

  it("includes resource evidence when reading one brand", async () => {
    const result = await getBrandById("brand-1", "org-session")

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.brands.read", {
      resource: "Brand",
      resourceId: "brand-1",
    })
    expect(mockGetBrandById).toHaveBeenCalledWith("org-session", "brand-1")
  })

  it("audits canonical create permission and writes through the trusted organization", async () => {
    const result = await createBrand({
      organizationId: "org-session",
      nameEn: "Acme",
    } as any)

    expect(result.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.brands.create", {
      resource: "Brand",
      auditAllowed: true,
    })
    expect(mockObserveModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      accessIntent: "write",
      surface: "actions/brands/getBrandsAction.ts#createBrand",
    }))
    expect(mockCreateBrand).toHaveBeenCalledWith(
      "org-session",
      expect.objectContaining({ nameEn: "Acme" }),
    )
  })

  it("rejects cross-organization input before service access", async () => {
    mockAssertCanUseOrganization.mockRejectedValueOnce(new Error("Forbidden"))

    const result = await getOrgBrands("org-other")

    expect(result).toMatchObject({ success: false, error: "Failed to fetch brands", data: [] })
    expect(mockObserveModuleAccess).not.toHaveBeenCalled()
    expect(mockListBrands).not.toHaveBeenCalled()
  })

  it("uses canonical audited permissions for update and delete mutations", async () => {
    const updated = await updateBrand("brand-1", {
      organizationId: "org-session",
      nameEn: "Acme Updated",
    } as any)
    const deleted = await deleteBrand("brand-1")

    expect(updated.success).toBe(true)
    expect(deleted.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.brands.update", {
      resource: "Brand",
      resourceId: "brand-1",
      auditAllowed: true,
    })
    expect(mockRequirePermission).toHaveBeenCalledWith("inventory.brands.delete", {
      resource: "Brand",
      resourceId: "brand-1",
      auditAllowed: true,
    })
    expect(mockUpdateBrand).toHaveBeenCalledWith(
      "org-session",
      "brand-1",
      expect.objectContaining({ nameEn: "Acme Updated" }),
    )
    expect(mockDeleteBrand).toHaveBeenCalledWith("org-session", "brand-1")
  })
})
