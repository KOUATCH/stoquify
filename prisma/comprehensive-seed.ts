import argon2 from "argon2";
import { faker } from "@faker-js/faker";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import {
  AccountingPeriodStatus,
  AccountingPostingPurpose,
  AccountingSetupStatus,
  AccountingSourceType,
  AdjustmentStatus,
  AdjustmentType,
  CashDrawerTransactionType,
  ChartAccountNormalBalance,
  ChartAccountType,
  FiscalYearStatus,
  GoodsReceiptStatus,
  InviteStatus,
  JournalEntryStatus,
  JournalType,
  LedgerEntryType,
  LedgerPostingBatchStatus,
  Locale,
  LocationType,
  MobileMoneyProvider,
  PaymentMethod,
  PaymentStatus,
  POSSessionStatus,
  PrismaClient,
  ProductionBatchStatus,
  PurchaseOrderStatus,
  RefundStatus,
  SalesOrderStatus,
  SerialStatus,
  TaxType,
  TransactionReferenceType,
  TransactionType,
  TransferStatus,
  UnitType,
} from "@prisma/client";
import { PERMISSIONS } from "../lib/permissions";
import { DEFAULT_POS_POSTING_RULES } from "../services/accounting/default-posting-rules";
import { CAMEROON_PAYMENT_PROVIDER_CODES } from "../services/regulatory/country-packs/cameroon.constants";
import { resolveCameroonStandardVatRateBps } from "../services/regulatory/country-packs/resolve";

const prisma = new PrismaClient();

const COUNT = 40;
const ORG_COUNT = 5;
const ID_PREFIX = "cmp_";
const ORGANIZATION_ID_PREFIX = `${ID_PREFIX}org_`;
const seedIndexes = Array.from({ length: COUNT }, (_, index) => index + 1);
const orgIndexes = Array.from({ length: ORG_COUNT }, (_, index) => index + 1);
const FAKER_SEED = 20260527;
const DEFAULT_DEMO_PASSWORD = "StockFlowSeed@2026";
const SEED_IMAGE_URL_ROOT = "/seed-images";
const SEED_IMAGE_DIR = path.join(process.cwd(), "public", "seed-images");
const SEED_IMAGE_KINDS = [
  "products",
  "categories",
  "brands",
  "avatars",
  "receipts",
] as const;
const CAMEROON_STANDARD_VAT_RATE_BPS = resolveCameroonStandardVatRateBps("2026-01-01").value;
const CAMEROON_STANDARD_VAT_RATE_PERCENT = CAMEROON_STANDARD_VAT_RATE_BPS / 100;
const CAMEROON_STANDARD_VAT_RATE_MULTIPLIER = CAMEROON_STANDARD_VAT_RATE_BPS / 10_000;
const CAMEROON_DEFAULT_MOBILE_MONEY_PROVIDER =
  MobileMoneyProvider[CAMEROON_PAYMENT_PROVIDER_CODES[0]];
const passwordHashCache = new Map<string, string>();

faker.seed(FAKER_SEED);

type SeedDelegate = {
  deleteMany(args: unknown): Promise<{ count: number }>;
  count(args: unknown): Promise<number>;
};

type OrgSeedContext = {
  orgIndex: number;
  organizationId: string;
  idPrefix: string;
  documentPrefix: string;
  emailSuffix: string;
  country: string;
  currency: string;
  timezone: string;
  locale: Locale;
};

const pad = (value: number) => value.toString().padStart(3, "0");
const orgIdFor = (value: number) => `${ORGANIZATION_ID_PREFIX}${pad(value)}`;
const orgCodeFor = (value: number) => `org${pad(value)}`;
const createOrgContext = (orgIndex: number): OrgSeedContext => {
  const isCentralAfrica = orgIndex % 2 !== 0;

  return {
    orgIndex,
    organizationId: orgIdFor(orgIndex),
    idPrefix: `${orgIdFor(orgIndex)}_`,
    documentPrefix: `CMP${pad(orgIndex)}`,
    emailSuffix: orgCodeFor(orgIndex),
    country: isCentralAfrica ? "Cameroon" : "Senegal",
    currency: isCentralAfrica ? "XAF" : "XOF",
    timezone: isCentralAfrica ? "Africa/Douala" : "Africa/Dakar",
    locale: orgIndex % 2 === 0 ? Locale.FR : Locale.EN,
  };
};
const orgContexts = orgIndexes.map((index) => createOrgContext(index));
let activeOrgContext: OrgSeedContext | null = null;
const currentOrg = () => {
  if (!activeOrgContext) {
    throw new Error("No active OrgSeedContext. Seed through seedOrgDataset().");
  }

  return activeOrgContext;
};
const orgId = () => currentOrg().organizationId;
const id = (model: string, value: number) =>
  `${currentOrg().idPrefix}${model}_${pad(value)}`;
const day = (value: number) => new Date(Date.UTC(2026, 4, value, 9, 0, 0));
const money = (value: number) => Number(value.toFixed(2));
const qty = (value: number) => Number(value.toFixed(3));
const orgScopedNumber = (prefix: string, value: number) =>
  `${currentOrg().documentPrefix}-${prefix}-${pad(value)}`;
const scopedEmail = (localPart: string) =>
  `${localPart}.${currentOrg().emailSuffix}@stockflow.test`;
const roleEmail = (email: string) =>
  scopedEmail(email.replace("@stockflow.test", ""));
const scopedPhone = (family: number, value: number) =>
  `+237${family}${currentOrg().orgIndex}${value.toString().padStart(4, "0")}`;
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
type SeedImageKind = (typeof SEED_IMAGE_KINDS)[number];

const seedImageUrl = (kind: SeedImageKind, value: number) =>
  `${SEED_IMAGE_URL_ROOT}/${kind}/${kind}-${pad(value)}.webp`;

const seedImagePath = (kind: SeedImageKind, value: number) =>
  path.join(SEED_IMAGE_DIR, kind, `${kind}-${pad(value)}.webp`);

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const paletteFor = (index: number) => {
  const palettes = [
    ["#12355b", "#2f80ed", "#f8d24b", "#f6f8fb"],
    ["#164e63", "#14b8a6", "#f97316", "#f7fafc"],
    ["#374151", "#22c55e", "#eab308", "#fafafa"],
    ["#4c1d95", "#a855f7", "#06b6d4", "#fbfbff"],
    ["#7f1d1d", "#ef4444", "#f59e0b", "#fff7ed"],
  ];

  return palettes[index % palettes.length];
};

const svgBase = (width: number, height: number, body: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#111827" flood-opacity="0.22"/>
    </filter>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12"/>
    </filter>
  </defs>
  ${body}
</svg>`;

const productSvg = (index: number) => {
  const [dark, accent, warm, light] = paletteFor(index);
  const title = `Stock Item ${pad(index)}`;

  return svgBase(
    1024,
    1024,
    `
    <rect width="1024" height="1024" fill="${light}"/>
    <rect width="1024" height="1024" fill="${accent}" opacity="0.08"/>
    <circle cx="200" cy="160" r="170" fill="${warm}" opacity="0.18" filter="url(#soft)"/>
    <circle cx="850" cy="850" r="240" fill="${accent}" opacity="0.14" filter="url(#soft)"/>
    <ellipse cx="512" cy="846" rx="280" ry="54" fill="#111827" opacity="0.16"/>
    <rect x="304" y="178" width="416" height="660" rx="54" fill="#ffffff" filter="url(#shadow)"/>
    <rect x="336" y="214" width="352" height="228" rx="34" fill="${dark}"/>
    <path d="M336 430 C430 360 520 500 688 382 L688 442 L336 442 Z" fill="${accent}" opacity="0.78"/>
    <rect x="376" y="486" width="272" height="146" rx="24" fill="${light}" stroke="${dark}" stroke-opacity="0.12"/>
    <text x="512" y="548" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${dark}">${escapeXml(title)}</text>
    <text x="512" y="592" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#475569">Premium retail pack</text>
    <rect x="380" y="676" width="264" height="74" rx="18" fill="${warm}" opacity="0.9"/>
    <text x="512" y="724" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="${dark}">CMP-SKU-${pad(index)}</text>
    <g opacity="0.7">${Array.from({ length: 18 }, (_, bar) => `<rect x="${388 + bar * 14}" y="776" width="${bar % 3 === 0 ? 8 : 5}" height="38" fill="${dark}"/>`).join("")}</g>
    `,
  );
};

const categorySvg = (index: number) => {
  const [dark, accent, warm, light] = paletteFor(index + 1);

  return svgBase(
    1024,
    768,
    `
    <rect width="1024" height="768" fill="${light}"/>
    <rect x="0" y="0" width="1024" height="280" fill="${dark}"/>
    <circle cx="854" cy="136" r="148" fill="${accent}" opacity="0.35"/>
    <text x="74" y="132" font-family="Arial, sans-serif" font-size="58" font-weight="800" fill="#ffffff">Category ${pad(index)}</text>
    <text x="78" y="186" font-family="Arial, sans-serif" font-size="28" fill="#e5e7eb">Organized merchandising group</text>
    <rect x="80" y="338" width="864" height="48" rx="12" fill="${dark}" opacity="0.78"/>
    <rect x="112" y="414" width="188" height="196" rx="18" fill="#ffffff" filter="url(#shadow)"/>
    <rect x="328" y="414" width="188" height="196" rx="18" fill="#ffffff" filter="url(#shadow)"/>
    <rect x="544" y="414" width="188" height="196" rx="18" fill="#ffffff" filter="url(#shadow)"/>
    <rect x="760" y="414" width="132" height="196" rx="18" fill="#ffffff" filter="url(#shadow)"/>
    <rect x="142" y="452" width="128" height="116" rx="16" fill="${accent}" opacity="0.88"/>
    <rect x="358" y="452" width="128" height="116" rx="16" fill="${warm}" opacity="0.88"/>
    <rect x="574" y="452" width="128" height="116" rx="16" fill="${accent}" opacity="0.58"/>
    <rect x="790" y="452" width="72" height="116" rx="16" fill="${warm}" opacity="0.68"/>
    <rect x="80" y="652" width="864" height="24" rx="12" fill="${dark}" opacity="0.2"/>
    `,
  );
};

const brandSvg = (index: number) => {
  const [dark, accent, warm, light] = paletteFor(index + 2);

  return svgBase(
    1024,
    512,
    `
    <rect width="1024" height="512" fill="${light}"/>
    <rect x="70" y="78" width="884" height="356" rx="54" fill="#ffffff" filter="url(#shadow)"/>
    <circle cx="244" cy="256" r="102" fill="${accent}"/>
    <path d="M244 142 L337 310 H151 Z" fill="${warm}" opacity="0.92"/>
    <circle cx="244" cy="256" r="42" fill="${dark}"/>
    <text x="410" y="240" font-family="Arial, sans-serif" font-size="62" font-weight="800" fill="${dark}">CMP BRAND</text>
    <text x="414" y="298" font-family="Arial, sans-serif" font-size="34" fill="#64748b">${pad(index)} enterprise supply</text>
    <rect x="414" y="334" width="360" height="16" rx="8" fill="${accent}" opacity="0.72"/>
    `,
  );
};

const avatarSvg = (index: number) => {
  const [dark, accent, warm, light] = paletteFor(index + 3);
  const skin = ["#8d5524", "#c68642", "#e0ac69", "#f1c27d", "#ffdbac"][
    index % 5
  ];

  return svgBase(
    512,
    512,
    `
    <rect width="512" height="512" fill="${light}"/>
    <circle cx="256" cy="256" r="232" fill="${accent}" opacity="0.16"/>
    <path d="M108 458 C122 350 184 302 256 302 C328 302 390 350 404 458 Z" fill="${dark}" filter="url(#shadow)"/>
    <circle cx="256" cy="218" r="102" fill="${skin}"/>
    <path d="M154 214 C160 116 222 82 286 104 C340 122 366 162 358 224 C326 182 260 172 154 214 Z" fill="#1f2937"/>
    <circle cx="220" cy="226" r="10" fill="#111827"/>
    <circle cx="294" cy="226" r="10" fill="#111827"/>
    <path d="M224 270 C246 292 278 292 300 270" fill="none" stroke="#7c2d12" stroke-width="9" stroke-linecap="round"/>
    <rect x="190" y="366" width="132" height="48" rx="24" fill="${warm}"/>
    `,
  );
};

const receiptSvg = (index: number) =>
  svgBase(
    768,
    1024,
    `
    <rect width="768" height="1024" fill="#f3f4f6"/>
    <rect x="112" y="64" width="544" height="896" rx="18" fill="#ffffff" filter="url(#shadow)"/>
    <text x="384" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="#111827">STOCKFLOW RECEIPT</text>
    <text x="384" y="194" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#64748b">EXP-${pad(index)}</text>
    ${Array.from({ length: 10 }, (_, row) => `<rect x="164" y="${252 + row * 52}" width="${row % 2 === 0 ? 330 : 250}" height="18" rx="9" fill="#94a3b8" opacity="0.55"/><rect x="542" y="${252 + row * 52}" width="64" height="18" rx="9" fill="#334155" opacity="0.62"/>`).join("")}
    <line x1="164" y1="790" x2="606" y2="790" stroke="#cbd5e1" stroke-width="4" stroke-dasharray="12 12"/>
    <text x="164" y="852" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="#111827">TOTAL</text>
    <text x="606" y="852" text-anchor="end" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="#111827">XAF ${(5000 + index * 300).toLocaleString("en-US")}</text>
    <rect x="164" y="884" width="96" height="96" fill="#111827"/>
    <rect x="180" y="900" width="20" height="20" fill="#ffffff"/>
    <rect x="224" y="900" width="20" height="20" fill="#ffffff"/>
    <rect x="180" y="944" width="20" height="20" fill="#ffffff"/>
    `,
  );

const renderSeedImage = async (
  kind: SeedImageKind,
  index: number,
  svg: string,
) => {
  const filePath = seedImagePath(kind, index);
  if (existsSync(filePath)) {
    return;
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await sharp(Buffer.from(svg)).webp({ quality: 88 }).toFile(filePath);
};

async function ensureSeedImages() {
  await mkdir(SEED_IMAGE_DIR, { recursive: true });

  for (const index of seedIndexes) {
    await Promise.all([
      renderSeedImage("products", index, productSvg(index)),
      renderSeedImage("categories", index, categorySvg(index)),
      renderSeedImage("brands", index, brandSvg(index)),
      renderSeedImage("avatars", index, avatarSvg(index)),
      renderSeedImage("receipts", index, receiptSvg(index)),
    ]);
  }

  const manifest = {
    strategy: "deterministic-svg-rendered-to-webp-with-sharp",
    generatedAt: "2026-05-27T00:00:00.000Z",
    countPerDomain: COUNT,
    publicRoot: SEED_IMAGE_URL_ROOT,
    domains: Object.fromEntries(
      SEED_IMAGE_KINDS.map((kind) => [
        kind,
        seedIndexes.map((index) => ({
          key: `${kind}-${pad(index)}`,
          url: seedImageUrl(kind, index),
          file: `${kind}/${kind}-${pad(index)}.webp`,
        })),
      ]),
    ),
  };

  await writeFile(
    path.join(SEED_IMAGE_DIR, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

function verifySeedImageFiles() {
  const missing = SEED_IMAGE_KINDS.flatMap((kind) =>
    seedIndexes
      .filter((index) => !existsSync(seedImagePath(kind, index)))
      .map((index) => seedImageUrl(kind, index)),
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing seed image assets: ${missing.slice(0, 10).join(", ")}`,
    );
  }

  console.log(
    `Verified ${SEED_IMAGE_KINDS.length * COUNT} local seed image assets in public/seed-images.`,
  );
}

