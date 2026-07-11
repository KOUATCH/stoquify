import { createUploadthing, type FileRouter } from "uploadthing/next";
import { requireApiModuleAccess, requireApiSessionForCurrentOrg, requireAppPermission } from "@/lib/security/server-authz";
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
    moduleSlug: "dashboard",
    surface: UPLOADTHING_SURFACE,
    surfaceType: "api",
    accessIntent: "write",
    audit: true,
  });
  if (!moduleAccess.allowed) {
    throw new ForbiddenError("Forbidden");
  }

  try {
    requireAppPermission(user, "dashboard.read");
  } catch {
    throw new ForbiddenError("Forbidden");
  }

  return {
    userId: user.id,
    organizationId: authz.organizationId,
  };
}

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  categoryImage: f({ image: { maxFileSize: "1MB" } })
    .middleware(requireUploadAuth)
    .onUploadComplete(
    async ({ metadata }) => {
      return { uploadedBy: metadata.userId, organizationId: metadata.organizationId };
    }
  ),
  itemImageUpload: f({ image: { maxFileSize: "1MB" } })
    .middleware(requireUploadAuth)
    .onUploadComplete(
    async ({ metadata }) => {
      return { uploadedBy: metadata.userId, organizationId: metadata.organizationId };
    }
  ),
  blogImage: f({ image: { maxFileSize: "1MB" } })
    .middleware(requireUploadAuth)
    .onUploadComplete(
    async ({ metadata }) => {
      return { uploadedBy: metadata.userId, organizationId: metadata.organizationId };
    }
  ),
  fileUploads: f({
    image: { maxFileSize: "1MB", maxFileCount: 4 },
    pdf: { maxFileSize: "1MB", maxFileCount: 4 },
    "application/msword": { maxFileSize: "1MB", maxFileCount: 4 }, // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "1MB",
      maxFileCount: 4,
    }, // .docx
    "application/vnd.ms-excel": { maxFileSize: "1MB", maxFileCount: 4 }, // .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      maxFileSize: "1MB",
      maxFileCount: 4,
    }, // .xlsx
    "application/vnd.ms-powerpoint": { maxFileSize: "1MB", maxFileCount: 4 }, // .ppt
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      { maxFileSize: "1MB", maxFileCount: 4 }, // .pptx
    "text/plain": { maxFileSize: "1MB", maxFileCount: 4 }, // .txt

    // Archive types
    "application/gzip": { maxFileSize: "1MB", maxFileCount: 4 },
    "application/zip": { maxFileSize: "1MB", maxFileCount: 4 },
  })
    .middleware(requireUploadAuth)
    .onUploadComplete(async ({ metadata }) => {
    return { uploadedBy: metadata.userId, organizationId: metadata.organizationId };
  }),
  mailAttachments: f({
    image: { maxFileSize: "1MB", maxFileCount: 4 },
    pdf: { maxFileSize: "1MB", maxFileCount: 4 },
    "application/msword": { maxFileSize: "1MB", maxFileCount: 4 }, // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "1MB",
      maxFileCount: 4,
    }, // .docx
    "application/vnd.ms-excel": { maxFileSize: "1MB", maxFileCount: 4 }, // .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      maxFileSize: "1MB",
      maxFileCount: 4,
    }, // .xlsx
    "application/vnd.ms-powerpoint": { maxFileSize: "1MB", maxFileCount: 4 }, // .ppt
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      { maxFileSize: "1MB", maxFileCount: 4 }, // .pptx
    "text/plain": { maxFileSize: "1MB", maxFileCount: 4 }, // .txt

    // Archive types
    "application/gzip": { maxFileSize: "1MB", maxFileCount: 4 },
    "application/zip": { maxFileSize: "1MB", maxFileCount: 4 },
  })
    .middleware(requireUploadAuth)
    .onUploadComplete(async ({ metadata }) => {
    return { uploadedBy: metadata.userId, organizationId: metadata.organizationId };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
