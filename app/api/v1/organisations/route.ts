import { getSession } from "@/lib/auth-server";
import { jsonErrorResponse, jsonMethodNotAllowed } from "@/lib/error-handling/route-response";
import { getApiOrganizationById } from "@/services/organization/organization-read.service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const session = await getSession();
        const organizationId = (session?.user as any)?.organizationId as string | undefined;

        if (!session?.user || !organizationId) {
            return jsonErrorResponse("Unauthorized", {
                code: "AUTH_REQUIRED",
                status: 401,
                userMessage: "Unauthenticated",
                endpoint: "GET /api/v1/organisations",
            });
        }

        const organization = await getApiOrganizationById(organizationId);
        return NextResponse.json(organization ? [organization] : []);
    } catch (error) {
        return jsonErrorResponse(error, { endpoint: "GET /api/v1/organisations" });

    }
}

export async function POST(request: Request) {
    return jsonMethodNotAllowed("POST");
}