const ALL_PERMISSIONS = Object.values(PERMISSIONS);
const uniquePermissions = (permissions: string[]) => [...new Set(permissions)];
const permissionsContaining = (...terms: string[]) =>
  ALL_PERMISSIONS.filter((permission) =>
    terms.some((term) => permission.includes(term)),
  );
const READ_ONLY_PERMISSIONS = ALL_PERMISSIONS.filter(
  (permission) =>
    permission.includes("_READ") ||
    permission.startsWith("READ_") ||
    permission.startsWith("VIEW_") ||
    permission.includes("_VIEW") ||
    permission.startsWith("EXPORT_"),
);

const ROLE_DEFINITIONS = [
  {
    code: "super_admin",
    nameEn: "Super Admin",
    nameFr: "Super administrateur",
    description: "Full system access with all permissions.",
    permissions: ["*", ...ALL_PERMISSIONS],
    email: "super.admin@stockflow.test",
    password: "SuperAdmin@2026",
    firstName: "Amina",
    lastName: "Ngono",
  },
  {
    code: "admin",
    nameEn: "Admin",
    nameFr: "Administrateur",
    description: "Organization administrator with complete business access.",
    permissions: ALL_PERMISSIONS,
    email: "admin@stockflow.test",
    password: "Admin@2026",
    firstName: "Marc",
    lastName: "Dubois",
  },
  {
    code: "branch_manager",
    nameEn: "Branch Manager",
    nameFr: "Responsable agence",
    description: "Branch operations, users, sales, stock, and local reporting.",
    permissions: permissionsContaining(
      "DASHBOARD",
      "LOCATION",
      "USER",
      "ROLE",
      "INVENTORY",
      "STOCK",
      "TRANSFER",
      "PURCHASE",
      "SALES",
      "CUSTOMER",
      "SUPPLIER",
      "POS",
      "CASH",
      "REPORT",
      "ANALYTICS",
    ),
    email: "branch.manager@stockflow.test",
    password: "BranchManager@2026",
    firstName: "Claire",
    lastName: "Mballa",
  },
  {
    code: "inventory_manager",
    nameEn: "Inventory Manager",
    nameFr: "Responsable inventaire",
    description:
      "Inventory catalog, stock levels, transfers, adjustments, and production stock.",
    permissions: permissionsContaining(
      "INVENTORY",
      "ITEM",
      "CATEGORY",
      "BRAND",
      "UNIT",
      "STOCK",
      "TRANSFER",
      "ADJUST",
      "SERIAL",
      "RECIPE",
      "PRODUCTION",
      "RAW_MATERIAL",
      "GOODS",
    ),
    email: "inventory.manager@stockflow.test",
    password: "InventoryManager@2026",
    firstName: "Jean",
    lastName: "Talla",
  },
  {
    code: "sales_manager",
    nameEn: "Sales Manager",
    nameFr: "Responsable ventes",
    description:
      "Sales orders, customers, POS oversight, payments, and revenue reporting.",
    permissions: permissionsContaining(
      "SALES",
      "CUSTOMER",
      "POS",
      "PAYMENT",
      "REFUND",
      "CASH",
      "REVENUE",
      "ANALYTICS",
    ),
    email: "sales.manager@stockflow.test",
    password: "SalesManager@2026",
    firstName: "Sophie",
    lastName: "Kamdem",
  },
  {
    code: "cashier_pos_user",
    nameEn: "Cashier/POS User",
    nameFr: "Caissier POS",
    description:
      "Daily POS operation, payments, receipts, refunds, and cash drawer actions.",
    permissions: uniquePermissions([
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.READ_ITEMS,
      PERMISSIONS.READ_CUSTOMERS,
      PERMISSIONS.OPERATE_POS,
      PERMISSIONS.PROCESS_PAYMENTS,
      PERMISSIONS.PROCESS_REFUNDS,
      PERMISSIONS.CASH_DRAWER_READ,
      PERMISSIONS.CASH_SYSTEM_READ,
      ...permissionsContaining("POS", "CASH", "PAYMENT", "RECEIPT"),
    ]),
    email: "cashier@stockflow.test",
    password: "Cashier@2026",
    firstName: "Grace",
    lastName: "Etame",
  },
  {
    code: "purchaser",
    nameEn: "Purchaser",
    nameFr: "Acheteur",
    description:
      "Supplier, purchase order, goods receipt, and procurement workflow access.",
    permissions: permissionsContaining(
      "PURCHASE",
      "SUPPLIER",
      "GOODS",
      "RECEIVE",
      "INVENTORY_COST",
    ),
    email: "purchaser@stockflow.test",
    password: "Purchaser@2026",
    firstName: "Patrick",
    lastName: "Fouda",
  },
  {
    code: "accountant",
    nameEn: "Accountant",
    nameFr: "Comptable",
    description:
      "Finance, payables, receivables, tax, payment, ledger, and cash reporting.",
    permissions: permissionsContaining(
      "FINANCE",
      "FINANCIAL",
      "PAYABLE",
      "RECEIVABLE",
      "PAYMENT",
      "TAX",
      "CASH",
      "LEDGER",
      "JOURNAL",
      "BUDGET",
      "PROFIT",
    ),
    email: "accountant@stockflow.test",
    password: "Accountant@2026",
    firstName: "Nadia",
    lastName: "Essomba",
  },
  {
    code: "hr_manager",
    nameEn: "HR Manager",
    nameFr: "Responsable RH",
    description:
      "Users, payroll, presence, attendance, schedules, and employee records.",
    permissions: permissionsContaining(
      "USER",
      "PRESENCE",
      "PAYROLL",
      "SCHEDULE",
      "ATTENDANCE",
      "EMPLOYEE",
    ),
    email: "hr.manager@stockflow.test",
    password: "HrManager@2026",
    firstName: "Luc",
    lastName: "Biya",
  },
  {
    code: "auditor",
    nameEn: "Auditor",
    nameFr: "Auditeur",
    description:
      "Read-only operational, financial, compliance, and audit-trail access.",
    permissions: uniquePermissions([
      ...READ_ONLY_PERMISSIONS,
      PERMISSIONS.VIEW_AUDIT_LOGS,
      PERMISSIONS.VIEW_FINANCIAL_AUDIT_TRAIL,
      PERMISSIONS.VIEW_COMPLIANCE_STATUS,
    ]),
    email: "auditor@stockflow.test",
    password: "Auditor@2026",
    firstName: "Helene",
    lastName: "Mbarga",
  },
  {
    code: "read_only",
    nameEn: "Read-only/User",
    nameFr: "Utilisateur lecture seule",
    description:
      "Read-only dashboard and operational visibility for demo exploration.",
    permissions: READ_ONLY_PERMISSIONS,
    email: "readonly@stockflow.test",
    password: "ReadOnly@2026",
    firstName: "Yann",
    lastName: "Njock",
  },
  {
    code: "user",
    nameEn: "User",
    nameFr: "Utilisateur",
    description:
      "Basic authenticated user with profile and own presence access.",
    permissions: uniquePermissions([
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.PROFILE_READ,
      PERMISSIONS.PASSWORD_READ,
      PERMISSIONS.VIEW_OWN_PRESENCE,
      PERMISSIONS.CLOCK_IN_OUT,
      PERMISSIONS.VIEW_OWN_SCHEDULE,
      PERMISSIONS.VIEW_OWN_ATTENDANCE_REPORTS,
    ]),
    email: "user@stockflow.test",
    password: "User@2026",
    firstName: "Emma",
    lastName: "Fotso",
  },
];

