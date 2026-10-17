const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),root=path.resolve(__dirname,'../../..');
const files=['components/evidence/ProofTrailDrawer.tsx','components/bi/BIProofDrawerHost.tsx','components/cash-command/CashCommandDashboard.tsx'];
const baseline=Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
fs.writeFileSync(path.join(__dirname,'evidence/proof-portal-source-before.json'),JSON.stringify(baseline,null,2)+'\n',{flag:'wx'});
function edit(file,work){const target=path.join(root,file),before=fs.readFileSync(target,'utf8'),after=work(before);if(before===after)throw Error('No change: '+file);const pending=target+'.pending-'+crypto.randomUUID();fs.writeFileSync(pending,after,{flag:'wx'});fs.renameSync(pending,target);}
edit(files[0],source=>{
 source=source.replace('import type { ReactNode }','import type { CSSProperties, ReactNode }');
 source=source.replace('  error?: string | null\n','  error?: string | null\n  locale?: "en" | "fr"\n');
 const marker='function EmptyState() {';
 source=source.replace(marker,()=>`// Portals do not inherit the dashboard ancestor. Use the same product-token
// aliases locally, without adding the dashboard page's positioning or backdrop.
const portalTokens = Object.fromEntries([
  "canvas", "border-subtle", "text", "text-soft", "info", "info-soft", "brand", "brand-soft",
  "gold", "gold-soft", "success", "success-soft", "danger", "danger-soft", "spruce", "spruce-soft",
].map(token => ["--dash-" + token, "var(--product-" + token + ")"])) as CSSProperties

const drawerCopy = {
  en: { title: "Proof Trail", description: "Evidence chain, blockers, redactions, and next actions for the selected record.", close: "Close proof",
    empty: "Proof trail unavailable. Select a supported record to inspect its evidence chain.", loading: "Loading proof trail.",
    nodes: "Evidence Nodes", edges: "Evidence Edges", blockers: "Blockers", redactions: "Redactions", from: "from", to: "to", unknown: "unknown source",
    noBlockers: "No proof blockers were returned for this record.", audited: "Sensitive proof access was audited.", auditRequired: "Sensitive proof access requires audit logging.",
    freshness: { fresh: "Fresh", stale: "Stale", partial: "Partial", blocked: "Blocked", unknown: "Unknown" } },
  fr: { title: "Piste de preuve", description: "Chaîne de preuve, blocages, masquages et prochaines actions pour le document sélectionné.", close: "Fermer la preuve",
    empty: "Piste de preuve indisponible. Sélectionnez un document pris en charge pour examiner sa chaîne de preuve.", loading: "Chargement de la piste de preuve.",
    nodes: "Éléments de preuve", edges: "Liens entre les preuves", blockers: "Blocages", redactions: "Masquages", from: "depuis", to: "vers", unknown: "source inconnue",
    noBlockers: "Aucun blocage de preuve n’a été renvoyé pour ce document.", audited: "L’accès aux preuves sensibles a été journalisé.", auditRequired: "L’accès aux preuves sensibles doit être journalisé.",
    freshness: { fresh: "À jour", stale: "Ancienne", partial: "Partielle", blocked: "Bloquée", unknown: "Inconnue" } },
} as const

function EmptyState({ text }: { text: string }) {`);
 source=source.replace('      Proof trail unavailable. Select a supported record to inspect its evidence chain.','      {text}');
 source=source.replace('function LoadingState() {','function LoadingState({ text }: { text: string }) {');
 source=source.replace('<span>Loading proof trail.</span>','<span role="status">{text}</span>');
 source=source.replace('h-4 w-4 animate-spin text-', 'h-4 w-4 animate-spin motion-reduce:animate-none text-');
 source=source.replace('function ErrorState({ error }: { error: string }) {','function ErrorState({ error }: { error: string }) {');
 source=source.replace('<p>{error}</p>','<p role="alert">{error}</p>');
 source=source.replace('error = null }: ProofTrailDrawerProps) {','error = null, locale = "en" }: ProofTrailDrawerProps) {\n  const t = drawerCopy[locale]');
 source=source.replace('<SheetContent className="w-full overflow-y-auto bg-[var(--dash-bg)] text-[var(--dash-text)] sm:max-w-2xl">','<SheetContent style={portalTokens} lang={locale} closeLabel={t.close} className="w-full overflow-y-auto bg-[var(--product-canvas)] text-[var(--dash-text)] [overflow-wrap:anywhere] motion-reduce:animate-none motion-reduce:transition-none sm:max-w-2xl">');
 source=source.replace('>Proof Trail</SheetTitle>', '>{t.title}</SheetTitle>');
 source=source.replace('            Evidence chain, blockers, redactions, and next actions for the selected record.','            {t.description}');
 source=source.replace('<LoadingState />','<LoadingState text={t.loading} />').replace('<EmptyState />','<EmptyState text={t.empty} />');
 source=source.replaceAll('<EvidenceGradeBadge grade=', '<EvidenceGradeBadge locale={locale} grade=');
 source=source.replace('{proofTrail.freshness}','{t.freshness[proofTrail.freshness]}');
 for(const [label,key] of [['Evidence Nodes','nodes'],['Evidence Edges','edges'],['Blockers','blockers'],['Redactions','redactions']])source=source.replace('title="'+label+'"','title={t.'+key+'}');
 source=source.replace('{node.nodeType} from {node.sourceTable ?? "unknown source"}.','{node.nodeType} {t.from} {node.sourceTable ?? t.unknown}.');
 source=source.replace('{edge.fromNodeId} to {edge.toNodeId}','{edge.fromNodeId} {t.to} {edge.toNodeId}');
 source=source.replace('>No proof blockers were returned for this record.</p>','>{t.noBlockers}</p>');
 source=source.replace('Sensitive proof access {proofTrail.audit.accessLogged ? "was audited" : "requires audit logging"}.','{proofTrail.audit.accessLogged ? t.audited : t.auditRequired}');
 return source;
});
edit(files[1],source=>source.replace('  className?: string\n','  className?: string\n  locale?: "en" | "fr"\n').replace('  className,\n','  className,\n  locale = "en",\n').replace('<ProofTrailDrawer open=', '<ProofTrailDrawer locale={locale} open='));
edit(files[2],source=>source.replace('subject={subject} proofTrail={active ? proofTrail : null}', 'locale={locale} subject={subject} proofTrail={active ? proofTrail : null}'));
