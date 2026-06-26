# The Compliance Layer for OHADA SMBs
### A pan-OHADA business proposal, market analysis, and marketing pitch

---

## 1. The niche in one sentence

A mobile-first SaaS that **automatically keeps an SMB legally compliant with the new mandatory electronic-invoicing (*facture normalisée électronique*) and online tax-filing rules now spreading across the OHADA zone** — sold not as "accounting software" but as **insurance against penalties and administrative closure**.

Working name for this document: **Konforme** (placeholder).

The reason this idea grips a decision-maker instantly is that you are not selling a productivity gain they have to be convinced of. The tax authority has already created the demand, by force, with a deadline. You are selling the cheapest, fastest way to avoid a fine and stay open for business.

---

## 2. Why this niche, and why now

### A legal forcing function with deadlines and penalties

Most SMB software is a *vitamin* — nice to have, easy to postpone. Mandatory e-invoicing is a *painkiller with a legal deadline*. Across the zone, governments are converting invoicing and tax filing from voluntary to obligatory, specifically to close the VAT gap (illicit financial flows are estimated at roughly **$88.6 billion a year for Africa**):

| Country | Status |
|---|---|
| **Côte d'Ivoire** | Facture Normalisée Électronique (FNE) **obligatory from 1 Sept 2025** for all companies incl. sole proprietors; phased deadlines through Dec 2025 |
| **Senegal** | E-invoicing made **mandatory for all VAT taxpayers** via 2025 Finance Law (loi n°2025-02, 28 Dec 2024), with penalties |
| **Benin, Niger** | Mandatory regimes already in force |
| **Burkina Faso** | Entire 2026 fiscal campaign themed on adopting the certified e-invoice |
| **Cameroon** | Télédéclaration obligatory for real-regime businesses **since 2024**; new IGS regime forces even small firms to keep OHADA accounts — penalty of **50% + administrative closure + 1M FCFA fine** for failure to keep accounts |
| **Tunisia, Angola, Nigeria** | Phasing in through 2026 |

This is not a one-time event. Enforcement is automated, recurring, and tightening. The deadline pressure renews every filing cycle.

### The current options are all bad

SMBs are squeezed between three poor choices:

1. **Excel + manual filing** — the default for most. But e-invoicing requires *structured, certified, real-time-transmissible* documents Excel cannot produce. This path is becoming illegal.
2. **Heavy ERPs (Sage, SAP, Odoo)** — too costly and complex. A *simple* Odoo setup in Cameroon runs **1.5–3M FCFA**; an advanced one **4–10M FCFA**, plus integrator fees and annual maintenance. Built for finance departments, not a shop owner with a phone.
3. **Hiring an accountant / CGA** — recurring cost, and still doesn't solve real-time invoice certification.

Meanwhile only ~**38% of UEMOA SMBs** had any defined digital strategy in 2025. The gap between *what the law now demands* and *what SMBs actually have* is enormous and widening — that gap is the market.

---

## 3. Market sizing (pan-OHADA)

OHADA spans **17 member states** (~$5T+ combined economic activity over time; the relevant unit here is the SMB count). SMBs represent **over 90% of the economic fabric and ~80% of employment** in Africa.

A defensible top-down frame:

- **TAM** — all VAT-registered / real-or-synthetic-regime businesses across the 17 states that will be legally required to issue certified invoices or e-file. Conservatively **several million** entities over the rollout horizon.
- **SAM** — formal-sector SMBs with a smartphone and mobile-money access in the 4–6 countries with active or imminent mandates (CI, Senegal, Cameroon, Benin, Burkina, Niger). Realistically **hundreds of thousands** of businesses in the near term.
- **SOM (3-year)** — a focused team capturing low tens of thousands of paying SMBs via a channel motion (see §6). At an ARPU of, say, 5,000–15,000 FCFA/month, **10,000 active accounts ≈ 600M–1.8B FCFA ARR** (~$1–3M). Plausible for a lean team, and that's a fraction of one country.

The point is not the precise number — it's that the law is converting a slow, optional market into a fast, mandatory one across 17 jurisdictions simultaneously.

---

## 4. The product

### Positioning
Not "comptabilité." The wedge is **"Soyez en règle"** ("be compliant") — issue a legal certified invoice and file on time, from your phone, in minutes. Accounting and dashboards come *after* you've hooked them on compliance.

### Core feature set (MVP → V2)