const roleDefinitionFor = (index: number) =>
  ROLE_DEFINITIONS[index - 1] ?? {
    code: `demo_role_${pad(index)}`,
    nameEn: `${faker.person.jobTitle()} Demo Role ${pad(index)}`,
    nameFr: `Role demo ${pad(index)}`,
    description: faker.company.catchPhrase(),
    permissions: uniquePermissions([
      ...READ_ONLY_PERMISSIONS.slice(0, 20),
      ...ALL_PERMISSIONS.slice(
        (index * 7) % ALL_PERMISSIONS.length,
        ((index * 7) % ALL_PERMISSIONS.length) + 18,
      ),
    ]),
    email: `demo.user.${pad(index)}@stockflow.test`,
    password: DEFAULT_DEMO_PASSWORD,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
  };

const ROLE_SEEDS = seedIndexes.map((index) => roleDefinitionFor(index));
const demoCredentials: Array<{
  organizationId: string;
  name: string;
  email: string;
  password: string;
  role: string;
  userId: string;
}> = [];

const hashPassword = async (password = DEFAULT_DEMO_PASSWORD) => {
  const cached = passwordHashCache.get(password);
  if (cached) {
    return cached;
  }

  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  passwordHashCache.set(password, hash);
  return hash;
};

const deleteOrder: Array<[string, SeedDelegate]> = [
  ["PaymentRefund", prisma.paymentRefund],
  ["CashDrawerTransaction", prisma.cashDrawerTransaction],
  ["Payment", prisma.payment],
  ["DailySalesReportCashEvent", prisma.dailySalesReportCashEvent],
  ["DailySalesReportItem", prisma.dailySalesReportItem],
  ["DailySalesReport", prisma.dailySalesReport],
  ["GoodsReceiptLine", prisma.goodsReceiptLine],
  ["GoodsReceipt", prisma.goodsReceipt],
  ["PurchaseOrderLine", prisma.purchaseOrderLine],
  ["PurchaseOrder", prisma.purchaseOrder],
  ["SalesOrderLine", prisma.salesOrderLine],
  ["SalesOrder", prisma.salesOrder],
  ["Expense", prisma.expense],
  ["CustomerLedgerEntry", prisma.customerLedgerEntry],
  ["SupplierLedgerEntry", prisma.supplierLedgerEntry],
  ["StockAdjustmentLine", prisma.stockAdjustmentLine],
  ["StockAdjustment", prisma.stockAdjustment],
  ["StockTransferLine", prisma.stockTransferLine],
  ["StockTransfer", prisma.stockTransfer],
  ["InventoryTransaction", prisma.inventoryTransaction],
  ["ProductionBatch", prisma.productionBatch],
  ["RecipeIngredient", prisma.recipeIngredient],
  ["Recipe", prisma.recipe],
  ["SerialNumber", prisma.serialNumber],
  ["ItemSupplier", prisma.itemSupplier],
  ["InventoryLevel", prisma.inventoryLevel],
  ["Item", prisma.item],
  ["CashDrawer", prisma.cashDrawer],
  ["POSSession", prisma.pOSSession],
  ["POSStation", prisma.pOSStation],
  ["ExpenseCategory", prisma.expenseCategory],
  ["TaxRate", prisma.taxRate],
  ["Unit", prisma.unit],
  ["Brand", prisma.brand],
  ["Category", prisma.category],
  ["Supplier", prisma.supplier],
  ["Customer", prisma.customer],
  ["Location", prisma.location],
  ["Invite", prisma.invite],
  ["AuditLog", prisma.auditLog],
  ["PasswordHistory", prisma.passwordHistory],
  ["Session", prisma.session],
  ["Account", prisma.account],
  ["User", prisma.user],
  ["Role", prisma.role],
  ["Organization", prisma.organization],
];

const seededOrganizationWhere = {
  organizationId: { startsWith: ORGANIZATION_ID_PREFIX },
};

const accountingCleanupOrder: Array<[string, () => Promise<{ count: number }>]> = [
  [
    "AccountingSourceLink",
    () => prisma.accountingSourceLink.deleteMany({ where: seededOrganizationWhere }),
  ],
  [
    "LedgerAuditEvent",
    () => prisma.ledgerAuditEvent.deleteMany({ where: seededOrganizationWhere }),
  ],
  [
    "JournalEntryLine",
    () => prisma.journalEntryLine.deleteMany({ where: seededOrganizationWhere }),
  ],
  [
    "JournalEntry",
    () => prisma.journalEntry.deleteMany({ where: seededOrganizationWhere }),
  ],
  [
    "LedgerPostingBatch",
    () => prisma.ledgerPostingBatch.deleteMany({ where: seededOrganizationWhere }),
  ],
  [
    "PostingRuleLine",
    () => prisma.postingRuleLine.deleteMany({ where: seededOrganizationWhere }),
  ],
  ["PostingRule", () => prisma.postingRule.deleteMany({ where: seededOrganizationWhere })],
  ["Journal", () => prisma.journal.deleteMany({ where: seededOrganizationWhere })],
  [
    "ChartOfAccount",
    () => prisma.chartOfAccount.deleteMany({ where: seededOrganizationWhere }),
  ],
  [
    "AccountingPeriod",
    () => prisma.accountingPeriod.deleteMany({ where: seededOrganizationWhere }),
  ],
  ["FiscalYear", () => prisma.fiscalYear.deleteMany({ where: seededOrganizationWhere })],
  [
    "OrganizationAccountingSettings",
    () =>
      prisma.organizationAccountingSettings.deleteMany({
        where: seededOrganizationWhere,
      }),
  ],
];

const verificationOrder = [...deleteOrder].reverse();

async function clearSeededData() {
  console.log("Clearing previous comprehensive seed records...");

  for (const [label, operation] of accountingCleanupOrder) {
    const result = await operation();
    if (result.count > 0) {
      console.log(`  deleted ${result.count} ${label}`);
    }
  }

  for (const [label, delegate] of deleteOrder) {
    const result = await delegate.deleteMany({
      where: { id: { startsWith: ID_PREFIX } },
    });
    if (result.count > 0) {
      console.log(`  deleted ${result.count} ${label}`);
    }
  }
}

async function seedOrganizations() {
  await prisma.organization.createMany({
    data: orgContexts.map((context) => ({
      id: context.organizationId,
      name: `${faker.company.name()} ${pad(context.orgIndex)}`,
      slug: `cmp-${context.emailSuffix}-${slugify(faker.company.buzzNoun())}`,
      industry: faker.helpers.arrayElement([
        "Retail",
        "Distribution",
        "Manufacturing",
        "Wholesale",
        "Food production",
      ]),
      country: context.country,
      state: faker.location.state(),
      address: faker.location.streetAddress(),
      currency: context.currency,
      timezone: context.timezone,
      defaultLocale: context.locale,
      inventoryStartDate: day(context.orgIndex),
      fiscalYearStart: "01-01",
      isActive: true,
      updatedAt: day(context.orgIndex),
    })),
  });
}

async function seedRoles() {
  await prisma.role.createMany({
    data: ROLE_SEEDS.map((role, roleIndex) => ({
      id: id("role", roleIndex + 1),
      code: role.code,
      nameEn: role.nameEn,
      nameFr: role.nameFr,
      description: role.description,
      permissions: uniquePermissions(role.permissions),
      organizationId: orgId(),
      updatedAt: day(roleIndex + 1),
    })),
  });
}

async function seedUsers() {
  for (const index of seedIndexes) {
    const role = ROLE_SEEDS[index - 1];
    const password = role.password ?? DEFAULT_DEMO_PASSWORD;
    const email = roleEmail(
      index <= ROLE_DEFINITIONS.length
        ? role.email
        : `demo.user.${pad(index)}@stockflow.test`,
    );
    const userId = id("user", index);

    await prisma.user.create({
      data: {
        id: userId,
        email,
        emailVerified: true,
        firstName: role.firstName,
        lastName: role.lastName,
        phone: scopedPhone(69, index),
        image: seedImageUrl("avatars", index),
        jobTitle: role.nameEn,
        password: await hashPassword(password),
        isActive: true,
        isVerified: true,
        preferredLocale: index % 2 === 0 ? Locale.FR : Locale.EN,
        lastLogin: day(index),
        updatedAt: day(index),
        organization: { connect: { id: orgId() } },
        roles: { connect: { id: id("role", index) } },
      },
    });

    if (index <= ROLE_DEFINITIONS.length) {
      demoCredentials.push({
        organizationId: orgId(),
        name: `${role.firstName} ${role.lastName}`,
        email,
        password,
        role: role.nameEn,
        userId,
      });
    }
  }
}

