# Database Seeding Guide

This guide explains how to seed your StockFlow database with comprehensive, realistic test data using the Faker library.

## Overview

The seed file creates:
- **5 Organizations** with complete business data
- **20 Users per organization** with realistic profiles and roles
- **8 Roles per organization** with proper hierarchy (Platform Admin → Sales Associate)
- **85+ System Permissions** with risk levels and approval workflows
- **100 Items per organization** with categories, brands, suppliers
- **50 Customers per organization** with purchase history
- **500+ Audit logs per organization** for compliance testing
- **200+ Inventory movements per organization** for stock tracking
- **Comprehensive permission system data** including sessions, approvals, and resource access

## Total Data Generated

- 📊 **Organizations**: 5
- 👥 **Users**: 100 (20 per org)
- 🛡️ **Roles**: 40 (8 per org)
- 🔑 **Permissions**: 85+ system-wide
- 📦 **Items**: 500 (100 per org)
- 🏪 **Customers**: 250 (50 per org)
- 📋 **Audit Logs**: 2,500+ (500+ per org)
- 🔄 **Inventory Movements**: 1,000+ (200+ per org)
- 🏢 **Suppliers**: 75 (15 per org)
- 📂 **Categories**: 75 (15 per org)
- 🏷️ **Brands**: 60 (12 per org)
- 📏 **Units**: 50 (10 per org)
- 📍 **Locations**: 40 (8 per org)
- 💰 **Tax Rates**: 40 (8 per org)

## Prerequisites

1. **Database Setup**: Ensure your PostgreSQL database is running and accessible
2. **Environment Variables**: Configure your `.env` file with proper `DATABASE_URL`
3. **Migrations**: Run the enterprise permissions migration first

## Step-by-Step Instructions

### 1. Run Database Migration

First, apply the enterprise permissions migration:

```bash
# Apply the enterprise permissions migration
psql -d your_database_name -f prisma/migrations/add_enterprise_permissions.sql

# Or use Prisma migrate (if you have migrations set up)
npx prisma db push
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Run the Seed Script

```bash
# Option 1: Using npm script
npm run seed

# Option 2: Direct execution
npx prisma db seed

# Option 3: Reset database and seed fresh
npm run reset
```

### 4. Verify Seeding

Check if data was created successfully:

```sql
-- Check organizations
SELECT COUNT(*) FROM organisations;

-- Check users
SELECT COUNT(*) FROM users;

-- Check permissions
SELECT COUNT(*) FROM permissions;

-- Check roles
SELECT COUNT(*) FROM roles;

-- Check items
SELECT COUNT(*) FROM items;

-- Check audit logs
SELECT COUNT(*) FROM audit_logs;
```

## Test Credentials

After seeding, you can log in with any of the generated users:

- **Email**: Any email from the seeded users (check database)
- **Password**: `password123` (for all seeded users)

To find user emails:
```sql
SELECT email, "firstName", "lastName" FROM users LIMIT 10;
```

## Seed Data Features

### 🏢 Organizations
- Realistic company names using Faker
- Complete contact information
- Tax registration numbers
- Active status flags

### 👥 Users
- Realistic names, emails, and phone numbers
- Proper password hashing (Argon2id)
- Role assignments (1-3 roles per user)
- Permission context and risk profiles
- Session configuration settings

### 🛡️ Enterprise RBAC System
- **7-Level Role Hierarchy**:
  1. Platform Administrator (Level 1) - Full system access
  2. Organization Owner (Level 2) - Organization-wide control
  3. Administrator (Level 3) - Administrative privileges
  4. Manager (Level 4) - Management functions
  5. Supervisor (Level 5) - Supervisory access
  6. Cashier/Inventory Clerk (Level 6) - Operational access
  7. Sales Associate (Level 7) - Basic sales functions

- **Permission Distribution**:
  - Platform Admin: 100% of permissions
  - Organization Owner: 90% of permissions
  - Administrator: 70% of permissions
  - Manager: 50% of permissions
  - Supervisor: 30% of permissions
  - Operational roles: 10-20% of permissions

### 📦 Business Data
- **Items**: Complete product catalog with SKUs, barcodes, pricing
- **Categories**: Organized product categorization
- **Brands**: Realistic brand names and descriptions
- **Suppliers**: Complete supplier profiles with payment terms
- **Customers**: Realistic customer profiles with purchase history
- **Inventory**: Stock movements, adjustments, and transfers

### 🔐 Security & Audit Data
- **Audit Logs**: Comprehensive activity tracking with risk assessment
- **User Sessions**: Device tracking and security monitoring
- **Permission Sessions**: Emergency access and temporary elevations
- **Approval Workflows**: Multi-stage approval processes
- **Risk Assessment**: Automated risk scoring for all activities

## Data Relationships

The seed data maintains proper relationships:
- Users → Organizations → Roles → Permissions
- Items → Categories → Brands → Units → Suppliers
- Inventory → Items → Locations → Users
- Audit Logs → Users → Resources → Permissions
- Sessions → Users → Permissions → Risk Profiles

## Customization

You can customize the seed configuration by modifying the `SEED_CONFIG` object in `seed.ts`:

```typescript
const SEED_CONFIG = {
  organizations: 5,        // Number of organizations
  usersPerOrg: 20,        // Users per organization
  itemsPerOrg: 100,       // Items per organization
  customersPerOrg: 50,    // Customers per organization
  auditLogsPerOrg: 500,   // Audit logs per organization
  // ... more configuration options
};
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   ```
   Solution: Check your DATABASE_URL in .env file
   ```

2. **Migration Not Applied**
   ```
   Solution: Run the enterprise permissions migration first
   ```

3. **Permission Denied**
   ```
   Solution: Ensure your database user has CREATE, INSERT permissions
   ```

4. **Seed Script Fails**
   ```
   Solution: Check console output for specific errors
   Clear existing data: npm run reset
   ```

### Debug Mode

To see detailed logging during seeding, check the console output. The seed script provides:
- Progress indicators for each data type
- Completion confirmations
- Error details if something fails
- Final summary with counts

## Performance Notes

- **Seeding Time**: Approximately 2-5 minutes depending on hardware
- **Database Size**: ~50MB for all seeded data
- **Memory Usage**: ~200MB during seeding process
- **CPU Usage**: Moderate during data generation

## Security Considerations

- All seeded passwords use Argon2id hashing
- Permission assignments follow least-privilege principles
- Risk assessments are properly configured
- Audit trails are comprehensive
- Session security is enforced

## Next Steps

After seeding:

1. **Test Login**: Use any seeded user credentials
2. **Explore RBAC**: Check permission management UI
3. **Review Data**: Browse inventory, customers, and reports
4. **Test Workflows**: Try various business processes
5. **Audit Review**: Check audit logs and security features

## Data Cleanup

To clean all seeded data:

```bash
# Reset database completely
npm run reset

# Or manually clean specific tables
npx prisma db push --force-reset
```

---

**Note**: This is test data for development and testing purposes only. Do not use in production environments without proper data sanitization and security review.
