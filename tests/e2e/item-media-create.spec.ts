import { expect, test } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { randomBytes } from "node:crypto"
import sharp from "sharp"

// Leave room for cold development-page compilation; upload itself stays capped at 90 s.
test.setTimeout(420_000)

// Optional functional run after recording cold-start failures on a busy dev host.
// The default run still exercises cold routes and every upload keeps its 90 s cap.
if (process.env.PLAYWRIGHT_WARM_MEDIA_ROUTES === "1") {
  test.beforeAll(async ({request}) => {
    test.setTimeout(600_000)
    for (const [path, status] of [
      ["/en/dashboard/inventory/items",200],
      ["/en/dashboard/inventory/items/create",200],
      ["/api/media/upload",405],
      ["/api/media/00000000-0000-4000-8000-000000000000",404],
    ] as const) {
      const started=Date.now()
      const response=await request.get(path,{timeout:240_000})
      expect(response.status()).toBe(status)
      await response.dispose()
      console.log(JSON.stringify({warmRoute:path,milliseconds:Date.now()-started}))
    }
  })
}

for (const viewport of [{width:1440,height:1100},{width:390,height:844}]) {
  const locale=viewport.width===390?"fr":"en"
  test(`creates and reloads an item with a real encrypted image at ${viewport.width}px (${locale})`, async ({page}) => {
    const png=await sharp(randomBytes(640*512*4),{raw:{width:640,height:512,channels:4}}).png().toBuffer()
    expect(png.length).toBeGreaterThan(1024*1024)
    await page.setViewportSize(viewport)
    await page.goto(`/${locale}/dashboard/inventory/items/create`)
    await page.getByLabel(/Product Name \(English\)/).fill("Media verification " + viewport.width)
    await page.getByRole("button",{name:"Next Step",exact:true}).click()
    const sku="MEDIA-"+viewport.width+"-"+Date.now()
    await page.getByLabel(/SKU \(Stock Keeping Unit\)/).fill(sku)
    await page.getByRole("button",{name:"Next Step",exact:true}).click()
    await expect(page.getByRole("heading",{name:"Pricing & Units"})).toBeVisible()
    await page.getByRole("button",{name:"Next Step",exact:true}).click()
    await expect(page.getByRole("heading",{name:"Inventory Settings"})).toBeVisible()
    await page.getByRole("button",{name:"Next Step",exact:true}).click()
    await expect(page.getByRole("heading",{name:locale==="fr"?"Images du produit":"Product Media"})).toBeVisible()
    const create=page.getByRole("button",{name:locale==="fr"?"Créer l’article":"Create Product",exact:true})
    await expect(create).toBeDisabled()
    const uploaded=page.waitForResponse(response=>response.url().endsWith("/api/media/upload")&&response.request().method()==="POST",{timeout:90_000})
    const uploadStarted=Date.now()
    await page.getByLabel(locale==="fr"?"Choisir une image":"Choose image",{exact:true}).setInputFiles({name:"media-verification.png",mimeType:"image/png",buffer:png})
    const response=await uploaded
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toContain("application/json")
    expect((await response.json()).success).toBe(true)
    await expect(create).toBeEnabled({timeout:90_000})
    console.log(JSON.stringify({locale,imageBytes:png.length,uploadMilliseconds:Date.now()-uploadStarted,transport:"POST /api/media/upload"}))
    const preview=page.getByRole("img",{name:locale==="fr"?"Ajouter une image du produit":"Upload Product Image",exact:true})
    const reference=await preview.getAttribute("src")
    expect(reference).toMatch(/^\/api\/media\//)
    const read=await page.request.get(reference!)
    expect(read.status()).toBe(200)
    expect(await read.body()).toEqual(png)
    await mkdir("what-next/item-media-remediation/browser/upload-timeout",{recursive:true})
    await page.screenshot({path:`what-next/item-media-remediation/browser/upload-timeout/media-${viewport.width}.png`,fullPage:true})
    await create.focus()
    await expect(create).toBeFocused()
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(new RegExp(`/${locale}/dashboard/inventory/items/?$`),{timeout:90_000})
    await page.reload()
    await expect(page.getByText(sku,{exact:true}).first()).toBeVisible({timeout:30_000})
    expect((await page.request.get(reference!)).status()).toBe(200)
    const savedImage=page.locator(`img[src="${reference}"]`).first()
    await expect(savedImage).toBeVisible()
    await expect.poll(()=>savedImage.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBe(640)
    const anonymous=await page.context().browser()!.newContext({storageState:{cookies:[],origins:[]}})
    const denied=await anonymous.request.get(new URL(reference!,page.url()).toString(),{maxRedirects:0})
    expect(denied.status()).toBe(401)
    await anonymous.close()
    await page.screenshot({path:`what-next/item-media-remediation/browser/upload-timeout/saved-${viewport.width}.png`,fullPage:true})
  })
}
