import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getSession } from "@/lib/auth-server";

const f = createUploadthing();

async function requireUploadAuth() {
  const session = await getSession();
  const organizationId = (session?.user as any)?.organizationId as string | undefined
  if (!session?.user?.id || !organizationId) {
    throw new Error("Unauthorized");
  }

  return {
    userId: session.user.id,
    organizationId,
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
