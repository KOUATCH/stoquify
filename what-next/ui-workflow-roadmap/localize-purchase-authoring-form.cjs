const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const file = path.join(root, 'components/purchase-orders/DurableCreatePurchaseOrderForm.tsx');
const original = fs.readFileSync(file, 'utf8');
let source = original;
const once = (from, to) => {
  if (!source.includes(from)) throw new Error('Missing expected source: ' + from);
  source = source.replace(from, to);
};
once('import { formatCurrency } from "@/lib/formatCurrency"', 'import { translatePurchaseAuthoringForm, type PurchaseAuthoringFormCopyKey } from "./purchase-authoring-form-copy"');
once('import { format } from "date-fns"', 'import { format } from "date-fns"\nimport { enUS, fr } from "date-fns/locale"');
once('const purchaseOrderSchema = z.object({', 'const purchaseOrderSchema = (locale: string) => {\n  const t = (key: PurchaseAuthoringFormCopyKey) => translatePurchaseAuthoringForm(locale, key)\n  return z.object({');
once('export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>', '}\n\nexport type PurchaseOrderFormData = z.infer<ReturnType<typeof purchaseOrderSchema>>');
once('  const router = useRouter()', '  const router = useRouter()\n  const t = useCallback((key: PurchaseAuthoringFormCopyKey) => translatePurchaseAuthoringForm(locale, key), [locale])\n  const dateLocale = locale === "fr" ? fr : enUS\n  const formatCurrency = (amount: number) => new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { style: "currency", currency: "XAF", minimumFractionDigits: 0 }).format(amount)');
once('zodResolver(purchaseOrderSchema)', 'zodResolver(purchaseOrderSchema(locale))');
const catalog = ts.createSourceFile('copy.ts', fs.readFileSync(path.join(root, 'components/purchase-orders/purchase-authoring-form-copy.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
const keys = new Set();
function collect(node) {
  if (ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name)) keys.add(node.name.text);
  ts.forEachChild(node, collect);
}
collect(catalog);
const parsed = ts.createSourceFile('form.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const startSteps = source.indexOf('const FORM_STEPS =');
const endSteps = source.indexOf('] as const', startSteps);
const replacements = [];
function visit(node) {
  const start = node.getStart(parsed), end = node.end;
  if (start >= startSteps && start < endSteps) return;
  if (ts.isStringLiteral(node) && keys.has(node.text)) {
    const expression = 't(' + JSON.stringify(node.text) + ')';
    replacements.push({ start, end, text: ts.isJsxAttribute(node.parent) ? '{' + expression + '}' : expression });
  } else if (ts.isJsxText(node) && keys.has(node.text.trim())) {
    const raw = source.slice(node.pos, end);
    replacements.push({ start: node.pos, end, text: raw.replace(node.text.trim(), '{t(' + JSON.stringify(node.text.trim()) + ')}') });
  }
  ts.forEachChild(node, visit);
}
visit(parsed);
replacements.sort((a, b) => b.start - a.start).forEach(edit => { source = source.slice(0, edit.start) + edit.text + source.slice(edit.end); });
once('{step.title}', '{t(step.title)}');
once('{step.description}', '{t(step.description)}');
once('`${FORM_STEPS.find(s => s.id === currentStep)?.title} completed successfully!`', 't(FORM_STEPS.find(s => s.id === currentStep)!.title)');
once('`${item.name} has been added to the order`', 'item.name');
once('`${line.item.name} has been removed from the order`', 'line.item.name');
once('[currentStep, form, orderLines.length, completedSteps, success, warning]', '[currentStep, form, orderLines.length, completedSteps, success, warning, t]');
once('[currentStep, validateCurrentStep, warning]', '[currentStep, validateCurrentStep, warning, t]');
once('[currentStep, completedSteps, validateCurrentStep, warning]', '[currentStep, completedSteps, validateCurrentStep, warning, t]');
once('}, [success])', '}, [success, t])');
once('}, [orderLines, warning])', '}, [orderLines, warning, t])');
once('{Math.round(progress)}% Complete', '{Math.round(progress)}% {t("Complete")}');
once('Total: {totals.valid', '{t("Total")}: {totals.valid');
once('{orderLines.length} items', '{orderLines.length} {t("Items")}');
once("{orderLines.length} item{orderLines.length !== 1 ? 's' : ''}", '{orderLines.length} {t("Items")}');
source = source.replaceAll('format(field.value, "PPP")', 'format(field.value, "PPP", { locale: dateLocale })');
once('format(form.getValues("expectedDeliveryDate"), "MMM dd, yyyy")', 'format(form.getValues("expectedDeliveryDate"), "PPP", { locale: dateLocale })');
source = source.replaceAll('<Calendar\r\n', '<Calendar\r\n                                      locale={dateLocale}\r\n                                      labels={{ labelPrevious: () => t("Previous month"), labelNext: () => t("Next month"), labelDay: date => format(date, "PPPP", { locale: dateLocale }) }}\r\n');
once('<Progress value={progress}', '<Progress aria-label={t("Overall Progress")} value={progress}');
once('key={step.id}', 'key={step.id}\n                    aria-current={isActive ? "step" : undefined}');
for (const [field, key] of [['quantity', 'Quantity'], ['unitPrice', 'Unit Price'], ['taxRate', 'Tax %'], ['discount', 'Discount']]) {
  once('value={line.' + field + '}', 'aria-label={`${t("' + key + '")} — ${line.item.name}`}\n                                          value={line.' + field + '}');
}
once('onClick={() => removeOrderLine(line.id)}', 'aria-label={`${t("Remove item")} — ${line.item.name}`}\n                                          onClick={() => removeOrderLine(line.id)}');
once('placeholder={t("Search items by name or SKU...")}', 'aria-label={t("Search items")}\n                    placeholder={t("Search items by name or SKU...")}');
once('<Button onClick={() => addOrderLine(item)}', '<Button aria-label={`${t("Add")} — ${item.name}`} onClick={() => addOrderLine(item)}');
if (fs.readFileSync(file, 'utf8') !== original) throw new Error('Source changed during transformation');
const staged = path.join(path.dirname(file), '.purchase-authoring-localization-' + require('node:crypto').randomUUID() + '.tmp');
fs.writeFileSync(staged, source);
fs.renameSync(staged, file);
console.log(JSON.stringify({ localizedNodes: replacements.length, file: path.relative(root, file) }));
