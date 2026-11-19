import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();
const UPLOADTHING_SURFACE = "POST /api/uploadthing";

export async function requireUploadAuth() {
  // RootLayout reads upload metadata on public pages. Load the authorization
  // graph only when an upload is actually checked, retaining every guard below.
  const { requireAnyAppPermission, requireApiModuleAccess, requireApiSessionForCurrentOrg } = await import("@/lib/security/server-authz");
  const { AuthRequiredError, ForbiddenError } = await import("@/services/_shared/action-errors");
  const authz = await requireApiSessionForCurrentOrg();
  if (authz.error || !authz.session?.user || !authz.organizationId) {
    throw new AuthRequiredError("Unauthorized");
  }

  const user = authz.session.user;
  const moduleAccess = await requireApiModuleAccess({
    organizationId: authz.organizationId,
    user,
    moduleSlug: "inventory",
    surface: UPLOADTHING_SURFACE,
    surfaceType: "api",
    accessIntent: "write",
    audit: true,
  });
  if (!moduleAccess.allowed) {
    throw new ForbiddenError("Forbidden");
  }

  try {
    requireAnyAppPermission(user, [
      "inventory.items.create",
      "inventory.items.update",
    ]);
  } catch {
    throw new ForbiddenError("Forbidden");
  }

  return {
    userId: user.id,
    organizationId: authz.organizationId,
  };
}

export const ourFileRouter = {
  itemImageUpload: f({ image: { maxFileSize: "1MB" } })
    .middleware(async () => {
      await requireUploadAuth()
      const { BusinessRuleError } = await import("@/services/_shared/action-errors")
      throw new BusinessRuleError("Use the managed image upload control to upload pictures.")
    })
    .onUploadComplete(async () => ({})),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
