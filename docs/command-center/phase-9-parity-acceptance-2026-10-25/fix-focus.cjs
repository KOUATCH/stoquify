const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');const {root,state}=require('./environment.cjs'),s=state();const hash=x=>crypto.createHash('sha256').update(x).digest('hex');const changesPath=path.join(__dirname,'source-changes.json'),changes=JSON.parse(fs.readFileSync(changesPath)),overlayPath=path.join(__dirname,'verified-overlays.json'),overlays=JSON.parse(fs.readFileSync(overlayPath));
const edits=[
 ['components/dashboard/CommandCenterRecovery.tsx',text=>text.replace('useState, useEffect, useTransition','useState, useEffect, useLayoutEffect, useTransition').replace('  const router = useRouter()',`  const contentRoot = useRef<HTMLDivElement>(null)
  const focusToRestore = useRef<string | null>(null)
  const router = useRouter()`).replace('  if (accepted !== snapshot) {',`  if (accepted !== snapshot) {
    const focused = typeof document !== "undefined" ? document.activeElement : null
    focusToRestore.current = focused instanceof HTMLElement && contentRoot.current?.contains(focused)
      ? focused.id || null : null`).replace('  useEffect(() => {',`  useLayoutEffect(() => {
    const id = focusToRestore.current
    focusToRestore.current = null
    // A protected response can replace the snapshot after a drawer has closed.
    // Restore only an equivalent permitted control, without retaining private UI state.
    if (!id || document.activeElement !== document.body) return
    const replacement = document.getElementById(id)
    if (replacement && contentRoot.current?.contains(replacement) && !replacement.matches(":disabled")) {
      replacement.focus()
    } else {
      document.getElementById("dashboard-main-content")?.focus()
    }
  }, [generation])
  useEffect(() => {`).replace('return <div className="dashboard-landing-theme','return <div ref={contentRoot} className="dashboard-landing-theme')],
 ['components/bi/BIProofDrawerHost.tsx',text=>text.replace('  triggerLabel?: string','  triggerId?: string\n  triggerLabel?: string').replace('  triggerLabel,','  triggerId,\n  triggerLabel,').replaceAll('        type="button"','        id={triggerId}\n        type="button"')],
 ['components/owner-war-room/OwnerWarRoomDashboard.tsx',text=>text.replace('              triggerLabel={t.openProof}','              triggerId="owner-brief-proof-trigger"\n              triggerLabel={t.openProof}').replace('                      key={subject.subjectType}','                      key={subject.subjectType}\n                      id={`owner-proof-${subject.subjectType}`}')],
 ['components/daily-habit/__tests__/phase4-release.test.tsx',text=>text+'\n'+`it.each([true, false])("restores focus safely after a protected snapshot replacement (control permitted: %s)", permitted => {
  const { CommandCenterRecovery } = require("@/components/dashboard/CommandCenterRecovery")
  const page = (snapshot: object, show: boolean) => <main id="dashboard-main-content" tabIndex={-1}><CommandCenterRecovery snapshot={snapshot} locale="en">{show ? <button id="proof-focus-fixture">Proof trigger</button> : <p>Access no longer available</p>}</CommandCenterRecovery></main>
  const result = render(page({}, true))
  const original = screen.getByRole("button", {name: "Proof trigger"})
  original.focus()
  result.rerender(page({}, permitted))
  expect(original).not.toBeInTheDocument()
  expect(permitted ? screen.getByRole("button", {name: "Proof trigger"}) : screen.getByRole("main")).toHaveFocus()
})
`]
];
for(const [file,transform] of edits){const target=path.join(root,file),candidate=path.join(s.candidate,file),before=fs.readFileSync(target,'utf8');assert.equal(fs.readFileSync(candidate,'utf8'),before,'Concurrent edit in '+file);let after=transform(before);if(before.includes('\r\n'))after=after.replace(/(?<!\r)\n/g,'\r\n');assert.notEqual(after,before);const backup=path.join(root,'.codex-tmp/phase9-source-before',file);if(!fs.existsSync(backup)){fs.mkdirSync(path.dirname(backup),{recursive:true});fs.writeFileSync(backup,before)}fs.writeFileSync(target,after);fs.writeFileSync(candidate,after);const c=changes.find(r=>r.file===file);if(c)c.after=hash(after);else changes.push({file,before:hash(before),after:hash(after)});const o=overlays.find(r=>r.file===file);if(o)o.verifiedOverlaySha256=hash(after);else overlays.push({file,capturedSha256:hash(before),verifiedOverlaySha256:hash(after),reason:'Preserve keyboard focus after protected snapshot replacement; private state still remounts'})}
fs.writeFileSync(changesPath,JSON.stringify(changes,null,2));fs.writeFileSync(overlayPath,JSON.stringify(overlays,null,2));console.log('Scoped focus restoration and two access-sensitive regression cases added');
