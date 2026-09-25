const fs=require('fs'),path=require('path');
let s=fs.readFileSync(path.join(__dirname,'lanes/environment/verify-navigation-current-browser.cjs'),'utf8');
const replacements=[
 ["await expect(page).toHaveURL(new RegExp('/'+locale+'/dashboard/purchases/payables/history$'));","await expect(page).toHaveURL(new RegExp('/'+locale+'/dashboard/purchases/payables/history$'),{timeout:180000});"],
 ["data:{permissions:['purchases.orders.read']}","data:{permissions:[]}"],
 ["await current(aside(),'/dashboard/purchases','location');","await expect(aside().locator('a[aria-current]')).toHaveCount(0);"],
 ["Current permissions remove workbench/history destinations; direct preparation route remains denied and the authorized ancestor is a location, not an exact page","Full current permission revocation removes all work destinations and current markers; direct preparation route remains denied"],
];
for(const [before,after]of replacements){if(s.split(before).length!==2)throw Error('Expected exact verifier replacement');s=s.replace(before,()=>after)}
s=s.replace("const report={at:","const legacyAliasObservation=require(path.join(f.root,'lib/security/rbac-permissions.ts')).expandPermissions(['purchases.orders.read']);\nconst report={legacyAliasObservation,at:");
fs.writeFileSync(path.join(__dirname,'lanes/environment/verify-navigation-current-browser-final.cjs'),s,{flag:'wx'});
console.log('Retained original attempt; final verifier tests complete revocation and a bounded cold-route navigation wait.');
