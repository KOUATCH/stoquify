const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const packet=path.resolve(__dirname,'..'),root=path.resolve(packet,'../../../../..');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'), norm=s=>s.replace(/\r\n/g,'\n');
const baseline=JSON.parse(fs.readFileSync(path.join(packet,'source-before.json')));
const target='actions/item/listItemsAction.ts', entry=baseline.files.find(f=>f.path===target);
for(const f of baseline.files)assert.equal(hash(fs.readFileSync(path.join(packet,f.snapshotPath))),f.sha256,f.path+' snapshot');
const before=norm(fs.readFileSync(path.join(packet,entry.snapshotPath),'utf8'));
const after=norm(fs.readFileSync(path.join(root,target),'utf8'));
const imports=["import { safeLoggedActionErrorMessage } from '@/actions/_shared/safe-action-responses';\n","import { ZodError } from 'zod';\n"];
let reversed=after;for(const imp of imports){assert.equal(reversed.split(imp).length,2,'expected exact new import');reversed=reversed.replace(imp,'');}
const marker='  } catch (error) {';assert.equal(reversed.split(marker).length,2);assert.equal(before.split(marker).length,2);
reversed=reversed.slice(0,reversed.lastIndexOf(marker))+before.slice(before.lastIndexOf(marker));
assert.equal(reversed,before,'only imports and catch may change');
assert(after.includes("{ action: 'actions/item/listItemsAction.ts#listItemsAction' }"));
assert(!after.includes('error.message'));
const changed=baseline.files.filter(f=>hash(fs.readFileSync(path.join(root,f.path)))!==f.sha256).map(f=>f.path);assert.deepEqual(changed,[target]);
const result={reviewedAt:new Date().toISOString(),passed:true,reviewer:'r04_review',preRepairSnapshotsVerified:baseline.files.length,changedBaselineFiles:changed,currentSourceSha256:hash(fs.readFileSync(path.join(root,target))),baselineSha256:entry.sha256,scope:'Two imports and one catch only; complete normalized pre-repair source restored by reversing those changes',unchanged:['normalizeArgs object/positional branches','schema/guard order and permission options','server-owned ctx.orgId override','service invocation/success envelope','consumer hook','shared canonical/logger/services/schema/guards'],responsePolicy:'Explicit fixed fallbacks by reviewed error discriminator; no arbitrary message propagation; existing safe logger/canonical FreshAuth/Next controls',noProductOrTestEditsByReviewer:true};fs.writeFileSync(path.join(__dirname,'SOURCE-REVIEW.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
