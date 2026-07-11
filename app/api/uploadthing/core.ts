import { createUploadthing, type FileRouter } from "uploadthing/next";
import {
  requireAnyAppPermission,
  requireApiModuleAccess,
  requireApiSessionForCurrentOrg,
} from "@/lib/security/server-authz";
import { AuthRequiredError, ForbiddenError } from "@/services/_shared/action-errors";

const f = createUploadthing();
const UPLOADTHING_SURFACE = "POST /api/uploadthing";

export async function requireUploadAuth() {
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
    .middleware(requireUploadAuth)
    .onUploadComplete(async ({ metadata }) => {
      return {
        uploadedBy: metadata.userId,
        organizationId: metadata.organizationId,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
