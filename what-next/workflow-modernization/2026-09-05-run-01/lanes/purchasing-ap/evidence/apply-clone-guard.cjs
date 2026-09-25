const fs=require("node:fs");
const file="services/purchase-order/purchase-order.service.ts";
const raw=fs.readFileSync(file,"utf8");
const anchor='    await assertModuleNewWorkInTx(tx, { organizationId: input.organizationId, moduleSlug: "purchasing", operation: "purchasing.order.clone" })';
if(!raw.includes(anchor))throw new Error("Clone admission anchor missing");
const validation=`
    // A clone is new work: inherited and overridden references must belong to
    // the current tenant and remain selectable, just like the active form catalogue.
    const supplierId = overrides.supplierId ?? source.supplierId
    const locationId = overrides.locationId ?? source.locationId
    const itemIds = [...new Set(source.lines.map((line) => line.itemId))]
    const [supplier, location, items] = await Promise.all([
      tx.supplier.findFirst({ where: { id: supplierId, organizationId: input.organizationId, isActive: true, deletedAt: null }, select: { id: true } }),
      tx.location.findFirst({ where: { id: locationId, organizationId: input.organizationId, isActive: true, deletedAt: null }, select: { id: true } }),
      tx.item.findMany({ where: { id: { in: itemIds }, organizationId: input.organizationId, isActive: true, deletedAt: null }, select: { id: true } }),
    ])
    if (!supplier) throw new NotFoundError("Supplier is unavailable for a new purchase order in this organisation.")
    if (!location) throw new NotFoundError("Delivery location is unavailable for a new purchase order in this organisation.")
    if (items.length !== itemIds.length) throw new NotFoundError("One or more items are unavailable for a new purchase order in this organisation.")
`;
fs.writeFileSync(file,raw.replace(anchor,anchor+"\n"+validation));
