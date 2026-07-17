# Database Seeding Instructions

## Quick Start

To seed your database with comprehensive test data, follow these steps:

### Option 1: Use the Simple Seed (Recommended for Testing)

```bash
# Run the simplified seed file
npx ts-node prisma/seed-simple.ts
```

### Option 2: Use Package.json Script

First, update your `package.json` to use the simple seed:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed-simple.ts"
  }
}
```

Then run:

```bash
npm run seed
```

### Option 3: Direct TypeScript Execution

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-simple.ts
```

## What Gets Created

The simple seed creates:

- **3 Organizations** with realistic company data
- **45 Users** (15 per organization) with hashed passwords
- **150 Items** (50 per organization) with complete product details
- **90 Customers** (30 per organization)
- **30 Suppliers** (10 per organization)
- **Item-Supplier relationships** for realistic business connections
- **Categories, Brands, Units, Tax Rates** for complete inventory management

## Test Login

After seeding, you can log in with any user:
- **Password**: `password123` (for all users)
- **Email**: Check the database for user emails

```sql
SELECT email, name FROM users LIMIT 10;
```

## Troubleshooting

If you encounter TypeScript errors with the main seed file, use the simplified version which has been tested to work with your current schema.

The main `seed.ts` file includes enterprise RBAC features but may need schema adjustments to work perfectly with your current database structure.