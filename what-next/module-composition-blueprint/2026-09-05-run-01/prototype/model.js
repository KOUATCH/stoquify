(function (scope) {
"use strict";
const text=(en,fr)=>({en,fr});
const specs=[
["platform","Workspace foundation","Socle commun","Platform","foundation",[],["identity","configuration","audit","navigation"],["Organization","User","Role","ConfigurationRevision"],["dashboard","settings","administration"]],
["ledger_core","Financial integrity","Intégrité financière","Accounting","foundation",["platform"],["ledger.authority","posting","period-locks"],["JournalEntry","PostingBatch","AccountingSourceLink"],[]],
["inventory","Inventory","Stocks","Inventory","operations",["platform","ledger_core"],["stock","valuation","transfers"],["Item","StockMovement","InventoryValuation"],["inventory"]],
["sales","Sales & invoicing","Ventes et facturation","Revenue","operations",["platform","ledger_core"],["invoicing","receivables"],["SalesOrder","SalesInvoice"],["sales"]],
["pos","Point of sale","Point de vente","Revenue","operations",["sales","inventory"],["checkout","offline-sales","receipts"],["PosSession","OfflineSyncBatch"],["pos"]],
["cash_drawer","Cash accountability","Contrôle de caisse","Finance","operations",["pos","finance"],["cash-shifts","cash-variance"],["CashDrawerSession","CashMovement"],["cash_drawer"]],
["purchasing","Purchasing & payables","Achats et fournisseurs","Procurement","operations",["platform","ledger_core"],["purchase-orders","supplier-invoices","payment-release"],["PurchaseOrder","SupplierInvoice","SupplierPayment"],["purchasing"]],
["finance","Cash & payments","Trésorerie et paiements","Finance","finance",["platform","ledger_core"],["cash-ledgers","payment-evidence"],["PaymentAccount","PaymentTransaction"],["finance"]],
["accounting","Accounting workspace","Comptabilité","Accounting","finance",["ledger_core"],["journal-workspace","statements"],[],["accounting"]],
["payment_reconciliation","Reconciliation","Rapprochement","Finance","finance",["finance","accounting"],["matching","suspense","signoff"],["ReconciliationRun","ReconciliationMatch"],["payment_reconciliation"]],
["close_assurance","Period close","Clôture","Accounting","finance",["accounting"],["close-review","close-evidence"],["CloseReview","CloseEvidence"],["close_assurance"]],
["hris","People & contracts","Personnel et contrats","People","people",["platform"],["employee-records","contracts"],["Employee","EmploymentContract"],[]],
["presence","Time & attendance","Temps et présence","People","people",["hris"],["attendance","leave"],["AttendanceEvent","LeaveRequest"],["presence"]],
["payroll","Payroll","Paie","People","people",["hris","ledger_core"],["payroll-calculation","payroll-approval","payslips"],["PayrollRun","PayrollPaymentBatch"],["payroll"]],
["compliance","Country compliance","Conformité pays","Compliance","assurance",["ledger_core"],["declarations","fiscal-evidence"],["FiscalDocument","Declaration"],["compliance"]],
["reports","Reports & exports","Rapports et exports","Data","assurance",["platform"],["report-workspace","governed-exports"],["ReportDefinition"],["reports"]],
["analytics","Decision insights","Aide à la décision","Data","assurance",["platform"],["metrics","management-insights"],["MetricDefinition"],["analytics"]],
["commercial_agents","Sales channels","Réseau commercial","Revenue","specialist",["sales"],["channel-commissions"],["CommercialAgentAgreement"],["commercial_agents"]],
["content","Content management","Gestion des contenus","Growth","specialist",["platform"],["content-publishing"],["ContentArticle"],["content"]],
["agent_assistance","Assisted work","Assistance intelligente","AI","assurance",["platform"],["read-only-assistance"],["AgentRun","AgentToolInvocation"],[]]
];
const summaries={
platform:text("One identity, one working environment, consistent access.","Une identité et un environnement de travail cohérent."),
ledger_core:text("Balanced, traceable financial records, included where needed.","Des écritures équilibrées et traçables, incluses si nécessaire."),
inventory:text("Know what is available, where it is and what it costs.","Suivez les quantités, les emplacements et les coûts."),
sales:text("Turn customer orders into invoices and receivables.","Transformez les commandes en factures et créances."),
pos:text("Sell in store with connected stock and reliable receipts.","Vendez en magasin avec des stocks et reçus cohérents."),
cash_drawer:text("Account for every shift, tender and cash difference.","Suivez chaque service, encaissement et écart."),
purchasing:text("Connect orders, receipts, supplier invoices and payment controls.","Reliez commandes, réceptions, factures et contrôles de paiement."),
finance:text("See cash positions and manage payment evidence.","Suivez la trésorerie et les preuves de paiement."),
accounting:text("Review journals, financial statements and period activity.","Consultez les journaux, états et activités de période."),
payment_reconciliation:text("Match statements, resolve exceptions and substantiate cash.","Rapprochez les relevés et justifiez la trésorerie."),
close_assurance:text("Know what remains before a period can close.","Identifiez les éléments nécessaires à la clôture."),
hris:text("Keep employee identity and contract history in one place.","Centralisez les dossiers et l'historique des contrats."),
presence:text("Collect time and absence inputs for your people processes.","Collectez les temps et absences pour vos processus RH."),
payroll:text("Prepare controlled payroll from approved people inputs.","Préparez une paie contrôlée à partir de données validées."),
compliance:text("Apply reviewed country rules and retain filing evidence.","Appliquez les règles pays validées et conservez les preuves."),
reports:text("Share scoped reports with traceable export controls.","Partagez des rapports selon les droits et contrôles d'export."),
analytics:text("Explain trends using permitted, reconciled business facts.","Expliquez les tendances avec des données autorisées."),
commercial_agents:text("Manage commercial partners and commission rules.","Gérez les partenaires et règles de commission."),
content:text("Maintain organization content with publishing controls.","Gérez les contenus avec des contrôles de publication."),
agent_assistance:text("Explain evidence and prepare suggestions within user rights.","Expliquez les preuves et préparez des suggestions autorisées.")
};
const routeFor=id=>"/workspace/"+id.replaceAll("_","-");
const interfaces={
platform:["configuration.saveDraft","configuration.preview","configuration.revised"],
ledger_core:["ledger.postBalancedJournal","ledger.readSourcePosting","ledger.posted"],
inventory:["inventory.recordMovement","inventory.readAvailability","inventory.movementRecorded"],
sales:["sales.issueInvoice","sales.readReceivable","sales.invoiceIssued"],
pos:["pos.captureSale","pos.readShift","pos.saleCaptured"],
cash_drawer:["cash.closeShift","cash.readVariance","cash.shiftClosed"],
purchasing:["purchasing.approveSupplierInvoice","purchasing.readPayable","purchasing.invoiceApproved"],
finance:["finance.recordPaymentEvidence","finance.readCashPosition","finance.paymentRecorded"],
accounting:["accounting.requestJournalReversal","accounting.readTrialBalance","accounting.reviewRecorded"],
payment_reconciliation:["reconciliation.confirmMatch","reconciliation.readExceptions","reconciliation.matchConfirmed"],
close_assurance:["close.submitReview","close.readReadiness","close.reviewSubmitted"],
hris:["hris.activateContract","hris.readEmployee","hris.contractActivated"],
presence:["presence.approveTimeInput","presence.readApprovedInputs","presence.inputApproved"],
payroll:["payroll.approveRun","payroll.readRun","payroll.runApproved"],
compliance:["compliance.prepareDeclaration","compliance.readFilingStatus","compliance.declarationPrepared"],
reports:["reports.requestExport","reports.readAuthorizedReport","reports.exportReady"],
analytics:["analytics.refreshProjection","analytics.readMetric","analytics.projectionUpdated"],
commercial_agents:["channels.approveCommission","channels.readAgreement","channels.commissionApproved"],
content:["content.publishArticle","content.readArticle","content.articlePublished"],
agent_assistance:["agents.requestSuggestion","agents.readSuggestion","agents.suggestionPrepared"]
};
const manifests=specs.map(([id,en,fr,owner,category,deps,provides,owns,legacy])=>({
schemaVersion:1,id,version:"1.0.0",status:"proposed",name:text(en,fr),summary:summaries[id],owner,category,
legacySlugs:legacy,commercial:category==="foundation"?{kind:"included",meter:null}:{kind:"selectable",meter: id==="pos"?"active-terminal-month":id==="payroll"?"processed-employee-month":"organization-month"},
requires:deps.map(moduleId=>({moduleId,min:"1.0.0",maxExclusive:"2.0.0",reason:"Required for the declared operating capability"})),
optionalDependencies:id==="analytics"?["reports"]:id==="payroll"?["presence"]:id==="close_assurance"?["payment_reconciliation"]:[],
provides,exclusiveCapabilities:id==="ledger_core"?["ledger.authority"]:[],conflicts:[],
dataOwnership:owns.map(entity=>({entity,writeOwner:id,tenantKey:"organizationId",classification:category==="people"?"restricted":"tenant-private"})),
commands:[{id:interfaces[id][0],version:1,accessIntent:id==="reports"?"export":id==="agent_assistance"?"read":"write",idempotency:"tenant + command + clientRequestId",authority:"server-derived",contractStatus:"proposed logical interface; not an existing callable endpoint"}],
queries:[{id:interfaces[id][1],version:1,accessIntent:"read",scope:"authorized organization and object"}],
events:[{id:interfaces[id][2],version:1,delivery:"at-least-once",partitionKey:"organizationId:aggregateId"}],
permissions:{read:id+".read",write:id+".write",mappingStatus:"proposed; map to current known permission registry before use"},
surfaces:category==="foundation"?[]:[{id:id+".home",path:routeFor(id),slot:category,intent:"read",routeStatus:"prototype only; production adapters retain current routes"}],
prerequisites:["payroll","compliance"].includes(id)?["country_pack_verified","responsible_owner"]:id==="agent_assistance"?["agent_policy"] :[],
provisioning:{handler:id+".provision.v1",idempotency:"configurationRevision:moduleId:step",schemaMigration:"deployment-managed; never per-click SQL",desiredObservedSeparate:true},
jobs:{policy:"snapshot-scoped authorization; recheck before irreversible execution",healthSignals:["lag","failed-attempts","stale-read-model"]},
lifecycle:{policy:"retain-v1",deactivation:"drain new commands; reconcile obligations; retain history",reactivation:"validate current grants, dependencies and schema",retention:"organization policy and applicable obligations; no invented period"},
rollback:{policy:"disable new writes; preserve immutable history; restore compatible configuration revision"}
}));
const externalLedger={...JSON.parse(JSON.stringify(manifests[1])),id:"external_ledger",name:text("External ledger authority","Autorité comptable externe"),legacySlugs:[],dataOwnership:[],commercial:{kind:"selectable",meter:null},requires:[{moduleId:"platform",min:"1.0.0",maxExclusive:"2.0.0"}],summary:text("Future integration used to illustrate a conflicting configuration.","Intégration future illustrant un conflit de configuration.")};
const presets={
retailer:{name:text("Neighbourhood retailer","Commerce de proximité"),organization:text("Marché Amani","Marché Amani"),selected:["inventory","sales","pos","cash_drawer"],goal:text("Sell confidently. Keep stock and cash in step.","Vendre sereinement. Relier stocks et trésorerie.")},
wholesaler:{name:text("Growing wholesaler","Grossiste en croissance"),organization:text("Amani Distribution","Amani Distribution"),selected:["inventory","sales","purchasing","finance","accounting","payment_reconciliation"],goal:text("Connect purchasing, stock, credit and cash.","Relier achats, stocks, crédit et trésorerie.")},
services:{name:text("Service organization","Entreprise de services"),organization:text("Atelier Conseil","Atelier Conseil"),selected:["sales","finance","accounting","reports"],goal:text("Invoice services without an inventory workflow.","Facturer des services sans gestion de stock.")},
multisite:{name:text("Multi-location organization","Entreprise multisite"),organization:text("Groupe Amani","Groupe Amani"),selected:["inventory","sales","pos","purchasing","finance","accounting","payment_reconciliation","hris","presence","payroll","compliance","close_assurance","analytics"],goal:text("Coordinate operations with shared financial and people controls.","Coordonner les opérations, les finances et les équipes.")},
accountant:{name:text("Accountant workspace","Espace comptable"),organization:text("Cabinet Horizon · Client A","Cabinet Horizon · Client A"),selected:["accounting","close_assurance","reports"],goal:text("Review one authorized client at a time.","Consulter un client autorisé à la fois.")}
};
function version(v){if(!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(v||""))return null;return v.split(".").map(Number)}
function compare(a,b){for(let i=0;i<3;i++)if(a[i]!==b[i])return a[i]-b[i];return 0}
function compatible(v,min,max){const a=version(v),b=version(min),c=version(max);return !!a&&!!b&&!!c&&compare(a,b)>=0&&compare(a,c)<0}
function registryIssues(registry){
const issues=[],by=new Map();for(const m of registry){if(by.has(m.id))issues.push({code:"DUPLICATE_ID",module:m.id});by.set(m.id,m);
if(m.schemaVersion!==1||!version(m.version)||!m.owner||!Array.isArray(m.requires)||!m.lifecycle||!m.permissions)issues.push({code:"INVALID_MANIFEST",module:m.id});}
const visiting=new Set(),done=new Set();function visit(id,chain=[]){if(visiting.has(id)){issues.push({code:"CYCLE",module:id,chain:[...chain,id]});return}if(done.has(id))return;visiting.add(id);for(const dep of by.get(id)?.requires??[]){if(!by.has(dep.moduleId))issues.push({code:"UNKNOWN_DEPENDENCY",module:id,dependency:dep.moduleId});else if(!compatible(by.get(dep.moduleId).version,dep.min,dep.maxExclusive))issues.push({code:"VERSION",module:id,dependency:dep.moduleId});visit(dep.moduleId,[...chain,id]);}visiting.delete(id);done.add(id)}
for(const id of by.keys())visit(id);return issues;
}
function plan(selected,options={}){
const registry=options.registry||manifests,by=new Map(registry.map(m=>[m.id,m])),issues=registryIssues(registry),requested=[...new Set(selected)],resolved=new Set(["platform"]),reasons={},edges=[];
function add(id,parent){if(!by.has(id)){issues.push({code:"UNKNOWN_MODULE",module:id});return}
if(parent){(reasons[id]??=[]).push(parent);edges.push({from:parent,to:id});}
if(resolved.has(id)&&id!=="platform")return;resolved.add(id);
for(const d of by.get(id).requires){if(options.autoInclude===false&&!requested.includes(d.moduleId)&&d.moduleId!=="platform"){issues.push({code:"MISSING_DEPENDENCY",module:id,dependency:d.moduleId});continue}
if(!resolved.has(d.moduleId))add(d.moduleId,id);else{(reasons[d.moduleId]??=[]).push(id);edges.push({from:id,to:d.moduleId});}}
}
requested.forEach(id=>add(id));const ownership=new Map(),exclusive=new Map(),routes=new Map();
for(const id of resolved){const m=by.get(id);if(!m)continue;for(const key of m.exclusiveCapabilities??[]){if(exclusive.has(key))issues.push({code:"CONFLICT",module:id,other:exclusive.get(key),capability:key});else exclusive.set(key,id)}
for(const c of m.conflicts??[])if(resolved.has(c))issues.push({code:"CONFLICT",module:id,other:c});
for(const o of m.dataOwnership??[]){if(ownership.has(o.entity))issues.push({code:"OWNERSHIP",module:id,other:ownership.get(o.entity),entity:o.entity});else ownership.set(o.entity,id)}
for(const s of m.surfaces??[]){if(routes.has(s.path))issues.push({code:"ROUTE_COLLISION",module:id,other:routes.get(s.path),path:s.path});else routes.set(s.path,id)}
for(const key of m.prerequisites??[])if(!options.prerequisites?.[key])issues.push({code:"SETUP",module:id,requirement:key});
if(m.commercial.kind==="selectable"&&Array.isArray(options.licensed)&&!options.licensed.includes(id))issues.push({code:"LICENSE",module:id});
}
const order=[],visited=new Set();function topo(id){if(visited.has(id))return;visited.add(id);for(const d of by.get(id)?.requires??[])if(resolved.has(d.moduleId))topo(d.moduleId);order.push(id)};for(const id of resolved)topo(id);
return {requested,resolved:order,automatic:order.filter(id=>!requested.includes(id)),reasons,edges,issues,compatible:issues.length===0,quoteRequired:order.filter(id=>by.get(id)?.commercial.kind==="selectable"),pricing:"No approved prices; quote and explicit acceptance required before purchase"};
}
function decide(input){
const deny=reason=>({allowed:false,reason});
if(!input.organizationExists||!input.actorOrganizationId||input.actorOrganizationId!==input.organizationId||input.objectOrganizationId&&input.objectOrganizationId!==input.organizationId)return deny("TENANT_SCOPE");
if(!input.sessionValid)return deny("SESSION");
if(!input.permission)return deny("PERMISSION");
if(!input.codeAvailable)return deny("NOT_AVAILABLE");
if(!input.controlsValid)return deny("CONTROL");
if(input.securitySuspended)return deny("SECURITY_SUSPENSION");
const now=Date.parse(input.now);if(!Number.isFinite(now))return deny("INVALID_TIME");
const validGrant=input.grant&&["active","trial","read_only"].includes(input.grant.status)&&(!input.grant.startsAt||Number.isFinite(Date.parse(input.grant.startsAt))&&Date.parse(input.grant.startsAt)<=now)&&(!input.grant.endsAt||Number.isFinite(Date.parse(input.grant.endsAt))&&now<Date.parse(input.grant.endsAt));
const retention=(input.intent==="read"||input.intent==="export")&&input.historical&&input.retentionAllowed&&input.retentionCapability&&input.entitlementKnown;
if(!validGrant&&!retention)return deny("ENTITLEMENT");
if(input.grant?.status==="read_only"&&!["read","export"].includes(input.intent))return deny("READ_ONLY");
if(!input.selected&&!retention)return deny("NOT_SELECTED");
if(!input.dependenciesReady&&!retention)return deny("DEPENDENCY");
if(!input.setupReady&&!retention)return deny("SETUP");
if(input.intent!=="read"&&!input.runtimeReady)return deny("RUNTIME");
if(!input.runtimeReady&&input.intent==="read"&&!input.cachedReadAvailable)return deny("RUNTIME");
return {allowed:true,reason:retention&&!validGrant?"RETAINED_HISTORY":!input.runtimeReady?"STALE_READ":"ALLOW"};
}
const lifecycle={
draft:["validated"],validated:["provisioning","draft"],provisioning:["active","failed"],failed:["provisioning","draft"],active:["suspending","upgrading"],upgrading:["active","failed"],suspending:["retained","active"],retained:["validated","retired"],retired:[]
};
function transition(from,to,{revision,currentRevision,openObligations=0}={}){
if(revision!==currentRevision)return {allowed:false,reason:"STALE_REVISION"};
if(!(lifecycle[from]||[]).includes(to))return {allowed:false,reason:"INVALID_TRANSITION"};
if(to==="retained"&&openObligations>0)return {allowed:false,reason:"OPEN_OBLIGATIONS"};
return {allowed:true,reason:"SIMULATION_ONLY"};
}
const api={manifests,externalLedger,presets,plan,registryIssues,decide,transition,compatible,text};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else scope.StoquifyModel=api;
})(typeof window!=="undefined"?window:globalThis);
