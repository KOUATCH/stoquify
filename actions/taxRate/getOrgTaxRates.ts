"use server"

import { getTaxRateManagementData } from "@/actions/taxRate/tax-rate-management-actions"

const getOrgTaxRates = async (organizationId: string) => {
  const result = await getTaxRateManagementData(organizationId)

  if (!result.success || !result.data) {
    return {
      error: result.error || "Failed to fetch tax rates",
      success: false,
      data: [],
    }
  }

  return {
    error: null,
    success: true,
    data: result.data.taxRates,
  }
}

export default getOrgTaxRates
