"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { localizePath } from "@/i18n/routing";
import {
  HRIS_IMPORT_FIELDS,
  HRIS_IMPORT_VERSION,
  parseEmployeeCsv,
  type ImportMapping,
} from "@/services/hris/employee-import.csv";
import type { EmployeeImportPreview } from "@/services/hris/employee-import.service";
type Command = "PREVIEW" | "COMMIT" | "RECEIPT" | "ERRORS" | "TEMPLATE";
export type ImportExecute = (
  command: Command,
  input: unknown,
) => Promise<{ success: boolean; data?: any; error?: string | null }>;
export function HrisEmployeeImport({
  organizationId,
  locale,
  execute,
}: {
  organizationId: string;
  locale: "en" | "fr";
  execute: ImportExecute;
}) {
  const t = (en: string, fr: string) => (locale === "fr" ? fr : en);
  const [content, setContent] = useState(""),
    [headers, setHeaders] = useState<string[]>([]),
    [mapping, setMapping] = useState<ImportMapping>({}),
    [preview, setPreview] = useState<EmployeeImportPreview | null>(null),
    [receipt, setReceipt] = useState<any>(null),
    [recoveredReceipt, setRecoveredReceipt] = useState<any>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [recoveryKey, setRecoveryKey] = useState("");
  const pending = useRef(false),
    status = useRef<HTMLDivElement>(null),
    commitKey = useRef<string | null>(null),
    storageKey = "hris-import:" + organizationId + ":last-receipt";
  useEffect(() => {
    try {
      setRecoveryKey(sessionStorage.getItem(storageKey) ?? "");
    } catch {}
  }, [storageKey]);
  const label = (field: string) =>
    (
      ({
        employeeNumber: t("Employee number", "Matricule"),
        displayName: t("Employee name", "Nom de l’employé"),
        hireDate: t("Employment start date", "Date d’entrée"),
        countryCode: t("Country code", "Code pays"),
        department: t("Department", "Service"),
        jobTitle: t("Job title", "Fonction"),
      }) as Record<string, string>
    )[field] ?? field;
  const issue = (code: string) =>
    (
      ({
        REQUIRED: t("Required value missing", "Valeur obligatoire manquante"),
        COLUMN_COUNT: t(
          "Column count does not match header",
          "Le nombre de colonnes ne correspond pas à l’en-tête",
        ),
        FORMULA_CELL: t(
          "Formula-like cell rejected",
          "Cellule ressemblant à une formule refusée",
        ),
        INVALID_TEXT: t("Invalid text or length", "Texte ou longueur invalide"),
        ISO_DATE_REQUIRED: t(
          "Use a valid YYYY-MM-DD date",
          "Utilisez une date AAAA-MM-JJ valide",
        ),
        COUNTRY_CODE_REQUIRED: t(
          "Use two uppercase country letters",
          "Utilisez deux lettres majuscules pour le pays",
        ),
        DUPLICATE_IN_FILE: t(
          "Employee number repeats in file",
          "Matricule répété dans le fichier",
        ),
        NUMBER_ALREADY_RETAINED: t(
          "Employee number already retained; no merge",
          "Matricule déjà conservé ; aucune fusion",
        ),
      }) as Record<string, string>
    )[code] ?? code;
  function source(value: string) {
    setContent(value);
    setPreview(null);
    setReceipt(null);
    commitKey.current = null;
    try {
      const parsed = parseEmployeeCsv(value);
      setHeaders(parsed.headers);
      setMapping(
        Object.fromEntries(
          parsed.headers
            .filter((h) => HRIS_IMPORT_FIELDS.includes(h as any))
            .map((h) => [h, h]),
        ),
      );
      setMessage("");
    } catch (error) {
      setHeaders([]);
      setMapping({});
      setMessage(
        t(
          "Complete a valid comma-separated CSV before previewing. ",
          "Complétez un CSV valide séparé par des virgules avant l’aperçu. ",
        ) + (error instanceof Error ? error.message : ""),
      );
    }
  }
  async function call(command: Command, input: unknown) {
    const result = await execute(command, input);
    if (!result.success)
      throw Error(
        result.error ?? t("Operation unavailable", "Opération indisponible"),
      );
    return result.data;
  }
  async function run(work: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      await work();
    } catch (error) {
      setMessage(
        (error instanceof Error ? error.message : "") +
          " — " +
          t(
            "Nothing is silently skipped. Check the receipt after an uncertain commit, or correct the file and preview again.",
            "Aucune ligne n’est ignorée silencieusement. Consultez le reçu après une validation incertaine, ou corrigez le fichier puis relancez l’aperçu.",
          ),
      );
    } finally {
      pending.current = false;
      setBusy(false);
      setTimeout(() => status.current?.focus(), 0);
    }
  }
  function download(file: { content: string; filename: string }) {
    const url = URL.createObjectURL(
        new Blob(["\uFEFF" + file.content], { type: "text/csv;charset=utf-8" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = file.filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const input = { content, mapping, version: HRIS_IMPORT_VERSION };
  return (
    <main className="dashboard-landing-theme dark min-h-screen">
      <div className="dashboard-landing-content mx-auto grid max-w-5xl gap-4 p-4 text-white">
        <h1 className="text-2xl font-semibold">
          {t("Import employee drafts", "Importer des brouillons employés")}
        </h1>
        <p>
          {t(
            "Up to 200 people. Comma-separated UTF-8 CSV, maximum 256 KiB. Dates use YYYY-MM-DD; country codes use two uppercase letters. All valid rows commit together as drafts. Existing employees and approved history are never overwritten.",
            "Jusqu’à 200 personnes. CSV UTF-8 séparé par des virgules, 256 Kio maximum. Dates AAAA-MM-JJ et codes pays de deux lettres majuscules. Les lignes valides sont enregistrées ensemble en brouillons. Les employés existants et l’historique approuvé ne sont jamais écrasés.",
          )}
        </p>
        <p>
          {t(
            "Blank records are ignored. Source files stay in this browser session; the server retains digests and minimal audit receipts. Error downloads contain row numbers and error codes, not personal values. Preview expires after 24 hours.",
            "Les lignes vides sont ignorées. Les fichiers sources restent dans cette session du navigateur ; le serveur conserve les empreintes et des reçus d’audit minimaux. Les rapports d’erreurs contiennent les lignes et codes, sans valeurs personnelles. L’aperçu expire après 24 heures.",
          )}
        </p>
        <Link href={localizePath("/dashboard/people", locale)}>
          {t("People directory", "Annuaire du personnel")}
        </Link>
        <div role="status" tabIndex={-1} ref={status} className="break-words">
          {message}
        </div>
        <fieldset disabled={busy} className="grid min-w-0 gap-4">
          <button
            className="dashboard-btn-secondary justify-self-start rounded px-4 py-2"
            onClick={() =>
              run(async () => download(await call("TEMPLATE", {})))
            }
          >
            {t("Download blank template", "Télécharger le modèle vide")}
          </button>
          <label className="grid gap-1">
            {t("Choose CSV file", "Choisir le fichier CSV")}
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file)
                  void run(async () => {
                    if (file.size > 262144)
                      throw Error(
                        t("File exceeds 256 KiB", "Le fichier dépasse 256 Kio"),
                      );
                    let text: string;
                    try {
                      text = new TextDecoder("utf-8", { fatal: true }).decode(
                        await file.arrayBuffer(),
                      );
                    } catch {
                      throw Error(
                        t(
                          "The file is not valid UTF-8. Export it as UTF-8 CSV and try again.",
                          "Le fichier n’est pas un UTF-8 valide. Exportez-le en CSV UTF-8 puis réessayez.",
                        ),
                      );
                    }
                    source(text);
                  });
              }}
            />
          </label>
          <label className="grid gap-1">
            {t("CSV content", "Contenu CSV")}
            <textarea
              className="dashboard-control min-w-0 rounded p-2 font-mono"
              rows={7}
              value={content}
              onChange={(e) => source(e.target.value)}
              spellCheck={false}
            />
          </label>
          {!!headers.length && (
            <section className="grid gap-2">
              <h2 className="text-lg font-semibold">
                {t("Match columns", "Associer les colonnes")}
              </h2>
              {headers.map((header) => (
                <label key={header} className="grid gap-1 sm:grid-cols-2">
                  {header}
                  <select
                    className="dashboard-control min-w-0 rounded p-2"
                    aria-label={t("Map ", "Associer ") + header}
                    value={mapping[header] ?? ""}
                    onChange={(e) => {
                      const next = { ...mapping };
                      if (e.target.value) next[header] = e.target.value;
                      else delete next[header];
                      setMapping(next);
                      setPreview(null);
                      setReceipt(null);
                      commitKey.current = null;
                    }}
                  >
                    <option value="">
                      {t("Ignore column", "Ignorer la colonne")}
                    </option>
                    {HRIS_IMPORT_FIELDS.map((field) => (
                      <option key={field} value={field}>
                        {label(field)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </section>
          )}
          <button
            className="dashboard-btn-primary justify-self-start rounded px-4 py-2"
            disabled={!headers.length}
            onClick={() =>
              run(async () => {
                setPreview(await call("PREVIEW", input));
                commitKey.current = crypto.randomUUID();
                setReceipt(null);
                setMessage(
                  t(
                    "Preview ready. Review every row before committing.",
                    "Aperçu prêt. Vérifiez toutes les lignes avant validation.",
                  ),
                );
              })
            }
          >
            {t("Preview import", "Prévisualiser l’import")}
          </button>
          {preview && (
            <section className="grid min-w-0 gap-3">
              <h2>{t("Review preview", "Vérifier l’aperçu")}</h2>
              <p>
                {t("Total", "Total")}: {preview.total} · {t("Valid", "Valides")}
                : {preview.accepted} · {t("Rejected", "Refusées")}:{" "}
                {preview.rejected}
              </p>
              <div className="max-h-96 overflow-auto rounded border border-white/20">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    {t("Import row outcomes", "Résultats des lignes importées")}
                  </caption>
                  <thead>
                    <tr>
                      {[
                        t("Row", "Ligne"),
                        ...HRIS_IMPORT_FIELDS.map(label),
                        t("Result", "Résultat"),
                      ].map((h) => (
                        <th key={h} scope="col" className="p-2 text-left">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr key={row.line}>
                        <td className="p-2">{row.line}</td>
                        {HRIS_IMPORT_FIELDS.map((field) => (
                          <td key={field} className="p-2">
                            {row.values[field] || "—"}
                          </td>
                        ))}
                        <td className="p-2">
                          {row.issues.length
                            ? row.issues
                                .map(
                                  (i) => label(i.field) + ": " + issue(i.code),
                                )
                                .join("; ")
                            : t("Ready as draft", "Prêt en brouillon")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                className="dashboard-btn-secondary justify-self-start rounded px-4 py-2"
                onClick={() =>
                  run(async () =>
                    download(
                      await call("ERRORS", { previewId: preview.previewId }),
                    ),
                  )
                }
              >
                {t("Download error report", "Télécharger le rapport d’erreurs")}
              </button>
              <button
                className="dashboard-btn-primary justify-self-start rounded px-4 py-2"
                disabled={preview.rejected > 0 || !!receipt}
                onClick={() =>
                  run(async () => {
                    const key = commitKey.current;
                    if (!key) throw Error("Preview required");
                    setRecoveryKey(key);
                    try {
                      sessionStorage.setItem(storageKey, key);
                    } catch {}
                    const saved = await call("COMMIT", {
                      ...input,
                      previewId: preview.previewId,
                      idempotencyKey: key,
                    });
                    setReceipt(saved);
                    setRecoveredReceipt(null);
                    setMessage(
                      t(
                        "Import committed. Keep the receipt reference.",
                        "Import validé. Conservez la référence du reçu.",
                      ),
                    );
                  })
                }
              >
                {t("Commit reviewed drafts", "Valider les brouillons vérifiés")}
              </button>
              {preview.rejected > 0 && (
                <p>
                  {t(
                    "Correct rejected rows and preview again. No rows will commit from this preview.",
                    "Corrigez les lignes refusées puis relancez l’aperçu. Aucune ligne de cet aperçu ne sera enregistrée.",
                  )}
                </p>
              )}
            </section>
          )}
          <section className="grid gap-2">
            <h2>
              {t(
                "Recover an interrupted import",
                "Reprendre un import interrompu",
              )}
            </h2>
            <label className="grid gap-1">
              {t(
                "Receipt recovery reference",
                "Référence de récupération du reçu",
              )}
              <input
                className="dashboard-control min-w-0 rounded p-2"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
              />
            </label>
            <button
              className="dashboard-btn-secondary justify-self-start rounded px-4 py-2"
              disabled={!recoveryKey}
              onClick={() =>
                run(async () => {
                  const result = await call("RECEIPT", {
                    idempotencyKey: recoveryKey,
                  });
                  if (result.status === "COMMITTED") {
                    setRecoveredReceipt(result);
                    setMessage(
                      t(
                        "Committed receipt recovered; no new employees created.",
                        "Reçu validé retrouvé ; aucun nouvel employé créé.",
                      ),
                    );
                  } else
                    setMessage(
                      t(
                        "No committed receipt at this check. Retry the same reviewed request, or preview the file again after reloading.",
                        "Aucun reçu validé lors de ce contrôle. Réessayez la même demande vérifiée, ou relancez l’aperçu après rechargement.",
                      ),
                    );
                })
              }
            >
              {t("Check receipt", "Consulter le reçu")}
            </button>
          </section>
        </fieldset>
        {[
          { data: receipt, recovered: false },
          { data: recoveredReceipt, recovered: true },
        ]
          .filter((item) => item.data)
          .map(({ data, recovered }) => (
            <section
              key={(recovered ? "history-" : "current-") + data.receiptId}
              className="grid gap-2 rounded border border-white/20 p-4"
            >
              <h2>
                {recovered
                  ? t("Recovered import receipt", "Reçu d’import retrouvé")
                  : t("Import receipt", "Reçu d’import")}
              </h2>
              <p>
                {t("Total", "Total")}: {data.total} ·{" "}
                {t("Created now", "Créés maintenant")}: {data.created} ·{" "}
                {t("Already committed", "Déjà enregistrés")}: {data.unchanged} ·{" "}
                {t("Rejected", "Refusés")}: {data.rejected}
              </p>
              <p className="break-all">
                {t("Batch reference", "Référence du lot")}: {data.previewId}
              </p>
              <p className="break-all">
                {t("Receipt reference", "Référence du reçu")}: {data.receiptId}
              </p>
              <ul className="grid max-h-64 gap-2 overflow-auto">
                {data.rows.map((row: any) => (
                  <li key={row.line}>
                    {t("Source row", "Ligne source")} {row.line} ·{" "}
                    {row.status === "CREATED"
                      ? t("Created", "Créé")
                      : t("Already committed", "Déjà enregistré")}{" "}
                    ·{" "}
                    <Link
                      className="underline"
                      href={localizePath(
                        `/dashboard/people/${encodeURIComponent(row.employeeId)}`,
                        locale,
                      )}
                    >
                      {t("Open employee", "Ouvrir le dossier employé")}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={localizePath("/dashboard/people/manage", locale)}>
                {t(
                  "Continue reviewed employee setup",
                  "Poursuivre la configuration vérifiée des employés",
                )}
              </Link>
            </section>
          ))}
      </div>
    </main>
  );
}
