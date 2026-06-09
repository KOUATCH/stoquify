"use server";
import { adminPermissions } from "@/config/permissions";
import { getAuthenticatedUser } from "@/config/useAuth";
import { hasAppPermission } from "@/lib/security/server-authz";
import { db } from "@/prisma/db";
import { Resend } from "resend";

// import { generateNumericToken } from "@/lib/token";
const resend = new Resend(process.env.RESEND_API_KEY);
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

const DEFAULT_USER_ROLE = {
  name: "User",
  roleName: "user",
  description: "Default user role with basic permissions",
  permissions: [
    "dashboard.read",
    "profile.read",
    "profile.update",
    "orders.read",
  ],
};

const ADMIN_USER_ROLE = {
  name: "Admin",
  roleName: "admin",
  description: "Default Admin role with all permissions",
  permissions: adminPermissions
};



export async function getOrgInvites(organizationId:string) {

  try {
    const authUser = await getAuthenticatedUser();
    if (organizationId && organizationId !== authUser.organizationId) {
      return [];
    }

    if (!hasAppPermission(authUser, "users.invite") && !hasAppPermission(authUser, "users.read")) {
      return [];
    }

    const organizationInvites = await db.invite.findMany({
    where:{
      organizationId: authUser.organizationId  
    },
    select: {
      id: true,
      email: true,
      organizationId: true,
      roleId: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      role: {
        select: {
          id: true,
          code: true,
          nameEn: true,
          nameFr: true,
        },
      },
    },
    });
   
    return organizationInvites
  } catch (error) {
    console.error("Error fetching the Invites:", error);
    return [];
  }
}