async function seedAccountingControlPlane() {
  await prisma.organizationAccountingSettings.create({
    data: {
      id: id("accounting_settings", 1),
      organizationId: orgId(),
      accountingEnabled: true,
      setupStatus: AccountingSetupStatus.IN_PROGRESS,
      countryPack: "SYSCOHADA_CM",
      baseCurrency: currentOrg().currency,
      fiscalYearStartMonth: 1,
      fiscalYearStartDay: 1,
      inventoryValuationPolicy: "WEIGHTED_AVERAGE",
      roundingMode: "HALF_UP",
      roundingScale: 2,
      taxRegime: "VAT_CM_STANDARD",
    },
  });

  const fiscalYear = await prisma.fiscalYear.create({
    data: {
      id: id("fiscal_year", 1),
      organizationId: orgId(),
      name: "2026",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T23:59:59.999Z"),
      status: FiscalYearStatus.OPEN,
    },
  });

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  await prisma.accountingPeriod.createMany({
    data: monthNames.map((name, monthIndex) => ({
      id: id("accounting_period", monthIndex + 1),
      organizationId: orgId(),
      fiscalYearId: fiscalYear.id,
      periodNumber: monthIndex + 1,
      name: `${name} 2026`,
      startDate: new Date(Date.UTC(2026, monthIndex, 1, 0, 0, 0, 0)),
      endDate: new Date(Date.UTC(2026, monthIndex + 1, 0, 23, 59, 59, 999)),
      status: AccountingPeriodStatus.OPEN,
    })),
  });

  const accounts = [
    {
      id: id("chart_account", 1),
      code: "571",
      nameEn: "Cash on hand",
      nameFr: "Caisse",
      type: ChartAccountType.ASSET,
      normalBalance: ChartAccountNormalBalance.DEBIT,
      mappingKey: "CASH_ON_HAND",
      syscohadaClass: "5",
      syscohadaReference: "571",
      isControlAccount: true,
    },
    {
      id: id("chart_account", 2),
      code: "521",
      nameEn: "Bank",
      nameFr: "Banque",
      type: ChartAccountType.ASSET,
      normalBalance: ChartAccountNormalBalance.DEBIT,
      mappingKey: "BANK",
      syscohadaClass: "5",
      syscohadaReference: "521",
      isControlAccount: true,
    },
    {
      id: id("chart_account", 3),
      code: "5121",
      nameEn: "Card clearing",
      nameFr: "Transit cartes",
      type: ChartAccountType.ASSET,
      normalBalance: ChartAccountNormalBalance.DEBIT,
      mappingKey: "CARD_CLEARING",
      syscohadaClass: "5",
      syscohadaReference: "512",
      isControlAccount: true,
    },
    {
      id: id("chart_account", 4),
      code: "531",
      nameEn: "Mobile money clearing",
      nameFr: "Transit mobile money",
      type: ChartAccountType.ASSET,
      normalBalance: ChartAccountNormalBalance.DEBIT,
      mappingKey: "MOBILE_MONEY_CLEARING",
      syscohadaClass: "5",
      syscohadaReference: "531",
      isControlAccount: true,
    },
    {
      id: id("chart_account", 5),
      code: "513",
      nameEn: "Cheque clearing",
      nameFr: "Transit cheques",
      type: ChartAccountType.ASSET,
      normalBalance: ChartAccountNormalBalance.DEBIT,
      mappingKey: "CHEQUE_CLEARING",
      syscohadaClass: "5",
      syscohadaReference: "513",
      isControlAccount: true,
    },
    {
      id: id("chart_account", 6),
      code: "411",
      nameEn: "Customer receivables",
      nameFr: "Clients",
      type: ChartAccountType.ASSET,
      normalBalance: ChartAccountNormalBalance.DEBIT,
      mappingKey: "ACCOUNTS_RECEIVABLE",
      syscohadaClass: "4",
      syscohadaReference: "411",
      isControlAccount: true,
    },
    {
      id: id("chart_account", 7),
      code: "401",
      nameEn: "Supplier payables",
      nameFr: "Fournisseurs",
      type: ChartAccountType.LIABILITY,
      normalBalance: ChartAccountNormalBalance.CREDIT,
      mappingKey: "ACCOUNTS_PAYABLE",
      syscohadaClass: "4",
      syscohadaReference: "401",
      isControlAccount: true,
    },
    {
      id: id("chart_account", 8),
      code: "419",
      nameEn: "Store credit liability",
      nameFr: "Avoirs clients",
      type: ChartAccountType.LIABILITY,
      normalBalance: ChartAccountNormalBalance.CREDIT,
      mappingKey: "STORE_CREDIT_LIABILITY",
      syscohadaClass: "4",
      syscohadaReference: "419",
      isControlAccount: true,
    },
    {
      id: id("chart_account", 9),
      code: "31",
      nameEn: "Inventory",
      nameFr: "Stocks",
      type: ChartAccountType.ASSET,
      normalBalance: ChartAccountNormalBalance.DEBIT,
      mappingKey: "INVENTORY",
      syscohadaClass: "3",
      syscohadaReference: "31",
      isControlAccount: true,
    },
    {
      id: id("chart_account", 10),
      code: "701",
      nameEn: "Sales revenue",
      nameFr: "Ventes de marchandises",
      type: ChartAccountType.REVENUE,
      normalBalance: ChartAccountNormalBalance.CREDIT,
      mappingKey: "SALES_REVENUE",
      syscohadaClass: "7",
      syscohadaReference: "701",
      isControlAccount: false,
    },
    {
      id: id("chart_account", 11),
      code: "443",
      nameEn: "Output VAT",
      nameFr: "TVA collectee",
      type: ChartAccountType.LIABILITY,
      normalBalance: ChartAccountNormalBalance.CREDIT,
      mappingKey: "OUTPUT_VAT",
      syscohadaClass: "4",
      syscohadaReference: "443",
      isControlAccount: true,
    },
    {
      id: id("chart_account", 12),
      code: "445",
      nameEn: "Input VAT",
      nameFr: "TVA deductible",
      type: ChartAccountType.ASSET,
      normalBalance: ChartAccountNormalBalance.DEBIT,
      mappingKey: "INPUT_VAT",
      syscohadaClass: "4",
      syscohadaReference: "445",
      isControlAccount: true,
    },
    {
      id: id("chart_account", 13),
      code: "603",
      nameEn: "Cost of goods sold",
      nameFr: "Achats consommes",
      type: ChartAccountType.EXPENSE,
      normalBalance: ChartAccountNormalBalance.DEBIT,
      mappingKey: "COGS",
      syscohadaClass: "6",
      syscohadaReference: "603",
      isControlAccount: false,
    },
    {
      id: id("chart_account", 14),
      code: "659",
      nameEn: "Inventory variance",
      nameFr: "Ecart de stock",
      type: ChartAccountType.EXPENSE,
      normalBalance: ChartAccountNormalBalance.DEBIT,
      mappingKey: "INVENTORY_VARIANCE",
      syscohadaClass: "6",
      syscohadaReference: "659",
      isControlAccount: false,
    },
  ];

  await prisma.chartOfAccount.createMany({
    data: accounts.map((account) => ({
      ...account,
      organizationId: orgId(),
      isSystem: true,
      isActive: true,
      allowManualPost: !account.isControlAccount,
    })),
  });

  await prisma.journal.createMany({
    data: [
      { code: "GEN", nameEn: "General Journal", nameFr: "Journal general", type: JournalType.GENERAL, allowManualEntries: true },
      { code: "OD", nameEn: "Adjustment Journal", nameFr: "Journal des operations diverses", type: JournalType.ADJUSTMENT, allowManualEntries: true },
      { code: "AN", nameEn: "Opening Balance Journal", nameFr: "Journal d'ouverture", type: JournalType.OPENING, allowManualEntries: true },
      { code: "VT", nameEn: "Sales Journal", nameFr: "Journal des ventes", type: JournalType.SALES, allowManualEntries: false },
      { code: "AC", nameEn: "Purchase Journal", nameFr: "Journal des achats", type: JournalType.PURCHASE, allowManualEntries: false },
      { code: "CA", nameEn: "Cash Journal", nameFr: "Journal de caisse", type: JournalType.CASH, allowManualEntries: true },
      { code: "BQ", nameEn: "Bank Journal", nameFr: "Journal de banque", type: JournalType.BANK, allowManualEntries: true },
      { code: "ST", nameEn: "Inventory Journal", nameFr: "Journal des stocks", type: JournalType.INVENTORY, allowManualEntries: false },
    ].map((journal, index) => ({
      id: id("journal", index + 1),
      organizationId: orgId(),
      isDefault: true,
      isActive: true,
      ...journal,
    })),
  });

  await prisma.postingRule.createMany({
    data: DEFAULT_POS_POSTING_RULES.map((template, index) => ({
      id: id("posting_rule", index + 1),
      organizationId: orgId(),
      code: template.code,
      nameEn: template.nameEn,
      nameFr: template.nameFr,
      descriptionEn: template.descriptionEn,
      descriptionFr: template.descriptionFr,
      sourceType: template.sourceType,
      postingPurpose: template.postingPurpose,
      priority: template.priority,
      isActive: true,
    })),
  });

  let postingRuleLineIndex = 1;
  await prisma.postingRuleLine.createMany({
    data: DEFAULT_POS_POSTING_RULES.flatMap((template, ruleIndex) =>
      template.lines.map((line) => ({
        id: id("posting_rule_line", postingRuleLineIndex++),
        organizationId: orgId(),
        postingRuleId: id("posting_rule", ruleIndex + 1),
        lineNumber: line.lineNumber,
        side: line.side,
        mappingKey: line.mappingKey,
        amountSource: line.amountSource,
        condition: line.condition ?? undefined,
        description: line.description,
      })),
    ),
  });

  await prisma.ledgerAuditEvent.create({
    data: {
      id: id("ledger_audit_event", 1),
      organizationId: orgId(),
      actorId: id("user", 1),
      action: "COMPREHENSIVE_ACCOUNTING_SEED",
      resourceType: "OrganizationAccountingSettings",
      resourceId: id("accounting_settings", 1),
      message: "Comprehensive accounting control plane seeded",
      metadata: {
        fiscalYear: fiscalYear.name,
        postingRules: DEFAULT_POS_POSTING_RULES.map((rule) => rule.code),
      },
    },
  });
}

async function seedAuthTables() {
  const defaultHash = await hashPassword();

  await prisma.account.createMany({
    data: seedIndexes.map((index) => {
      const password = ROLE_SEEDS[index - 1].password ?? DEFAULT_DEMO_PASSWORD;
      const passwordHash = passwordHashCache.get(password) ?? defaultHash;
      const userId = id("user", index);

      return {
        id: id("account", index),
        userId,
        accountId: userId,
        providerId: "credential",
        accessToken: orgScopedNumber("ACCESS", index),
        refreshToken: orgScopedNumber("REFRESH", index),
        scope: "profile email",
        accessTokenExpiresAt: day(index + 30),
        password: passwordHash,
      };
    }),
  });

  await prisma.session.createMany({
    data: seedIndexes.map((index) => ({
      id: id("session", index),
      token: orgScopedNumber("SESSION", index),
      userId: id("user", index),
      expiresAt: day(index + 30),
    })),
  });

  await prisma.passwordHistory.createMany({
    data: seedIndexes.map((index) => ({
      id: id("password_history", index),
      userId: id("user", index),
      passwordHash:
        index <= ROLE_DEFINITIONS.length
          ? (passwordHashCache.get(ROLE_SEEDS[index - 1].password) ??
            defaultHash)
          : defaultHash,
      createdAt: day(index),
    })),
  });
}

async function seedReferenceData() {
  await prisma.location.createMany({
    data: seedIndexes.map((index) => ({
      id: id("location", index),
      name: `${faker.location.city()} ${faker.helpers.arrayElement(["Store", "Warehouse", "Hub", "Kitchen"])} ${pad(index)}`,
      code: orgScopedNumber("LOC", index),
      type: [
        LocationType.STORE,
        LocationType.WAREHOUSE,
        LocationType.DISTRIBUTION_CENTER,
        LocationType.MANUFACTURING,
      ][index % 4],
      address: faker.location.streetAddress(),
      phone: scopedPhone(68, index),
      email: scopedEmail(`location.${pad(index)}`),
      isActive: true,
      isDefault: index === 1,
      organizationId: orgId(),
      managerId: id("user", index),
      allowNegativeStock: index % 5 === 0,
      requiresApproval: index % 4 === 0,
      updatedAt: day(index),
    })),
  });

  await prisma.customer.createMany({
    data: seedIndexes.map((index) => ({
      id: id("customer", index),
      name: `${faker.person.fullName()} ${pad(index)}`,
      code: orgScopedNumber("CUS", index),
      email: scopedEmail(`customer.${pad(index)}`),
      phone: scopedPhone(67, index),
      address: faker.location.streetAddress(),
      taxId: orgScopedNumber("CUS-TAX", index),
      creditLimit: money(250_000 + index * 5_000),
      paymentTerms: 15 + index,
      notes: faker.company.catchPhrase(),
      isActive: true,
      preferredLocale: index % 2 === 0 ? Locale.FR : Locale.EN,
      currentBalance: money(index * 1_250),
      organizationId: orgId(),
      updatedAt: day(index),
    })),
  });

  await prisma.supplier.createMany({
    data: seedIndexes.map((index) => ({
      id: id("supplier", index),
      name: `${faker.company.name()} ${pad(index)}`,
      code: orgScopedNumber("SUP", index),
      contactPerson: faker.person.fullName(),
      email: scopedEmail(`supplier.${pad(index)}`),
      phone: scopedPhone(66, index),
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: `BP-${1000 + index}`,
      country: faker.helpers.arrayElement([
        "Cameroon",
        "France",
        "Senegal",
        "Cote d'Ivoire",
      ]),
      taxId: orgScopedNumber("SUP-TAX", index),
      paymentTerms: 20 + index,
      creditLimit: money(500_000 + index * 10_000),
      notes: faker.company.catchPhrase(),
      isActive: true,
      preferredLocale: index % 2 === 0 ? Locale.FR : Locale.EN,
      currentBalance: money(index * 2_000),
      organizationId: orgId(),
      updatedAt: day(index),
    })),
  });

  await prisma.category.createMany({
    data: seedIndexes.map((index) => ({
      id: id("category", index),
      slug: `${currentOrg().emailSuffix}-${slugify(faker.commerce.department())}-${pad(index)}`,
      titleEn: `${faker.commerce.department()} ${pad(index)}`,
      titleFr: `Categorie ${pad(index)}`,
      descriptionEn: faker.commerce.productDescription(),
      descriptionFr: `Description de categorie ${pad(index)}`,
      imageUrl: seedImageUrl("categories", index),
      parentId: index > 10 ? id("category", index - 10) : null,
      isActive: true,
      organizationId: orgId(),
      updatedAt: day(index),
    })),
  });

  await seedBrands();

  await prisma.unit.createMany({
    data: seedIndexes.map((index) => ({
      id: id("unit", index),
      symbol: `${currentOrg().documentPrefix}-U${pad(index)}`,
      type: [
        UnitType.QUANTITY,
        UnitType.WEIGHT,
        UnitType.VOLUME,
        UnitType.LENGTH,
      ][index % 4],
      nameEn: `${faker.science.unit().name} ${pad(index)}`,
      nameFr: `Unite ${pad(index)}`,
      baseUnit: index % 2 === 0 ? "piece" : "kg",
      conversionRate: index % 2 === 0 ? 1 : money(0.5 + index / 10),
      isActive: true,
      organizationId: orgId(),
      updatedAt: day(index),
    })),
  });

  await prisma.taxRate.createMany({
    data: seedIndexes.map((index) => ({
      id: id("tax_rate", index),
      rate: money((index % 10) + 5),
      type: [TaxType.SALES, TaxType.VAT, TaxType.GST, TaxType.EXCISE][
        index % 4
      ],
      nameEn: `${faker.commerce.productAdjective()} Tax ${pad(index)}`,
      nameFr: `Taxe ${pad(index)}`,
      isActive: true,
      organizationId: orgId(),
      updatedAt: day(index),
    })),
  });

  await prisma.expenseCategory.createMany({
    data: seedIndexes.map((index) => ({
      id: id("expense_category", index),
      nameEn: `${faker.commerce.department()} Expense ${pad(index)}`,
      nameFr: `Categorie depense ${pad(index)}`,
      descriptionEn: faker.finance.transactionDescription(),
      descriptionFr: `Description categorie depense ${pad(index)}`,
      isActive: true,
      organizationId: orgId(),
      updatedAt: day(index),
    })),
  });
}

