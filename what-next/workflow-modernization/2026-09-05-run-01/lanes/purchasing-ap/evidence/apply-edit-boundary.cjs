const fs = require("node:fs");
function change(path, transform) { const original = fs.readFileSync(path,"utf8"); const next = transform(original); if(next===original) throw new Error("No change: "+path); fs.writeFileSync(path,next); }
change("hooks/useRecentPurchaseOrderQueries.ts", text => {
 const start=text.lastIndexOf("/**", text.indexOf("export function useUpdatePurchaseOrder()"));
 const end=text.indexOf("/**", text.indexOf("export function useUpdatePurchaseOrder()"));
 if(start<0||end<0) throw new Error("Hook bounds missing");
 return text.slice(0,start)+`/**
 * Save through the protected action. Draft input is not authoritative order data.
 */
export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation<
    PurchaseOrderResponse<PurchaseOrderWithRelations>,
    QueryError,
    UpdatePurchaseOrderDTO & BaseMutationVariables
  >({
    meta: { operation: 'update', entity: 'Purchase Order' },
    retry: false,
    mutationFn: async (payload) => {
      if (!payload.id || !payload.organizationId) {
        throw new Error("Purchase order ID and organization ID are required");
      }
      return updatePurchaseOrder(payload);
    },
    onSuccess: (result, variables) => {
      if (!result.success || !result.data) return;
      // Detail has a separate actor-specific presentation shape. Refetch it
      // instead of merging write DTOs into that cached read model.
      void queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.detail(variables.id) });
      void queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.summary(variables.organizationId) });
    },
  });
}

`+text.slice(end);
});
change("actions/purchaseOrderWorkflow/purchaseOrderSystemAction.ts",text=>text.replace(/updatedById: userId,\r?\n    shippingCost: payload\.shippingCost \?\? 0,/, "updatedById: userId,"));
change("app/[locale]/(dashboard)/dashboard/purchase-orders/[id]/edit/page.tsx",text=>text
 .replace('import { getPurchaseOrderById, getPurchaseOrderFormOptions }', 'import { NotFoundError } from "@/services/_shared/action-errors"\nimport { getPurchaseOrderById, getPurchaseOrderCurrency, getPurchaseOrderFormOptions }')
 .replace('const purchaseOrder = await getPurchaseOrderById(id, ctx.orgId).catch(() => null)', 'const purchaseOrder = await getPurchaseOrderById(id, ctx.orgId).catch((error: unknown) => {\n        if (error instanceof NotFoundError) notFound()\n        throw error\n      })')
 .replace('const options = await getPurchaseOrderFormOptions(ctx.orgId)', 'const [options, currency] = await Promise.all([\n        getPurchaseOrderFormOptions(ctx.orgId),\n        getPurchaseOrderCurrency(ctx.orgId),\n      ])')
 .replace('organizationId={ctx.orgId}', 'organizationId={ctx.orgId}\n          currency={currency}')
);
