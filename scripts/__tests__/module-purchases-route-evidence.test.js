const fs = require("fs"), os = require("os"), path = require("path")
const { purchasesRouteEvidence } = require("../module-purchases-route-evidence")
const { buildModuleSurfaceInventory } = require("../module-surface-inventory")
const dir = "app/[locale]/(dashboard)/dashboard/purchases", file = `${dir}/payables/correct/page.tsx`, route = "/dashboard/purchases/payables/correct"
const source = fs.readFileSync(path.join(process.cwd(),file),"utf8")
function fixture() { const root=fs.mkdtempSync(path.join(os.tmpdir(),"purchases-route-evidence-")); fs.mkdirSync(path.join(root,dir),{recursive:true});for(const name of ['purchases-route-access.tsx','purchases-route-data-access.ts'])fs.copyFileSync(path.join(process.cwd(),dir,name),path.join(root,dir,name));return root }
const roots=[]
afterEach(()=>{for(const root of roots.splice(0))fs.rmSync(root,{recursive:true,force:true})})
test('real correction route is traced to its current permission and enforce mode',()=>{
  expect(purchasesRouteEvidence(process.cwd(),file,source,route)).toMatchObject({permission:'purchasing.ap.invoice.post',guard:'withPurchasesSurfaceAccess',observeOrEnforce:'enforce',metadata:{runtimeCertification:false}})
  expect(buildModuleSurfaceInventory(process.cwd()).records.find(row=>row.file===file)).toMatchObject({classification:'mapped',guard:'withPurchasesSurfaceAccess'})
})
test.each(['request','approve','record','recovery'])('payment %s route retains its permission and enforced module boundary',kind=>{
  const paymentFile=`${dir}/payables/payments/${kind}/page.tsx`,paymentRoute=`/dashboard/purchases/payables/payments/${kind}`
  expect(purchasesRouteEvidence(process.cwd(),paymentFile,fs.readFileSync(path.join(process.cwd(),paymentFile),'utf8'),paymentRoute)).toMatchObject({permission:`purchasing.ap.payment.${['record','recovery'].includes(kind)?'release':kind}`,guard:'withPurchasesSurfaceAccess',observeOrEnforce:'enforce',metadata:{runtimeCertification:false}})
})
test.each([
  ['unused call',s=>s.replace('return withPurchasesSurfaceAccess','const unused = withPurchasesSurfaceAccess').replace(/\) \}\)\r?\n\}/,') })\nreturn <div />\n}')],
  ['wrong import',s=>s.replace('"../../purchases-route-access"','"../../untrusted-wrapper"')],
  ['unknown key',s=>s.replace('purchases-invoice-correct','not-registered')],
  ['mutable selection',s=>s.replace('const surface =','let surface =')],
  ['permission mutation',s=>s.replace('return withPurchasesSurfaceAccess','surface.permissions = []\n  return withPurchasesSurfaceAccess')],
  ['aliased mutation',s=>s.replace('return withPurchasesSurfaceAccess','const alias = surface; alias.permissions = []\n  return withPurchasesSurfaceAccess')],
  ['shadowed wrapper',s=>s.replace('return withPurchasesSurfaceAccess','const withPurchasesSurfaceAccess = ({onAllowed}) => onAllowed({});\nreturn withPurchasesSurfaceAccess')],
  ['destructured wrapper shadow',s=>s.replace('({ params }: { params: Promise<{ locale: string }> })','({ params, withPurchasesSurfaceAccess }: any)')],
  ['spread override',s=>s.replace('{ params, surface, onAllowed:','{ params, surface, ...override, onAllowed:')],
  ['computed override',s=>s.replace('{ params, surface, onAllowed:','{ params, surface, ["surface"]: bypass, onAllowed:')],
  ['argument mutation',s=>s.replace('{ params, surface, onAllowed:','{ params: (surface.permissions = [], params), surface, onAllowed:')],
])('does not accept %s as guard evidence',(_name,change)=>expect(purchasesRouteEvidence(process.cwd(),file,change(source),route)).toBeNull())
test.each(['wrapper','plumbing','duplicate-key','empty-permission','route-mismatch','observe'])('handles %s changes honestly',mode=>{
  const root=fixture();roots.push(root);const target=path.join(root,dir,mode==='wrapper'?'purchases-route-access.tsx':'purchases-route-data-access.ts');let text=fs.readFileSync(target,'utf8')
  if(mode==='wrapper')text=text.replace('return state.node','return onAllowed({} as any, "en")')
  if(mode==='plumbing')text=text.replace('return purchasesRouteMap[key]','return purchasesRouteCatalog[0]')
  if(mode==='duplicate-key')text=text.replace('export const purchasesRouteCatalog: PurchasesRouteSurface[] = [','export const purchasesRouteCatalog: PurchasesRouteSurface[] = [{ key: "purchases-invoice-correct", route: "elsewhere", permissions: [] },')
  if(mode==='empty-permission')text=text.replace('permissions: ["purchasing.ap.invoice.post"]','permissions: []')
  if(mode==='route-mismatch')text=text.replace('route: "/dashboard/purchases/payables/correct"','route: "/dashboard/other"')
  if(mode==='observe')text=text.split('\n').map(line=>line.includes('key: "purchases-invoice-correct"')?line.replace('mode: "enforce"','mode: "observe"'):line).join('\n')
  fs.writeFileSync(target,text)
  const result=purchasesRouteEvidence(root,file,source,route)
  if(mode==='observe')expect(result.observeOrEnforce).toBe('observe');else expect(result).toBeNull()
})
