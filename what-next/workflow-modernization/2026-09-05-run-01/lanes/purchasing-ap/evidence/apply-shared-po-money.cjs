const fs=require("node:fs");let path="components/purchase-orders/ModernEditPurchaseOrderForm.tsx";let raw=fs.readFileSync(path,"utf8");
raw=raw.replace('import { purchaseOrderEditDefaults,', 'import { formatPurchaseOrderMoney } from "./purchase-order-money"\nimport { purchaseOrderEditDefaults,');
const start=raw.indexOf("  // Persisted PO amounts have two decimals;");
const end=raw.indexOf("  const busy =",start);if(start<0||end<0)throw Error("Missing money formatter bounds");
raw=raw.slice(0,start)+'  const money = (amount: number) => formatPurchaseOrderMoney(amount, locale, currency)\n'+raw.slice(end);
fs.writeFileSync(path,raw);
path="components/purchase-orders/ModernPurchaseOrderDetailPage.tsx";raw=fs.readFileSync(path,"utf8").replace('import { formatCurrency as formatMoney } from "@/lib/i18n/formatters"','import { formatPurchaseOrderMoney } from "./purchase-order-money"').replace('return formatMoney(amount, locale, purchaseOrder.currency)', 'return formatPurchaseOrderMoney(amount, locale, purchaseOrder.currency)');fs.writeFileSync(path,raw);
