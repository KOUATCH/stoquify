const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../../..');
const edit=(p,fn)=>{const file=path.join(root,p);fs.writeFileSync(file,fn(fs.readFileSync(file,'utf8')))};
edit('components/purchasing/APHistoryWorkbench.tsx',s=>s.replace('row.movementState === "unverified" || row.signedPayableMovement == null','row.movementState !== "recorded" || row.signedPayableMovement == null'));
edit('lib/purchasing/ap-history-presentation.ts',s=>s.replace('if (!summary) return','if (!summary || summary.financialBasis !== "current_remainder_of_filtered_recognized_invoices") return'));
for(const locale of ['en','fr'])edit('messages/'+locale+'.json',s=>s.replace(locale==='fr'?'Paiements libérés vérifiés':'Verified released payments',locale==='fr'?'Paiements libérés enregistrés':'Recorded released payments'));
console.log('Old response shapes cannot present unverified money as a recognized current amount.');