async function seedBrands() {
  for (const index of seedIndexes) {
    const brandName = `${faker.company.name()} ${pad(index)}`;
    await prisma.$executeRaw`
      insert into "brands" (
        "id",
        "nameEn",
        "nameFr",
        "slug",
        "descriptionEn",
        "descriptionFr",
        "logoUrl",
        "isActive",
        "organizationId",
        "createdAt",
        "updatedAt"
      )
      values (
        ${id("brand", index)},
        ${brandName},
        ${`Marque ${pad(index)}`},
        ${`${currentOrg().emailSuffix}-${slugify(brandName)}-${pad(index)}`},
        ${faker.company.catchPhrase()},
        ${`Description francaise de marque ${pad(index)}`},
        ${seedImageUrl("brands", index)},
        ${true},
        ${orgId()},
        ${day(index)},
        ${day(index)}
      )
    `;
  }
}

async function seedItemsAndInventory() {
  await prisma.item.createMany({
    data: seedIndexes.map((index) => {
      const productName = `${faker.commerce.productName()} ${pad(index)}`;
      const costPrice = money(
        faker.number.float({ min: 800, max: 15_000, fractionDigits: 2 }),
      );
      const sellingPrice = money(
        costPrice *
          faker.number.float({ min: 1.18, max: 1.65, fractionDigits: 2 }),
      );

      return {
        id: id("item", index),
        slug: `${currentOrg().emailSuffix}-${slugify(productName)}-${pad(index)}`,
        sku: orgScopedNumber("SKU", index),
        barcode: orgScopedNumber("BAR", index),
        nameEn: productName,
        nameFr: `Article ${pad(index)}`,
        descriptionEn: faker.commerce.productDescription(),
        descriptionFr: `Article d'inventaire ${pad(index)}`,
        imageUrls: [seedImageUrl("products", index)],
        thumbnail: seedImageUrl("products", index),
        upc: `${currentOrg().documentPrefix}-UPC-${pad(index)}`,
        ean: `${currentOrg().documentPrefix}-EAN-${pad(index)}`,
        mpn: orgScopedNumber("MPN", index),
        isbn: orgScopedNumber("ISBN", index),
        dimensions: `${10 + index}x${8 + index}x${5 + index} cm`,
        weight: qty(
          faker.number.float({ min: 0.2, max: 35, fractionDigits: 3 }),
        ),
        color: faker.color.human(),
        size: faker.helpers.arrayElement([
          "Small",
          "Standard",
          "Large",
          "Bulk",
        ]),
        costPrice,
        sellingPrice,
        msrp: money(sellingPrice * 1.12),
        trackInventory: true,
        trackSerialNumbers: index % 2 === 0,
        trackBatches: index % 3 === 0,
        trackExpiry: index % 4 === 0,
        minStockLevel: qty(5 + index),
        maxStockLevel: qty(100 + index * 4),
        reorderLevel: qty(10 + index),
        reorderQuantity: qty(25 + index),
        isActive: true,
        isDiscontinued: false,
        organizationId: orgId(),
        categoryId: id("category", index),
        brandId: id("brand", index),
        unitId: id("unit", index),
        taxRateId: id("tax_rate", index),
        updatedAt: day(index),
      };
    }),
  });

  await prisma.inventoryLevel.createMany({
    data: seedIndexes.map((index) => {
      const quantityOnHand = qty(75 + index);
      const reserved = qty(index % 5);
      const averageCost = money(1_000 + index * 175);
      return {
        id: id("inventory_level", index),
        itemId: id("item", index),
        locationId: id("location", index),
        quantityOnHand,
        quantityReserved: reserved,
        quantityAvailable: qty(quantityOnHand - reserved),
        quantityInTransit: qty(index % 4),
        quantityOnOrder: qty(10 + index),
        reorderPoint: qty(8 + index),
        averageCost,
        totalValue: money(quantityOnHand * averageCost),
        version: index,
        lastCountDate: day(index),
        lastTransactionAt: day(index),
        updatedAt: day(index),
      };
    }),
  });

  await prisma.itemSupplier.createMany({
    data: seedIndexes.map((index) => ({
      id: id("item_supplier", index),
      itemId: id("item", index),
      supplierId: id("supplier", index),
      supplierSku: orgScopedNumber("SUP-SKU", index),
      supplierName: `Supplier Item ${pad(index)}`,
      isPreferred: index % 3 === 0,
      leadTimeDays: 3 + index,
      minOrderQuantity: qty(5 + index),
      unitCost: money(900 + index * 120),
      lastPurchaseDate: day(index),
      notes: `Preferred supply record ${pad(index)}`,
      updatedAt: day(index),
    })),
  });

  await prisma.serialNumber.createMany({
    data: seedIndexes.map((index) => ({
      id: id("serial_number", index),
      serialNumber: orgScopedNumber("SERIAL", index),
      status: [
        SerialStatus.AVAILABLE,
        SerialStatus.RESERVED,
        SerialStatus.SOLD,
        SerialStatus.RETURNED,
      ][index % 4],
      itemId: id("item", index),
      locationId: id("location", index),
      organizationId: orgId(),
      batchNumber: orgScopedNumber("BATCH", index),
      expiryDate: day(index + 120),
      notes: `Serial seed ${pad(index)}`,
      updatedAt: day(index),
    })),
  });
}

async function seedPointOfSale() {
  await prisma.pOSStation.createMany({
    data: seedIndexes.map((index) => ({
      id: id("pos_station", index),
      terminalNumber: orgScopedNumber("TERM", index),
      name: `Seed POS Terminal ${pad(index)}`,
      isActive: true,
      hasCashDrawer: true,
      locationId: id("location", index),
      organizationId: orgId(),
      updatedAt: day(index),
    })),
  });

  await prisma.cashDrawer.createMany({
    data: seedIndexes.map((index) => ({
      id: id("cash_drawer", index),
      name: `Seed Cash Drawer ${pad(index)}`,
      drawerNumber: orgScopedNumber("DRAWER", index),
      currentBalance: money(50_000 + index * 1_000),
      expectedBalance: money(50_000 + index * 1_050),
      isOpen: index % 4 !== 0,
      locationId: id("location", index),
      terminalId: id("pos_station", index),
      updatedAt: day(index),
    })),
  });

  await prisma.pOSSession.createMany({
    data: seedIndexes.map((index) => ({
      id: id("pos_session", index),
      sessionNumber: orgScopedNumber("POS-SESSION", index),
      status: [
        POSSessionStatus.ACTIVE,
        POSSessionStatus.CLOSED,
        POSSessionStatus.RECONCILED,
      ][index % 3],
      startTime: day(index),
      endTime: index % 3 === 0 ? day(index + 1) : null,
      terminalId: id("pos_station", index),
      locationId: id("location", index),
      userId: id("user", index),
      openingBalance: money(20_000 + index * 500),
      closingBalance: money(22_000 + index * 550),
      expectedBalance: money(22_100 + index * 550),
      variance: money(index % 2 === 0 ? 100 : -75),
      totalSales: money(100_000 + index * 2_500),
      totalTax: money(19_250 + index * 450),
      totalDiscount: money(index * 125),
      transactionCount: 4 + index,
      cashTotal: money(40_000 + index * 1_000),
      cardTotal: money(30_000 + index * 800),
      mobileMoneyTotal: money(20_000 + index * 500),
      bankTransferTotal: money(5_000 + index * 250),
      creditTotal: money(2_000 + index * 100),
      organizationId: orgId(),
      notes: `POS session ${pad(index)}`,
      updatedAt: day(index),
    })),
  });
}

async function seedPurchasing() {
  await prisma.purchaseOrder.createMany({
    data: seedIndexes.map((index) => {
      const subtotal = money(75_000 + index * 4_000);
      const taxAmount = money(subtotal * CAMEROON_STANDARD_VAT_RATE_MULTIPLIER);
      const total = money(subtotal + taxAmount + 2_500);
      return {
        id: id("purchase_order", index),
        orderNumber: orgScopedNumber("PO", index),
        status: [
          PurchaseOrderStatus.DRAFT,
          PurchaseOrderStatus.APPROVED,
          PurchaseOrderStatus.RECEIVED,
          PurchaseOrderStatus.COMPLETED,
        ][index % 4],
        orderDate: day(index),
        expectedDeliveryDate: day(index + 7),
        actualDeliveryDate: index % 3 === 0 ? day(index + 6) : null,
        paymentTerms: `Net ${15 + index}`,
        notes: `Purchase order ${pad(index)}`,
        internalNotes: `Internal PO notes ${pad(index)}`,
        subtotal,
        taxAmount,
        shippingCost: 2_500,
        discount: money(index * 100),
        total,
        supplierId: id("supplier", index),
        locationId: id("location", index),
        organizationId: orgId(),
        createdById: id("user", index),
        approvedById: id("user", (index % COUNT) + 1),
        approvedAt: day(index + 1),
        updatedAt: day(index),
      };
    }),
  });

  await prisma.purchaseOrderLine.createMany({
    data: seedIndexes.map((index) => {
      const orderedQuantity = qty(20 + index);
      const unitCost = money(1_000 + index * 150);
      const taxAmount = money(orderedQuantity * unitCost * CAMEROON_STANDARD_VAT_RATE_MULTIPLIER);
      const lineTotal = money(orderedQuantity * unitCost + taxAmount);
      return {
        id: id("purchase_order_line", index),
        purchaseOrderId: id("purchase_order", index),
        itemId: id("item", index),
        orderedQuantity,
        receivedQuantity: qty(
          index % 2 === 0 ? orderedQuantity : orderedQuantity - 2,
        ),
        unitCost,
        discount: money(index * 50),
        taxRate: CAMEROON_STANDARD_VAT_RATE_PERCENT,
        taxAmount,
        lineTotal,
        notes: `PO line ${pad(index)}`,
        updatedAt: day(index),
      };
    }),
  });

  await prisma.goodsReceipt.createMany({
    data: seedIndexes.map((index) => ({
      id: id("goods_receipt", index),
      receiptNumber: orgScopedNumber("GR", index),
      receiptDate: day(index + 8),
      status: [
        GoodsReceiptStatus.DRAFT,
        GoodsReceiptStatus.RECEIVED,
        GoodsReceiptStatus.COMPLETED,
      ][index % 3],
      notes: `Goods receipt ${pad(index)}`,
      purchaseOrderId: id("purchase_order", index),
      locationId: id("location", index),
      organizationId: orgId(),
      receivedById: id("user", index),
      updatedAt: day(index),
    })),
  });

  await prisma.goodsReceiptLine.createMany({
    data: seedIndexes.map((index) => {
      const receivedQuantity = qty(18 + index);
      const unitCost = money(1_000 + index * 150);
      return {
        id: id("goods_receipt_line", index),
        goodsReceiptId: id("goods_receipt", index),
        purchaseOrderLineId: id("purchase_order_line", index),
        itemId: id("item", index),
        receivedQuantity,
        unitCost,
        lineTotal: money(receivedQuantity * unitCost),
        notes: `Receipt line ${pad(index)}`,
        batchNumber: orgScopedNumber("PO-BATCH", index),
        expiryDate: day(index + 180),
        updatedAt: day(index),
      };
    }),
  });
}

