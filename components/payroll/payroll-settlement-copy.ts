import type { Locale } from "@/types/bilingual";

const en = {
  title: "Record payroll settlement", remaining: "Verified remaining amount", hint: "Enter the amount settled by this evidence, not the cumulative total. Final settlement must equal the remaining amount.",
  status: "Settlement status", settled: "Settled", partial: "Partially settled", amount: "Settlement amount", sourceRegisterHash: "Source register hash", evidenceHash: "Evidence hash",
  providerEventId: "Provider event ID", statementLineId: "Statement line ID", statementFileHash: "Statement file hash", matchRecordId: "Match record ID", providerAccountId: "Provider account ID", providerTransactionId: "Provider transaction ID", providerReference: "Provider reference", notes: "Notes", optional: "Optional",
  evidenceHelp: "Review the posted payroll run and choose its approved reconciliation proof. The server verifies the stored records and current remaining amount when you submit.",
  submit: "Record settlement proof", pending: "Recording…", retry: "Retry the same request", refresh: "Refresh balance", adopt: "Review and use refreshed balance",
  success: "Settlement evidence recorded.", replay: "Settlement evidence was already recorded for this request.",
  unknown: "The outcome could not be confirmed. Your entries are preserved and locked. Retry the same request to check whether it was recorded.",
  fresh: "Fresh authentication required", freshHelp: "Reauthenticate, then retry. Your entries are preserved.",
  password: "Current password", authenticate: "Authenticate", authenticated: "Authentication confirmed. Review and submit the settlement separately.", authFailed: "Authentication could not be confirmed. Check your password or wait before retrying.",
  denied: "You are not authorized to record this settlement. Refresh your access or contact the payroll controller.",
  conflict: "The balance or evidence changed, or this request conflicts with an earlier submission. Refresh and review the batch before retrying.",
  validation: "Review the amount, settlement status and evidence references. The amount must be positive, use at most two decimal places and not exceed the remaining obligation.",
  stale: "The remaining balance has changed. Review the new amount before using it; your evidence entries are preserved.",
  unavailable: "The remaining balance is unverified. Reconcile the original settlement evidence before recording another payment.",
  restricted: "Settlement entry is unavailable with your current access. Ask the payroll controller to review the batch.",
  next: "Next action", ready: "Review the remaining obligation and the source evidence. Recording requires current authority and fresh authentication.",
} as const;
const fr: Record<keyof typeof en, string> = {
  title:"Enregistrer le règlement de paie",remaining:"Montant restant vérifié",hint:"Saisissez le montant réglé par cette preuve, et non le total cumulé. Le règlement final doit être égal au montant restant.",
  status:"État du règlement",settled:"Réglé",partial:"Partiellement réglé",amount:"Montant du règlement",sourceRegisterHash:"Empreinte du registre source",evidenceHash:"Empreinte de la preuve",
  providerEventId:"Identifiant de l’événement du prestataire",statementLineId:"Identifiant de la ligne de relevé",statementFileHash:"Empreinte du fichier de relevé",matchRecordId:"Identifiant du rapprochement",providerAccountId:"Identifiant du compte prestataire",providerTransactionId:"Identifiant de la transaction du prestataire",providerReference:"Référence du prestataire",notes:"Notes",optional:"Facultatif",
  evidenceHelp:"Examinez la paie comptabilisée et choisissez son justificatif de rapprochement approuvé. Le serveur vérifie les documents enregistrés et le solde restant lors de l’envoi.",
  submit:"Enregistrer la preuve de règlement",pending:"Enregistrement…",retry:"Réessayer la même demande",refresh:"Actualiser le solde",adopt:"Examiner et utiliser le solde actualisé",
  success:"Preuve de règlement enregistrée.",replay:"La preuve de règlement était déjà enregistrée pour cette demande.",
  unknown:"Le résultat n’a pas pu être confirmé. Vos saisies sont conservées et verrouillées. Réessayez la même demande pour vérifier son enregistrement.",
  fresh:"Une authentification récente est requise",freshHelp:"Authentifiez-vous à nouveau, puis réessayez. Vos saisies sont conservées.",
  password:"Mot de passe actuel",authenticate:"S’authentifier",authenticated:"Authentification confirmée. Examinez puis envoyez le règlement séparément.",authFailed:"L’authentification n’a pas pu être confirmée. Vérifiez votre mot de passe ou patientez avant de réessayer.",
  denied:"Vous n’êtes pas autorisé à enregistrer ce règlement. Actualisez vos accès ou contactez le responsable de paie.",
  conflict:"Le solde ou les preuves ont changé, ou cette demande contredit un enregistrement antérieur. Actualisez et examinez le lot avant de réessayer.",
  validation:"Vérifiez le montant, l’état du règlement et les références des preuves. Le montant doit être positif, comporter au plus deux décimales et ne pas dépasser l’obligation restante.",
  stale:"Le solde restant a changé. Examinez le nouveau montant avant de l’utiliser ; vos références de preuves sont conservées.",
  unavailable:"Le solde restant n’est pas vérifié. Rapprochez les preuves de règlement d’origine avant d’enregistrer un autre paiement.",
  restricted:"La saisie du règlement n’est pas disponible avec vos accès actuels. Demandez au responsable de paie d’examiner le lot.",
  next:"Prochaine action",ready:"Examinez l’obligation restante et les preuves sources. L’enregistrement exige les autorisations actuelles et une authentification récente.",
};
export const payrollSettlementCopy = (locale: Locale) => locale === "fr" ? fr : en;
