const organizations=['p04-r06-a','p04-r06-b'];
const permissions=['dashboard.read','profile.read','profile.update','inventory.items.read'];
const aliases=['active','foreign','revoked','expired','inactive','locked_indefinite','locked_future','expired_lock','browser_en','browser_fr'];
const providerId='p04r06-synthetic';
const actors=Object.fromEntries(aliases.map(alias=>{const id='p04r06-'+alias;return[alias,{id,email:id+'@example.invalid',organizationId:organizations[alias==='foreign'?1:0],roleId:id+'-role',roleCode:id+'_role',permissions:[...permissions],secondary:{id:id+'-secondary',providerId,accountId:id+'-secondary'}}];}));
module.exports={organizations,permissions,aliases,actors,providerId,modules:['dashboard','inventory','settings']};
