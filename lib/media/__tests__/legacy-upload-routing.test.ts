import { decodeLegacyPath, isPrivateUploadOptimizerTarget, legacyUploadDestination } from "../legacy-upload-routing"

describe("legacy upload routing", () => {
  test.each([
    ["/images/cabin-1.jpg", "/api/uploads/cmp_org_005/a032d164-c607-4d66-9050-367cf45f0008.jpg"],
    ["/images/cabin-2.jpg", "/api/uploads/cmp_org_005/f2f43248-c73b-4104-a865-e0f02c2b0ace.jpg"],
    ["/images/profile.jpg", "/api/uploads/cmp_org_005/56492210-f588-4db0-a970-f245e574ab06.jpg"],
    ["/IMAGES/PROFILE.JPG", "/api/uploads/cmp_org_005/56492210-f588-4db0-a970-f245e574ab06.jpg"],
    ["/%69mages%2Fprofile.jpg", "/api/uploads/cmp_org_005/56492210-f588-4db0-a970-f245e574ab06.jpg"],
    ["/%2569mages/profile.jpg", "/api/uploads/cmp_org_005/56492210-f588-4db0-a970-f245e574ab06.jpg"],
    ["/images\\profile.jpg", "/api/uploads/cmp_org_005/56492210-f588-4db0-a970-f245e574ab06.jpg"],
    ["/x/..%2Fimages/profile.jpg", "/api/uploads/cmp_org_005/56492210-f588-4db0-a970-f245e574ab06.jpg"],
    ["/images/profile.jpg::$DATA", "/api/uploads/cmp_org_005/56492210-f588-4db0-a970-f245e574ab06.jpg"],
    ["/images/profile.jpg%3A%3A%24DATA", "/api/uploads/cmp_org_005/56492210-f588-4db0-a970-f245e574ab06.jpg"],
    ["/images/profile.jpg.", "/api/uploads/cmp_org_005/56492210-f588-4db0-a970-f245e574ab06.jpg"],
    ["/images/profile.jpg%20", "/api/uploads/cmp_org_005/56492210-f588-4db0-a970-f245e574ab06.jpg"],
  ])("preserves private alias %s through its fixed tenant guard", (pathname, destination) => {
    expect(legacyUploadDestination(pathname)).toBe(destination)
  })

  test.each([
    "/uploads/org-1/item.png", "/Uploads/org-1/item.png",
    "/%75ploads/org-1/item.png", "/uploads%2Forg-1%2Fitem.png",
    "/%2575ploads/org-1/item.png", "/uploads/org-1/%69tem.png",
    "/uploads\\org-1\\item.png",
    "/x/..%2Fuploads/org-1/item.png", "/%2e%2Fuploads/org-1/item.png", "/%2Fuploads/org-1/item.png",
  ])("routes %s through the guarded API", pathname => {
    expect(legacyUploadDestination(pathname)).toBe("/api/uploads/org-1/item.png")
  })

  test.each(["/public-control.png", "/uploads-other/org/item.png", "/api/uploads/org/item.png", "/images/profile.jpg-other", "/images/cabin-3.jpg"])('leaves %s outside the legacy rewrite', pathname => {
    expect(legacyUploadDestination(pathname)).toBeNull()
  })

  test.each(["/%zz", "/%", "/%252525252525252575ploads/org/item.png"])('refuses malformed or excessive decoding: %s', pathname => {
    expect(decodeLegacyPath(pathname)).toBeNull()
  })

  it("encodes query/fragment characters as path data in a rewrite", () => {
    expect(legacyUploadDestination("/uploads/org/item%3Fq%3Dx%23f.png")).toBe("/api/uploads/org/item%3Fq%3Dx%23f.png")
  })

  const origin = "http://127.0.0.1:12345"
  test.each([
    "/uploads/org/item.png", "/api/uploads/org/item.png", "/Uploads/org/item.png",
    "/%75ploads%2Forg%2Fitem.png", "/api%2Fuploads/org/item.png",
    "/%2575ploads/org/item.png", "/uploads/org/item.png?width=2#fragment",
    origin + "/uploads/org/item.png", "/%zz", null, "",
    "/x/..%2Fuploads/org/item.png", "/%2e%2Fuploads/org/item.png", "/%2Fuploads/org/item.png",
    "/images/cabin-1.jpg", "/images/cabin-2.jpg", "/images/profile.jpg",
    "/IMAGES/PROFILE.JPG", "/%2569mages/profile.jpg", "/images/profile.jpg%3A%3A%24DATA",
    origin + "/images/profile.jpg", "/images/profile.jpg%20",
  ])("blocks private or invalid optimizer source %s", value => {
    expect(isPrivateUploadOptimizerTarget(value, origin)).toBe(true)
  })

  test.each(["/public-control.png", "/images/logo.png", "https://images.unsplash.com/public.png"])('retains public optimizer source %s', value => {
    expect(isPrivateUploadOptimizerTarget(value, origin)).toBe(false)
  })
})
