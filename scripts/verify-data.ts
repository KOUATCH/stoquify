import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyData() {
  console.log('🔍 Verifying database population...\n');

  try {
    // Check core entities
    const organizations = await prisma.organization.count();
    console.log(`📊 Organizations: ${organizations}`);

    const users = await prisma.user.count();
    console.log(`👥 Users: ${users}`);

    const locations = await prisma.location.count();
    console.log(`📍 Locations: ${locations}`);

    const categories = await prisma.category.count();
    console.log(`📂 Categories: ${categories}`);

    const brands = await prisma.brand.count();
    console.log(`🏷️  Brands: ${brands}`);

    const items = await prisma.item.count();
    console.log(`📦 Items: ${items}`);

    const suppliers = await prisma.supplier.count();
    console.log(`🏭 Suppliers: ${suppliers}`);

    const customers = await prisma.customer.count();
    console.log(`👥 Customers: ${customers}`);

    // Check business transactions
    const purchaseOrders = await prisma.purchaseOrder.count();
    console.log(`📋 Purchase Orders: ${purchaseOrders}`);

    const salesOrders = await prisma.salesOrder.count();
    console.log(`🛒 Sales Orders: ${salesOrders}`);

    const inventoryLevels = await prisma.inventoryLevel.count();
    console.log(`📊 Inventory Levels: ${inventoryLevels}`);

    // Check POS infrastructure
    const posStations = await prisma.pOSStation.count();
    console.log(`🏪 POS Stations: ${posStations}`);

    const cashDrawers = await prisma.cashDrawer.count();
    console.log(`💰 Cash Drawers: ${cashDrawers}`);

    // Check presence system
    const presenceSessions = await prisma.employeePresenceSession.count();
    console.log(`🕐 Presence Sessions: ${presenceSessions}`);

    const schedules = await prisma.employeeSchedule.count();
    console.log(`📅 Employee Schedules: ${schedules}`);

    // Check financial data
    const receivables = await prisma.accountsReceivable.count();
    console.log(`💳 Accounts Receivable: ${receivables}`);

    const payables = await prisma.accountsPayable.count();
    console.log(`📄 Accounts Payable: ${payables}`);

    // Check permissions and roles
    const permissions = await prisma.permission.count();
    console.log(`🔐 Permissions: ${permissions}`);

    const roles = await prisma.role.count();
    console.log(`👑 Roles: ${roles}`);

    // Sample user verification
    console.log('\n👤 Sample User Verification:');
    const sampleAdmin = await prisma.user.findFirst({
      where: { email: 'admin@company.com' },
      include: {
        organization: true,
        roles: true,
      }
    });

    if (sampleAdmin) {
      console.log(`✅ Admin user found: ${sampleAdmin.name}`);
      console.log(`   Organization: ${sampleAdmin.organization.name}`);
      console.log(`   Roles: ${sampleAdmin.roles.map(r => r.name).join(', ')}`);
    }

    // Sample item with realistic image
    console.log('\n📱 Sample Item Verification:');
    const sampleItem = await prisma.item.findFirst({
      where: { nameEn: { contains: 'iPhone' } },
      include: {
        categories: true,
        brands: true,
        units: true,
      }
    });

    if (sampleItem) {
      console.log(`✅ iPhone found: ${sampleItem.nameEn}`);
      console.log(`   Category: ${sampleItem.categories?.titleEn}`);
      console.log(`   Brand: ${sampleItem.brands?.brandName}`);
      console.log(`   Cost: $${sampleItem.costPrice}`);
      console.log(`   Price: $${sampleItem.sellingPrice}`);
      console.log(`   Image: ${sampleItem.imageUrls}`);
    }

    // Inventory verification
    console.log('\n📊 Inventory Verification:');
    const inventoryItems = await prisma.inventoryLevel.findMany({
      take: 5,
      include: {
        items: { select: { nameEn: true } },
        locations: { select: { name: true } }
      }
    });

    inventoryItems.forEach(inv => {
      console.log(`✅ ${inv.items.nameEn} at ${inv.locations.name}: ${inv.quantityOnHand} units`);
    });

    console.log('\n🎉 Database verification completed successfully!');
    console.log('\n🔐 Test Credentials:');
    console.log('Super Admin: admin@company.com / password123');
    console.log('Manager: manager@company.com / password123');
    console.log('Inventory: inventory@company.com / password123');
    console.log('Sales: john.smith@company.com / password123');
    console.log('Cashier: mike.johnson@company.com / password123');

    console.log('\n🌐 Access Points:');
    console.log('- Prisma Studio: http://localhost:5556');
    console.log('- Application: http://localhost:3000 (when started)');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyData();
