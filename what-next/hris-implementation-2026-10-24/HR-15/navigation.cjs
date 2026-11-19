const fs=require('node:fs');
for(const [file,anchor,addition] of [
 ['components/hris/HrisEmployeeSelfService.tsx','<h2 id="documents-heading" className="text-base font-semibold tracking-normal text-white">Documents</h2>','<Link className="underline" href={`/${locale}/dashboard/people/me/documents`}>{locale === "fr" ? "Mes originaux protégés" : "My protected originals"}</Link>'],
 ['components/hris/HrisPeopleAuthoring.tsx','{!view.canAuthorContract ? (','<Link className="underline" href={localizePath("/dashboard/people/documents?employeeId=" + encodeURIComponent(employee.id), locale)}>{t("Protected employee originals", "Originaux protégés de l’employé")}</Link>\n              ']
]){let s=fs.readFileSync(file,'utf8');if(!s.includes(anchor))throw Error('Missing anchor');s=s.replace(anchor,()=>file.includes('SelfService')?anchor+'\n          '+addition:addition+anchor);fs.writeFileSync(file+'.hr15-candidate',s)}
