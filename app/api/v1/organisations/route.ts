import { jsonAuthzError, jsonErrorResponse, jsonMethodNotAllowed } from "@/lib/error-handling/route-response";
import { requireApiModuleAccess, requireApiSessionForCurrentOrg, requireAppPermission } from "@/lib/security/server-authz";
import { getApiOrganizationById } from "@/services/organization/organization-read.service";
import { NextResponse } from "next/server";

const GET_ORGANISATIONS_ENDPOINT = "GET /api/v1/organisations";

export async function GET() {
    try {
        const authz = await requireApiSessionForCurrentOrg();

        if (authz.error) {
            return jsonAuthzError(authz.error, authz.status, GET_ORGANISATIONS_ENDPOINT);
        }

        const user = authz.session?.user;
        const organizationId = authz.organizationId;

        if (!user || !organizationId) {
            return jsonAuthzError("Unauthorized", 401, GET_ORGANISATIONS_ENDPOINT);
        }

        const moduleAccess = await requireApiModuleAccess({
            organizationId,
            user,
            moduleSlug: "settings",
            surface: GET_ORGANISATIONS_ENDPOINT,
            surfaceType: "api",
            accessIntent: "read",
            audit: true,
        });
        if (!moduleAccess.allowed) {
            return jsonAuthzError(moduleAccess.error, moduleAccess.status, GET_ORGANISATIONS_ENDPOINT);
        }

        try {
            requireAppPermission(user, "MANAGE_SYSTEM_SETTINGS");
        } catch {
            return jsonAuthzError("Forbidden", 403, GET_ORGANISATIONS_ENDPOINT);
        }

        const organization = await getApiOrganizationById(organizationId);
        return NextResponse.json(organization ? [organization] : []);
    } catch (error) {
        return jsonErrorResponse(error, { endpoint: GET_ORGANISATIONS_ENDPOINT });

    }
}

export async function POST() {
    return jsonMethodNotAllowed("POST");
}
