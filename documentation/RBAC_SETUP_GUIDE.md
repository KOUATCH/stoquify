# 🔐 StockFlow RBAC System Setup Guide

## 🚀 Quick Start

### 1. Seed the Database
Run the following command to create the super admin user and demo accounts:

```bash
npm run seed
```

### 2. Test Credentials

#### 🔐 **Super Administrator** (Full Access)
- **Email:** `admin@stockflow.demo`
- **Password:** `SuperAdmin123!`
- **Permissions:** All permissions (Complete system access)

#### 👥 **Demo Users** (Different Role Levels)

**📊 Manager**
- **Email:** `manager@stockflow.demo`
- **Password:** `Manager123!`
- **Access:** Operational management, inventory, sales, reporting

**👤 Employee**
- **Email:** `employee@stockflow.demo`
- **Password:** `Employee123!`
- **Access:** Basic operations, sales processing

**💰 Cashier**
- **Email:** `cashier@stockflow.demo`
- **Password:** `Cashier123!`
- **Access:** POS operations only

**👁️ Viewer**
- **Email:** `viewer@stockflow.demo`
- **Password:** `Viewer123!`
- **Access:** Read-only access to reports and data

## 🎯 Testing the RBAC System

### 1. Login & Navigation Test
1. Visit `http://localhost:3000/login`
2. Login with different user accounts
3. Notice how navigation changes based on permissions
4. Try accessing restricted routes

### 2. Admin Panel Access
1. Login as super admin (`admin@stockflow.demo`)
2. Navigate to `/dashboard/admin`
3. Test user and role management features

### 3. Permission Testing
1. Login as different users
2. Try accessing:
   - `/dashboard/admin` (Admin only)
   - `/dashboard/users` (User management permission)
   - `/dashboard/roles` (Role management permission)
   - `/dashboard/inventory` (Inventory permissions)

### 4. User Management Testing
1. Login as super admin
2. Go to Admin Panel → User Management
3. Test:
   - Inviting new users
   - Assigning/removing roles
   - Activating/deactivating users
   - Editing user profiles

### 5. Role Management Testing
1. Login as super admin
2. Go to Admin Panel → Role Management
3. Test:
   - Creating custom roles
   - Using role templates
   - Managing permissions
   - Deleting roles

## 🔒 Security Features Verified

✅ **Route Protection**: Unauthorized users are redirected
✅ **UI Component Gating**: Features hidden based on permissions
✅ **Hierarchical Access**: Admins can't modify super admins
✅ **Organization Isolation**: Users only see their org data
✅ **Self-Protection**: Users can't deactivate themselves
✅ **Last Admin Protection**: Prevents removing last admin

## 🎨 UI Features to Test

✅ **Permission-based Navigation**: Menu items appear/disappear
✅ **Dynamic Button States**: Actions enabled/disabled by permission
✅ **Role Templates**: Quick role creation with predefined permissions
✅ **Bulk Permission Management**: Group permissions by category
✅ **Real-time Updates**: Changes reflect immediately
✅ **Toast Notifications**: User feedback for all actions

## 📱 Available Routes

### Public Routes
- `/login` - Login page
- `/register` - Registration page
- `/forgot-password` - Password reset

### Protected Routes (Permission-based)
- `/dashboard` - Main dashboard (any authenticated user)
- `/dashboard/admin` - Admin panel (READ_USERS or READ_ROLES)
- `/dashboard/users` - User management (READ_USERS)
- `/dashboard/roles` - Role management (READ_ROLES)
- `/dashboard/inventory` - Inventory (READ_ITEMS)
- `/dashboard/reports` - Reports (VIEW_*_REPORTS)

## 🛠️ Commands

```bash
# Seed database with test data
npm run seed

# Reset database and re-seed
npm run reset

# Start development server
npm run dev

# Run linting
npm run lint
```

## 🏗️ Architecture Overview

### Permission System
- **40+ Granular Permissions** covering all business operations
- **7 Predefined Roles** with hierarchical structure
- **Permission Groups** for organized management
- **Template System** for quick role creation

### Security Layers
1. **Middleware Protection** - Route-level access control
2. **API Action Guards** - Server-side permission checking
3. **UI Component Gates** - Client-side conditional rendering
4. **Database Constraints** - Organization-level data isolation

### User Experience
- **Progressive Disclosure** - Show only relevant features
- **Context-aware UI** - Buttons/menus adapt to permissions
- **Seamless Navigation** - No broken links or dead ends
- **Informative Feedback** - Clear error messages and success states

## 🎉 Ready to Go!

Your StockFlow RBAC system is now fully configured and ready for testing. Login with the super admin account to start exploring the comprehensive user and role management features!

**Next Steps:**
1. Run `npm run seed` to create test accounts
2. Start the development server with `npm run dev`
3. Visit `http://localhost:3000/login`
4. Login with `admin@stockflow.demo` / `SuperAdmin123!`
5. Explore the Admin Panel at `/dashboard/admin`