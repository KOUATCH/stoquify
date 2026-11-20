export function isPOSG0CashOnlyPilot(organizationId: string): boolean {
  const pilotOrganizationId = process.env.AQSTOQFLOW_POS_G0_CASH_ONLY_ORGANIZATION_ID?.trim()
  return Boolean(pilotOrganizationId) && pilotOrganizationId === organizationId
}