**MVP — the compliance wedge**
- Create and issue a **certified electronic invoice** conforming to the local format (FNE in CI, etc.), with the legally required fields, QR/sticker, and transmission to the tax platform.
- **Tax-deadline calendar** with push reminders (VAT on the 15th, IGS, DSF, etc.) — country-aware.
- **SYSCOHADA-aware** numbering and a minimal chart of accounts baked in.
- **Mobile-money payment capture** (Orange Money, MTN MoMo, Wave) linked to each invoice.
- Works on a cheap Android phone; **offline-first PWA** that queues and syncs (connectivity is the #1 infra risk).

**V2 — the retention layer**
- Auto-generated VAT return drafts and DSF/financial-statement export.
- Inventory + simple POS.
- Multi-user with role-based access (owner, cashier, accountant).
- Accountant portal: one login, all their clients' books (see go-to-market).

### Architecture (fits your Next.js + Prisma stack)

This is a textbook multi-tenant SaaS, and the pan-OHADA angle has one non-obvious design requirement: **each country has a different e-invoicing platform and format.** Do not hard-code one. Build a **compliance-adapter pattern**:

```
Next.js (App Router) — PWA, offline queue, mobile-first UI
        │
   tRPC / Route Handlers
        │
   Core domain (country-agnostic): Invoice, Party, TaxLine, Payment
        │
   Compliance Adapters (per country, pluggable):
     ├─ ci-fne/       → DGI FNE API + sticker/QR
     ├─ sn-efacture/  → Senegal DGTCP format
     ├─ cm-dgi/       → Cameroon Fiscalis/Harmony
     └─ ...           → add a country = add an adapter
        │
   Prisma + PostgreSQL (tenant_id on every row; consider RLS)
        │
   Jobs: BullMQ/queue for async certification + retry on reconnect
```

Prisma data-model spine:

```prisma
model Tenant {
  id        String   @id @default(cuid())
  country   Country
  taxRegime TaxRegime
  niu       String   // local tax ID
  invoices  Invoice[]
  users     User[]
}

model Invoice {
  id            String        @id @default(cuid())
  tenantId      String
  tenant        Tenant        @relation(fields: [tenantId], references: [id])
  number        String
  status        InvoiceStatus // DRAFT | QUEUED | CERTIFIED | FAILED
  certRef       String?       // platform certification reference
  lines         TaxLine[]
  payments      Payment[]
  createdAt     DateTime      @default(now())
  @@unique([tenantId, number])
  @@index([tenantId, status])
}
```

The adapter boundary is the moat-in-miniature: once you've done the painful integration work against each DGI's quirky platform, a new entrant must repeat it country by country.

---

## 5. Business model and pricing

**Freemium-to-paid, priced below the pain.** Anchor every conversation against the fine, not against competitors.

- **Free** — up to N certified invoices/month + deadline reminders. Gets them legal and hooked.
- **Pro** — ~**5,000–10,000 FCFA/month** (less than a monthly electricity bill): unlimited invoices, VAT-return drafts, multi-user, support.
- **Cabinet / Accountant** — per-client-seat pricing for CGAs and accountants managing portfolios.
- Collect via **mobile money** (card penetration is low; this is essential, not optional).

Unit economics work because the channel motion (below) keeps CAC low and the legal mandate keeps churn low — you don't churn out of something that keeps you from being shut down.

---

## 6. Recommended buyer and go-to-market

**You asked me to recommend the buyer. My recommendation: lead with accountants and Centres de Gestion Agréés (CGAs) as your channel, with the SMB owner as the end-user.** This is a B2B2B "land via the accountant, serve the SMB" motion. Rationale:

1. **Distribution leverage.** One accountant or CGA serves dozens to hundreds of SMBs. Win one, gain their whole book. For a small dev team that cannot fund mass-market acquisition, this is the only capital-efficient path.
2. **Trust transfer.** SMB owners trust their accountant on fiscal matters far more than a cold SaaS ad. The accountant's endorsement is your conversion engine.
3. **The accountant feels the pain too.** Under e-invoicing, every client's invoices must flow correctly or the *accountant* gets blamed and buried in manual fixes. You're selling them relief, not just selling through them.
4. **CGAs are a structured, addressable beachhead** — especially in Cameroon, where they're tax-favored bodies with organized membership you can target directly.

**Sequencing:**
- **Phase 1 (months 0–9):** Pick **one** country to prove the loop. I'd start with **Côte d'Ivoire** (most mature mandatory FNE, clearest deadline pressure, largest formal SMB base) *or* **Cameroon** if you want to build on home turf and the IGS penalty narrative. Sign 5–10 accountant/CGA design partners. Build the adapter, nail certification, get to "it just works."
- **Phase 2 (months 9–18):** Add SMB-direct **product-led growth** — the free tier as a viral, self-serve on-ramp through WhatsApp and mobile-money channels.
- **Phase 3 (18 months+):** Add the **second and third country adapters**. Your pan-OHADA thesis is realized through adapters, not through trying to be everywhere on day one.

**Government partnership** (the third option) is tempting but slow and political — pursue it opportunistically as a *credibility and distribution* layer (e.g., becoming a DGI-certified/approved provider) once you have traction, not as your primary motion.

---

## 7. Competition and defensibility

- **Sage / SAP / Odoo** — powerful but expensive and complex; they fight for the finance department, not the corner shop. You win on price, mobile-first simplicity, and being *only* about compliance.
- **Local players** (e.g., Tauraco and various national billing apps) — validate the market but are mostly single-country. Your defensibility is (a) the multi-country **adapter library**, (b) the **accountant channel** lock-in, and (c) **switching cost**: once a business's certified invoice history and tax filings live in your system, leaving is painful.
- **The DGI's own free portal** — clunky, single-purpose, no UX, no reminders, no mobile money, no accountant view. You are the friendly layer on top. (Don't fight the portal — integrate with it.)

