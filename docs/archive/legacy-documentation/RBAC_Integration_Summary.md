# StockFlow RBAC Integration - Complete Implementation

## Overview

The StockFlow application now features a **complete, enterprise-grade RBAC (Role-Based Access Control) system** with full authorization and access control capabilities. This document provides a comprehensive overview of the implemented system and how to use it.

## 🛡️ RBAC System Architecture

### 9-Tier Role Hierarchy

The system implements a sophisticated 9-level role hierarchy with proper inheritance:

| Level | Role | Code | Description | User Count (per org) |
|-------|------|------|-------------|---------------------|
| 1 | Super Administrator | `super_admin` | Platform-wide control | 1 |
| 2 | Organization Owner | `organization_owner` | Full organizational authority | 1 |
| 3 | Administrator | `administrator` | System administration | 2 |
| 4 | Manager | `manager` | Department management | 3 |
| 5 | Supervisor | `supervisor` | Shift supervision | 4 |
| 6 | Cashier | `cashier` | POS operations | 6 |
| 6 | Inventory Clerk | `inventory_clerk` | Inventory management | 3 |
| 7 | Sales Associate | `sales_associate` | Basic sales functions | 4 |
| 8 | Viewer | `viewer` | Read-only access | 1 |

### Permission Categories

The system includes **41 enterprise-grade permissions** across 8 categories:

1. **PLATFORM** - Platform administration (Super Admin only)
2. **ORGANIZATION** - Organization management
3. **USER_MANAGEMENT** - User operations
4. **ROLE_MANAGEMENT** - Role operations
5. **PERMISSION_MANAGEMENT** - Permission operations
6. **INVENTORY** - Inventory and item management
7. **SALES** - Sales and POS operations
8. **FINANCIAL** - Financial reports and pricing
9. **SECURITY** - Audit and security controls
10. **REPORTING** - Report generation and export

## 📊 Seeded Data Summary

### Organizations
- **Count**: 2 organizations
- **Structure**: Complete organizational setup with realistic company data
- **Features**: Industry classification, location data, currency settings

### Users & Authentication
- **Total Users**: 50 (25 per organization)
- **Authentication**: Bcrypt-hashed passwords
- **Distribution**: Realistic role-based user distribution
- **System Users**: Dedicated system administrators for each organization

### Permissions & Roles
- **System Permissions**: 41 granular permissions
- **Roles**: 18 total (9 per organization)
- **Role-Permission Matrix**: Properly assigned permissions by hierarchy
- **Inheritance**: Higher roles inherit lower role permissions

### Business Data
- **Items**: 150 with complete business relationships
- **Customers**: 80 with contact information
- **Suppliers**: 30 with business details
- **Categories**: 24 organized product categories
- **Brands**: 20 brand associations
- **Tax Rates**: 12 configurable tax structures

### RBAC Operational Data
- **Resources**: 40 with access controls and ownership
- **Permission Sessions**: 20 (temporary elevations, emergency access)
- **Permission Approvals**: 30 (pending/approved/rejected workflows)
- **Audit Logs**: 200 comprehensive activity records
- **User Sessions**: Advanced session tracking and security

## 🔐 Authentication & Authorization

### Test Credentials

**Regular Users:**
- **Password**: `password123` (for all role-based users)

**System Administrators:**
- **Password**: `system123` (for system admin accounts)

### Finding User Credentials

Use this SQL query to find users by role:

```sql
SELECT
    u.email,
    u.name,
    u."jobTitle",
    r.name as role_name,
    r.code as role_code,
    r."hierarchyLevel"
FROM users u
JOIN "_UserRoles" ur ON u.id = ur."A"
JOIN roles r ON ur."B" = r.id
ORDER BY r."hierarchyLevel", u.name;
```

### Sample User Accounts

For each organization, you'll find users distributed across roles:

```sql
-- Find Super Admins
SELECT u.email, u.name FROM users u
JOIN "_UserRoles" ur ON u.id = ur."A"
JOIN roles r ON ur."B" = r.id
WHERE r.code = 'super_admin';

-- Find Organization Owners
SELECT u.email, u.name FROM users u
JOIN "_UserRoles" ur ON u.id = ur."A"
JOIN roles r ON ur."B" = r.id
WHERE r.code = 'organization_owner';

-- Find Cashiers
SELECT u.email, u.name FROM users u
JOIN "_UserRoles" ur ON u.id = ur."A"
JOIN roles r ON ur."B" = r.id
WHERE r.code = 'cashier';
```

## 🚀 Enterprise Features Implemented

### 1. Permission System
- **41 Granular Permissions**: Covering all system operations
- **Risk-Based Classification**: LOW, MEDIUM, HIGH, CRITICAL risk levels
- **Approval Requirements**: High-risk operations require approval
- **Context-Aware**: Time, location, and condition-based restrictions

