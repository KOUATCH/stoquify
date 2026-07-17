import { BusinessRuleError } from "@/services/_shared/action-errors"

import type { ComplianceAdapter } from "../adapter-contract"
import {
  FAKE_SANDBOX_ADAPTER_CODE,
  fakeSandboxComplianceAdapter,
} from "./fake-sandbox"
import {
  CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
  cameroonDgiSandboxComplianceAdapter,
} from "./cameroon-dgi-sandbox"

const complianceAdapters = [
  fakeSandboxComplianceAdapter,
  cameroonDgiSandboxComplianceAdapter,
] as const

export function getComplianceAdapter(adapterKey?: string | null): ComplianceAdapter {
  if (!adapterKey || adapterKey === FAKE_SANDBOX_ADAPTER_CODE) {
    return fakeSandboxComplianceAdapter
  }

  if (adapterKey === CAMEROON_DGI_SANDBOX_ADAPTER_CODE) {
    return cameroonDgiSandboxComplianceAdapter
  }

  throw new BusinessRuleError(
    `Compliance adapter "${adapterKey}" is not wired. Production tax-authority adapters require official specifications, sandbox proof, and expert review before registration.`,
  )
}

export const registeredComplianceAdapters = complianceAdapters