---

## 8. Key risks and mitigations

| Risk | Mitigation |
|---|---|
| **Connectivity / power** in target markets | Offline-first PWA, queue-and-sync, USSD/SMS fallback for reminders |
| **Each DGI platform is different and changes** | Adapter pattern isolates churn to one module; treat integrations as a maintained product |
| **Mandates get delayed** (frequent prorogations) | Delays *extend* your window; price on the standing reminder/efficiency value so you survive a postponement |
| **Trust / data security fears** | Encryption in transit + at rest, RBAC, local-feeling support; lead with security in the pitch |
| **Low willingness to pay** | Free tier removes the "no" at the door; price below the fine, not above a competitor |
| **Becoming a certified provider takes time** | Begin DGI relationship early; in the interim, integrate with the public portal |

---

## 9. The marketing pitch

### 9.1 The core narrative (use this everywhere)

> **The deadline is already here. The fine is real. We make you compliant before lunch — from your phone, for less than your electricity bill.**

Three beats, in order: **Fear → Relief → Proof.**

1. **Fear (their reality, stated plainly).** "The FNE / e-invoice is now obligatory. A non-compliant invoice isn't just a paperwork problem — it can mean a rejected VAT deduction, a 50% penalty, and your doors closed by the tax office."
2. **Relief (you, as the easy way out).** "Konforme issues a fully certified, legal invoice in under a minute, reminds you before every deadline, and files the groundwork for your VAT return automatically. No 3-million-franc software. No IT project. Your phone."
3. **Proof (make it concrete).** A 90-second live demo: type an invoice → tap → certified document with QR appears → "that just went to the DGI, and you're covered."

### 9.2 Pitch to the accountant / CGA (primary buyer)

> "E-invoicing turned every one of your clients into a real-time compliance risk — and every error lands on your desk. Konforme gives you one dashboard for your whole portfolio: every client's certified invoices flowing correctly, every deadline tracked, every VAT return pre-drafted. You stop firefighting and onboard more clients without more staff. We pay you per client seat. Your clients see you as the firm that modernized them."

The hook for the accountant is **capacity** (serve more clients with the same team) and **risk reduction** (no more blame for a client's botched filing).

### 9.3 Pitch to the SMB owner (end-user)

> "Tu veux rester ouvert ? La facture normalisée est obligatoire. Avec Konforme, tu fais une facture légale en 30 secondes depuis ton téléphone, tu encaisses par Mobile Money, et tu reçois un rappel avant chaque échéance fiscale. Gratuit pour commencer. Moins cher que ta facture d'électricité ensuite."

Channels: through their accountant first; then WhatsApp-led referral, mobile-money agent networks, and short vernacular video showing the one-tap certified invoice.

### 9.4 Sample first-contact message (accountant outreach)

> **Objet : 30 clients en règle FNE, depuis un seul écran**
>
> Bonjour [Nom],
>
> Depuis que la facture électronique est obligatoire, chaque erreur d'un client devient *votre* problème. Konforme vous donne un tableau de bord unique : factures certifiées de tous vos clients, échéances suivies, déclarations TVA pré-remplies — sans recruter.
>
> Nous cherchons 5 cabinets partenaires pour démarrer dans [pays], avec rémunération par client. 15 minutes cette semaine pour une démo ?
>
> [Nom] — Konforme

### 9.5 The one-line investor framing (since pan-OHADA is the ambition)

> "Stripe-grade invoicing meets TurboTax-grade compliance, built mobile-first for the 17 OHADA states that are *all* mandating e-invoicing at once — distributed through the accountants who can't keep up."

---

## 10. Suggested next steps for your team

1. **Pick the beachhead country** (CI for market maturity, or Cameroon for home advantage + the IGS penalty story).
2. **Build the single-country compliance adapter + certified-invoice MVP** in Next.js/Prisma — nothing else. Offline-first from day one.
3. **Sign 5–10 accountant/CGA design partners** before you write the V2 roadmap; let their portfolios shape it.
4. **Instrument the funnel** (free → certified-invoice → paid) so the PLG layer in Phase 2 is data-driven.
5. **Open the DGI conversation early** about becoming an approved/certified provider.

---

*Figures and regulatory facts in this document are drawn from public reporting current to mid-2026 (Sage, Generix, Edicom, Agence Ecofin, national DGI sources, and regional SMB-digitalization coverage). Verify exact deadlines, formats, and certification requirements with each country's Direction Générale des Impôts before building the corresponding adapter, as rollout dates and technical specs change frequently. This is a strategic analysis, not legal or tax advice.*