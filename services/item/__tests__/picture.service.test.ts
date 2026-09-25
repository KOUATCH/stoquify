/** @jest-environment node */
import { createHash, createCipheriv, randomBytes } from "node:crypto"
import { db } from "@/prisma/db"
import { claimItemPictures, deleteUnattachedPicture, readItemPicture, uploadItemPicture, validatePictureBytes } from "@/services/media/picture.service"

const mockUpload = jest.fn()
const mockDelete = jest.fn()
const mockSigned = jest.fn()
jest.mock("uploadthing/server", () => ({
  UTApi: jest.fn(() => ({ uploadFiles: mockUpload, deleteFiles: mockDelete, generateSignedURL: mockSigned })),
  UTFile: class extends File { customId: string; constructor(parts: BlobPart[], name: string, options: FilePropertyBag & {customId: string}) { super(parts,name,options); this.customId=options.customId } },
}))
jest.mock("@/prisma/db", () => ({ db: { pictureAsset: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findFirst: jest.fn() } } }))
const assets = db.pictureAsset as unknown as {create: jest.Mock; update: jest.Mock; updateMany: jest.Mock; findFirst: jest.Mock}
const id = "11111111-1111-4111-8111-111111111111"
const reference = "/api/media/" + id
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD7sAAAAASUVORK5CYII=", "base64")
const originalFetch = global.fetch
beforeEach(() => { jest.clearAllMocks(); process.env.UPLOADTHING_TOKEN="test-token"; assets.updateMany.mockResolvedValue({count:1}); mockDelete.mockResolvedValue({success:true}) })
afterEach(() => { global.fetch=originalFetch })

it("uploads only ciphertext and persists an owned durable reference", async () => {
  mockUpload.mockImplementation(async (file: File & {customId:string}) => ({data:{key:"key-1",ufsUrl:"https://app.ufs.sh/f/key-1",size:file.size,customId:file.customId},error:null}))
  const result=await uploadItemPicture(new File([png],"image.png",{type:"image/png"}),"org-1","user-1")
  expect(result).toMatch(/^\/api\/media\/[0-9a-f-]+$/)
  expect(assets.create).toHaveBeenCalledWith({data:expect.objectContaining({organizationId:"org-1",createdById:"user-1",sha256:createHash("sha256").update(png).digest("hex")})})
  expect(mockUpload).toHaveBeenCalledWith(expect.any(File),{acl:"public-read",contentDisposition:"attachment"})
  const uploaded = mockUpload.mock.calls[0][0] as File
  expect(Buffer.from(await uploaded.arrayBuffer())).not.toEqual(png)
  expect(uploaded.type).toBe("application/octet-stream")
  expect(assets.update).toHaveBeenCalledWith(expect.objectContaining({data:{providerKey:"key-1",providerUrl:"https://app.ufs.sh/f/key-1",status:"ready"}}))
})
it("rejects forged content and oversize files before provider writes", async () => {
  expect(()=>validatePictureBytes(Buffer.from("not a png file"),"image/png")).toThrow("valid")
  await expect(uploadItemPicture({size:5*1024*1024,type:"image/png",arrayBuffer:jest.fn()} as unknown as File,"org-1","user-1")).rejects.toThrow("4 MB")
  expect(mockUpload).not.toHaveBeenCalled()
})
it("does not mark a provider failure as a completed upload", async () => {
  mockUpload.mockResolvedValue({data:null,error:{code:"FAILED"}})
  await expect(uploadItemPicture(new File([png],"image.png",{type:"image/png"}),"org-1","user-1")).rejects.toThrow("unavailable")
  expect(assets.update).not.toHaveBeenCalled()
})
it("rejects another tenant's, deleted, or missing asset before attachment", async () => {
  assets.updateMany.mockResolvedValue({count:0})
  await expect(claimItemPictures(db as never,"org-1",[reference])).rejects.toThrow("unavailable")
  expect(assets.updateMany).toHaveBeenCalledWith({where:{id,organizationId:"org-1",entityType:"item",status:"ready"},data:{attachedAt:expect.any(Date)}})
})
it("accepts unchanged legacy references but rejects new arbitrary URLs", async () => {
  await claimItemPictures(db as never,"org-1",["/uploads/org-1/old.png"],["/uploads/org-1/old.png"])
  await expect(claimItemPictures(db as never,"org-1",["https://example.com/arbitrary.png"])).rejects.toThrow("Upload an image")
})
it("does not fetch or disclose an asset from another tenant", async () => {
  assets.findFirst.mockResolvedValue(null)
  await expect(readItemPicture(id,"org-other")).rejects.toThrow("not found")
  expect(mockSigned).not.toHaveBeenCalled()
})
function encryptedFixture() {
  const key=randomBytes(32), iv=randomBytes(12)
  const cipher=createCipheriv("aes-256-gcm",key,iv)
  cipher.setAAD(Buffer.from(`org-1:${id}`))
  const ciphertext=Buffer.concat([cipher.update(png),cipher.final()])
  assets.findFirst.mockResolvedValue({providerKey:"key-1",providerUrl:"https://app.ufs.sh/f/key-1",byteLength:png.length,sha256:createHash("sha256").update(png).digest("hex"),mimeType:"image/png",encryptionKey:key.toString("base64"),encryptionIv:iv.toString("base64"),encryptionTag:cipher.getAuthTag().toString("base64")})
  return ciphertext
}
it("decrypts authenticated bytes and verifies integrity", async () => {
  global.fetch=jest.fn().mockResolvedValue(new Response(encryptedFixture()))
  expect((await readItemPicture(id,"org-1")).bytes).toEqual(new Uint8Array(png))
})
it("rejects modified provider ciphertext", async () => {
  const ciphertext=encryptedFixture(); ciphertext[0]^=1
  global.fetch=jest.fn().mockResolvedValue(new Response(ciphertext))
  await expect(readItemPicture(id,"org-1")).rejects.toThrow("unavailable")
})
it("never deletes an attached or foreign asset", async () => {
  assets.findFirst.mockResolvedValue(null)
  await expect(deleteUnattachedPicture(reference,"org-1","user-1")).rejects.toThrow("not found")
  expect(mockDelete).not.toHaveBeenCalled()
})
it("serializes deletion against attachment and keeps a retryable tombstone", async () => {
  assets.findFirst.mockResolvedValue({status:"ready"})
  await deleteUnattachedPicture(reference,"org-1","user-1")
  expect(assets.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({organizationId:"org-1",createdById:"user-1",attachedAt:null})}))
  expect(mockDelete).toHaveBeenCalledWith(id,{keyType:"customId"})
  expect(assets.update).toHaveBeenCalledWith({where:{id},data:{status:"deleted"}})
})
