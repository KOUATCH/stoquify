export type PermissionMode = "single" | "all" | "any"
export type PosRouteText = string | { en: string; fr: string }

export type PosRouteSurface = {
  key: string
  route: string
  title: string
  resource: string
  permissions: readonly string[]
  permissionMode?: PermissionMode
  module?: never
  noActiveOrgTitle?: PosRouteText
  noActiveOrgMessage?: PosRouteText
  permissionDeniedTitle?: PosRouteText
  permissionDeniedMessage?: PosRouteText
  noActiveOrgPrimaryHref?: string
  permissionDeniedPrimaryHref?: string
}

export const posRouteCatalog: PosRouteSurface[] = [
  {
    key: "pos-dashboard",
    route: "/dashboard/pos",
    title: "POS",
    resource: "POSPage",
    permissions: ["OPERATE_POS"],
    permissionMode: "single",
    noActiveOrgTitle: { en: "Choose an organization to open the point of sale", fr: "Choisissez une organisation pour ouvrir le point de vente" },
    permissionDeniedTitle: { en: "Point of sale access is required", fr: "Un accès au point de vente est nécessaire" },
    permissionDeniedMessage: { en: "Your current role cannot operate the point of sale. Ask your administrator for access or switch to an authorized account.", fr: "Votre rôle actuel ne permet pas d’utiliser le point de vente. Demandez un accès à votre administrateur ou utilisez un compte autorisé." },
  },
  {
    key: "pos-activity",
    route: "/dashboard/pos/activity",
    title: "POS activity",
    resource: "POSActivityPage",
    permissions: ["OPERATE_POS", "pos.use", "pos.read"],
    permissionMode: "any",
    noActiveOrgTitle: { en: "Choose an organization to view POS activity", fr: "Choisissez une organisation pour consulter l’activité de caisse" },
    permissionDeniedTitle: { en: "Point of sale access is required", fr: "Un accès au point de vente est nécessaire" },
    permissionDeniedMessage: { en: "Your current role cannot view POS activity. Ask your administrator for access.", fr: "Votre rôle actuel ne permet pas de consulter l’activité de caisse. Demandez un accès à votre administrateur." },
  },
]

export const posRouteMap: Record<string, PosRouteSurface> = Object.fromEntries(
  posRouteCatalog.map((entry) => [entry.key, entry]),
)

export const posRouteByRoute: Record<string, PosRouteSurface> = Object.fromEntries(
  posRouteCatalog.map((entry) => [entry.route, entry]),
)

const posSurfaceByResource: Record<string, PosRouteSurface> = Object.fromEntries(
  posRouteCatalog.map((entry) => [entry.resource, entry]),
)

export function getPosRouteSurface(key: string) {
  return posRouteMap[key]
}

export function getPosRouteSurfaceByRoute(route: string) {
  return posRouteByRoute[route]
}

export function getPosRouteSurfaceByResource(resource: string) {
  return posSurfaceByResource[resource]
}