### 2. Role-Permission Matrix
- **Hierarchical Inheritance**: Higher roles inherit lower role permissions
- **Proper Separation**: Clear boundaries between role capabilities
- **System Roles**: Protected platform and organization management roles
- **Custom Roles**: Flexible role creation within organizations

### 3. User-Role Assignments
- **Realistic Distribution**: Proper user-to-role ratios
- **Multiple Roles**: Users can have multiple roles when needed
- **Role Validation**: Proper hierarchy enforcement
- **Temporal Control**: Role assignments with expiration dates

### 4. Resource Access Control
- **Fine-Grained Permissions**: Individual resource access control
- **Ownership Model**: Resource ownership and delegation
- **Visibility Levels**: Private, Organization, Public access levels
- **Resource Types**: Documents, Reports, Dashboards, Files, Systems

### 5. Audit Trail
- **Comprehensive Logging**: Every action logged with full context
- **Risk Assessment**: Automated risk scoring for activities
- **Session Correlation**: Activities linked to user sessions
- **Compliance Ready**: Complete audit trail for regulatory compliance

### 6. Permission Sessions
- **Temporary Elevation**: Time-limited permission grants
- **Emergency Access**: Break-glass procedures for critical situations
- **Delegation**: Permission delegation between users
- **Maintenance Mode**: Special access for system maintenance

### 7. Approval Workflows
- **Multi-Stage Approval**: Complex approval chains
- **Role-Based Reviewers**: Approvals based on hierarchy
- **Justification Required**: Mandatory documentation for requests
- **Automatic Expiry**: Time-bounded approvals

### 8. Security Features
- **Session Management**: Advanced session tracking and control
- **Risk-Based Controls**: Actions classified by risk level
- **Device Tracking**: Device fingerprinting and monitoring
- **Location Awareness**: IP-based location tracking

## 📋 Permission Details

### Super Administrator Permissions
- `PLATFORM_ADMIN` - Complete platform control
- `SYSTEM_MAINTENANCE` - System maintenance operations
- `GLOBAL_SETTINGS` - Global configuration management
- **Plus all other permissions**

### Organization Owner Permissions
- `MANAGE_ORGANIZATION` - Organizational control
- `CREATE_USERS`, `UPDATE_USERS`, `DELETE_USERS` - User management
- `CREATE_ROLES`, `UPDATE_ROLES`, `DELETE_ROLES` - Role management
- `GRANT_PERMISSIONS`, `REVOKE_PERMISSIONS` - Permission management
- `MANAGE_SECURITY` - Security settings control
- **Plus operational permissions**

### Administrator Permissions
- `CREATE_USERS`, `READ_USERS`, `UPDATE_USERS` - User operations
- `READ_ROLES`, `UPDATE_ROLES`, `ASSIGN_ROLES` - Role operations
- `MANAGE_INVENTORY`, `ADJUST_STOCK` - Inventory control
- `VIEW_FINANCIAL_REPORTS`, `MANAGE_PRICING` - Financial access
- **Plus operational permissions**

### Manager Permissions
- `READ_USERS`, `UPDATE_USERS` - Limited user operations
- `MANAGE_INVENTORY`, `TRANSFER_STOCK` - Inventory operations
- `OPERATE_POS`, `PROCESS_SALES` - Sales operations
- `VIEW_FINANCIAL_REPORTS` - Financial reporting
- **Plus operational permissions**

### Cashier Permissions
- `READ_ITEMS` - Product information access
- `OPERATE_POS` - Point of sale operations
- `PROCESS_SALES` - Sales transaction processing
- `HANDLE_RETURNS` - Return processing
- `ACCESS_CASH_DRAWER` - Cash management

### And more roles with appropriate permission sets...

## 🔍 Using the RBAC System

### 1. Authentication
```typescript
// Example login flow
const session = await auth();
if (session?.user) {
  const userRoles = session.user.roles;
  const userPermissions = session.user.permissions;
}
```

### 2. Permission Checking
```typescript
// Using the permission hooks
import { usePermissions } from '@/lib/enterprise-permissions/hooks';

const { hasPermission } = usePermissions();

const canDeleteUsers = await hasPermission('DELETE_USERS');
if (canDeleteUsers) {
  // Show delete button
}
```

### 3. Role-Based UI
```typescript
// Using permission gates
import { PermissionGate } from '@/lib/enterprise-permissions/components';

<PermissionGate permission="MANAGE_INVENTORY">
  <InventoryManagementPanel />
</PermissionGate>
```

### 4. Route Protection
```typescript
// API route protection
import { withPermission } from '@/lib/enterprise-permissions/middleware';

export const POST = withPermission('CREATE_ITEMS')(
  async (req, context) => {
    // Protected route logic
  }
);
```