async function seedSalesAndPayments() {
  await prisma.salesOrder.createMany({
    data: seedIndexes.map((index) => {
      const subtotal = money(50_000 + index * 3_000);
      const taxAmount = money(subtotal * CAMEROON_STANDARD_VAT_RATE_MULTIPLIER);
      const discount = money(index * 75);
      const total = money(subtotal + taxAmount - discount);
      return {
        id: id("sales_order", index),
        orderNumber: orgScopedNumber("SO", index),
        status: [
          SalesOrderStatus.CONFIRMED,
          SalesOrderStatus.PROCESSING,
          SalesOrderStatus.COMPLETED,
          SalesOrderStatus.DELIVERED,
        ][index % 4],
        orderDate: day(index),
        dueDate: day(index + 3),
        notes: `Sales order ${pad(index)}`,
        subtotal,
        taxAmount,
        shippingCost: 0,
        discount,
        total,
        paymentStatus:
          index % 4 === 0 ? PaymentStatus.PARTIAL : PaymentStatus.PAID,
        customerId: id("customer", index),
        locationId: id("location", index),
        organizationId: orgId(),
        createdById: id("user", index),
        terminalId: id("pos_station", index),
        sessionId: id("pos_session", index),
        updatedAt: day(index),
      };
    }),
  });

  await prisma.salesOrderLine.createMany({
    data: seedIndexes.map((index) => {
      const quantity = qty(2 + (index % 5));
      const unitPrice = money(1_500 + index * 225);
      const taxAmount = money(quantity * unitPrice * CAMEROON_STANDARD_VAT_RATE_MULTIPLIER);
      const lineTotal = money(quantity * unitPrice + taxAmount);
      return {
        id: id("sales_order_line", index),
        salesOrderId: id("sales_order", index),
        itemId: id("item", index),
        quantity,
        unitPrice,
        discount: money(index * 25),
        taxRate: CAMEROON_STANDARD_VAT_RATE_PERCENT,
        taxAmount,
        lineTotal,
        notes: `Sales line ${pad(index)}`,
        updatedAt: day(index),
      };
    }),
  });

  await prisma.payment.createMany({
    data: seedIndexes.map((index) => {
      const amount = money(10_000 + index * 750);
      const method = [
        PaymentMethod.CASH,
        PaymentMethod.CARD,
        PaymentMethod.MOBILE_MONEY,
        PaymentMethod.BANK_TRANSFER,
      ][index % 4];
      return {
        id: id("payment", index),
        paymentNumber: orgScopedNumber("PAY", index),
        amount,
        method,
        status: index % 5 === 0 ? PaymentStatus.REFUNDED : PaymentStatus.PAID,
        idempotencyKey: orgScopedNumber("IDEMP", index),
        organizationId: orgId(),
        salesOrderId: id("sales_order", index),
        cashTendered:
          method === PaymentMethod.CASH ? money(amount + 1_000) : null,
        changeGiven: method === PaymentMethod.CASH ? 1_000 : null,
        cardType: method === PaymentMethod.CARD ? "VISA" : null,
        cardLast4: method === PaymentMethod.CARD ? `${1000 + index}` : null,
        authorizationCode:
          method === PaymentMethod.CARD ? orgScopedNumber("AUTH", index) : null,
        mobileMoneyProvider:
          method === PaymentMethod.MOBILE_MONEY
            ? CAMEROON_DEFAULT_MOBILE_MONEY_PROVIDER
            : null,
        mobileMoneyPhoneNumber:
          method === PaymentMethod.MOBILE_MONEY
            ? scopedPhone(65, index)
            : null,
        mobileMoneyReference:
          method === PaymentMethod.MOBILE_MONEY
            ? orgScopedNumber("MOMO", index)
            : null,
        mobileMoneyStatus:
          method === PaymentMethod.MOBILE_MONEY ? "SUCCESS" : null,
        mobileMoneyFeesAmount:
          method === PaymentMethod.MOBILE_MONEY ? money(100 + index) : null,
        bankReference:
          method === PaymentMethod.BANK_TRANSFER
            ? orgScopedNumber("BANK-REF", index)
            : null,
        bankName: method === PaymentMethod.BANK_TRANSFER ? "Seed Bank" : null,
        transactionId: orgScopedNumber("TXN", index),
        processedAt: day(index),
        processorResponse: "APPROVED",
        processedById: id("user", index),
        refundedAmount: index % 5 === 0 ? money(amount / 2) : 0,
        notes: `Payment ${pad(index)}`,
        updatedAt: day(index),
      };
    }),
  });

  await prisma.paymentRefund.createMany({
    data: seedIndexes.map((index) => ({
      id: id("payment_refund", index),
      refundNumber: orgScopedNumber("REF", index),
      amount: money(500 + index * 50),
      reason: `Seed refund reason ${pad(index)}`,
      status: [
        RefundStatus.PENDING,
        RefundStatus.APPROVED,
        RefundStatus.PROCESSED,
      ][index % 3],
      organizationId: orgId(),
      paymentId: id("payment", index),
      processedAt: day(index + 1),
      processorResponse: "REFUND_ACCEPTED",
      processedById: id("user", index),
      notes: `Refund ${pad(index)}`,
      updatedAt: day(index),
    })),
  });
}

async function seedInventoryTransactions() {
  await prisma.inventoryTransaction.createMany({
    data: seedIndexes.flatMap((index) => {
      const unitCost = money(1_000 + index * 175);
      const purchasedQuantity = qty(20 + index);
      const soldQuantity = qty(2 + (index % 5));

      return [
        {
          id: id("inventory_purchase_transaction", index),
          type: TransactionType.PURCHASE_RECEIPT,
          quantity: purchasedQuantity,
          unitCost,
          totalCost: money(purchasedQuantity * unitCost),
          notes: `Purchase receipt movement ${pad(index)}`,
          itemId: id("item", index),
          locationId: id("location", index),
          organizationId: orgId(),
          createdById: id("user", index),
          referenceType: TransactionReferenceType.GOODS_RECEIPT,
          referenceId: id("goods_receipt", index),
          referenceNumber: orgScopedNumber("GR", index),
          batchNumber: orgScopedNumber("PO-BATCH", index),
          serialNumbers: [orgScopedNumber("SERIAL", index)],
          expiryDate: day(index + 180),
          balanceAfter: qty(75 + index + purchasedQuantity),
          createdAt: day(index),
        },
        {
          id: id("inventory_sale_transaction", index),
          type: TransactionType.SALE,
          quantity: qty(-soldQuantity),
          unitCost,
          totalCost: money(-soldQuantity * unitCost),
          notes: `Sales consumption movement ${pad(index)}`,
          itemId: id("item", index),
          locationId: id("location", index),
          organizationId: orgId(),
          createdById: id("user", index),
          referenceType: TransactionReferenceType.SALES_ORDER,
          referenceId: id("sales_order", index),
          referenceNumber: orgScopedNumber("SO", index),
          batchNumber: orgScopedNumber("BATCH", index),
          serialNumbers: [orgScopedNumber("SERIAL", index)],
          expiryDate: day(index + 120),
          balanceAfter: qty(75 + index + purchasedQuantity - soldQuantity),
          createdAt: day(index + 1),
        },
      ];
    }),
  });
}

async function seedAccountingEntries() {
  await prisma.ledgerPostingBatch.createMany({
    data: seedIndexes.map((index) => ({
      id: id("ledger_posting_batch", index),
      organizationId: orgId(),
      periodId: id("accounting_period", ((index - 1) % 12) + 1),
      sourceType: AccountingSourceType.POS_SALE,
      sourceId: id("sales_order", index),
      postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
      idempotencyKey: orgScopedNumber("POST-SALE", index),
      sourceVersion: 1,
      status: LedgerPostingBatchStatus.POSTED,
      metadata: {
        seed: true,
        sourceNumber: orgScopedNumber("SO", index),
      },
      postedAt: day(index),
    })),
  });

  await prisma.journalEntry.createMany({
    data: seedIndexes.map((index) => ({
      id: id("journal_entry", index),
      organizationId: orgId(),
      journalId: id("journal", 4),
      periodId: id("accounting_period", ((index - 1) % 12) + 1),
      postingBatchId: id("ledger_posting_batch", index),
      entryNumber: orgScopedNumber("JE", index),
      entryDate: day(index),
      status: JournalEntryStatus.POSTED,
      currency: currentOrg().currency,
      memo: `Seed sale recognition ${orgScopedNumber("SO", index)}`,
      reference: orgScopedNumber("SO", index),
      sourceType: AccountingSourceType.POS_SALE,
      sourceId: id("sales_order", index),
      postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
      postedAt: day(index),
      postedById: id("user", 8),
      createdById: id("user", 8),
    })),
  });

  await prisma.journalEntryLine.createMany({
    data: seedIndexes.flatMap((index) => {
      const subtotal = money(50_000 + index * 3_000);
      const taxAmount = money(subtotal * CAMEROON_STANDARD_VAT_RATE_MULTIPLIER);
      const discount = money(index * 75);
      const revenue = money(subtotal - discount);
      const total = money(revenue + taxAmount);
      const unitCost = money(1_000 + index * 175);
      const soldQuantity = qty(2 + (index % 5));
      const costAmount = money(soldQuantity * unitCost);
      const lineBase = (index - 1) * 5;

      return [
        {
          id: id("journal_entry_line", lineBase + 1),
          organizationId: orgId(),
          journalEntryId: id("journal_entry", index),
          accountId: id("chart_account", 1),
          lineNumber: 1,
          description: `Cash/customer settlement for ${orgScopedNumber("SO", index)}`,
          debit: total,
          credit: 0,
          currency: currentOrg().currency,
          locationId: id("location", index),
          customerId: id("customer", index),
        },
        {
          id: id("journal_entry_line", lineBase + 2),
          organizationId: orgId(),
          journalEntryId: id("journal_entry", index),
          accountId: id("chart_account", 13),
          lineNumber: 2,
          description: `COGS for ${orgScopedNumber("SO", index)}`,
          debit: costAmount,
          credit: 0,
          currency: currentOrg().currency,
          locationId: id("location", index),
          itemId: id("item", index),
        },
        {
          id: id("journal_entry_line", lineBase + 3),
          organizationId: orgId(),
          journalEntryId: id("journal_entry", index),
          accountId: id("chart_account", 10),
          lineNumber: 3,
          description: `Revenue for ${orgScopedNumber("SO", index)}`,
          debit: 0,
          credit: revenue,
          currency: currentOrg().currency,
          customerId: id("customer", index),
        },
        {
          id: id("journal_entry_line", lineBase + 4),
          organizationId: orgId(),
          journalEntryId: id("journal_entry", index),
          accountId: id("chart_account", 11),
          lineNumber: 4,
          description: `Output VAT for ${orgScopedNumber("SO", index)}`,
          debit: 0,
          credit: taxAmount,
          currency: currentOrg().currency,
          customerId: id("customer", index),
        },
        {
          id: id("journal_entry_line", lineBase + 5),
          organizationId: orgId(),
          journalEntryId: id("journal_entry", index),
          accountId: id("chart_account", 9),
          lineNumber: 5,
          description: `Inventory relief for ${orgScopedNumber("SO", index)}`,
          debit: 0,
          credit: costAmount,
          currency: currentOrg().currency,
          locationId: id("location", index),
          itemId: id("item", index),
        },
      ];
    }),
  });

  await prisma.accountingSourceLink.createMany({
    data: seedIndexes.map((index) => ({
      id: id("accounting_source_link", index),
      organizationId: orgId(),
      postingBatchId: id("ledger_posting_batch", index),
      journalEntryId: id("journal_entry", index),
      sourceType: AccountingSourceType.POS_SALE,
      sourceId: id("sales_order", index),
      sourceNumber: orgScopedNumber("SO", index),
      sourceDate: day(index),
      metadata: {
        seed: true,
        postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
      },
    })),
  });

  await prisma.ledgerAuditEvent.createMany({
    data: seedIndexes.map((index) => ({
      id: id("ledger_audit_event", index + 1),
      organizationId: orgId(),
      postingBatchId: id("ledger_posting_batch", index),
      journalEntryId: id("journal_entry", index),
      action: "SEED_POSTED_SALE_JOURNAL",
      actorId: id("user", 8),
      resourceType: "SalesOrder",
      resourceId: id("sales_order", index),
      message: `Posted seed sale journal ${orgScopedNumber("JE", index)}`,
      metadata: {
        sourceNumber: orgScopedNumber("SO", index),
      },
    })),
  });
}

