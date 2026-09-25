import type { CommercialModuleSlug } from "./module-control-contracts"

type OperationalDependency = {
  moduleSlug: CommercialModuleSlug
  dependsOnSlug: CommercialModuleSlug
  reason: string
}

/** These edges describe new business work created by a dependent operation.
 * Catalogue dependencies still govern eligibility and required setup separately.
 * Accounting's manual-journal stop leaves mandatory ledger effects available. */
const dependencies: readonly OperationalDependency[] = Object.freeze([
  Object.freeze({
    moduleSlug: "pos",
    dependsOnSlug: "sales",
    reason: "New POS sales create new sales orders.",
  } as const),
])

export function getModuleOperationalDependencies(): readonly OperationalDependency[] {
  return dependencies
}
