"use client";
import { useHrisFreshAuth } from "./useHrisFreshAuth";
import { HrisControlledReview, type ReviewTarget } from "./HrisControlledReview";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import type { PeopleAuthoringView } from "@/services/hris/people-authoring-read.service";
import { localizePath } from "@/i18n/routing";

type Field = {
  name: string;
  en: string;
  fr: string;
  type?: string;
  required?: boolean;
  value?: string;
  options?: Array<[string, string]>;
};
export type AuthoringRequest = {
  operation: string;
  data: Record<string, unknown>;
};
const f = (
  name: string,
  en: string,
  fr: string,
  type = "text",
  required = true,
): Field => ({ name, en, fr, type, required });

function OperatingForm({
  title,
  locale,
  fields,
  send,
  operation,
  disabled = false,
  fixed = {},
  transform = (x) => x,
}: {
  title: string;
  locale: "en" | "fr";
  fields: Field[];
  operation: string;
  disabled?: boolean;
  fixed?: Record<string, unknown>;
  transform?: (v: Record<string, string>) => Record<string, unknown>;
  send: (r: AuthoringRequest) => Promise<void>;
}) {
  const [pending, setPending] = useState(false),
    retry = useRef<{ fingerprint: string; key: string } | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget)) as Record<
      string,
      string
    >;
    const data = { ...transform(values), ...fixed };
    const fingerprint = JSON.stringify(data);
    if (retry.current?.fingerprint !== fingerprint)
      retry.current = { fingerprint, key: crypto.randomUUID() };
    setPending(true);
    try {
      await send({
        operation,
        data: { ...data, idempotencyKey: retry.current!.key },
      });
    } finally {
      setPending(false);
    }
  }
  return (
    <details className="rounded-lg border border-white/20 p-4">
      <summary className="cursor-pointer font-semibold">{title}</summary>
      <form className="mt-4 grid gap-3" onSubmit={submit} aria-label={title}>
        <fieldset
          disabled={pending || disabled}
          className="grid min-w-0 gap-3 sm:grid-cols-2"
        >
          {fields.map((field) => (
            <label key={field.name} className="grid min-w-0 gap-1 text-sm">
              {locale === "fr" ? field.fr : field.en}
              {field.options ? (
                <select
                  className="dashboard-control min-w-0 rounded p-2"
                  name={field.name}
                  required={field.required ?? true}
                  defaultValue={field.value ?? ""}
                >
                  {field.options.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="dashboard-control min-w-0 rounded p-2"
                  name={field.name}
                  type={field.type ?? "text"}
                  required={field.required ?? true}
                  defaultValue={field.value ?? ""}
                  step={field.type === "number" ? "0.01" : undefined}
                />
              )}
            </label>
          ))}
        </fieldset>
        <button
          className="dashboard-btn-primary justify-self-start rounded px-4 py-2"
          disabled={pending || disabled}
          type="submit"
        >
          {pending
            ? locale === "fr"
              ? "Enregistrement…"
              : "Saving…"
            : locale === "fr"
              ? "Enregistrer"
              : "Save"}
        </button>
      </form>
    </details>
  );
}

