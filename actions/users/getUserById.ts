"use server";
import { adminPermissions } from "@/config/permissions";
import { getAuthenticatedUser } from "@/config/useAuth";
import { hasAppPermission, safeUserSelect } from "@/lib/security/server-authz";
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



export async function getUserById(id: string) {
  try {
    const authUser = await getAuthenticatedUser();
    const canReadUsers = hasAppPermission(authUser, "users.read");

    if (id !== authUser.id && !canReadUsers) {
      return null;
    }

    const user = await db.user.findFirst({
      where: {
        id,
        organizationId: authUser.organizationId,
      },
      select: safeUserSelect,
    });
    return user;
  } catch (error) {
    console.log(error);
    return null;
  }
}
 
