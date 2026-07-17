// Query key factory for items
export const ItemKeys = {
  all: ["items"] as const,
  lists: () => [...ItemKeys.all, "list"] as const,
  list: (filters: string) => [...ItemKeys.lists(), { filters }] as const,
  details: () => [...ItemKeys.all, "detail"] as const,
  detail: (id: string) => [...ItemKeys.details(), id] as const,
  orgItems: (orgId: string) => [...ItemKeys.all, "org", orgId] as const,
   briefOrgItems: (orgId: string) => [...ItemKeys.orgItems(orgId), "brief"] as const,
  completeOrgItems: (orgId: string) => [...ItemKeys.orgItems(orgId), "complete"] as const,
}
export const ItemKeysWithOrg = {
  ...ItemKeys,
  orgItems: (orgId: string) => [...ItemKeys.all, "org", orgId] as const,
  briefOrgItems: (orgId: string) => [...ItemKeys.orgItems(orgId), "brief"] as const,
  completeOrgItems: (orgId: string) => [...ItemKeys.orgItems(orgId), "complete"] as const,
}
export const BrandKeys = {
  all: ["brands"] as const,
  lists: () => [...BrandKeys.all, "list"] as const,
  list: (filters: string) => [...BrandKeys.lists(), { filters }] as const,
  details: () => [...BrandKeys.all, "detail"] as const,
  detail: (id: string) => [...BrandKeys.details(), id] as const,
  orgBrands: (orgId: string) => [...BrandKeys.all, "org", orgId] as const, briefOrgBrands: (orgId: string) => [...BrandKeys.orgBrands(orgId), "brief"] as const,
  completeOrgBrands: (orgId: string) => [...BrandKeys.orgBrands(orgId), "complete"] as const,
}

export const CategoryKeys = {
  all: ["categories"] as const,
  lists: () => [...CategoryKeys.all, "list"] as const,
  list: (filters: string) => [...CategoryKeys.lists(), { filters }] as const,
  details: () => [...CategoryKeys.all, "detail"] as const,
  detail: (id: string) => [...CategoryKeys.details(), id] as const,
  orgCategories: (orgId: string) => [...CategoryKeys.all, "org", orgId] as const, briefOrgCategories: (orgId: string) => [...CategoryKeys.orgCategories(orgId), "brief"] as const,
  completeOrgCategories: (orgId: string) => [...CategoryKeys.orgCategories(orgId), "complete"] as const,
}

export const UnitKeys = {
  all: ["units"] as const,
  lists: () => [...UnitKeys.all, "list"] as const,
  list: (filters: string) => [...UnitKeys.lists(), { filters }] as const,
  details: () => [...UnitKeys.all, "detail"] as const,
  detail: (id: string) => [...UnitKeys.details(), id] as const,
  orgUnits: (orgId: string) => [...UnitKeys.all, "org", orgId] as const, briefOrgUnits: (orgId: string) => [...UnitKeys.orgUnits(orgId), "brief"] as const,
  completeOrgUnits: (orgId: string) => [...UnitKeys.orgUnits(orgId), "complete"] as const,
}

export const TaxRateKeys = {
  all: ["taxRates"] as const,
  lists: () => [...TaxRateKeys.all, "list"] as const,
  list: (filters: string) => [...TaxRateKeys.lists(), { filters }] as const,
  details: () => [...TaxRateKeys.all, "detail"] as const,
  detail: (id: string) => [...TaxRateKeys.details(), id] as const,
  orgTaxRates: (orgId: string) => [...TaxRateKeys.all, "org", orgId] as const, briefOrgTaxRates: (orgId: string) => [...TaxRateKeys.orgTaxRates(orgId), "brief"] as const,
  completeOrgTaxRates: (orgId: string) => [...TaxRateKeys.orgTaxRates(orgId), "complete"] as const,
}

export const LocationKeys = {
  all: ["locations"] as const,
  lists: () => [...LocationKeys.all, "list"] as const,
  list: (filters: string) => [...LocationKeys.lists(), { filters }] as const,
  details: () => [...LocationKeys.all, "detail"] as const,
  detail: (id: string) => [...LocationKeys.details(), id] as const,
  orgLocations: (orgId: string) => [...LocationKeys.all, "org", orgId] as const, briefOrgLocations: (orgId: string) => [...LocationKeys.orgLocations(orgId), "brief"] as const,
  completeOrgLocations: (orgId: string) => [...LocationKeys.orgLocations(orgId), "complete"] as const,
}

export const SupplierKeys = {
  all: ["suppliers"] as const,
  lists: () => [...SupplierKeys.all, "list"] as const,
  list: (filters: string) => [...SupplierKeys.lists(), { filters }] as const,
  details: () => [...SupplierKeys.all, "detail"] as const,
  detail: (id: string) => [...SupplierKeys.details(), id] as const,
  orgSuppliers: (orgId: string) => [...SupplierKeys.all, "org", orgId] as const, briefOrgSuppliers: (orgId: string) => [...SupplierKeys.orgSuppliers(orgId), "brief"] as const,
  completeOrgSuppliers: (orgId: string) => [...SupplierKeys.orgSuppliers(orgId), "complete"] as const,
}

export const CustomerKeys = {
  all: ["customers"] as const,
  lists: () => [...CustomerKeys.all, "list"] as const,
  list: (filters: string) => [...CustomerKeys.lists(), { filters }] as const,
  details: () => [...CustomerKeys.all, "detail"] as const,
  detail: (id: string) => [...CustomerKeys.details(), id] as const,
  orgCustomers: (orgId: string) => [...CustomerKeys.all, "org", orgId] as const,
  briefOrgCustomers: (orgId: string) => [...CustomerKeys.orgCustomers(orgId), "brief"] as const,
  completeOrgCustomers: (orgId: string) => [...CustomerKeys.orgCustomers(orgId), "complete"] as const,
}

export const LocationKeys2 = {
  detail: (id: string) => ["location", "detail", id] as const,
  lists: () => ["location", "list"] as const,
  orgLocations: (orgId: string) => ["location", "org", orgId] as const,
};
