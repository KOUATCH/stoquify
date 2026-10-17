const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,root,helper}=f;
const {collectAccountingSetupReadinessIssues,markAccountingSetupReady}=require(path.join(root,'services/accounting/accounting-settings.service.ts'));
const file='services/accounting/accounting-settings.service.ts',hash=()=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),stamp=crypto.randomUUID(),result={at:new Date().toISOString(),sourceHashes:{[file]:hash()},syntheticNegativeFixture:true};
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const createOrg=label=>db.organization.create({data:{name:helper.prefix+'Rule-side '+label+' '+stamp,slug:'rule-side-'+label+'-'+stamp,currency:'XAF'}});
 const org=await createOrg('primary'),foreign=await createOrg('foreign'),scope={organizationId:org.id};
 await db.organizationAccountingSettings.create({data:{...scope,accountingEnabled:false,setupStatus:'IN_PROGRESS'}});
 // Intentionally malformed historical-rule fixtures, not a supported configuration or readiness approval.
 const rule=async(organizationId,sides)=>db.postingRule.create({data:{organizationId,code:'NEGATIVE-SIDE',nameEn:'Synthetic negative rule-side fixture',sourceType:'POS_SALE',postingPurpose:'SALE_COMPLETION',lines:{create:sides.map((side,i)=>({organizationId,lineNumber:i+1,side,mappingKey:i?'SALES_REVENUE':'CASH_ON_HAND',amountSource:'SOURCE_AMOUNT'}))}},include:{lines:true}});
 const bad=await rule(org.id,['DEBIT','DEBIT']);await rule(foreign.id,['DEBIT','CREDIT']);
 const issue='Missing active balanced posting rule scaffold for SALE_COMPLETION',before=await collectAccountingSetupReadinessIssues(org.id);assert.ok(before.includes(issue));
 await assert.rejects(()=>markAccountingSetupReady(org.id,undefined,{actorPermissions:['accounting.setup.manage'],lastAuthAt:new Date()}),/not ready/);
 await db.postingRuleLine.update({where:{id:bad.lines.find(l=>l.lineNumber===2).id},data:{side:'CREDIT'}});
 const after=await collectAccountingSetupReadinessIssues(org.id);assert.ok(!after.includes(issue));assert.equal(before.length-after.length,1);assert.ok(after.length>0);
 const settings=await db.organizationAccountingSettings.findUniqueOrThrow({where:{organizationId:org.id}});assert.equal(settings.setupStatus,'IN_PROGRESS');assert.equal(settings.accountingEnabled,false);
 for(const model of ['journalEntry','payment','closePackExport'])assert.equal(await db[model].count({where:scope}),0);
 Object.assign(result,{passed:true,fixture:{organizationId:org.id,foreignOrganizationId:foreign.id,postingRuleId:bad.id},oneSidedRuleRejected:true,foreignBalancedRuleCannotSatisfyTenant:true,repairRemovesOnlyCorrespondingIssue:true,remainingSetupIssues:after.length,noActivationOrFinancialEffects:true});
}
main().catch(e=>{result.passed=false;result.error=f.safe(e)}).finally(async()=>{result.sourceStable=hash()===result.sourceHashes[file];result.passed=!!result.passed&&result.sourceStable;const receipt='setup-side-persistence-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,receipt),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({receipt,...result}));await db.$disconnect();process.exitCode=result.passed?0:1});
