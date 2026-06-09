

"use server";
import { getAuthenticatedUser } from "@/config/useAuth";
import { hasAppPermission, safeUserSelect } from "@/lib/security/server-authz";
import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log";
import { db } from "@/prisma/db";


export async function deleteUser(id: string) {

  try {
    const authUser = await getAuthenticatedUser();

    if (!hasAppPermission(authUser, "users.delete")) {
      return {
        error: "Forbidden",
        status: 403,
        data: null,
      };
    }

    if (id === authUser.id) {
      return {
        error: "You cannot delete your own account",
        status: 400,
        data: null,
      };
    }

    // Use a transaction for atomic operations
    return await db.$transaction(async (tx) => {
     
const user= await tx.user.findFirst({
  where:{id, organizationId: authUser.organizationId},
  select:{
    email:true,
    organizationId:true
  }
})

if (!user) {
  throw new Error("User not found")
}

await tx.invite.deleteMany({
  where:{email:user.email, organizationId:user.organizationId}
});

   const deletedUser=  await tx.user.delete({
      where: {
        id,
      },
      select: safeUserSelect,
    });

    void logSecurityEvent({
      type: SecurityEventType.USER_DELETED,
      userId: authUser.id,
      organizationId: authUser.organizationId,
      resource: id,
      details: { deletedEmail: user.email },
    })

    return {
      ok: true,
  data:deletedUser
    };

    })
} catch (error) {
    console.error("Error deleting user:", error);
    return {
      error: `Something went wrong, Please try again`,
      status: 500,
      data: null,
    };
}}
