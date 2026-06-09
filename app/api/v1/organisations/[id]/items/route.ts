import { db } from "@/prisma/db";
import { requireApiSessionForOrg } from "@/lib/security/server-authz";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";


export const GET = async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {


    try {
        const orgId = (await params).id;
        const authz = await requireApiSessionForOrg(orgId);
        if (authz.error) {
            return NextResponse.json({ error: authz.error }, { status: authz.status });
        }

        // parse pagination parameters from url
        const searchParams = request.nextUrl.searchParams;
        const pageParams = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
        const limitParams = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10) || 10, 1), 100);


        // check if pagination is requested
        const isPagination = pageParams > 0 && limitParams > 0;
        // const isPagination= pageParams !== null && limitParams !== null;

        if (isPagination) {
            // Fetch items for the organization with pagination
            const page = pageParams;
            const limit = limitParams;
            const skip = (page - 1) * limit;

            // Execute queries in parallel for efficiency
            const [items, totalCount] = await Promise.all([
                db.item.findMany({
                    where: { organizationId: orgId },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    skip: skip,
                    take: limit
                }),
                db.item.count({ where: { organizationId: orgId } })
            ]);

            // Calculate pagination metadata
            const totalPages = Math.ceil(totalCount / limit);
            //  construct response with data and pagination
            const response = {
                data: items,
                pagination: {
                    itemCount: totalCount,
                    page,
                    limit,
                    totalPages
                }
            };
            return new Response(JSON.stringify(response), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            // return all items without PaginationOptions
            const items = await db.item.findMany({
                where: {
                    organizationId: orgId
                },

                orderBy: {
                    createdAt: 'desc'
                }
            });
            const response = {
                data: items,
                pagination: {
                    itemCount: items.length,
                    page: 1,
                    limit: items.length,
                    totalPages: 1

                }
            };
            return new Response(JSON.stringify(response), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('ItemService error:', error);
        throw error;
    }
}
export async function POST(request: Request) {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
