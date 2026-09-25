const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),root=path.resolve(__dirname,'../../../../..');
const edits=[];
function plan(file,transform){const full=path.join(root,file),before=fs.readFileSync(full,'utf8').replaceAll('\r\n','\n'),after=transform(before);assert.notEqual(before,after,file);edits.push({full,before,after});}
function cut(value,start,end,replacement=''){const a=value.indexOf(start),b=value.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,'Missing bounded edit '+start);return value.slice(0,a)+replacement+value.slice(b);}
plan('services/organization/organization-settings.service.ts',value=>{
  for(const text of ['import { randomUUID } from "crypto"\n','import { adminPermissions } from "@/config/permissions"\n','import { generateSlug } from "@/lib/generateSlug"\n']){assert.ok(value.includes(text));value=value.replace(text,'');}
  value=value.replace('import { Locale as PrismaLocale, PaymentStatus }','import { PaymentStatus }');
  value=cut(value,'function cleanText(', 'export function canReadOrganizations(');
  value=cut(value,'export function canCreateOrganizations(', 'const organizationSettingsSelect', 'export function canCreateOrganizations(_actor: OrganizationSettingsActor) {\n  // A settings update permission does not create a usable owner account.\n  return false\n}\n\n');
  value=cut(value,'export async function createOrganizationForSettings(', 'export async function updateOrganizationCurrencyForOrg(', 'export async function createOrganizationForSettings(\n  _data: CreateOrganizationSettingsInput,\n): Promise<OrganizationManagementRow> {\n  // Retain the legacy boundary for old callers, without creating ownerless tenants.\n  throw new BusinessRuleError("Create the owner account and organization together through owner registration.", "INVALID_TRANSITION")\n}\n\n');
  return value;
});
plan('actions/organization/organization-settings-actions.ts',value=>{
  const a=value.indexOf('export async function createOrganizationSettings('),b=value.indexOf('export async function updateOrganizationSettings(',a);assert.ok(a>=0&&b>a);
  const section=value.slice(a,b).replace('    await requireFreshAuth(300)','    const fresh = await requireFreshAuth(300)').replace('    await observeOrganizationSettingsAccess(','    if (fresh.claims.userId !== ctx.userId || fresh.claims.tenantId !== ctx.orgId) throw new ForbiddenError()\n\n    await observeOrganizationSettingsAccess(');
  const start=section.indexOf('    if (!data.name.trim())'),finish=section.indexOf('    const organization =',start);assert.ok(start>=0&&finish>start);
  const bounded=section.slice(0,start)+section.slice(finish);
  const catchStart=bounded.indexOf('  } catch (error) {');assert.ok(catchStart>=0);
  return value.slice(0,a)+bounded.slice(0,catchStart)+'  } catch (error) {\n    return safeSuccessActionErrorResult(error, { action: "system.organization.create" }, "Open owner registration to create another organization.")\n  }\n}\n\n'+value.slice(b);
});
plan('components/settings/OrganizationManagementTable.tsx',value=>{
  value=cut(value,'import {\n  Dialog,','import {\n  DropdownMenu,','');
  value=value.replace('import { Label } from "@/components/ui/label"\n','').replace('import { Textarea } from "@/components/ui/textarea"\n','').replace('import { useCreateOrganizationSettings, useOrganizationManagementRows }','import { useOrganizationManagementRows }');
  value=value.replace('interface OrganizationManagementTableProps','import OrganizationSetupHandoff, { organizationSetupLabel } from "./OrganizationSetupHandoff"\n\ninterface OrganizationManagementTableProps');
  value=cut(value,'type CreateOrganizationFormState =','const DASHBOARD_SEGMENT');
  value=cut(value,'const CURRENCIES =','const copy =');
  value=cut(value,'function getDefaultCreateForm()','function escapeCsv(');
  value=value.replace('  const [createForm, setCreateForm] = useState<CreateOrganizationFormState>(getDefaultCreateForm)\n','').replace('  const createOrganizationMutation = useCreateOrganizationSettings(organizationId, locale)\n','');
  value=cut(value,'  const updateCreateField =','  const copyOrganizationId =');
  value=value.replaceAll('{t.create}','{organizationSetupLabel(locale)}');
  value=cut(value,'      <Dialog\n','    </>','      <OrganizationSetupHandoff open={createOpen} onOpenChange={setCreateOpen} locale={locale} />\n');
  value=cut(value,'function CreateField({','function SummaryTile({');
  return value;
});
for(const edit of edits)assert.equal(fs.readFileSync(edit.full,'utf8').replaceAll('\r\n','\n'),edit.before,'Source changed during preparation');
for(const edit of edits)fs.writeFileSync(edit.full,edit.after);
console.log(JSON.stringify({changed:edits.map(edit=>path.relative(root,edit.full).replaceAll('\\','/')),scope:'replace ownerless company creation with existing owner-registration handoff'}));
