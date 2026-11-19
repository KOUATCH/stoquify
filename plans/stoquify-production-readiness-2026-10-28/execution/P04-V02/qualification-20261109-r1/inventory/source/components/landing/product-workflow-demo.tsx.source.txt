"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import {
  ArrowRight,
  Check,
  FileCheck2,
  Package,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
} from "lucide-react";
import { useCinematicMotionOff } from "./cinematic-shell";
import { AccountingWorkflowContext } from "./accounting-workflow-context";
import { PreviewLogo } from "./preview-logo";
import type { CinematicModuleId } from "./cinematic-modules";
import {
  createWorkflowAnimations,
  workflowFlights,
  WORKFLOW_DURATION,
  WORKFLOW_CYCLE_DURATION,
} from "./product-workflow-motion";

type Copy = readonly [string, string];
type Step = { label: Copy; detail: Copy };

// Illustrations of existing product boundaries, never live execution or status.
// Sources: pos/checkout.service, inventory/inventory-transfer-lifecycle.service,
// reconciliation/manual-match-evidence, accounting/close-assurance.service,
// payroll/{employee,contract,certified-input-proof}, purchasing/ap-control.service.
const workflows: Record<CinematicModuleId, readonly Step[]> = {
  pos: [
    {
      label: ["Build the basket", "Composer le panier"],
      detail: [
        "Select the items at the register. Quantities and prices stay visible before checkout.",
        "Sélectionnez les articles en caisse. Quantités et prix restent visibles avant l’encaissement.",
      ],
    },
    {
      label: ["Record the payment", "Enregistrer le paiement"],
      detail: [
        "Review the total and the tender before confirming the sale.",
        "Vérifiez le total et le mode de règlement avant de confirmer la vente.",
      ],
    },
    {
      label: ["Keep the trail", "Conserver la trace"],
      detail: [
        "The recorded sale keeps its receipt, payment and stock movement connected.",
        "La vente enregistrée conserve le lien avec le reçu, le paiement et le mouvement de stock.",
      ],
    },
  ],
  inventory: [
    {
      label: ["Review the transfer", "Vérifier le transfert"],
      detail: [
        "Choose the source, destination and quantity. An independent approval is required before dispatch.",
        "Choisissez l’origine, la destination et la quantité. Une approbation indépendante précède l’expédition.",
      ],
    },
    {
      label: ["Dispatch the goods", "Expédier les articles"],
      detail: [
        "After approval, dispatch reduces stock at the source. The destination has not received the goods yet.",
        "Après approbation, l’expédition réduit le stock d’origine. Le site destinataire n’a pas encore reçu les articles.",
      ],
    },
    {
      label: ["Confirm receipt", "Confirmer la réception"],
      detail: [
        "Record the quantity actually received. Both locations retain the transfer reference.",
        "Enregistrez la quantité réellement reçue. Les deux sites conservent la référence du transfert.",
      ],
    },
  ],
  finance: [
    {
      label: ["Find the payment", "Retrouver le paiement"],
      detail: [
        "Start from a confirmed internal payment and its source reference.",
        "Partez d’un paiement interne confirmé et de sa référence d’origine.",
      ],
    },
    {
      label: ["Compare the evidence", "Comparer les justificatifs"],
      detail: [
        "Compare the statement line, currency, direction and available amount with the payment.",
        "Comparez la ligne du relevé, la devise, le sens et le montant disponible avec le paiement.",
      ],
    },
    {
      label: ["Review the match", "Vérifier le rapprochement"],
      detail: [
        "Equal amounts are a starting point. Review the supporting evidence before confirming a match.",
        "Des montants égaux sont un point de départ. Vérifiez les justificatifs avant de confirmer le rapprochement.",
      ],
    },
  ],
  accounting: [
    {
      label: ["Trace the source", "Retrouver la pièce"],
      detail: [
        "Open the source behind a journal entry to understand the recorded transaction.",
        "Ouvrez la pièce liée à une écriture pour comprendre l’opération enregistrée.",
      ],
    },
    {
      label: ["Review the journal", "Réviser le journal"],
      detail: [
        "Review debits, credits and the source link. This illustration simplifies the posting and tax rules.",
        "Vérifiez débits, crédits et pièce d’origine. Cet exemple simplifie les règles comptables et fiscales.",
      ],
    },
    {
      label: ["Prepare the close", "Préparer la clôture"],
      detail: [
        "Check outstanding evidence and reconciliation issues. A balanced journal alone does not close the period.",
        "Examinez les justificatifs et rapprochements en attente. Une écriture équilibrée ne clôture pas la période.",
      ],
    },
  ],
  hris: [
    {
      label: ["Open the record", "Ouvrir le dossier"],
      detail: [
        "Keep employee identity and organizational context in a single record.",
        "Réunissez l’identité du salarié et son contexte organisationnel dans un dossier.",
      ],
    },
    {
      label: ["Link the contract", "Relier le contrat"],
      detail: [
        "Connect the employment contract and its supporting documents to the employee.",
        "Reliez le contrat de travail et ses justificatifs au salarié.",
      ],
    },
    {
      label: ["Review time inputs", "Vérifier les temps"],
      detail: [
        "Review time information before it becomes part of payroll preparation.",
        "Vérifiez les temps de travail avant leur utilisation dans la préparation de la paie.",
      ],
    },
  ],
  payroll: [
    {
      label: ["Gather inputs", "Réunir les données"],
      detail: [
        "Bring employee and time records into the payroll readiness review.",
        "Réunissez dossiers salariés et temps de travail pour vérifier la préparation de la paie.",
      ],
    },
    {
      label: ["Check readiness", "Vérifier la préparation"],
      detail: [
        "Review the input evidence and applicable country rules before approval.",
        "Vérifiez les justificatifs et les règles applicables du pays avant l’approbation.",
      ],
    },
    {
      label: ["Review the draft", "Examiner le brouillon"],
      detail: [
        "A draft payslip remains subject to review. It is not evidence of payment.",
        "Un bulletin provisoire reste à vérifier. Il ne constitue pas une preuve de paiement.",
      ],
    },
  ],
  payables: [
    {
      label: ["Open the order", "Ouvrir la commande"],
      detail: [
        "Start with the supplier order and the amount committed.",
        "Partez de la commande fournisseur et du montant engagé.",
      ],
    },
    {
      label: ["Compare the receipt", "Comparer la réception"],
      detail: [
        "Compare the goods receipt and supplier invoice with the order.",
        "Comparez la réception et la facture fournisseur avec la commande.",
      ],
    },
    {
      label: ["Review the payable", "Vérifier la dette"],
      detail: [
        "Review the amount due and supporting documents before preparing payment.",
        "Vérifiez le montant à payer et les justificatifs avant de préparer le règlement.",
      ],
    },
  ],
  receivables: [
    {
      label: ["Follow the invoice", "Suivre la facture"],
      detail: [
        "Keep the customer, invoice amount and due date together.",
        "Réunissez le client, le montant de la facture et son échéance.",
      ],
    },
    {
      label: ["Record a collection", "Enregistrer un encaissement"],
      detail: [
        "Link the partial collection to the customer invoice.",
        "Reliez l’encaissement partiel à la facture client.",
      ],
    },
    {
      label: ["Follow the balance", "Suivre le solde"],
      detail: [
        "The remaining amount stays visible for follow-up until fully collected.",
        "Le montant restant dû reste visible pour les relances jusqu’à son encaissement complet.",
      ],
    },
  ],
};