async function seedFinanceAndLedgers() {
  await prisma.expense.createMany({
    data: seedIndexes.map((index) => ({
      id: id("expense", index),
      expenseNumber: orgScopedNumber("EXP", index),
      description: `Seed expense ${pad(index)}`,
      amount: money(5_000 + index * 300),
      expenseDate: day(index),
      categoryId: id("expense_category", index),
      locationId: id("location", index),
      paymentMethod: [
        PaymentMethod.CASH,
        PaymentMethod.CARD,
        PaymentMethod.BANK_TRANSFER,
      ][index % 3],
      receiptUrl: seedImageUrl("receipts", index),
      supplierId: id("supplier", index),
      notes: `Expense notes ${pad(index)}`,
      organizationId: orgId(),
      createdById: id("user", index),
      updatedAt: day(index),
    })),
  });

  await prisma.customerLedgerEntry.createMany({
    data: seedIndexes.map((index) => ({
      id: id("customer_ledger_entry", index),
      customerId: id("customer", index),
      entryDate: day(index),
      type: [
        LedgerEntryType.SALE,
        LedgerEntryType.PAYMENT,
        LedgerEntryType.CREDIT_NOTE,
      ][index % 3],
      debit: money(index % 2 === 0 ? 10_000 + index * 500 : 0),
      credit: money(index % 2 !== 0 ? 7_000 + index * 400 : 0),
      balanceAfter: money(index * 1_250),
      description: `Customer ledger entry ${pad(index)}`,
      referenceType: "SALES_ORDER",
      referenceId: id("sales_order", index),
      organizationId: orgId(),
      createdAt: day(index),
    })),
  });

  await prisma.supplierLedgerEntry.createMany({
    data: seedIndexes.map((index) => ({
      id: id("supplier_ledger_entry", index),
      supplierId: id("supplier", index),
      entryDate: day(index),
      type: [
        LedgerEntryType.PURCHASE,
        LedgerEntryType.PAYMENT,
        LedgerEntryType.DEBIT_NOTE,
      ][index % 3],
      debit: money(index % 2 === 0 ? 15_000 + index * 750 : 0),
      credit: money(index % 2 !== 0 ? 8_000 + index * 450 : 0),
      balanceAfter: money(index * 2_000),
      description: `Supplier ledger entry ${pad(index)}`,
      referenceType: "PURCHASE_ORDER",
      referenceId: id("purchase_order", index),
      organizationId: orgId(),
      createdAt: day(index),
    })),
  });
}

async function seedReportingAndCash() {
  await prisma.cashDrawerTransaction.createMany({
    data: seedIndexes.map((index) => {
      const amount = money(1_000 + index * 100);
      const before = money(50_000 + index * 1_000);
      return {
        id: id("cash_drawer_transaction", index),
        type: [
          CashDrawerTransactionType.OPENING_BALANCE,
          CashDrawerTransactionType.SALE,
          CashDrawerTransactionType.CASH_IN,
          CashDrawerTransactionType.CLOSING_BALANCE,
        ][index % 4],
        amount,
        reason: `Cash reason ${pad(index)}`,
        notes: `Cash drawer transaction ${pad(index)}`,
        cashDrawerId: id("cash_drawer", index),
        sessionId: id("pos_session", index),
        userId: id("user", index),
        balanceBefore: before,
        balanceAfter: money(before + amount),
        createdAt: day(index),
      };
    }),
  });

  await prisma.dailySalesReport.createMany({
    data: seedIndexes.map((index) => {
      const totalRevenue = money(75_000 + index * 2_250);
      const totalCost = money(45_000 + index * 1_150);
      const grossProfit = money(totalRevenue - totalCost);
      return {
        id: id("daily_sales_report", index),
        date: day(index),
        locationId: id("location", index),
        organizationId: orgId(),
        totalRevenue,
        totalCost,
        grossProfit,
        grossMargin: money((grossProfit / totalRevenue) * 100),
        totalQuantitySold: qty(15 + index),
        totalTransactions: 5 + index,
        averageTransactionValue: money(totalRevenue / (5 + index)),
        itemsSold: 1 + (index % 5),
        cashSales: money(totalRevenue * 0.35),
        cardSales: money(totalRevenue * 0.25),
        mobileMoneySales: money(totalRevenue * 0.25),
        bankTransferSales: money(totalRevenue * 0.1),
        creditSales: money(totalRevenue * 0.05),
        totalExpenses: money(2_000 + index * 100),
        netProfit: money(grossProfit - (2_000 + index * 100)),
        openingBalance: money(20_000 + index * 400),
        closingBalance: money(25_000 + index * 500),
        cashIn: money(5_000 + index * 200),
        cashOut: money(500 + index * 50),
        variance: money(index % 2 === 0 ? 100 : -100),
        reportGeneratedAt: day(index + 1),
        reportGeneratedById: id("user", index),
        isFinalized: index % 2 === 0,
        notes: `Daily sales report ${pad(index)}`,
      };
    }),
  });

  await prisma.dailySalesReportItem.createMany({
    data: seedIndexes.map((index) => {
      const costPrice = money(1_000 + index * 175);
      const sellingPrice = money(1_500 + index * 225);
      const quantitySold = qty(3 + (index % 5));
      const totalRevenue = money(quantitySold * sellingPrice);
      const totalCost = money(quantitySold * costPrice);
      const grossProfit = money(totalRevenue - totalCost);
      return {
        id: id("daily_sales_report_item", index),
        reportId: id("daily_sales_report", index),
        itemId: id("item", index),
        itemNameEn: `Seed Item ${pad(index)}`,
        itemNameFr: `Article de test ${pad(index)}`,
        itemSku: orgScopedNumber("SKU", index),
        costPrice,
        sellingPrice,
        startingQuantity: qty(80 + index),
        quantitySold,
        endingQuantity: qty(80 + index - quantitySold),
        cashSales: money(totalRevenue * 0.4),
        cardSales: money(totalRevenue * 0.25),
        mobileMoneySales: money(totalRevenue * 0.25),
        bankTransferSales: money(totalRevenue * 0.05),
        creditSales: money(totalRevenue * 0.05),
        totalRevenue,
        totalCost,
        grossProfit,
        margin: money((grossProfit / totalRevenue) * 100),
      };
    }),
  });

  await prisma.dailySalesReportCashEvent.createMany({
    data: seedIndexes.map((index) => ({
      id: id("daily_sales_report_cash_event", index),
      reportId: id("daily_sales_report", index),
      transactionType: CashDrawerTransactionType.SALE,
      amount: money(1_000 + index * 200),
      reason: `Daily cash event ${pad(index)}`,
      notes: `Cash event notes ${pad(index)}`,
      balanceBefore: money(25_000 + index * 500),
      balanceAfter: money(26_000 + index * 700),
      timestamp: day(index),
      userId: id("user", index),
      userName: `Seed${pad(index)} User`,
    })),
  });
}

