type IncidentRouteSources = {
  incidentDetailRouteSourceText: string | null;
  assuranceRouteAccessSourceText?: string;
  assuranceRouteCatalogSourceText?: string;
};

export function hasProtectedPosCashShortageIncidentRoute(input: IncidentRouteSources): boolean {
  const route = input.incidentDetailRouteSourceText ?? "";
  if (route.includes("requirePermission") && route.includes('resource: "WorkflowAssuranceIncident"')) {
    return true;
  }

  const access = input.assuranceRouteAccessSourceText ?? "";
  const data = input.assuranceRouteCatalogSourceText ?? "";
  return (
    /import\s*\{\s*routeByKey,\s*withAssuranceSurfaceAccess\s*\}\s*from\s*"\.\.\/\.\.\/\.\.\/assurance-route-access"/.test(route) &&
    route.includes('const surface = routeByKey("assurance-control-tower-incident")') &&
    /return\s+withAssuranceSurfaceAccess\(\{\s*params,\s*surface,\s*onAllowed:\s*async\s*\(ctx,\s*locale\)\s*=>\s*\{\s*const data = await getAssuranceIncidentDetailData\(\{\s*organizationId:\s*ctx\.orgId,\s*actorPermissions:\s*ctx\.permissions,\s*incidentId,\s*\}\)/.test(route) &&
    access.includes('import { getAssuranceRouteSurface } from "./assurance-route-data-access"') &&
    access.includes("return getAssuranceRouteSurface(key)") &&
    access.includes("const state = await evaluateAssuranceRouteAccess(surface, params, permissionOptions)") &&
    /if\s*\(state\.kind === "blocked"\)\s*\{\s*return state\.node/.test(access) &&
    access.includes("return onAllowed(state.context, state.locale)") &&
    access.includes("context = await requirePermission(surface.permissions[0]!, {") &&
    /\{\s*key:\s*"assurance-control-tower-incident",\s*route:\s*"\/dashboard\/assurance\/control-tower\/incidents\/\[incidentId\]",\s*title:\s*"[^"]+",\s*resource:\s*"WorkflowAssuranceControlTower",\s*permissions:\s*\["controls\.audit\.read"\]/.test(data)
  );
}