function RecordRow({
  label,
  value,
  ready = false,
}: {
  label: string;
  value: string;
  ready?: boolean;
}) {
  return (
    <div className="workflow-record">
      <span className="workflow-arrival" aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
      {ready && <Check size={15} aria-hidden="true" />}
    </div>
  );
}

function WorkflowScene({
  module,
  step,
  time,
  fr,
}: {
  module: CinematicModuleId;
  step: number;
  time: number;
  fr: boolean;
}) {
  const t = (en: string, french: string) => (fr ? french : en);
  const money = (n: number) =>
    `${new Intl.NumberFormat(fr ? "fr-FR" : "en-GB").format(n)} XAF`;
  const status = (text: string, complete = false) => (
    <span className={`workflow-status ${complete ? "complete" : ""}`}>
      <FileCheck2 size={14} aria-hidden="true" />
      {text}
    </span>
  );
  const card = (label: string, value: string, children?: ReactNode) => (
    <div className="workflow-card">
      <span className="workflow-arrival" aria-hidden="true" />
      <small>{label}</small>
      <strong>{value}</strong>
      {children}
    </div>
  );

  if (module === "pos")
    return (
      <>
        <div className="workflow-topline">
          <span>{t("Main shop · Register 01", "Boutique · Caisse 01")}</span>
          <span>SALE-104</span>
        </div>
        <div className="workflow-checkout">
          <div className="workflow-catalog">
            {[
              ["Coffee", "Café", 2500],
              ["Tea", "Thé", 1500],
            ].map(([en, french, price], index) => (
              <div key={en} className="workflow-item">
                <Package size={30} aria-hidden="true" />
                <strong>{t(String(en), String(french))}</strong>
                <span>{money(Number(price))}</span>
                <small>
                  {time >= (index === 0 ? 2300 : 4700) ? "1 ×" : "+"}
                </small>
              </div>
            ))}
            <div className="workflow-register">
              <ScanLine size={18} aria-hidden="true" />
              {time < 2300
                ? t("Select an item", "Choisir un article")
                : time < 4700
                  ? t("1 item selected", "1 article sélectionné")
                  : t("2 items selected", "2 articles sélectionnés")}
            </div>
          </div>
          <div className="workflow-receipt">
            <span className="workflow-receipt-brand"><PreviewLogo /></span>
            <small>{t("Main shop", "Boutique principale")}</small>
            <RecordRow
              label={t("Coffee × 1", "Café × 1")}
              value={money(2500)}
            />
            <RecordRow label={t("Tea × 1", "Thé × 1")} value={money(1500)} />
            <div className="workflow-total">
              <span>Total</span>
              <strong>
                {money(time < 2300 ? 0 : time < 4700 ? 2500 : 4000)}
              </strong>
            </div>
            {status(
              time < 6000
                ? time < 4700
                  ? t("Building basket", "Composition du panier")
                  : t("Basket ready", "Panier prêt")
                : time < 13500
                  ? t("Cash · review tender", "Espèces · règlement à vérifier")
                  : t("Sale recorded", "Vente enregistrée"),
              time >= 13500,
            )}
          </div>
        </div>
        <div className="workflow-payment">
          <span>
            <small>{t("Tender", "Règlement")}</small>
            <strong>{t("Cash", "Espèces")}</strong>
          </span>
          <span>
            <small>{t("Amount received", "Montant reçu")}</small>
            <strong>{time >= 8200 ? money(4000) : "—"}</strong>
          </span>
          <span className="workflow-payment-confirm">
            <Check size={15} aria-hidden="true" />
            {t("Confirm sale", "Confirmer la vente")}
          </span>
        </div>
        <div className="workflow-result">
          <Package size={18} aria-hidden="true" />
          <span>
            {time >= 13500
              ? t(
                  "Stock movement linked · Coffee −1 · Tea −1",
                  "Mouvement de stock relié · Café −1 · Thé −1",
                )
              : t(
                  "Stock updates after the sale is recorded",
                  "Le stock évolue après l’enregistrement de la vente",
                )}
          </span>
        </div>
      </>
    );

  if (module === "inventory")
    return (
      <>
        <div className="workflow-topline">
          <span>SKU-024 · {t("24 units", "24 unités")}</span>
          <span>TRF-024</span>
        </div>
        <div className="workflow-transfer">
          {card(
            t("Warehouse", "Entrepôt"),
            time < 6500 ? "120" : "96",
            <small>{t("units available", "unités disponibles")}</small>,
          )}
          <div
            className={`workflow-route ${time >= 6500 && time < 13000 ? "in-transit" : ""}`}
          >
            <Package size={20} aria-hidden="true" />
            <span>{time >= 6500 && time < 13000 ? "24" : "0"}</span>
            <ArrowRight aria-hidden="true" />
            <small>{t("In transit", "En transit")}</small>
          </div>
          {card(
            t("Main shop", "Boutique"),
            time >= 13000 ? "72" : "48",
            <small>{t("units available", "unités disponibles")}</small>,
          )}
        </div>
        <div className="workflow-ledger">
          <RecordRow
            label={t("Independent approval", "Approbation indépendante")}
            value={
              time >= 5000
                ? t("Recorded", "Enregistrée")
                : t("Required", "Requise")
            }
            ready={time >= 5000}
          />
          <RecordRow
            label={t("Dispatched", "Expédié")}
            value={`${time >= 6500 ? 24 : 0} / 24`}
            ready={time >= 6500}
          />
          <RecordRow
            label={t("Received", "Reçu")}
            value={`${time >= 13000 ? 24 : 0} / 24`}
            ready={time >= 13000}
          />
        </div>
        <div className="workflow-result">
          {t(
            "168 units total · source + transit + destination",
            "168 unités au total · origine + transit + destination",
          )}
        </div>
      </>
    );

  if (module === "finance")
    return (
      <>
        <div className="workflow-topline">
          <span>{t("Payment review", "Vérification des paiements")}</span>
          <span>XAF</span>
        </div>
        <div className="workflow-pair">
          {card(
            t("Confirmed payment", "Paiement confirmé"),
            money(4000),
            <small>SALE-104</small>,
          )}
          {card(
            t("Statement line", "Ligne du relevé"),
            time >= 5000 ? money(4000) : "—",
            <small>
              {time >= 5000
                ? "REF-104"
                : t("Select evidence", "Choisir un justificatif")}
            </small>,
          )}
        </div>
        <div className="workflow-ledger">
          <RecordRow
            label={t("Currency", "Devise")}
            value={time >= 7900 ? "XAF ↔ XAF" : "XAF"}
            ready={time >= 7900}
          />
          <RecordRow
            label={t("Direction", "Sens")}
            value={t("Incoming payment", "Encaissement")}
            ready={time >= 9600}
          />
          <RecordRow
            label={t("Difference", "Écart")}
            value={time >= 11200 ? money(0) : "—"}
          />
        </div>
        <div className="workflow-result">
          {status(
            step === 2
              ? t("Evidence review pending", "Justificatifs à vérifier")
              : t("Match not confirmed", "Rapprochement non confirmé"),
          )}
        </div>
      </>
    );

  if (module === "accounting")
    return (
      <>
        <div className="workflow-topline">
          <span>
            {t("October · Journal review", "Octobre · Révision du journal")}
          </span>
          <span>XAF</span>
        </div>
        <div className="workflow-source">
          <FileCheck2 aria-hidden="true" />
          <div>
            <small>{t("Linked source", "Pièce liée")}</small>
            <strong>SALE-104</strong>
          </div>
          {status(t("To review", "À vérifier"))}
        </div>
        <table className="workflow-journal">
          <caption>
            {t(
              "Simplified journal · posting and tax rules omitted",
              "Journal simplifié · règles comptables et fiscales omises",
            )}
          </caption>
          <thead>
            <tr>
              <th>{t("Entry", "Écriture")}</th>
              <th>{t("Debit", "Débit")}</th>
              <th>{t("Credit", "Crédit")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>{t("Cash", "Caisse")}</th>
              <td>{time >= 8300 ? money(4000) : "—"}</td>
              <td>—</td>
            </tr>
            <tr>
              <th>{t("Sales", "Ventes")}</th>
              <td>—</td>
              <td>{time >= 10000 ? money(4000) : "—"}</td>
            </tr>
          </tbody>
        </table>
        <div className="workflow-result">
          {status(
            step === 2
              ? t(
                  "Close pending · reconciliation evidence needed",
                  "Clôture en attente · justificatif de rapprochement requis",
                )
              : t(
                  "Source available · review required",
                  "Pièce disponible · vérification requise",
                ),
          )}
        </div>
      </>
    );

  if (module === "receivables" || module === "payables") {
    const ar = module === "receivables";
    return (
      <>
        <div className="workflow-topline">
          <span>{ar ? "CLIENT-012 · INV-104" : "PO-028 · BILL-028"}</span>
          <span>{t("Due 31 Oct", "Échéance 31 oct.")}</span>
        </div>
        <div className="workflow-pair">
          {card(
            ar
              ? t("Customer invoice", "Facture client")
              : t("Supplier order", "Commande fournisseur"),
            money(ar ? 60000 : 120000),
          )}
          {card(
            ar
              ? t("Outstanding", "Reste à recevoir")
              : t("Amount due", "Montant à payer"),
            money(ar ? (time >= 11200 ? 20000 : 60000) : 120000),
          )}
        </div>
        <div className="workflow-ledger">
          <RecordRow
            label={
              ar ? t("Invoice", "Facture") : t("Purchase order", "Commande")
            }
            value={ar ? "INV-104" : "PO-028"}
            ready
          />
          <RecordRow
            label={
              ar
                ? t("Collection recorded", "Encaissement enregistré")
                : t("Goods receipt", "Bon de réception")
            }
            value={
              time >= (ar ? 9000 : 8200) ? (ar ? money(40000) : "GR-028") : "—"
            }
            ready={time >= (ar ? 9000 : 8200)}
          />
          <RecordRow
            label={
              ar
                ? t("Follow-up", "Suivi")
                : t("Invoice review", "Contrôle de facture")
            }
            value={
              ar
                ? t("Balance outstanding", "Solde restant dû")
                : t("Pending", "En attente")
            }
          />
        </div>
        <div className="workflow-result">
          {status(
            ar
              ? time >= 11200
                ? t(
                    "Partial collection · balance remains visible",
                    "Encaissement partiel · solde visible",
                  )
                : t("Invoice outstanding", "Facture à recevoir")
              : t("Payment not released", "Paiement non exécuté"),
          )}
        </div>
      </>
    );
  }

  const payroll = module === "payroll";
  return (
    <>
      <div className="workflow-topline">
        <span>
          {t("Sample employee · October", "Salarié fictif · Octobre")}
        </span>
        <span>EMP-024</span>
      </div>
      <div className="workflow-person">
        <span>AM</span>
        <div>
          <small>{t("Operations · Main shop", "Opérations · Boutique")}</small>
          <strong>
            {payroll
              ? t("Payroll preparation", "Préparation de la paie")
              : t("Employee record", "Dossier salarié")}
          </strong>
        </div>
      </div>
      <div className="workflow-ledger">
        <RecordRow
          label={t("Employee record", "Dossier salarié")}
          value="EMP-024"
          ready
        />
        <RecordRow
          label={
            payroll
              ? t("Time inputs", "Temps de travail")
              : t("Contract", "Contrat")
          }
          value={
            time >= 8000
              ? payroll
                ? t("Reviewed", "Vérifiés")
                : "DOC-024"
              : t("To review", "À vérifier")
          }
          ready={time >= 8000}
        />
        <RecordRow
          label={
            payroll
              ? t("Country rules", "Règles du pays")
              : t("Time inputs", "Temps de travail")
          }
          value={t("Review pending", "À vérifier")}
        />
      </div>
      <div className="workflow-result">
        {status(
          payroll && step === 2
            ? t(
                "Draft payslip · not payment evidence",
                "Bulletin provisoire · sans preuve de paiement",
              )
            : t(
                "Review inputs before payroll approval",
                "Vérifier les données avant l’approbation de la paie",
              ),
        )}
      </div>
    </>
  );
}

// No timelines, effects or live data in the invisible sizing layer. Memoizing it
// keeps animation frames confined to the one active scene.
const WorkflowSizeGuide = memo(function WorkflowSizeGuide({ fr }: { fr: boolean }) {
  return (<div className="workflow-size-guide" aria-hidden="true" inert>
          {(Object.keys(workflows) as CinematicModuleId[]).flatMap(id => [0, 5999, 11999, WORKFLOW_DURATION].map(frame => (
            <div className="workflow-scene-reserve" key={`${id}-${frame}`}>
              {!["pos", "inventory", "accounting"].includes(id) && <div className="workflow-evidence">
                <FileCheck2 size={18} /><span><small>{fr ? "Pièce à relier" : "Document to link"}</small><strong>{workflowFlights[id][0].label[fr ? 1 : 0]}</strong></span><ArrowRight size={16} />
              </div>}
              <WorkflowScene module={id} step={Math.min(2, Math.floor(frame / 6000))} time={frame} fr={fr} />
              <div className="workflow-progress" />
            </div>
          )))}
        </div>);
});

// Reserves the animated walkthrough's footprint when the library shows a guide.
// This is a static, inert layout: it never starts a playback timer.
export function WorkflowDemoPlaceholder({ reserveScene = true }: { reserveScene?: boolean }) {
  const fr = useLocale() === "fr";
  const text = (copy: Copy) => copy[fr ? 1 : 0];
  return <div className="product-workflow workflow-demo-placeholder" aria-hidden="true" inert>
    <div className="workflow-interaction">
      <p className="workflow-playback-indicator">{fr ? "En pause · éloignez le pointeur pour reprendre" : "Paused · move away to resume"}</p>
      <div className="workflow-scene-stack">{reserveScene && <WorkflowSizeGuide fr={fr} />}</div>
    </div>
    <div className="workflow-steps">{[0, 1, 2].map(index => <button key={index} tabIndex={-1} type="button">
      <span>0{index + 1}</span><span className="workflow-step-labels">{Object.values(workflows).map((steps, i) => <span key={i}>{text(steps[index].label)}</span>)}</span>
    </button>)}</div>
    <div className="workflow-explanation">{Object.values(workflows).flatMap((steps, i) => steps.map((step, j) => <div key={`${i}-${j}`}><strong>{text(step.label)}</strong><p>{text(step.detail)}</p></div>))}</div>
    <div className="workflow-controls"><span>{fr ? "Lecture en pause" : "Walkthrough paused"}</span><button type="button" tabIndex={-1}>Pause</button><button type="button" tabIndex={-1}>{fr ? "Recommencer" : "Replay"}</button></div>
  </div>;
}

/** Visible, user-controllable loops. Inactive modules unmount their timers. */
export function ProductWorkflowDemo({ module, showAccountingContext = true, stableLayout = false }: { module: CinematicModuleId; showAccountingContext?: boolean; stableLayout?: boolean }) {
  const fr = useLocale() === "fr";
  const motionOff = useCinematicMotionOff();
  const text = (copy: Copy) => copy[fr ? 1 : 0];
  const root = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(motionOff ? 5999 : 0);
  const elapsed = useRef(time);
  const motionInitialized = useRef(false);
  const animations = useRef<Animation[]>([]);
  const hintRoot = useRef<HTMLSpanElement>(null);
  const hintAnimations = useRef<Animation[]>([]);
  const tap = useRef<{
    id: number;
    x: number;
    y: number;
    startedAt: number;
  } | null>(null);
  const [seekVersion, setSeekVersion] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const [hintPointer, setHintPointer] = useState<"mouse" | "touch">("mouse");
  const [visible, setVisible] = useState(false);
  const [presented, setPresented] = useState(false);
  const [entranceHoldRequired, setEntranceHoldRequired] = useState(false);
  const [entranceHoldComplete, setEntranceHoldComplete] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const steps = workflows[module];
  const motionEnabled =
    !motionOff && !paused && !hovered && visible && presented && pageVisible &&
    (!entranceHoldRequired || entranceHoldComplete);
  const complete = time >= WORKFLOW_DURATION;
  const step = Math.min(2, Math.floor(time / 6000));
  const playing = motionEnabled;
  // Hover is temporary; the Pause button can still make that pause persistent.
  const showPause = playing || (hovered && !paused);
  const indicatorState = paused ? "paused" : hovered ? "hovered" : "ready";
  const keyboardHintState = showPause ? "keyboard-pause" : "keyboard-resume";
  const hintState = keyboardFocused
    ? keyboardHintState
    : hintPointer === "touch"
      ? paused ? "touch-paused" : "touch-ready"
      : indicatorState;
  const keyboardHints = [
    ["keyboard-pause", fr ? "Entrée ou Espace pour mettre en pause" : "Enter or Space to pause"],
    ["keyboard-resume", fr ? "Entrée ou Espace pour reprendre" : "Enter or Space to resume"],
  ] as const;
  const hintFadeDuration = playing ? 360 : 180;
  useLayoutEffect(() => {
    const labels = Array.from(hintRoot.current?.children ?? []) as HTMLElement[];
    // Snapshot every layer before cancelling; shared timing keeps their total opacity
    // steady even when a third input method interrupts an unfinished crossfade.
    const from = labels.map((label) => Number(getComputedStyle(label).opacity));
    const duration = hintAnimations.current.length ? hintFadeDuration : 0;
    hintAnimations.current.forEach((animation) => animation.cancel());
    hintAnimations.current = labels.map((label, index) => {
      const opacity = label.dataset.active === "true" ? 1 : 0;
      return label.animate([{ opacity: duration ? from[index] : opacity }, { opacity }], {
        duration,
        easing: "ease-out",
        fill: "both",
      });
    });
  }, [hintState, hintFadeDuration, motionOff]);
  useEffect(() => () => {
    hintAnimations.current.forEach((animation) => animation.cancel());
  }, []);
  const playback = useRef({ playing, time });
  playback.current = { playing, time };
  const captureFrame = useCallback(() => {
    if (!playback.current.playing) return;
    // Capture the rendered frame, not the text clock's last 100 ms tick.
    const position = animations.current[0]?.currentTime;
    if (typeof position === "number") {
      elapsed.current = position % WORKFLOW_CYCLE_DURATION;
      setTime(elapsed.current);
    }
  }, []);
  const seek = (next: number) => {
    elapsed.current = next;
    setTime(next);
    setSeekVersion((value) => value + 1);
  };

  useEffect(() => {
    if (!motionOff) {
      // The public shell starts static until the client's motion preference is known.
      if (!motionInitialized.current) {
        motionInitialized.current = true;
        elapsed.current = 0;
        setTime(0);
        setSeekVersion((value) => value + 1);
      }
      return;
    }
    // Turning motion off leaves a complete, readable snapshot of the current phase.
    const snapshot = Math.min(
      WORKFLOW_DURATION,
      (Math.floor(elapsed.current / 6000) + 1) * 6000 - 1,
    );
    elapsed.current = snapshot;
    setTime(snapshot);
    setSeekVersion((value) => value + 1);
  }, [motionOff]);

  useEffect(() => {
    setHintPointer(window.matchMedia("(any-pointer: coarse)").matches ? "touch" : "mouse");
    const update = () => setPageVisible(document.visibilityState !== "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    const showcase = root.current?.closest<HTMLElement>(".workflow-showcase");
    const updatePresentation = () => {
      setEntranceHoldRequired(Boolean(
        showcase?.hasAttribute("data-hero-handoff") ||
        showcase?.hasAttribute("data-mobile-preview"),
      ));
      // The staggered preview finishes only when the shared entry reaches 1.
      // Standalone demos and static layouts have no entrance to wait for.
      const heroReady = !showcase?.hasAttribute("data-hero-handoff") ||
        Number(showcase.style.getPropertyValue("--hero-entry-opacity") || "1") >= 1;
      const mobileReady = !showcase?.hasAttribute("data-mobile-preview") ||
        Number(showcase.style.getPropertyValue("--mobile-preview-opacity") || "0") >= 1;
      const ready = heroReady && mobileReady;
      if (!ready) captureFrame();
      setPresented(ready);
    };
    const presentationObserver = showcase
      ? new MutationObserver(updatePresentation)
      : null;
    if (showcase) presentationObserver?.observe(showcase, {
      attributes: true,
      attributeFilter: ["style", "data-hero-handoff", "data-mobile-preview"],
    });
    updatePresentation();
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              // A fast scroll can queue multiple readings for this preview.
              const entry = entries[entries.length - 1];
              setVisible(
                entry.isIntersecting && entry.intersectionRatio >= 0.35,
              );
            },
            { threshold: 0.35 },
          );
    if (root.current) observer?.observe(root.current);
    return () => {
      presentationObserver?.disconnect();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [captureFrame]);

  useEffect(() => {
    if (entranceHoldComplete || !entranceHoldRequired || !presented || !visible || !pageVisible || motionOff)
      return;
    // Give the settled interface a short reading hold before its first playback.
    const timer = window.setTimeout(() => setEntranceHoldComplete(true), 400);
    return () => window.clearTimeout(timer);
  }, [entranceHoldComplete, entranceHoldRequired, presented, visible, pageVisible, motionOff]);

  useEffect(() => {
    if (!playing) return;
    const startedAt = Date.now();
    const from = elapsed.current;
    // Text changes use a modest cadence; the browser interpolates motion at display refresh rate.
    const timer = window.setInterval(() => {
      const next = (from + Date.now() - startedAt) % WORKFLOW_CYCLE_DURATION;
      const wrapped = next < elapsed.current;
      elapsed.current = next;
      setTime(next);
      if (wrapped) setSeekVersion((value) => value + 1);
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing, seekVersion]);

  useEffect(() => {
    const viewport =
      root.current?.querySelector<HTMLElement>(".workflow-viewport");
    if (!viewport || motionOff) return;
    const rebuild = () => {
      const currentTime = animations.current[0]?.currentTime;
      const position =
        typeof currentTime === "number" ? currentTime : playback.current.time;
      animations.current.forEach((animation) => animation.cancel());
      animations.current = createWorkflowAnimations(viewport, module);
      animations.current.forEach((animation) => {
        animation.currentTime = position;
        if (playback.current.playing) animation.play();
      });
    };
    rebuild();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(rebuild);
    observer?.observe(viewport);
    return () => {
      observer?.disconnect();
      animations.current.forEach((animation) => animation.cancel());
      animations.current = [];
    };
  }, [module, motionOff]);

  useEffect(() => {
    animations.current.forEach((animation) => {
      // Seek after pausing to resolve the native pending pause at this exact
      // position, without drifting forward to the next frame.
      if (!playing) animation.pause();
      animation.currentTime = elapsed.current;
      if (playing) animation.play();
    });
  }, [playing, seekVersion, motionOff]);

  return (
    <div
      ref={root}
      className="product-workflow"
      data-module={module}
      data-step={step}
      data-time={time}
      data-playing={playing}
      data-hovered={hovered}
      data-motion-off={motionOff}
      onPointerEnter={(event) => {
        // Touch generates pointer entry too, but must never leave playback stuck.
        if (event.pointerType !== "mouse") return;
        setHintPointer("mouse");
        setKeyboardFocused(false);
        captureFrame();
        setHovered(true);
      }}
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse" || (!event.movementX && !event.movementY)) return;
        setHintPointer("mouse");
        setKeyboardFocused(false);
        if (!hovered) {
          captureFrame();
          setHovered(true);
        }
      }}
      onPointerDownCapture={(event) => {
        if (event.pointerType !== "mouse" && event.pointerType !== "touch") return;
        setHintPointer(event.pointerType);
        setKeyboardFocused(false);
        if (event.pointerType === "touch") setHovered(false);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setHovered(false);
      }}
      onFocusCapture={(event) => {
        // Playback buttons are explicit requests; focusing one must not invert its action.
        if (!(event.target as HTMLElement).closest(".workflow-controls"))
          setPaused(true);
      }}
    >
      <div className="workflow-step-heading">
        <span>{fr ? "LE PARCOURS EN ACTION" : "THE WORKFLOW IN ACTION"}</span>
        <span>0{step + 1} / 03</span>
      </div>
      <div
        className="workflow-interaction"
        onPointerDown={(event) => {
          tap.current =
            !motionOff && event.pointerType === "touch" && event.isPrimary
              ? {
                  id: event.pointerId,
                  x: event.clientX,
                  y: event.clientY,
                  startedAt: Date.now(),
                }
              : null;
        }}
        onPointerMove={(event) => {
          const start = tap.current;
          // Leave scrolling and pinch zoom to the browser; neither toggles playback.
          if (
            start &&
            Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10
          )
            tap.current = null;
        }}
        onPointerCancel={() => {
          tap.current = null;
        }}
        onPointerUp={(event) => {
          const start = tap.current;
          tap.current = null;
          if (
            !start ||
            motionOff ||
            event.pointerType !== "touch" ||
            event.pointerId !== start.id ||
            Date.now() - start.startedAt > 500 ||
            Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10
          )
            return;
          captureFrame();
          setPaused((value) => !value);
        }}
      >
        {motionOff && stableLayout && (
          <p className="workflow-playback-indicator workflow-text-reserve" aria-hidden="true">
            {fr ? "En pause · éloignez le pointeur pour reprendre" : "Paused · move away to resume"}
          </p>
        )}
        {!motionOff && (
          <p className="workflow-playback-indicator" id={`workflow-playback-hint-${module}`}>
            <span className="workflow-indicator-icon" aria-hidden="true">
              <Pause size={13} className="workflow-indicator-state" data-active={indicatorState === "ready"} />
              <Play size={13} className="workflow-indicator-state" data-active={indicatorState !== "ready"} />
            </span>
            <span className="workflow-indicator-hints" ref={hintRoot}>
              {([
                ["ready", fr ? "Survolez pour mettre en pause" : "Hover to pause"],
                ["hovered", fr ? "En pause · éloignez le pointeur pour reprendre" : "Paused · move away to resume"],
                ["paused", fr ? "En pause · cliquez sur Lire pour reprendre" : "Paused · use Play to resume"],
                ["touch-ready", fr ? "Touchez l’aperçu pour mettre en pause" : "Tap the preview to pause"],
                ["touch-paused", fr ? "Touchez l’aperçu pour reprendre" : "Tap the preview to resume"],
                ...keyboardHints,
              ] as const).map(([state, hint]) => (
                <span key={state} className="workflow-indicator-state" data-active={hintState === state} aria-hidden={hintState !== state}>
                  {hint}
                </span>
              ))}
            </span>
          </p>
        )}
        <div className="workflow-scene-stack">
        {stableLayout && <WorkflowSizeGuide fr={fr} />}
        <div className="workflow-viewport">
          {!["pos", "inventory", "accounting"].includes(module) && (
            <div className="workflow-evidence">
              <FileCheck2 size={18} aria-hidden="true" />
              <span>
                <small>{fr ? "Pièce à relier" : "Document to link"}</small>
                <strong>{text(workflowFlights[module][0].label)}</strong>
              </span>
              <ArrowRight size={16} aria-hidden="true" />
            </div>
          )}
          <WorkflowScene module={module} step={step} time={time} fr={fr} />
          <div className="workflow-flight-layer" aria-hidden="true">
            {workflowFlights[module].map((flight, index) => (
              <div className="workflow-flight" data-flight={index} key={index}>
                {module === "pos" || module === "inventory" ? (
                  <Package size={18} />
                ) : (
                  <FileCheck2 size={18} />
                )}
                <span>{text(flight.label)}</span>
              </div>
            ))}
          </div>
          <div className="workflow-progress" aria-hidden="true">
            <span className="workflow-playhead" />
          </div>
        </div>
        </div>
      </div>
      <div
        className="workflow-steps"
        role="group"
        aria-label={fr ? "Étapes de la démonstration" : "Demonstration steps"}
      >
        {steps.map((item, index) => (
          <button
            key={index}
            type="button"
            aria-pressed={step === index}
            aria-controls={`workflow-explanation-${module}`}
            onClick={() => {
              setPaused(true);
              seek(index === 2 ? WORKFLOW_DURATION : (index + 1) * 6000 - 1);
            }}
          >
            <span aria-hidden="true">0{index + 1}</span>
            <span className="workflow-step-labels">
              <span>{text(item.label)}</span>
              {stableLayout && Object.values(workflows).map((workflow, i) => <span key={i} className="workflow-text-reserve" aria-hidden="true">{text(workflow[index].label)}</span>)}
            </span>
          </button>
        ))}
      </div>
      <div
        className="workflow-explanation"
        id={`workflow-explanation-${module}`}
        aria-live={playing ? "off" : "polite"}
        aria-atomic="true"
      >
        <div><strong>{text(steps[step].label)}</strong><p>{text(steps[step].detail)}</p></div>
        {stableLayout && Object.values(workflows).flatMap((workflow, i) => workflow.map((item, j) => (
          <div key={`${i}-${j}`} className="workflow-text-reserve" aria-hidden="true"><strong>{text(item.label)}</strong><p>{text(item.detail)}</p></div>
        )))}
      </div>
      {showAccountingContext && <AccountingWorkflowContext module={module} />}
      <div className="workflow-controls">
        <span>
          {motionOff
            ? fr
              ? "Mode sans animation"
              : "Motion paused"
            : hovered && !paused
              ? fr
                ? "En pause pendant votre lecture"
                : "Paused while you inspect"
              : complete && playing
                ? fr
                  ? "État final · reprise dans un instant"
                  : "Final state · replaying shortly"
                : playing
                  ? fr
                    ? "Lecture en cours"
                    : "Playing walkthrough"
                  : fr
                    ? "Lecture en pause"
                    : "Walkthrough paused"}
        </span>
        {!motionOff && (
          <button
            type="button"
            aria-describedby={`workflow-playback-hint-${module}`}
            onFocus={(event) => setKeyboardFocused(event.currentTarget.matches(":focus-visible"))}
            onBlur={() => setKeyboardFocused(false)}
            onPointerDown={() => setKeyboardFocused(false)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              setKeyboardFocused(true);
              // Handle once on keydown, without a second native click or key repeat.
              event.preventDefault();
              if (event.repeat) return;
              captureFrame();
              setPaused(showPause);
              // An explicit keyboard resume takes priority over a resting pointer.
              if (!showPause) setHovered(false);
            }}
            onClick={() => setPaused(showPause)}
          >
            {showPause ? (
              <Pause size={15} aria-hidden="true" />
            ) : (
              <Play size={15} aria-hidden="true" />
            )}
            {showPause ? "Pause" : fr ? "Lire" : "Play"}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            seek(motionOff ? 5999 : 0);
            setPaused(motionOff);
          }}
        >
          <RotateCcw size={15} aria-hidden="true" />
          {fr ? "Recommencer" : "Replay"}
        </button>
      </div>
    </div>
  );
}
