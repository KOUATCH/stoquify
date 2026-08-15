export type PeopleRouteSurface = {
  key: string
  route: string
  title: string
  resource: string
  permissions: readonly string[]
  permissionMode?: "single" | "all" | "any"
  noActiveOrgTitle?: string
  noActiveOrgMessage?: string
  permissionDeniedTitle?: string
  permissionDeniedMessage?: string
  noActiveOrgPrimaryHref?: string
  permissionDeniedPrimaryHref?: string
}

export const peopleRouteCatalog: PeopleRouteSurface[] = [
  {
    key: "people-workspace",
    route: "/dashboard/people",
    title: "People workspace",
    resource: "HrisPeopleWorkspace",
    permissions: ["hris.people.read"],
    permissionMode: "any",
    noActiveOrgTitle: "People workspace needs an active organization",
    noActiveOrgMessage:
      "Refresh your session from the dashboard so HRIS people controls can load within the active tenant.",
    permissionDeniedTitle: "People workspace is not available for this role",
    permissionDeniedMessage:
      "People workspace access requires HRIS people read permission. Payroll permissions do not unlock HRIS people truth.",
    noActiveOrgPrimaryHref: "/dashboard",
    permissionDeniedPrimaryHref: "/dashboard",
  },
  {
    key: "people-employee-profile",
    route: "/dashboard/people/[employeeId]",
    title: "Employee profile",
    resource: "HrisEmployeeProfile",
    permissions: ["hris.people.read"],
    permissionMode: "any",
    noActiveOrgTitle: "Employee profile is not available",
    noActiveOrgMessage: "This profile requires HRIS people read permission within the active organization.",
    permissionDeniedTitle: "Employee profile is not available",
    permissionDeniedMessage: "This profile requires HRIS people read permission within the active organization.",
    noActiveOrgPrimaryHref: "/dashboard",
    permissionDeniedPrimaryHref: "/dashboard",
  },
  {
    key: "people-team",
    route: "/dashboard/people/team",
    title: "Managed workforce",
    resource: "HrisManagerSelfService",
    permissions: ["hris.people.read"],
    permissionMode: "any",
    noActiveOrgTitle: "Managed workforce is not available",
    noActiveOrgMessage: "This workspace requires scoped HRIS people access in the active organization.",
    permissionDeniedTitle: "Managed workforce is not available",
    permissionDeniedMessage: "This workspace requires scoped HRIS people access in the active organization.",
    noActiveOrgPrimaryHref: "/dashboard",
    permissionDeniedPrimaryHref: "/dashboard",
  },
  {
    key: "people-me",
    route: "/dashboard/people/me",
    title: "Employee self-service",
    resource: "HrisEmployeeSelfService",
    permissions: ["hris.self_service.read"],
    permissionMode: "any",
    noActiveOrgTitle: "Employee self-service is not available",
    noActiveOrgMessage: "This workspace requires own-record HRIS self-service access in the active organization.",
    permissionDeniedTitle: "Employee self-service is not available",
    permissionDeniedMessage: "This workspace requires own-record HRIS self-service access in the active organization.",
    noActiveOrgPrimaryHref: "/dashboard",
    permissionDeniedPrimaryHref: "/dashboard",
  },
  {
    key: "people-history",
    route: "/dashboard/people/history",
    title: "People history",
    resource: "HrisMovementHistory",
    permissions: ["hris.people.read"],
    permissionMode: "any",
    noActiveOrgTitle: "People history needs an active organization",
    noActiveOrgMessage: "Refresh your dashboard session before loading HRIS movement evidence.",
    permissionDeniedTitle: "People history is not available for this role",
    permissionDeniedMessage: "Movement history visibility requires HRIS people read access.",
    noActiveOrgPrimaryHref: "/dashboard/people",
    permissionDeniedPrimaryHref: "/dashboard/people",
  },
  {
    key: "people-approvals",
    route: "/dashboard/people/approvals",
    title: "Approval inbox",
    resource: "HrisApprovalInbox",
    permissions: ["hris.people.read"],
    permissionMode: "any",
    noActiveOrgTitle: "Approvals need an active organization",
    noActiveOrgMessage: "Refresh your dashboard session before loading HRIS approvals.",
    permissionDeniedTitle: "Approval inbox is not available for this role",
    permissionDeniedMessage: "Approval visibility requires HRIS people read access.",
    noActiveOrgPrimaryHref: "/dashboard/people",
    permissionDeniedPrimaryHref: "/dashboard/people",
  },
]

export const peopleRouteMap: Record<string, PeopleRouteSurface> = Object.fromEntries(
  peopleRouteCatalog.map((entry) => [entry.key, entry]),
)

export const peopleRouteByRoute: Record<string, PeopleRouteSurface> = Object.fromEntries(
  peopleRouteCatalog.map((entry) => [entry.route, entry]),
)

const peopleSurfaceByResource: Record<string, PeopleRouteSurface> = Object.fromEntries(
  peopleRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getPeopleRouteSurface(key: string) {
  return peopleRouteMap[key]
}

export function getPeopleRouteSurfaceByRoute(route: string) {
  return peopleRouteByRoute[route]
}

export function getPeopleRouteSurfaceByResource(resource: string) {
  return peopleSurfaceByResource[resource]
}
