const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../../../../..');
const edit=(p,fn)=>{const file=path.join(root,p);fs.writeFileSync(file,fn(fs.readFileSync(file,'utf8')))};
edit('hooks/useRecentPurchaseOrderQueries.ts',s=>{
 s=s.replace('import type { PurchaseApprovalRequest }','import type { PurchaseLifecycleRequest } from "@/services/purchase-order/purchase-order-lifecycle-contracts";\nimport type { PurchaseApprovalRequest }');
 for(const name of ['Delete','Submit','Cancel','Close']){
  const start=s.indexOf('export function use'+name+'PurchaseOrder()'),end=s.indexOf('\n}',start)+2;if(start<0||end<2)throw Error(name);
  const action=name.toLowerCase()+'PurchaseOrder';
  const snippet=`export function use${name}PurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation<Awaited<ReturnType<typeof ${action}>>, QueryError, { id: string; organizationId: string; request?: PurchaseLifecycleRequest; reason?: string }>({
    mutationFn: async ({ id, organizationId, request${name==='Cancel'?', reason':''} }) => {
      const result = await ${action}(id, organizationId, ${name==='Cancel'?'reason, ':''}request);
      if (!result.success || !result.data) throw Object.assign(new Error(result.error || "Purchase-order decision was not confirmed"), { code: result.code });
      return result;
    },
    ...getBaseMutationOptions(queryClient),
  });
}`;
  s=s.slice(0,start)+snippet+s.slice(end);
 }
 s=s.replace('      newStatus: PurchaseOrderStatus;','      newStatus: PurchaseOrderStatus;\n      reviewedRequests?: Array<{ id: string; request: PurchaseLifecycleRequest }>;').replace('async ({ ids, organizationId, newStatus, reason })','async ({ ids, organizationId, newStatus, reason, reviewedRequests })').replace('        toStatus: newStatus,','        toStatus: newStatus,\n        reviewedRequests,');
 s=s.replace('  errors?: string[];','  errors?: string[];\n  archivedIds?: string[];');
 s=s.replace('const bulkDeletePurchaseOrders = async (\r\n  ids: string[],\r\n  organizationId: string,','const bulkDeletePurchaseOrders = async (\r\n  ids: string[],\r\n  organizationId: string,\r\n  reviewedRequests?: Array<{ id: string; request: PurchaseLifecycleRequest }>,');
 s=s.replace('    let deletedCount = 0;', '    if (!reviewedRequests || new Set(reviewedRequests.map(value => value.id)).size !== new Set(ids).size || ids.some(id => !reviewedRequests.some(value => value.id === id && value.request.kind === "archive"))) throw new Error("Review each selected archive request first.");\n    const archivedIds: string[] = [];\n    let deletedCount = 0;');
 s=s.replace('        await deletePurchaseOrder(id, organizationId);','        const result = await deletePurchaseOrder(id, organizationId, reviewedRequests.find(value => value.id === id)!.request);\n        if (!result.success || !result.data?.lifecycleReceipt.archived) throw new Error(result.error || "Archive was not confirmed");\n        archivedIds.push(id);');
 s=s.replace('      data: { deletedCount, failedCount, errors:', '      data: { deletedCount, failedCount, archivedIds, errors:');
 const a=s.indexOf('export function useBulkDeletePurchaseOrders()'),b=s.indexOf('\n}',a)+2;let part=s.slice(a,b);
 part=part.replace('{ ids: string[]; organizationId: string }','{ ids: string[]; organizationId: string; reviewedRequests?: Array<{ id: string; request: PurchaseLifecycleRequest }> }').replace('async ({ ids, organizationId })','async ({ ids, organizationId, reviewedRequests })').replace('return await bulkDeletePurchaseOrders(ids, organizationId);','const result = await bulkDeletePurchaseOrders(ids, organizationId, reviewedRequests);\n      if (!result.success) throw new Error(result.error || "Archive was not confirmed");\n      return result;').replace('variables.ids.forEach','(data.data.archivedIds ?? []).forEach').replace('        notify.success(','        const show = failedCount ? notify.warning : notify.success;\n        show(');
 s=s.slice(0,a)+part+s.slice(b);return s;
});
edit('components/purchase-orders/ModernPurchaseOrderDetailPage.tsx',s=>{const a=s.indexOf('  const handleComplete ='),b=s.indexOf('  if (isLoading)',a);if(a<0||b<0)throw Error('handler');return s.slice(0,a)+s.slice(b)});
