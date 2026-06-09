"use server"

import { createManagedTaxRate } from "@/actions/taxRate/tax-rate-management-actions"
import type { TaxRateManagementInput } from "@/actions/taxRate/tax-rate-management-actions"
import type { TaxRateCreateDTO } from "@/types/taxRates"

function normalizeTaxRateInput(data: TaxRateCreateDTO): TaxRateManagementInput {
  return {
    nameEn: data.nameEn ?? data.taxRateName ?? data.name ?? "",
    nameFr: data.nameFr ?? null,
    rate: Number(data.rate ?? 0),
    type: (data.type as TaxRateManagementInput["type"]) ?? "SALES",
    isActive: data.isActive ?? true,
  }
}

const createActionTaxRate = async (data: TaxRateCreateDTO & { organizationId: string }) => {
  if (!data.organizationId) {
    return {
      success: false,
      error: "Organization is required",
      data: null,
    }
  }

  const result = await createManagedTaxRate(data.organizationId, normalizeTaxRateInput(data))

  return {
    success: result.success,
    error: result.error ?? null,
    data: result.data ?? null,
  }
}

export default createActionTaxRate
