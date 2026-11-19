const fs = require('node:fs');
const p='components/hris/HrisWorkspaceSetup.tsx';
let s=fs.readFileSync(p,'utf8');
s=s.replace('<p>{g.domain} ·','<p>{data.users.find(u => u.id === g.reviewerUserId)?.name || g.reviewerUserId} · {g.domain} ·');
s=s.replace('t("Future, expired or revoked", "Futur, expiré ou révoqué")','g.revokedAt ? t("Revoked", "Révoqué") : new Date(g.effectiveFrom) > new Date() ? t("Future", "Futur") : t("Expired", "Expiré")');
fs.writeFileSync(p,s);
