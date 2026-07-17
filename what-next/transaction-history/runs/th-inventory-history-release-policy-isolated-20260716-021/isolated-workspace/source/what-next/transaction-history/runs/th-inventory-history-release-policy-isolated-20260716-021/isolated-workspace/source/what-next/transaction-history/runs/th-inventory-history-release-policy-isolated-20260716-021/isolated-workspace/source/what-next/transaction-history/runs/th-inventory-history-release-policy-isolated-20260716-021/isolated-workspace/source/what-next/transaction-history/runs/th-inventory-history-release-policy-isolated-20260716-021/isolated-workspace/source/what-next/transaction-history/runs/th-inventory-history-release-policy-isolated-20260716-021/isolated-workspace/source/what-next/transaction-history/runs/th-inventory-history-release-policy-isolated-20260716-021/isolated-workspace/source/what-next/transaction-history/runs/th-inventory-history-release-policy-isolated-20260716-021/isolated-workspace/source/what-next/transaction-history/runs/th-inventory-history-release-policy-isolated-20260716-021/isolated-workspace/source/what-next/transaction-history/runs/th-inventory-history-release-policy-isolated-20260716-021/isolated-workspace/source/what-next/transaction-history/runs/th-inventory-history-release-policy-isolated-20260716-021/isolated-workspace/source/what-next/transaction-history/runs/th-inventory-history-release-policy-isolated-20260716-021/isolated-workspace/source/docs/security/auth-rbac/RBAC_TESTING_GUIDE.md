# RBAC Testing Guide for StockFlow

## Overview
This guide helps you test the Role-Based Access Control (RBAC) system with the seeded test data. The system now includes 15 test users across 6 different roles with varying permission levels.

## Test Data Summary

### Organization
- **Name**: StockFlow Test Company
- **Roles**: 6 different roles with hierarchical permissions
- **Users**: 15 test users with realistic permission distributions
- **Password**: `password123` (for all users)

### User Roles and Test Accounts

#### 1. Super Administrator (1 user)
- **Email**: `superadmin1@test.com`
- **Permissions**: Full system access (1 permission: `*` wildcard)
- **Access Level**: Complete administrative control - can access everything

#### 2. Administrator (2 users)
- **Emails**: `admin1@test.com`, `admin2@test.com`
- **Permissions**: Administrative access to most features (47 permissions)
- **Access Level**: Can manage users, roles, and system settings

#### 3. Manager (3 users)
- **Emails**: `manager1@test.com`, `manager2@test.com`, `manager3@test.com`
- **Permissions**: Management level operations (29 permissions)
- **Access Level**: Inventory, sales, customers, financial reports

#### 4. Supervisor (3 users)
- **Emails**: `supervisor1@test.com`, `supervisor2@test.com`, `supervisor3@test.com`
- **Permissions**: Supervisory access (20 permissions)
- **Access Level**: Limited inventory management, sales, basic reporting

#### 5. Cashier (4 users)
- **Emails**: `cashier1@test.com`, `cashier2@test.com`, `cashier3@test.com`, `cashier4@test.com`
- **Permissions**: POS and sales operations (7 permissions)
- **Access Level**: Point of sale, basic customer management

#### 6. Inventory Clerk (2 users)
- **Emails**: `inventoryclerk1@test.com`, `inventoryclerk2@test.com`
- **Permissions**: Inventory management (10 permissions)
- **Access Level**: Items, stock, transfers, adjustments

## Testing Scenarios

### 1. Authentication Testing
```bash
# Test login with different roles
1. Login with superadmin1@test.com
2. Login with cashier1@test.com
3. Login with inventoryclerk1@test.com
```

### 2. Authorization Testing by Role

#### Super Administrator Tests
- ✅ Should access all dashboard features
- ✅ Should manage users and roles
- ✅ Should access all reports
- ✅ Should manage organization settings

#### Manager Tests
- ✅ Should access inventory management
- ✅ Should view financial reports
- ✅ Should manage customers
- ❌ Should NOT create/delete users
- ❌ Should NOT manage roles

#### Cashier Tests
- ✅ Should access POS system
- ✅ Should process sales
- ✅ Should view basic customer info
- ❌ Should NOT access inventory management
- ❌ Should NOT view financial reports
- ❌ Should NOT manage users

#### Inventory Clerk Tests
- ✅ Should create/update items
- ✅ Should adjust stock levels
- ✅ Should transfer inventory
- ❌ Should NOT access POS system
- ❌ Should NOT view financial reports
- ❌ Should NOT manage customers