async function seedProductionAndStockMovement() {
  await prisma.recipe.createMany({
    data: seedIndexes.map((index) => ({
      id: id("recipe", index),
      nameEn: `Seed Recipe ${pad(index)}`,
      nameFr: `Recette de test ${pad(index)}`,
      outputItemId: id("item", index),
      outputQuantity: qty(10 + index),
      laborCost: money(2_000 + index * 150),
      overheadCost: money(1_000 + index * 75),
      version: 1,
      isActive: true,
      notes: `Recipe seed ${pad(index)}`,
      organizationId: orgId(),
      updatedAt: day(index),
    })),
  });

  await prisma.recipeIngredient.createMany({
    data: seedIndexes.map((index) => ({
      id: id("recipe_ingredient", index),
      recipeId: id("recipe", index),
      itemId: id("item", (index % COUNT) + 1),
      quantity: qty(1 + index / 10),
      wastePercent: money(index % 5),
      notes: `Recipe ingredient ${pad(index)}`,
      updatedAt: day(index),
    })),
  });

  await prisma.productionBatch.createMany({
    data: seedIndexes.map((index) => ({
      id: id("production_batch", index),
      batchNumber: orgScopedNumber("PROD", index),
      recipeId: id("recipe", index),
      plannedQuantity: qty(30 + index),
      actualQuantity: qty(index % 4 === 0 ? 0 : 28 + index),
      status: [
        ProductionBatchStatus.PLANNED,
        ProductionBatchStatus.IN_PROGRESS,
        ProductionBatchStatus.COMPLETED,
      ][index % 3],
      startedAt: day(index),
      completedAt: index % 3 === 2 ? day(index + 1) : null,
      totalInputCost: money(20_000 + index * 750),
      unitCost: money(800 + index * 30),
      notes: `Production batch ${pad(index)}`,
      locationId: id("location", index),
      organizationId: orgId(),
      createdById: id("user", index),
      updatedAt: day(index),
    })),
  });

  await prisma.stockAdjustment.createMany({
    data: seedIndexes.map((index) => ({
      id: id("stock_adjustment", index),
      adjustmentNumber: orgScopedNumber("ADJ", index),
      type: [
        AdjustmentType.CYCLE_COUNT,
        AdjustmentType.DAMAGED,
        AdjustmentType.FOUND,
        AdjustmentType.CORRECTION,
      ][index % 4],
      reason: `Adjustment reason ${pad(index)}`,
      status: [
        AdjustmentStatus.DRAFT,
        AdjustmentStatus.SUBMITTED,
        AdjustmentStatus.APPROVED,
        AdjustmentStatus.COMPLETED,
      ][index % 4],
      adjustmentDate: day(index),
      notes: `Stock adjustment ${pad(index)}`,
      locationId: id("location", index),
      organizationId: orgId(),
      createdById: id("user", index),
      approvedById: id("user", (index % COUNT) + 1),
      approvedAt: day(index + 1),
      updatedAt: day(index),
    })),
  });

  await prisma.stockAdjustmentLine.createMany({
    data: seedIndexes.map((index) => {
      const systemQuantity = qty(75 + index);
      const actualQuantity = qty(systemQuantity + (index % 2 === 0 ? 2 : -1));
      const adjustedQuantity = qty(actualQuantity - systemQuantity);
      const unitCost = money(1_000 + index * 175);
      return {
        id: id("stock_adjustment_line", index),
        adjustmentId: id("stock_adjustment", index),
        itemId: id("item", index),
        systemQuantity,
        actualQuantity,
        adjustedQuantity,
        unitCost,
        totalCost: money(adjustedQuantity * unitCost),
        notes: `Adjustment line ${pad(index)}`,
        updatedAt: day(index),
      };
    }),
  });

  await prisma.stockTransfer.createMany({
    data: seedIndexes.map((index) => ({
      id: id("stock_transfer", index),
      transferNumber: orgScopedNumber("TRF", index),
      status: [
        TransferStatus.DRAFT,
        TransferStatus.APPROVED,
        TransferStatus.IN_TRANSIT,
        TransferStatus.COMPLETED,
      ][index % 4],
      transferDate: day(index),
      expectedDate: day(index + 2),
      actualDate: index % 4 === 3 ? day(index + 2) : null,
      notes: `Stock transfer ${pad(index)}`,
      fromLocationId: id("location", index),
      toLocationId: id("location", (index % COUNT) + 1),
      organizationId: orgId(),
      createdById: id("user", index),
      approvedById: id("user", (index % COUNT) + 1),
      approvedAt: day(index + 1),
      updatedAt: day(index),
    })),
  });

  await prisma.stockTransferLine.createMany({
    data: seedIndexes.map((index) => ({
      id: id("stock_transfer_line", index),
      transferId: id("stock_transfer", index),
      itemId: id("item", index),
      requestedQuantity: qty(5 + index),
      shippedQuantity: qty(4 + index),
      receivedQuantity: qty(index % 4 === 3 ? 4 + index : 0),
      unitCost: money(1_000 + index * 175),
      notes: `Transfer line ${pad(index)}`,
      updatedAt: day(index),
    })),
  });
}

async function seedAuditAndInvites() {
  await prisma.invite.createMany({
    data: seedIndexes.map((index) => ({
      id: id("invite", index),
      token: `${currentOrg().orgIndex}${index}`.padStart(64, "0"),
      email: scopedEmail(`invite.${pad(index)}`),
      organizationId: orgId(),
      roleId: id("role", index),
      status: [
        InviteStatus.PENDING,
        InviteStatus.ACCEPTED,
        InviteStatus.EXPIRED,
        InviteStatus.CANCELLED,
      ][index % 4],
      expiresAt: day(index + 30),
      updatedAt: day(index),
    })),
  });

  await prisma.auditLog.createMany({
    data: seedIndexes.map((index) => ({
      id: id("audit_log", index),
      entityType: index % 2 === 0 ? "Item" : "SalesOrder",
      entityId: index % 2 === 0 ? id("item", index) : id("sales_order", index),
      action: index % 2 === 0 ? "CREATE" : "UPDATE",
      changes: {
        seed: true,
        index,
        note: `Comprehensive seed audit ${pad(index)}`,
      },
      userId: id("user", index),
      ipAddress: `10.0.0.${index}`,
      userAgent: "StockFlow comprehensive seed",
      organizationId: orgId(),
      createdAt: day(index),
    })),
  });
}

async function withOrgSeedContext<T>(
  context: OrgSeedContext,
  operation: () => Promise<T>,
) {
  const previousContext = activeOrgContext;
  activeOrgContext = context;

  try {
    return await operation();
  } finally {
    activeOrgContext = previousContext;
  }
}

async function seedOrgDataset(context: OrgSeedContext) {
  await withOrgSeedContext(context, async () => {
    console.log(
      `Seeding full dataset for ${context.organizationId} (${context.documentPrefix})`,
    );

    await seedRoles();
    await seedUsers();
    await seedAccountingControlPlane();
    await seedAuthTables();
    await seedReferenceData();
    await seedItemsAndInventory();
    await seedPointOfSale();
    await seedPurchasing();
    await seedSalesAndPayments();
    await seedInventoryTransactions();
    await seedAccountingEntries();
    await seedFinanceAndLedgers();
    await seedReportingAndCash();
    await seedProductionAndStockMovement();
    await seedAuditAndInvites();
  });
}

async function verifyCounts() {
  const generatedIdWhere = { id: { startsWith: ID_PREFIX } };
  const tenantMinimum = ORG_COUNT * COUNT;
  const aggregateTargets: Array<{
    model: string;
    delegate: SeedDelegate;
    minimum: number;
  }> = [
    ...verificationOrder.map(([model, delegate]) => ({
      model,
      delegate,
      minimum: model === "Organization" ? ORG_COUNT : tenantMinimum,
    })),
    {
      model: "OrganizationAccountingSettings",
      delegate: prisma.organizationAccountingSettings,
      minimum: ORG_COUNT,
    },
    { model: "FiscalYear", delegate: prisma.fiscalYear, minimum: ORG_COUNT },
    {
      model: "AccountingPeriod",
      delegate: prisma.accountingPeriod,
      minimum: ORG_COUNT * 12,
    },
    {
      model: "ChartOfAccount",
      delegate: prisma.chartOfAccount,
      minimum: ORG_COUNT * 14,
    },
    { model: "Journal", delegate: prisma.journal, minimum: ORG_COUNT * 8 },
    {
      model: "PostingRule",
      delegate: prisma.postingRule,
      minimum: ORG_COUNT * DEFAULT_POS_POSTING_RULES.length,
    },
    {
      model: "PostingRuleLine",
      delegate: prisma.postingRuleLine,
      minimum: ORG_COUNT * DEFAULT_POS_POSTING_RULES.length,
    },
    {
      model: "LedgerPostingBatch",
      delegate: prisma.ledgerPostingBatch,
      minimum: tenantMinimum,
    },
    {
      model: "JournalEntry",
      delegate: prisma.journalEntry,
      minimum: tenantMinimum,
    },
    {
      model: "JournalEntryLine",
      delegate: prisma.journalEntryLine,
      minimum: tenantMinimum * 5,
    },
    {
      model: "AccountingSourceLink",
      delegate: prisma.accountingSourceLink,
      minimum: tenantMinimum,
    },
    {
      model: "LedgerAuditEvent",
      delegate: prisma.ledgerAuditEvent,
      minimum: tenantMinimum,
    },
  ];

  const counts = await Promise.all(
    aggregateTargets.map(async ({ model, delegate, minimum }) => ({
      model,
      minimum,
      count: await delegate.count({ where: generatedIdWhere }),
    })),
  );

  const lowCounts = counts.filter(({ count, minimum }) => count < minimum);

  console.table(counts);

  if (lowCounts.length > 0) {
    throw new Error(
      `Comprehensive seed coverage failed: ${lowCounts
        .map(({ model, count, minimum }) => `${model}=${count}/${minimum}`)
        .join(", ")}`,
    );
  }

  const orgDistributions = await Promise.all(
    orgContexts.map(async (context) => ({
      organizationId: context.organizationId,
      roles: await prisma.role.count({
        where: { organizationId: context.organizationId },
      }),
      users: await prisma.user.count({
        where: { organizationId: context.organizationId },
      }),
      locations: await prisma.location.count({
        where: { organizationId: context.organizationId },
      }),
      customers: await prisma.customer.count({
        where: { organizationId: context.organizationId },
      }),
      suppliers: await prisma.supplier.count({
        where: { organizationId: context.organizationId },
      }),
      items: await prisma.item.count({
        where: { organizationId: context.organizationId },
      }),
      purchases: await prisma.purchaseOrder.count({
        where: { organizationId: context.organizationId },
      }),
      sales: await prisma.salesOrder.count({
        where: { organizationId: context.organizationId },
      }),
      payments: await prisma.payment.count({
        where: { organizationId: context.organizationId },
      }),
      chartAccounts: await prisma.chartOfAccount.count({
        where: { organizationId: context.organizationId },
      }),
      postingRules: await prisma.postingRule.count({
        where: { organizationId: context.organizationId },
      }),
      journalEntries: await prisma.journalEntry.count({
        where: { organizationId: context.organizationId },
      }),
    })),
  );
  const incompleteOrganizations = orgDistributions.filter(
    (distribution) =>
      distribution.roles < COUNT ||
      distribution.users < COUNT ||
      distribution.locations < COUNT ||
      distribution.customers < COUNT ||
      distribution.suppliers < COUNT ||
      distribution.items < COUNT ||
      distribution.purchases < COUNT ||
      distribution.sales < COUNT ||
      distribution.payments < COUNT ||
      distribution.chartAccounts < 14 ||
      distribution.postingRules < DEFAULT_POS_POSTING_RULES.length ||
      distribution.journalEntries < COUNT,
  );

  console.table(orgDistributions);

  if (incompleteOrganizations.length > 0) {
    throw new Error(
      `Comprehensive seed tenant distribution failed: ${incompleteOrganizations
        .map((distribution) => distribution.organizationId)
        .join(", ")}`,
    );
  }

  const journalEntries = await prisma.journalEntry.findMany({
    where: generatedIdWhere,
    select: {
      entryNumber: true,
      organizationId: true,
      lines: {
        select: {
          debit: true,
          credit: true,
        },
      },
    },
  });
  const unbalancedEntries = journalEntries.filter((entry) => {
    const debitTotal = entry.lines.reduce(
      (total, line) => total + Number(line.debit),
      0,
    );
    const creditTotal = entry.lines.reduce(
      (total, line) => total + Number(line.credit),
      0,
    );

    return Math.round(debitTotal * 100) !== Math.round(creditTotal * 100);
  });

  if (unbalancedEntries.length > 0) {
    throw new Error(
      `Seed produced unbalanced journal entries: ${unbalancedEntries
        .slice(0, 10)
        .map((entry) => `${entry.organizationId}/${entry.entryNumber}`)
        .join(", ")}`,
    );
  }

  console.log(`Verified ${journalEntries.length} balanced seed journal entries.`);
}

async function main() {
  console.log(
    `Starting comprehensive seed for ${ORG_COUNT} organizations with at least ${COUNT} records per tenant-scoped business model...`,
  );

  demoCredentials.length = 0;
  await ensureSeedImages();
  verifySeedImageFiles();
  await clearSeededData();
  await seedOrganizations();
  for (const context of orgContexts) {
    await seedOrgDataset(context);
  }
  await verifyCounts();
  verifySeedImageFiles();

  console.log("Comprehensive seed completed successfully.");
  console.log(
    "Development/demo credentials only. Do not use these passwords in production.",
  );
  console.table(demoCredentials);
}

main()
  .catch((error) => {
    console.error("Comprehensive seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
