import { getSession } from "@/lib/auth-server";
import { db } from "@/prisma/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const session = await getSession();
        const organizationId = (session?.user as any)?.organizationId as string | undefined;

        if (!session?.user || !organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const organization = await db.organization.findFirst({
            where: { id: organizationId },
            select: {
                id: true,
                name: true,
                slug: true,
                industry: true,
                country: true,
                state: true,
                currency: true,
                timezone: true,
                defaultLocale: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return NextResponse.json(organization ? [organization] : []);
    } catch (error) {
        console.error("Error fetching the count:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });

    }
}

export async function POST(request: Request) {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