### 3. Feature-Specific Permission Tests

#### Dashboard Access
```
Super Admin: Full dashboard
Manager: Operational dashboard
Cashier: Sales dashboard only
Inventory Clerk: Inventory dashboard only
```

#### User Management
```
Super Admin: ✅ Create, Read, Update, Delete users
Administrator: ✅ Create, Read, Update users
Manager: ✅ Read users only
Others: ❌ No access
```

#### Inventory Management
```
Super Admin: ✅ Full access
Administrator: ✅ Full access
Manager: ✅ Full access
Supervisor: ✅ Read, Update limited
Inventory Clerk: ✅ Create, Read, Update items
Cashier: ✅ Read items only
```

#### Financial Reports
```
Super Admin: ✅ All financial reports
Administrator: ✅ All financial reports
Manager: ✅ View financial reports
Others: ❌ No access
```

### 4. UI/UX Permission Testing

#### Navigation Menu
- Different roles should see different menu items
- Restricted features should be hidden or disabled

#### Page Access
- Direct URL access to restricted pages should redirect
- Proper error messages for unauthorized access

#### Form Controls
- Edit/Delete buttons should be hidden for read-only users
- Action buttons should reflect user permissions

### 5. API Permission Testing

Test API endpoints with different user tokens:

#### User Management APIs
```bash
# Should work for Super Admin/Admin only
GET /api/users
POST /api/users
PUT /api/users/:id
DELETE /api/users/:id
```

#### Inventory APIs
```bash
# Should work for Super Admin/Admin/Manager/Inventory Clerk
GET /api/items
POST /api/items
PUT /api/items/:id

# Should work for most roles (read-only for Cashier)
GET /api/inventory/levels
```

#### Sales APIs
```bash
# Should work for Super Admin/Admin/Manager/Supervisor/Cashier
POST /api/sales
GET /api/sales

# Should be restricted for Inventory Clerk
DELETE /api/sales/:id
```

## Testing Commands

### Database Inspection
```sql
-- View users and their roles
SELECT u.email, u.name, u."jobTitle", r.name as role_name, r.code as role_code
FROM users u
JOIN "_UserRoles" ur ON u.id = ur."A"
JOIN roles r ON ur."B" = r.id
ORDER BY r.code, u.name;

-- View role permissions
SELECT r.name, r.code, array_length(r.permissions, 1) as permission_count
FROM roles r
ORDER BY array_length(r.permissions, 1) DESC;

-- Check specific user permissions
SELECT u.email, r.name as role, r.permissions
FROM users u
JOIN "_UserRoles" ur ON u.id = ur."A"
JOIN roles r ON ur."B" = r.id
WHERE u.email = 'cashier1@test.com';
```

### Manual Testing Checklist

#### Login and Access
- [ ] Login with each role type
- [ ] Verify dashboard content varies by role
- [ ] Check navigation menu reflects permissions

#### Permission Boundaries
- [ ] Cashier cannot access user management
- [ ] Inventory Clerk cannot access financial reports
- [ ] Manager cannot delete users
- [ ] Supervisor has limited inventory access

#### Error Handling
- [ ] Proper error messages for unauthorized access
- [ ] Graceful handling of permission-denied scenarios
- [ ] Redirect to appropriate pages after failed access

#### Data Security
- [ ] Users can only see data from their organization
- [ ] Role permissions are enforced at API level
- [ ] Sensitive operations require higher privileges

## Troubleshooting

### Common Issues
1. **Users not seeing expected permissions**: Check role assignment in database
2. **Permission errors in UI**: Verify permission checking logic in components
3. **API access denied**: Check authentication middleware and permission validation

### Debug Commands
```bash
# Re-run seeding if needed
npx tsx prisma/rbac-test-seed.ts

# Check database with Prisma Studio
npx prisma studio

# View current permissions configuration
cat config/permissions.ts
```

## Next Steps
1. Test each role systematically
2. Verify permission boundaries are enforced
3. Check UI/UX reflects role permissions
4. Validate API security with different user tokens
5. Test edge cases and error scenarios

## Expected Results
After testing, you should confirm:
- ✅ Users can only access features allowed by their role
- ✅ UI elements are hidden/shown based on permissions
- ✅ API endpoints enforce role-based restrictions
- ✅ Error handling is appropriate for unauthorized access
- ✅ Role hierarchy is properly implemented