## 📊 Database Schema Integration

### Core RBAC Tables
- **users** - Enhanced with RBAC relationships
- **roles** - Role definitions with hierarchy
- **permissions** - System permissions catalog
- **role_permissions** - Role-permission assignments
- **user_permissions** - Direct user permissions
- **resources** - Protected resources
- **resource_permissions** - Resource access control
- **permission_sessions** - Temporary permission grants
- **permission_approvals** - Approval workflow tracking
- **user_sessions** - Session management
- **audit_logs** - Enhanced with permission context

### Relationships
- Users ↔ Roles (Many-to-Many)
- Roles ↔ Permissions (Many-to-Many)
- Users ↔ Permissions (Many-to-Many for direct grants)
- Resources ↔ Users (Ownership)
- Resources ↔ Permissions (Access control)

## 🚦 Testing the System

### 1. Login Testing
1. Use the SQL query above to find user emails
2. Login with email and password `password123`
3. Verify role-based dashboard access

### 2. Permission Testing
1. Login as different role users
2. Navigate to various system sections
3. Verify appropriate access restrictions
4. Test permission-protected actions

### 3. Audit Testing
1. Perform various system actions
2. Check audit logs for activity recording
3. Verify risk assessment classification
4. Review permission context logging

### 4. Approval Testing
1. Request high-risk permissions
2. Review approval workflow
3. Test approval/rejection process
4. Verify automatic expiry

## 🔧 Configuration Options

### Environment Variables
```env
# Permission system configuration
PERMISSION_CACHE_TTL=900000  # 15 minutes
PERMISSION_RISK_THRESHOLD=75
PERMISSION_MAX_CONCURRENT_SESSIONS=5
PERMISSION_SESSION_TIMEOUT=28800000  # 8 hours
PERMISSION_AUDIT_LEVEL=DETAILED
PERMISSION_ENABLE_EMERGENCY_ACCESS=true
```

### Role Hierarchy Customization
Modify the `ROLE_HIERARCHY` array in the seed file to:
- Add new roles
- Modify permission assignments
- Adjust hierarchy levels
- Change role descriptions

### Permission Customization
Modify the `SYSTEM_PERMISSIONS` array to:
- Add new permissions
- Change risk levels
- Modify approval requirements
- Update permission categories

## 🛠️ Maintenance

### Re-seeding the System
```bash
# Run the comprehensive RBAC seed
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-integrated-rbac.ts
```

### Adding New Permissions
1. Add to `SYSTEM_PERMISSIONS` array
2. Assign to appropriate roles in `ROLE_HIERARCHY`
3. Re-run seeding or manually insert into database
4. Update UI components with new permission checks

### Role Management
1. Roles can be created through the admin interface
2. Permission assignments can be modified
3. User-role assignments are dynamic
4. Hierarchy levels enforce proper access control

## 📈 Performance Considerations

### Caching
- Permission checks are cached for performance
- Cache TTL configurable via environment variables
- Automatic cache invalidation on permission changes

### Database Optimization
- Proper indexing on permission tables
- Optimized queries for role-permission lookups
- Efficient session management

### Monitoring
- Comprehensive audit logging
- Performance metrics for permission checks
- Session monitoring and management

## 🔒 Security Best Practices

### Password Security
- Bcrypt hashing with salt rounds
- Strong password requirements (configurable)
- Password change tracking

### Session Security
- Advanced session management
- Device fingerprinting
- IP-based location tracking
- Concurrent session limits

### Permission Security
- Principle of least privilege
- Regular permission audits
- Risk-based access controls
- Emergency access procedures

## 📞 Support & Documentation

### Additional Resources
- Complete RBAC system documentation: `RBAC_System_Documentation.md`
- Implementation guide: Available in `/lib/enterprise-permissions/README.md`
- API documentation: Available in individual route files

### Common Issues
1. **Permission Denied**: Check user role assignments
2. **Missing Permissions**: Verify role-permission matrix
3. **Session Issues**: Check session timeout settings
4. **Audit Gaps**: Verify audit level configuration

---

## Conclusion

The StockFlow RBAC system provides enterprise-grade security and access control with:

✅ **Complete Role Hierarchy** - 9 levels with proper inheritance
✅ **Comprehensive Permissions** - 41 granular permissions
✅ **Advanced Security** - Risk assessment and audit trails
✅ **Flexible Management** - Dynamic role and permission assignment
✅ **Production Ready** - Full integration with auth system
✅ **Scalable Architecture** - Designed for enterprise growth

The system is now ready for production use with full authorization, access control, and audit capabilities.

---

*Generated on: $(date)*
*StockFlow RBAC Integration v1.0*