export function HrisPeopleAuthoring({
  initial,
  locale,
  execute,
  reload,
}: {
  initial: PeopleAuthoringView;
  locale: "en" | "fr";
  execute: (
    r: AuthoringRequest,
  ) => Promise<{ success: boolean; data?: any; error?: string | null; code?: string | null }>;
  reload: (employeeId?: string) => Promise<PeopleAuthoringView>;
}) {
  const [view, setView] = useState(initial),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false),
    navigating = useRef(false),
    status = useRef<HTMLDivElement>(null),
    navigation = useRef(0);
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en),
    selected = view.selected,
    employee = selected?.employee;
  const recovery = useHrisFreshAuth(locale, `${employee?.id ?? "new"}:${navigation.current}`);
  const label = (code: string) => ({
    DRAFT: t("Draft", "Brouillon"), ACTIVE: t("Active", "Actif"),
    REQUESTED: t("Awaiting review", "En attente de validation"), APPROVED: t("Approved", "Approuvé"),
    APPLIED: t("Applied", "Appliqué"), REJECTED: t("Rejected", "Rejeté"),
    TERMINATED: t("Employment ended", "Emploi terminé"), ENDED: t("Ended", "Terminé"), CANCELLED: t("Cancelled", "Annulé"),
    ONBOARD: t("Onboarding", "Entrée"), TERMINATE: t("Departure", "Sortie"), TRANSFER: t("Transfer", "Mutation"), PROMOTION: t("Promotion", "Promotion"), REHIRE: t("Rehire", "Réembauche"),
    "hris.employee.lifecycle.requested": t("Employment change requested", "Changement d’emploi demandé"),
    "hris.employee.lifecycle.approved": t("Employment change approved", "Changement d’emploi approuvé"),
    "hris.employee.lifecycle.rejected": t("Employment change rejected", "Changement d’emploi rejeté"),
    "hris.employee.lifecycle.applied": t("Employment change applied", "Changement d’emploi appliqué"),
    artifactHash: t("Document reference", "Référence du document"), malwareScanEvidenceHash: t("Scan evidence", "Preuve d’analyse"), malwareScanProvider: t("Scan provider", "Fournisseur d’analyse"), malwareScannedAt: t("Scanned on", "Analysé le"), signedAt: t("Signed on", "Signé le"), retentionPolicyCode: t("Retention policy", "Politique de conservation"), retentionBasis: t("Retention basis", "Fondement de conservation"), retainUntil: t("Retain until", "Conserver jusqu’au"), legalHold: t("Legal hold", "Conservation légale"),
  } as Record<string, string>)[code] ?? code;
  async function load(employeeId?: string) {
    const generation = ++navigation.current;
    navigating.current = true;
    setLoading(true);
    try {
      const next = await reload(employeeId);
      if (generation !== navigation.current) return;
      setView(next);
      setMessage(t("Status refreshed", "Statut actualisé"));
    } catch {
      if (generation === navigation.current)
        setMessage(
          t(
            "Could not refresh. Retry.",
            "Actualisation impossible. Réessayez.",
          ),
        );
    } finally {
      if (generation === navigation.current) { navigating.current = false; setLoading(false); }
    }
  }
  async function send(request: AuthoringRequest) {
    if (navigating.current) { setMessage(t("Wait for the selected employee to load.", "Attendez le chargement du dossier sélectionné.")); return; }
    const generation = navigation.current;
    setMessage("");
    try {
      const result = await recovery.run(() => execute(request));
      if (generation !== navigation.current) return;
      if (!result.success) throw new Error(result.error ?? "Unavailable");
      const id = result.data?.payrollEmployee?.id ?? employee?.id;
      try {
        const next = await reload(id);
        if (generation !== navigation.current) return;
        setView(next);
        setMessage(
          result.data?.applied === false
            ? t(
                "Approved and scheduled; today's employment is unchanged. Apply when due.",
                "Approuvé et planifié ; la situation actuelle reste inchangée. Appliquez à l’échéance.",
              )
            : t(
                "Saved. Review the current status before the next step.",
                "Enregistré. Vérifiez le statut avant l’étape suivante.",
              ),
        );
      } catch {
        if (generation === navigation.current)
          setMessage(
            t(
              "Saved, but refresh failed. Reload status before submitting again.",
              "Enregistré, mais l’actualisation a échoué. Actualisez le statut avant de renvoyer.",
            ),
          );
      }
    } catch (error) {
      if (generation === navigation.current)
        setMessage(
          (error instanceof Error ? error.message + " — " : "") +
            t(
              "Could not save. Your entries remain. Review the error and refresh stale records before retrying.",
              "Enregistrement impossible. Vos saisies restent disponibles. Vérifiez l’erreur et actualisez les dossiers modifiés avant de réessayer.",
            ),
        );
    } finally {
      if (generation === navigation.current)
        setTimeout(() => status.current?.focus(), 0);
    }
  }
  const reason = [
    f("decisionReason", "Decision reason", "Motif de décision"),
    f(
      "approvalEvidenceHash",
      "Approval evidence reference",
      "Référence de preuve d’approbation",
    ),
  ];
  const period = [
    f("effectiveFrom", "Effective from", "Applicable à partir du", "date"),
    f(
      "effectiveTo",
      "Final date (inclusive, optional)",
      "Dernière date (incluse, facultative)",
      "date",
      false,
    ),
  ];
  const choose = (
    name: string,
    en: string,
    fr: string,
    items: Array<[string, string]>,
    required = true,
  ): Field => ({
    ...f(name, en, fr, "text", required),
    options: [["", t("Select", "Choisir")], ...items],
  });
  const form = (
    key: string,
    title: string,
    operation: string,
    fields: Field[],
    fixed: Record<string, unknown> = {},
    transform?: (v: Record<string, string>) => Record<string, unknown>,
  ) => {
    const domains:Record<string,ReviewTarget["domain"]>={LIFECYCLE_APPROVE:"LIFECYCLE",LIFECYCLE_APPLY:"LIFECYCLE",SALARY_APPROVE:"SALARY_CHANGE",SALARY_APPLY:"SALARY_CHANGE",PAYMENT_APPROVE:"PAYMENT_DESTINATION",PAYMENT_APPLY:"PAYMENT_DESTINATION"};
    const domain=operation==="INBOX"?fixed.domain as ReviewTarget["domain"]:domains[operation];
    if(domain)return <HrisControlledReview key={String(employee?.id)+key} locale={locale} label={title} disabled={loading} target={{domain,decision:operation.endsWith("APPLY")?"APPLY":(fixed.decision??"APPROVE") as ReviewTarget["decision"],employeeId:String(fixed.employeeId),sourceId:String(fixed.sourceId??fixed.requestId??fixed.salaryChangeRequestId??fixed.paymentDestinationChangeRequestId)}} onComplete={async()=>{const current=navigation.current;const updated=await reload(employee.id);if(current===navigation.current)setView(updated)}}/>;
    return (
    <OperatingForm
      key={(employee?.id ?? "new") + ":" + key}
      title={title}
      locale={locale}
      fields={fields}
      fixed={fixed}
      transform={transform}
      operation={operation}
      disabled={loading}
      send={send}
    />
  );
  };
  const identity = [
    f("employeeNumber", "Employee number", "Matricule"),
    f("displayName", "Employee name", "Nom de l’employé"),
    f("hireDate", "Employment start date", "Date d’entrée", "date"),
    f(
      "countryCode",
      "Applicable country (2-letter code)",
      "Pays applicable (code de 2 lettres)",
    ),
    choose(
      "userId",
      "Linked verified account (optional)",
      "Compte lié (facultatif)",
      view.users.map((u) => [u.id, u.name ?? u.id]),
      false,
    ),
    choose(
      "locationId",
      "Location (optional)",
      "Site (facultatif)",
      view.locations.map((l) => [l.id, l.name]),
      false,
    ),
    f(
      "department",
      "Department (optional)",
      "Service (facultatif)",
      "text",
      false,
    ),
    f(
      "jobTitle",
      "Job title (optional)",
      "Fonction (facultative)",
      "text",
      false,
    ),
  ];
  const clean = (v: Record<string, string>) =>
    Object.fromEntries(Object.entries(v).filter(([, value]) => value !== ""));
  const currentContracts = (selected?.contracts ?? []).filter(
    (c: any) =>
      c.status === "ACTIVE" &&
      c.effectiveFrom.slice(0, 10) <= new Date().toISOString().slice(0, 10) &&
      (!c.effectiveTo ||
        c.effectiveTo.slice(0, 10) >= new Date().toISOString().slice(0, 10)),
  );
  const payment = selected?.payment?.paymentDestination?.latestChange;
  const review = (domain: string, sourceId: string) => ({
    domain,
    sourceId,
    employeeId: employee.id,
    decision: "APPROVE",
  });
  return (
    <main className="dashboard-landing-theme dark min-h-screen">
      <div className="dashboard-landing-content mx-auto grid max-w-5xl gap-4 p-4 text-white">
        <h1 className="text-2xl font-semibold">
          {t("Employee administration", "Administration du personnel")}
        </h1>
        <p>
          {t(
            "Prepare a draft, obtain independent evidence review, then apply approved employment changes. No statutory policy or contract wording is supplied here.",
            "Préparez un brouillon, obtenez une validation indépendante des preuves, puis appliquez les changements approuvés. Aucun texte contractuel ni règle légale n’est fourni ici.",
          )}
        </p>
        <div role="status" tabIndex={-1} ref={status} className="break-words">
          {message}
        </div>
        <nav className="flex flex-wrap gap-3">
          <Link href={localizePath("/dashboard/people", locale)}>
            {t("Directory", "Annuaire")}
          </Link>
          <Link href={localizePath("/dashboard/people/approvals", locale)}>
            {t(
              "Independent approval inbox",
              "Boîte de validation indépendante",
            )}
          </Link>
          <button onClick={() => load(employee?.id)}>
            {t("Refresh status", "Actualiser le statut")}
          </button>
        </nav>
        <label className="grid gap-1">
          {t("Open an employee", "Ouvrir un dossier employé")}
          <select
            className="dashboard-control min-w-0 rounded p-2"
            value={employee?.id ?? ""}
            onChange={(e) => load(e.target.value || undefined)}
          >
            <option value="">{t("New employee", "Nouvel employé")}</option>
            {view.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.employeeNumber} · {e.displayName}
              </option>
            ))}
          </select>
        </label>
        {!view.completeEmployeeList && (
          <p role="alert">
            {t(
              "Population exceeds this 200-person pilot. Use the directory search.",
              "La population dépasse ce pilote de 200 personnes. Utilisez la recherche dans l’annuaire.",
            )}
          </p>
        )}
        {!employee ? (
          form(
            "new",
            t("Create employee draft", "Créer un brouillon employé"),
            "PROFILE",
            identity,
            { createOnly: true, status: "DRAFT" },
            clean,
          )
        ) : (
          <>
            <header>
              <h2 className="text-xl font-semibold">
                {employee.displayName} · {label(employee.status)}
              </h2>
              <p>
                {t("Current employment starts", "L’emploi actuel débute le")}{" "}
                {employee.hireDate.slice(0, 10)}
              </p>
            </header>
            <section className="grid gap-2 rounded border border-white/20 p-4">
              <h2>{t("What still needs attention", "Points à traiter")}</h2>
              {selected.blockers.map((code: string) => (
                <p key={code}>
                  {(
                    {
                      EMPLOYEE_NOT_ACTIVE: employee.status === "TERMINATED" ? t(
                        "Employment ended: review departure tasks and final-period inputs.",
                        "Emploi terminé : vérifiez les tâches de sortie et les entrées de la dernière période.",
                      ) : t(
                        "Employment: review and apply onboarding below.",
                        "Emploi : validez puis appliquez l’entrée ci-dessous.",
                      ),
                      USER_MAPPING_NOT_READY: t(
                        "Account: link an existing tenant member in the profile form.",
                        "Compte : liez un membre existant dans le formulaire du profil.",
                      ),
                      ACTIVE_CONTRACT_MISSING: employee.status === "TERMINATED" ? t(
                        "No active contract is expected after departure. Review retained approved contracts and final-period inputs.",
                        "Aucun contrat actif n’est attendu après le départ. Vérifiez les contrats approuvés conservés et les données de la dernière période.",
                      ) : t(
                        "Contract: prepare a draft, review its signed evidence and request activation.",
                        "Contrat : préparez un brouillon, validez la preuve signée puis demandez l’activation.",
                      ),
                      CONTRACT_EVIDENCE_MISSING: t(
                        "Evidence: complete the contract document review below.",
                        "Preuve : terminez la validation documentaire ci-dessous.",
                      ),
                      PAYMENT_DESTINATION_EVIDENCE_MISSING: t(
                        "Payment: request, independently review and apply the destination below.",
                        "Paiement : demandez, faites valider et appliquez la destination ci-dessous.",
                      ),
                      FROZEN_ATTENDANCE_MISSING: t(
                        "Attendance: use time setup and attendance closure; this page cannot freeze payroll inputs.",
                        "Présence : utilisez la configuration du temps et sa clôture ; cette page ne fige pas les données de paie.",
                      ),
                    } as Record<string, string>
                  )[code] ??
                    t(
                      "This blocker requires its source workflow or HR support: ",
                      "Ce blocage exige son circuit source ou le support RH : ",
                    ) + code}
                </p>
              ))}
              <Link className="underline" href={localizePath("/dashboard/people/corrections", locale)}>{t("Review profile correction cases", "Vérifier les dossiers de correction")}</Link>
              <Link href={localizePath("/dashboard/people/setup", locale)}>
                {t("Time setup", "Configuration du temps")}
              </Link>
            </section>
            {form(
              "edit-" + employee.id + ":" + employee.updatedAt,
              t("Correct employee profile", "Corriger le profil employé"),
              "PROFILE",
              identity.map((field) => ({
                ...field,
                value:
                  field.name === "hireDate"
                    ? employee.hireDate.slice(0, 10)
                    : (employee[field.name] ?? ""),
              })),
              {
                employeeId: employee.id,
                expectedUpdatedAt: employee.updatedAt,
              },
              clean,
            )}
            <section className="grid gap-3">
              <h2 className="text-lg font-semibold">
                {t(
                  "Contracts and reviewed documents",
                  "Contrats et documents vérifiés",
                )}
              </h2>
              <Link className="underline" href={localizePath("/dashboard/people/documents?employeeId=" + encodeURIComponent(employee.id), locale)}>{t("Protected employee originals", "Originaux protégés de l’employé")}</Link>
              {!view.canAuthorContract ? (
                <p>
                  {t(
                    "Contract authoring requires the existing contract-management permission. Ask an authorized contract operator; this page does not grant it.",
                    "La rédaction exige le droit existant de gestion des contrats. Adressez-vous à un opérateur autorisé ; cette page n’accorde pas ce droit.",
                  )}
                </p>
              ) : (
                form(
                  "contract-new",
                  t(
                    "Prepare contract or renewal draft",
                    "Préparer un contrat ou renouvellement",
                  ),
                  "CONTRACT_CREATE",
                  [
                    f(
                      "contractNumber",
                      "Unique contract number",
                      "Numéro unique de contrat",
                    ),
                    choose("type", "Contract type", "Type de contrat", [
                      ["CDI", t("Permanent", "CDI")],
                      ["CDD", t("Fixed term", "CDD")],
                      ["INTERNSHIP", t("Internship", "Stage")],
                      ["DAILY", t("Daily", "Journalier")],
                    ]),
                    ...period,
                    f(
                      "baseSalary",
                      "Agreed base salary",
                      "Salaire de base convenu",
                      "number",
                    ),
                    {
                      ...f("currency", "Currency", "Devise"),
                      value: view.organization.currency,
                    },
                    f(
                      "workingHoursPerMonth",
                      "Monthly working hours",
                      "Heures mensuelles",
                      "number",
                    ),
                  ],
                  { employeeId: employee.id, status: "DRAFT" },
                  clean,
                )
              )}
              {selected.contracts.map((c: any) => (
                <article
                  className="grid gap-2 rounded border border-white/10 p-3"
                  key={c.id}
                >
                  <h3>
                    {c.contractNumber} · {label(c.status)} ·{" "}
                    {c.effectiveFrom.slice(0, 10)} –{" "}
                    {c.effectiveTo?.slice(0, 10) ??
                      t("Open-ended", "Sans terme")}
                  </h3>
                  <p>
                    {c.baseSalary ??
                      t(
                        "Salary unavailable for this role",
                        "Salaire indisponible pour ce rôle",
                      )}{" "}
                    {c.currency ?? ""}
                  </p>
                  <p>
                    {c.documentEvidencePresent
                      ? t(
                          "Approved signed evidence retained",
                          "Preuve signée approuvée conservée",
                        )
                      : t(
                          "Signed evidence needs independent review",
                          "La preuve signée exige une validation indépendante",
                        )}
                  </p>
                  {c.status === "DRAFT" && (
                    <>
                      {form(
                        "doc-" + c.id,
                        t(
                          "Submit signed document evidence",
                          "Soumettre la preuve du document signé",
                        ),
                        "DOCUMENT_REQUEST",
                        [
                          f(
                            "artifactHash",
                            "Document evidence reference",
                            "Référence de preuve documentaire",
                          ),
                          f(
                            "malwareScanEvidenceHash",
                            "Malware scan evidence",
                            "Preuve d’analyse antivirus",
                          ),
                          f(
                            "malwareScanProvider",
                            "Scan provider",
                            "Fournisseur d’analyse",
                          ),
                          f(
                            "malwareScannedAt",
                            "Scan date",
                            "Date d’analyse",
                            "date",
                          ),
                          f(
                            "signedAt",
                            "Signing date",
                            "Date de signature",
                            "date",
                          ),
                          f(
                            "retentionPolicyCode",
                            "Approved retention policy",
                            "Politique de conservation approuvée",
                          ),
                          f(
                            "retentionBasis",
                            "Retention basis",
                            "Fondement de conservation",
                          ),
                          f(
                            "retainUntil",
                            "Retain until",
                            "Conserver jusqu’au",
                            "date",
                          ),
                        ],
                        { employeeId: employee.id, contractId: c.id },
                      )}
                      {selected.documentRequests.find(
                        (d: any) => d.contractId === c.id,
                      )?.pending && (
                        <>
                          <dl className="grid gap-1 break-all text-sm">
                            {Object.entries(
                              selected.documentRequests.find(
                                (d: any) => d.contractId === c.id,
                              ).pending,
                            )
                              .filter(([key]) =>
                                [
                                  "artifactHash",
                                  "malwareScanEvidenceHash",
                                  "malwareScanProvider",
                                  "malwareScannedAt",
                                  "signedAt",
                                  "retentionPolicyCode",
                                  "retentionBasis",
                                  "retainUntil",
                                  "legalHold",
                                ].includes(key),
                              )
                              .map(([key, value]) => (
                                <div key={key}>
                                  <dt>{label(key)}</dt>
                                  <dd>{typeof value === "boolean" ? (value ? t("Yes", "Oui") : t("No", "Non")) : String(value)}</dd>
                                </div>
                              ))}
                          </dl>
                          <p>
                            {t(
                              "Pending document review: check source, signature, scan and retention before approving.",
                              "Document en attente : vérifiez la source, la signature, l’analyse et la conservation avant validation.",
                            )}
                          </p>
                          {form(
                            "doc-review-" + c.id,
                            t(
                              "Approve document evidence",
                              "Approuver la preuve documentaire",
                            ),
                            "INBOX",
                            reason,
                            review("CONTRACT_DOCUMENT", c.id),
                          )}
                        </>
                      )}
                      {form(
                        "activate-" + c.id,
                        t(
                          "Request contract activation",
                          "Demander l’activation du contrat",
                        ),
                        "CONTRACT_REQUEST",
                        [
                          f(
                            "reason",
                            "Activation reason",
                            "Motif d’activation",
                          ),
                          f(
                            "requestEvidenceHash",
                            "Request evidence reference",
                            "Référence de preuve de demande",
                          ),
                        ],
                        { employeeId: employee.id, contractId: c.id },
                      )}
                      {c.approvalStatus === "REQUESTED" &&
                        c.canReviewAmounts &&
                        form(
                          "activate-review-" + c.id,
                          t(
                            "Approve contract activation",
                            "Approuver l’activation du contrat",
                          ),
                          "INBOX",
                          reason,
                          review("CONTRACT_ACTIVATION", c.id),
                        )}
                    </>
                  )}
                </article>
              ))}
            </section>
            <section className="grid gap-3">
              <h2 className="text-lg font-semibold">
                {t(
                  "Verified payment destination",
                  "Destination de paiement vérifiée",
                )}
              </h2>
              <p>
                {selected.payment.paymentDestination.maskedDestination ??
                  t("Not verified", "Non vérifiée")}
              </p>
              {form(
                "payment",
                t(
                  "Request payment destination",
                  "Demander une destination de paiement",
                ),
                "PAYMENT_REQUEST",
                [
                  choose(
                    "paymentMethod",
                    "Payment method",
                    "Moyen de paiement",
                    [
                      ["BANK_TRANSFER", t("Bank transfer", "Virement")],
                      ["MOBILE_MONEY", t("Mobile money", "Mobile money")],
                      ["CASH", t("Cash", "Espèces")],
                    ],
                  ),
                  f(
                    "bankAccountNumber",
                    "Bank account (bank transfer only)",
                    "Compte bancaire (virement uniquement)",
                    "text",
                    false,
                  ),
                  f("bankName", "Bank name", "Banque", "text", false),
                  f(
                    "accountHolderName",
                    "Account holder",
                    "Titulaire",
                    "text",
                    false,
                  ),
                  f(
                    "mobileMoneyProvider",
                    "Mobile provider",
                    "Opérateur mobile",
                    "text",
                    false,
                  ),
                  f(
                    "mobileMoneyPhone",
                    "Mobile number",
                    "Numéro mobile",
                    "tel",
                    false,
                  ),
                  f("requestReason", "Reason", "Motif"),
                  f(
                    "evidenceDocumentHash",
                    "Evidence reference",
                    "Référence de preuve",
                  ),
                ],
                { employeeId: employee.id },
                clean,
              )}
              {payment && (
                <p>
                  {label(payment.status)} · {payment.maskedDestination} ·{" "}
                  {payment.requestReason}
                </p>
              )}
              {payment?.status === "REQUESTED" &&
                form(
                  "payment-approve-" + payment.id,
                  t("Approve payment destination", "Approuver la destination"),
                  "PAYMENT_APPROVE",
                  reason,
                  {
                    employeeId: employee.id,
                    paymentDestinationChangeRequestId: payment.id,
                  },
                )}
              {payment?.status === "APPROVED" &&
                form(
                  "payment-apply-" + payment.id,
                  t(
                    "Apply approved destination (separate operator)",
                    "Appliquer la destination (opérateur distinct)",
                  ),
                  "PAYMENT_APPLY",
                  [],
                  {
                    employeeId: employee.id,
                    paymentDestinationChangeRequestId: payment.id,
                  },
                )}
            </section>
            <section className="grid gap-3">
              <h2 className="text-lg font-semibold">
                {t("Employment changes", "Changements d’emploi")}
              </h2>
              <p>{t(
                "For a departure, select the first date no longer employed. The preceding date is the last employment day. Account access is handled separately.",
                "Pour une sortie, choisissez le premier jour hors emploi. La veille est le dernier jour d’emploi. Les accès au compte sont traités séparément.",
              )}</p>
              {selected.lifecycle ? (
                <>
                  <p>
                    {label(selected.lifecycle.type)} · {label(selected.lifecycle.status)} ·{" "}
                    {selected.lifecycle.effectiveAt.slice(0, 10)} ·{" "}
                    {Object.values(selected.lifecycle.target)
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {selected.lifecycle.status === "REQUESTED" &&
                    form(
                      "life-approve-" + selected.lifecycle.requestId,
                      t(
                        "Approve employment change",
                        "Approuver le changement d’emploi",
                      ),
                      "LIFECYCLE_APPROVE",
                      reason,
                      {
                        employeeId: employee.id,
                        requestId: selected.lifecycle.requestId,
                      },
                    )}
                  {selected.lifecycle.status === "APPROVED" &&
                    form(
                      "life-apply-" + selected.lifecycle.requestId,
                      t("Apply when effective", "Appliquer à la date d’effet"),
                      "LIFECYCLE_APPLY",
                      [],
                      {
                        employeeId: employee.id,
                        requestId: selected.lifecycle.requestId,
                      },
                    )}
                </>
              ) : (
                form(
                  "life-request",
                  t(
                    "Request onboarding, transfer or leaver scheduling",
                    "Demander une entrée, mutation ou sortie planifiée",
                  ),
                  "LIFECYCLE_REQUEST",
                  [
                    choose("type", "Change type", "Type de changement", [
                      ["ONBOARD", t("Onboard", "Entrée")],
                      ["TRANSFER", t("Transfer", "Mutation")],
                      ["PROMOTION", t("Promotion", "Promotion")],
                      ["TERMINATE", t("Terminate", "Sortie")],
                      ["REHIRE", t("Rehire", "Réembauche")],
                    ]),
                    f("effectiveAt", "Effective date", "Date d’effet", "date"),
                    f("reason", "Reason", "Motif"),
                    f(
                      "evidenceHash",
                      "Evidence reference",
                      "Référence de preuve",
                    ),
                    f(
                      "department",
                      "New department (optional)",
                      "Nouveau service (facultatif)",
                      "text",
                      false,
                    ),
                    f(
                      "jobTitle",
                      "New job title (optional)",
                      "Nouvelle fonction (facultative)",
                      "text",
                      false,
                    ),
                    choose(
                      "locationId",
                      "New location (optional)",
                      "Nouveau site (facultatif)",
                      view.locations.map((l) => [l.id, l.name]),
                      false,
                    ),
                  ],
                  { employeeId: employee.id },
                  (v) => ({
                    type: v.type,
                    effectiveAt: v.effectiveAt,
                    reason: v.reason,
                    evidenceHash: v.evidenceHash,
                    target: clean({
                      department: v.department,
                      jobTitle: v.jobTitle,
                      locationId: v.locationId,
                    }),
                  }),
                )
              )}
            </section>
            <section className="grid gap-3">
              <h2 className="text-lg font-semibold">
                {t("Compensation changes", "Changements de rémunération")}
              </h2>
              <p>
                {t(
                  "Salary application requires three distinct people: requester, approver and applier. Future contracts do not replace today's effective salary.",
                  "L’application du salaire exige trois personnes distinctes : demandeur, valideur et applicateur. Les contrats futurs ne remplacent pas le salaire actuel.",
                )}
              </p>
              {form(
                "salary",
                t("Request salary change", "Demander un changement de salaire"),
                "SALARY_REQUEST",
                [
                  choose(
                    "sourceContractId",
                    "Current effective contract",
                    "Contrat actuellement applicable",
                    currentContracts.map((c: any) => [c.id, c.contractNumber]),
                  ),
                  f(
                    "proposedBaseSalary",
                    "Proposed base salary",
                    "Salaire proposé",
                    "number",
                  ),
                  f("effectiveFrom", "Effective date", "Date d’effet", "date"),
                  f("requestReason", "Reason", "Motif"),
                  f(
                    "evidenceDocumentHash",
                    "Evidence reference",
                    "Référence de preuve",
                  ),
                ],
                { employeeId: employee.id },
              )}
              {selected.compensation.salaryChanges.map((s: any) => (
                <article
                  key={s.id}
                  className="grid gap-2 rounded border border-white/10 p-3"
                >
                  <h3>
                    {label(s.status)} · {s.effectiveFrom.slice(0, 10)} ·{" "}
                    {s.currentBaseSalary} → {s.proposedBaseSalary} {s.currency}
                  </h3>
                  {s.status === "REQUESTED" &&
                    !s.redactions.length &&
                    form(
                      "salary-approve-" + s.id,
                      t(
                        "Approve salary change",
                        "Approuver le changement de salaire",
                      ),
                      "SALARY_APPROVE",
                      reason,
                      { employeeId: employee.id, salaryChangeRequestId: s.id },
                    )}
                  {s.status === "APPROVED" &&
                    !s.redactions.length &&
                    form(
                      "salary-apply-" + s.id,
                      t(
                        "Apply reviewed salary change",
                        "Appliquer le changement validé",
                      ),
                      "SALARY_APPLY",
                      [],
                      { employeeId: employee.id, salaryChangeRequestId: s.id },
                    )}
                </article>
              ))}
            </section>
            <section className="grid gap-2">
              <h2>{t("Employment history", "Historique d’emploi")}</h2>
              {(selected.timeline.events ?? []).map((event: any) => (
                <p key={event.id}>
                  {new Date(event.occurredAt).toLocaleString(locale)} · {label(event.eventType)}
                </p>
              ))}
            </section>
            <p>
              {t(
                "Corrections to reviewed contract wording, employee numbers and existing compensation component definitions require the responsible HR workflow. Do not reactivate an incorrect contract; use the approval inbox to reject pending work and have an authorized contract operator prepare its replacement.",
                "Les corrections de contrats vérifiés, matricules et définitions de composantes exigent le circuit RH responsable. Ne réactivez pas un contrat incorrect ; rejetez le travail en attente dans la boîte de validation puis faites préparer son remplacement par un opérateur autorisé.",
              )}
            </p>
            <Link href={localizePath(`/dashboard/people/roster?employeeId=${employee.id}`, locale)}>{t("Schedule and attendance", "Planning et présences")}</Link>
            <Link href={localizePath(`/dashboard/people/leave?employeeId=${employee.id}`, locale)}>{t("Manage leave and balances", "Gérer les congés et soldes")}</Link>
            <Link
              href={localizePath(`/dashboard/people/${employee.id}`, locale)}
            >
              {t(
                "Read profile and history",
                "Consulter le profil et l’historique",
              )}
            </Link>
          </>
        )}
      </div>
      {recovery.dialog}
    </main>
  );
}
