# Enterprise RBAC System - Complete Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Core Components](#core-components)
5. [API Endpoints](#api-endpoints)
6. [React Hooks](#react-hooks)
7. [UI Components](#ui-components)
8. [Server Actions](#server-actions)
9. [Middleware & Guards](#middleware--guards)
10. [Security Features](#security-features)
11. [Integration Guide](#integration-guide)
12. [Best Practices](#best-practices)

---

## System Overview

The StockFlow Enterprise RBAC (Role-Based Access Control) system is a comprehensive, scalable, and secure authorization framework designed for enterprise-level applications. It provides granular permission control, hierarchical role management, resource-level security, and advanced audit capabilities.

### Key Features
- **Hierarchical Role Management** - 7-level role hierarchy with inheritance
- **Granular Permissions** - 50+ enterprise-grade permissions across 8 categories
- **Resource-Level Security** - Fine-grained access control for specific resources
- **Context-Aware Authorization** - Time, location, and condition-based access
- **Risk Assessment Engine** - Automated risk scoring and mitigation
- **Approval Workflows** - Multi-stage approval for sensitive operations
- **Comprehensive Auditing** - Complete activity logging for compliance
- **Session Management** - Advanced session tracking and security
- **Emergency Access** - Break-glass procedures for critical situations

---

## Architecture

### System Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  UI Components    │  React Hooks    │  Permission Gates         │
│  - Dashboard      │  - usePerms     │  - PermissionGate         │
│  - RoleManager    │  - useRoles     │  - RoleGate               │
│  - UserAssign     │  - useResource  │  - ResourceGate           │
│  - AuditDash      │  - useUserPerms │  - PermissionButton       │
│  - ResourceMgr    │                 │                           │
├─────────────────────────────────────────────────────────────────┤
│                    API Layer                                    │
├─────────────────────────────────────────────────────────────────┤
│  Middleware       │  API Routes     │  Server Actions           │
│  - withPermission │  - /check       │  - requiresPermission     │
│  - withRateLimit  │  - /validate    │  - Role Management        │
│  - withAuditLog   │  - /resource    │  - User Assignment        │
│                   │  - /refresh     │  - Resource Control       │
├─────────────────────────────────────────────────────────────────┤
│                   Business Logic Layer                         │
├─────────────────────────────────────────────────────────────────┤
│  Core Managers    │  Validators     │  Resource Controllers     │
│  - PermissionMgr  │  - PermValidator│  - ResourceAccessMgr      │
│  - SessionMgr     │  - RuleValidator│  - OwnershipController    │
│  - RiskAssessor   │  - ContextValid │  - VisibilityController   │
├─────────────────────────────────────────────────────────────────┤
│                   Data Layer                                   │
├─────────────────────────────────────────────────────────────────┤
│  Database Schema  │  Models         │  Relationships            │
│  - Users          │  - EnhancedUser │  - User ←→ Roles          │
│  - Roles          │  - Permission   │  - Role ←→ Permissions    │
│  - Permissions    │  - Resource     │  - User ←→ Resources      │
│  - Resources      │  - AuditLog     │  - Permission ←→ Rules    │
│  - AuditLogs      │  - Session      │                           │
└─────────────────────────────────────────────────────────────────┘
```

### Permission Flow
```
User Request → Middleware → Permission Check → Resource Access → Audit Log
     ↓              ↓              ↓               ↓              ↓
 Auth Check → Role Hierarchy → Rule Validation → Risk Assessment → Action
```

---

## Database Schema

### Enhanced Tables

#### 1. Users (Enhanced)
```sql
-- Enhanced existing user table
ALTER TABLE users ADD COLUMN permission_context JSONB;
ALTER TABLE users ADD COLUMN session_config JSONB;
ALTER TABLE users ADD COLUMN risk_profile JSONB;
```

#### 2. Roles (Enhanced)
```sql
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  hierarchy_level INTEGER NOT NULL DEFAULT 7,
  parent_role_id TEXT REFERENCES roles(id),
  is_active BOOLEAN DEFAULT true,
  is_system_role BOOLEAN DEFAULT false,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  organization_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. Permissions (New)
```sql
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  risk_level permission_risk_level DEFAULT 'LOW',
  requires_approval BOOLEAN DEFAULT false,
  approval_chain TEXT[],
  time_restrictions JSONB,
  amount_limits JSONB,
  location_restrictions JSONB,
  business_rules JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. Resources (New)
```sql
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id),
  visibility resource_visibility DEFAULT 'organization',
  is_public BOOLEAN DEFAULT false,
  metadata JSONB,
  tags TEXT[],
  organization_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. Role Permissions (New)
```sql
CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  conditions JSONB,
  is_active BOOLEAN DEFAULT true,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by TEXT REFERENCES users(id),
  expires_at TIMESTAMPTZ,
  UNIQUE(role_id, permission_id)
);
```

#### 6. User Permissions (New)
```sql
CREATE TABLE IF NOT EXISTS user_permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id TEXT REFERENCES permissions(id) ON DELETE CASCADE,
  resource_id TEXT REFERENCES resources(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL,
  conditions JSONB,
  is_active BOOLEAN DEFAULT true,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by TEXT REFERENCES users(id),
  expires_at TIMESTAMPTZ,
  justification TEXT
);
```

#### 7. Resource Permissions (New)
```sql
CREATE TABLE IF NOT EXISTS resource_permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT REFERENCES roles(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL,
  conditions JSONB,
  is_active BOOLEAN DEFAULT true,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by TEXT REFERENCES users(id),
  expires_at TIMESTAMPTZ
);
```

#### 8. Permission Sessions (New)
```sql
CREATE TABLE IF NOT EXISTS permission_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permissions TEXT[] NOT NULL,
  reason TEXT NOT NULL,
  is_emergency BOOLEAN DEFAULT false,
  approved_by TEXT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 9. Permission Approvals (New)
```sql
CREATE TABLE IF NOT EXISTS permission_approvals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  request_type TEXT NOT NULL,
  requester_id TEXT NOT NULL REFERENCES users(id),
  requested_permissions TEXT[],
  resource_id TEXT REFERENCES resources(id),
  justification TEXT NOT NULL,
  approver_id TEXT REFERENCES users(id),
  status approval_status DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 10. User Sessions (Enhanced)
```sql
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  device_info JSONB,
  ip_address INET,
  location_data JSONB,
  permissions_snapshot TEXT[],
  risk_score INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 11. Audit Logs (Enhanced)
```sql
-- Enhanced existing audit_logs table
ALTER TABLE audit_logs ADD COLUMN permission_context JSONB;
ALTER TABLE audit_logs ADD COLUMN risk_assessment JSONB;
ALTER TABLE audit_logs ADD COLUMN session_id TEXT;
ALTER TABLE audit_logs ADD COLUMN approval_chain TEXT[];
```

---

## Core Components

### 1. PermissionManager (`lib/enterprise-permissions/manager.ts`)

The central orchestrator for all permission operations.

#### Key Methods:
```typescript
class PermissionManager {
  // Core Permission Checking
  async hasPermission(user: EnhancedUser, permission: string, context?: PermissionContext): Promise<PermissionResult>
  async hasAnyPermission(user: EnhancedUser, permissions: string[], context?: PermissionContext): Promise<PermissionResult>
  async hasAllPermissions(user: EnhancedUser, permissions: string[], context?: PermissionContext): Promise<PermissionResult>
  async validateRule(user: EnhancedUser, rule: PermissionRule, context?: PermissionContext): Promise<PermissionResult>

  // Resource Access
  async canAccessResource(user: EnhancedUser, resourceType: string, resourceId: string, action: string, context?: PermissionContext): Promise<boolean>

  // Role Management
  async assignRole(userId: string, roleId: string, grantedBy: string, expiresAt?: Date): Promise<void>
  async revokeRole(userId: string, roleId: string, revokedBy: string): Promise<void>
  async getUserRoles(userId: string): Promise<Role[]>

  // Permission Management
  async grantPermission(userId: string, permission: string, grantedBy: string, conditions?: any, expiresAt?: Date): Promise<void>
  async revokePermission(userId: string, permission: string, revokedBy: string): Promise<void>
  async getUserPermissions(userId: string): Promise<string[]>

  // Resource Permission Management
  async grantResourcePermission(resourceType: string, resourceId: string, userId: string, permissionType: string, grantedBy: string): Promise<void>
  async revokeResourcePermission(resourceType: string, resourceId: string, userId: string, permissionType: string, revokedBy: string): Promise<void>

  // Session Management
  async createSession(user: EnhancedUser, deviceInfo: any): Promise<Session>
  async validateSession(sessionToken: string): Promise<Session | null>
  async revokeSession(sessionId: string, revokedBy: string): Promise<void>
  async getActiveSessions(userId: string): Promise<Session[]>

  // Emergency Access
  async requestEmergencyAccess(userId: string, permissions: string[], justification: string): Promise<string>
  async approveEmergencyAccess(requestId: string, approverId: string): Promise<void>

  // Cache Management
  async refreshPermissions(userId: string): Promise<void>
  async clearPermissionCache(userId?: string): Promise<void>
}
```

### 2. PermissionValidator (`lib/enterprise-permissions/validator.ts`)

Advanced validation engine with context-aware checks.

#### Key Features:
- **Context Validation** - Time, location, amount-based restrictions
- **Risk Assessment** - Automated risk scoring
- **Business Rule Enforcement** - Custom rule validation
- **Hierarchy Validation** - Role hierarchy enforcement
- **Condition Checking** - Complex conditional logic

#### Key Methods:
```typescript
class PermissionValidator {
  async validateRule(user: EnhancedUser, rule: PermissionRule, context: PermissionContext): Promise<PermissionResult>
  async checkTimeRestrictions(restrictions: TimeRestriction[], context: PermissionContext): Promise<boolean>
  async checkLocationRestrictions(restrictions: LocationRestriction[], context: PermissionContext): Promise<boolean>
  async checkAmountLimits(limits: AmountLimit[], context: PermissionContext): Promise<boolean>
  async assessRisk(user: EnhancedUser, action: string, context: PermissionContext): Promise<RiskAssessment>
  async validateHierarchy(userRoles: Role[], requiredLevel: number): Promise<boolean>
  async checkBusinessRules(rules: BusinessRule[], context: PermissionContext): Promise<boolean>
}
```

### 3. ResourceAccessManager (`lib/enterprise-permissions/resource.ts`)

Manages resource-level permissions and ownership.

#### Key Features:
- **Resource Ownership** - Control over specific resources
- **Visibility Management** - Public, organization, private access
- **Permission Inheritance** - Role-based resource access
- **Access Logging** - Comprehensive access tracking

#### Key Methods:
```typescript
class ResourceAccessManager {
  async grantResourcePermission(resourceType: string, resourceId: string, userId: string, permissionType: string, grantedBy: string): Promise<void>
  async revokeResourcePermission(resourceType: string, resourceId: string, userId: string, permissionType: string, revokedBy: string): Promise<void>
  async checkResourceAccess(user: EnhancedUser, resourceType: string, resourceId: string, action: string): Promise<boolean>
  async getResourcePermissions(resourceType: string, resourceId: string): Promise<ResourcePermission[]>
  async transferResourceOwnership(resourceType: string, resourceId: string, newOwnerId: string, transferredBy: string): Promise<void>
  async setResourceVisibility(resourceType: string, resourceId: string, visibility: string, updatedBy: string): Promise<void>
  async logResourceAccess(userId: string, resourceType: string, resourceId: string, action: string, result: 'success' | 'denied'): Promise<void>
}
```

---

## API Endpoints

### 1. Permission Check (`/api/permissions/check`)
```typescript
// POST /api/permissions/check
interface CheckPermissionRequest {
  permission: string;
  context?: PermissionContext;
}

interface CheckPermissionResponse {
  granted: boolean;
  reason?: string;
  suggestions?: string[];
  riskLevel?: string;
  requiresApproval?: boolean;
}
```

### 2. Multiple Permission Check (`/api/permissions/check-multiple`)
```typescript
// POST /api/permissions/check-multiple
interface CheckMultiplePermissionsRequest {
  permissions: string[];
  requireAll: boolean;
  context?: PermissionContext;
}

interface CheckMultiplePermissionsResponse {
  granted: boolean;
  grantedPermissions: string[];
  deniedPermissions: string[];
  missingPermissions: string[];
  reason?: string;
}
```

### 3. Rule Validation (`/api/permissions/validate-rule`)
```typescript
// POST /api/permissions/validate-rule
interface ValidateRuleRequest {
  rule: PermissionRule;
  context?: PermissionContext;
}

interface ValidateRuleResponse {
  granted: boolean;
  reason?: string;
  riskAssessment?: RiskAssessment;
  approvalRequired?: boolean;
  conditions?: any;
}
```

### 4. Resource Access Check (`/api/permissions/check-resource`)
```typescript
// POST /api/permissions/check-resource
interface CheckResourceRequest {
  resourceType: string;
  resourceId: string;
  action: string;
  context?: PermissionContext;
}

interface CheckResourceResponse {
  granted: boolean;
  reason?: string;
  resourceExists: boolean;
  ownershipInfo?: OwnershipInfo;
}
```

### 5. User Permissions (`/api/permissions/user-permissions`)
```typescript
// GET /api/permissions/user-permissions
interface UserPermissionsResponse {
  user: EnhancedUser;
  permissions: string[];
  roles: Role[];
  resourcePermissions: ResourcePermission[];
  sessionInfo: SessionInfo;
}
```

### 6. User Roles (`/api/permissions/user-roles`)
```typescript
// GET /api/permissions/user-roles
interface UserRolesResponse {
  roles: Role[];
  effectiveRole: Role;
  hierarchyLevel: number;
  permissions: string[];
}
```

### 7. Permission Refresh (`/api/permissions/refresh`)
```typescript
// POST /api/permissions/refresh
interface RefreshPermissionsResponse {
  success: boolean;
  message: string;
  refreshedAt: Date;
}
```

---

## React Hooks

### 1. usePermissions Hook

Core permission checking hook for React components.

```typescript
// Usage
const { hasPermission, hasAnyPermission, hasAllPermissions, validateRule, isLoading, error, refreshPermissions } = usePermissions();

// Methods
interface UsePermissionsReturn {
  hasPermission: (permission: string, context?: PermissionContext) => Promise<boolean>;
  hasAnyPermission: (permissions: string[], context?: PermissionContext) => Promise<boolean>;
  hasAllPermissions: (permissions: string[], context?: PermissionContext) => Promise<boolean>;
  validateRule: (rule: PermissionRule, context?: PermissionContext) => Promise<PermissionResult>;
  isLoading: boolean;
  error: Error | null;
  refreshPermissions: () => Promise<void>;
}

// Example Usage
const MyComponent = () => {
  const { hasPermission, isLoading } = usePermissions();

  const handleAction = async () => {
    const canDelete = await hasPermission('DELETE_USERS');
    if (!canDelete) {
      alert('Permission denied');
      return;
    }
    // Perform action
  };

  if (isLoading) return <div>Loading permissions...</div>;

  return (
    <button onClick={handleAction}>
      Delete User
    </button>
  );
};
```

### 2. useRoles Hook

Role management and hierarchy checking.

```typescript
// Usage
const { roles, effectiveRole, isLoading, error, hasRole, getRoleHierarchy } = useRoles();

// Methods
interface UseRolesReturn {
  roles: Role[];
  effectiveRole: string | null;
  isLoading: boolean;
  error: Error | null;
  hasRole: (roleCode: string) => boolean;
  getRoleHierarchy: () => number;
}

// Example Usage
const RoleDisplay = () => {
  const { roles, effectiveRole, hasRole } = useRoles();

  return (
    <div>
      <p>Current Role: {effectiveRole}</p>
      <p>Is Admin: {hasRole('administrator') ? 'Yes' : 'No'}</p>
      <div>
        All Roles: {roles.map(role => role.name).join(', ')}
      </div>
    </div>
  );
};
```

### 3. useResourceAccess Hook

Resource-level access control.

```typescript
// Usage
const { canAccess, getResourcePermissions, isLoading, error } = useResourceAccess();

// Methods
interface UseResourceAccessReturn {
  canAccess: (resourceType: string, resourceId: string, action: string) => Promise<boolean>;
  getResourcePermissions: (resourceType: string, resourceId: string) => Promise<ResourcePermission[]>;
  isLoading: boolean;
  error: Error | null;
}

// Example Usage
const ResourceComponent = ({ resourceId }: { resourceId: string }) => {
  const { canAccess } = useResourceAccess();
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const hasAccess = await canAccess('document', resourceId, 'edit');
      setCanEdit(hasAccess);
    };
    checkAccess();
  }, [resourceId]);

  return (
    <div>
      {canEdit ? (
        <button>Edit Document</button>
      ) : (
        <span>Read-only access</span>
      )}
    </div>
  );
};
```

### 4. useUserPermissions Hook

Comprehensive user permission data.

```typescript
// Usage
const { user, permissions, isLoading, error, hasPermission, hasAnyPermission, hasAllPermissions, refetch } = useUserPermissions();

// Methods
interface UseUserPermissionsReturn {
  user: EnhancedUser | null;
  permissions: string[];
  isLoading: boolean;
  error: Error | null;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  refetch: () => Promise<void>;
}
```

### 5. usePermissionState Hook

Single permission state management.

```typescript
// Usage
const { hasAccess, isChecking, error } = usePermissionState('DELETE_USERS');

// Methods
interface UsePermissionStateReturn {
  hasAccess: boolean | null;
  isChecking: boolean;
  error: Error | null;
}
```

### 6. usePermissionRequests Hook

Permission request and approval management.

```typescript
// Usage
const { requests, requestPermission, fetchRequests, isLoading, error } = usePermissionRequests();

// Methods
interface UsePermissionRequestsReturn {
  requests: PermissionRequest[];
  requestPermission: (permissions: string[], resourceId?: string, justification?: string) => Promise<boolean>;
  fetchRequests: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}
```

---

## UI Components

### 1. PermissionManagementDashboard

**Purpose**: Main dashboard for permission system overview and management.

**Features**:
- Real-time permission statistics
- Security alerts and risk monitoring
- Recent activity feed
- Quick action buttons for common tasks
- Permission category overview

**Props**:
```typescript
interface PermissionManagementDashboardProps {
  // No props - uses hooks for data
}
```

**Usage**:
```typescript
import PermissionManagementDashboard from '@/components/permissions/PermissionManagementDashboard';

function PermissionsPage() {
  return <PermissionManagementDashboard />;
}
```

### 2. RoleManagement

**Purpose**: Comprehensive role management interface with hierarchy visualization.

**Features**:
- Role creation, editing, and deletion
- Hierarchical role display (7 levels)
- Permission assignment to roles
- Role inheritance visualization
- Permission matrix view
- Bulk role operations

**Props**:
```typescript
interface RoleManagementProps {
  // No props - uses hooks for data
}
```

**Key Sections**:
- **Overview Tab**: Role cards with hierarchy levels
- **Hierarchy Tab**: Visual role hierarchy display
- **Permissions Tab**: Role-permission matrix

### 3. UserPermissionAssignment

**Purpose**: User-centric permission and role assignment interface.

**Features**:
- User search and filtering
- Role assignment to users
- Direct permission grants
- Bulk permission assignment
- User permission matrix
- Permission history tracking

**Props**:
```typescript
interface UserPermissionAssignmentProps {
  // No props - uses hooks for data
}
```

**Key Sections**:
- **User List Tab**: Searchable user cards with assignment controls
- **Bulk Assignment Tab**: Mass permission assignment
- **Matrix Tab**: User-permission visualization

### 4. PermissionAuditDashboard

**Purpose**: Security monitoring and compliance tracking interface.

**Features**:
- Real-time audit log monitoring
- Security alert management
- Risk assessment dashboard
- Activity analytics
- Compliance reporting
- Alert resolution tracking

**Props**:
```typescript
interface PermissionAuditDashboardProps {
  // No props - uses hooks for data
}
```

**Key Sections**:
- **Overview Tab**: Summary statistics and top activities
- **Events Tab**: Detailed audit log with filtering
- **Alerts Tab**: Security alert management
- **Analytics Tab**: Charts and trend analysis

### 5. ResourceAccessManagement

**Purpose**: Resource-level access control and ownership management.

**Features**:
- Resource creation and management
- Permission assignment to resources
- Access log monitoring
- Resource ownership transfer
- Visibility control (private/organization/public)
- Resource permission matrix

**Props**:
```typescript
interface ResourceAccessManagementProps {
  // No props - uses hooks for data
}
```

**Key Sections**:
- **Resources Tab**: Resource cards with access controls
- **Permissions Tab**: Resource permission matrix
- **Access Logs Tab**: Resource access monitoring

### Permission Gate Components

#### PermissionGate
Conditional rendering based on permissions.

```typescript
interface PermissionGateProps {
  permission: string | string[];
  requireAll?: boolean;
  context?: PermissionContext;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

// Usage
<PermissionGate permission="DELETE_USERS" fallback={<div>Access Denied</div>}>
  <DeleteButton />
</PermissionGate>
```

#### RoleGate
Conditional rendering based on roles.

```typescript
interface RoleGateProps {
  role: string | string[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

// Usage
<RoleGate role="administrator">
  <AdminPanel />
</RoleGate>
```

#### ResourceGate
Conditional rendering based on resource access.

```typescript
interface ResourceGateProps {
  resourceType: string;
  resourceId: string;
  action: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

// Usage
<ResourceGate resourceType="document" resourceId="doc-123" action="edit">
  <EditButton />
</ResourceGate>
```

#### PermissionButton
Permission-aware button component.

```typescript
interface PermissionButtonProps extends ButtonProps {
  permission: string;
  context?: PermissionContext;
  showTooltip?: boolean;
  tooltipContent?: string;
}

// Usage
<PermissionButton
  permission="CREATE_USERS"
  onClick={handleCreateUser}
  showTooltip={true}
  tooltipContent="Create new user account"
>
  Create User
</PermissionButton>
```

---

## Server Actions

### 1. Role Management Actions

#### createRole
```typescript
export const createRole = requiresPermission('CREATE_ROLES')(
  async (roleData: CreateRoleData): Promise<Role> => {
    // Validate role data
    const validation = await validateRoleData(roleData);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Create role
    const role = await prisma.role.create({
      data: {
        ...roleData,
        organizationId: await getCurrentUserOrganization(),
      },
    });

    // Audit log
    await logAction('ROLE_CREATED', 'ROLE', role.id, { role });

    return role;
  }
);
```

#### updateRole
```typescript
export const updateRole = requiresPermission('UPDATE_ROLES')(
  async (roleId: string, updateData: UpdateRoleData): Promise<Role> => {
    // Check role exists and user has access
    const existingRole = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!existingRole) {
      throw new Error('Role not found');
    }

    // Update role
    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data: updateData,
    });

    // Audit log
    await logAction('ROLE_UPDATED', 'ROLE', roleId, {
      before: existingRole,
      after: updatedRole,
    });

    return updatedRole;
  }
);
```

#### deleteRole
```typescript
export const deleteRole = requiresPermission('DELETE_ROLES')(
  async (roleId: string): Promise<void> => {
    // Check role exists and is not system role
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: { users: true },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystemRole) {
      throw new Error('Cannot delete system role');
    }

    if (role.users.length > 0) {
      throw new Error('Cannot delete role with assigned users');
    }

    // Delete role
    await prisma.role.delete({
      where: { id: roleId },
    });

    // Audit log
    await logAction('ROLE_DELETED', 'ROLE', roleId, { role });
  }
);
```

### 2. Permission Assignment Actions

#### assignRoleToUser
```typescript
export const assignRoleToUser = requiresPermission('ASSIGN_ROLES')(
  async (userId: string, roleId: string, expiresAt?: Date): Promise<void> => {
    // Validate assignment
    const validation = await validateRoleAssignment(userId, roleId);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Create assignment
    await prisma.userRole.create({
      data: {
        userId,
        roleId,
        assignedBy: await getCurrentUserId(),
        expiresAt,
      },
    });

    // Clear user permission cache
    await clearUserPermissionCache(userId);

    // Audit log
    await logAction('ROLE_ASSIGNED', 'USER', userId, {
      roleId,
      expiresAt,
    });
  }
);
```

#### grantPermissionToUser
```typescript
export const grantPermissionToUser = requiresPermission('GRANT_PERMISSIONS')(
  async (userId: string, permission: string, conditions?: any, expiresAt?: Date): Promise<void> => {
    // Validate permission grant
    const validation = await validatePermissionGrant(userId, permission);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Create permission grant
    await prisma.userPermission.create({
      data: {
        userId,
        permissionCode: permission,
        conditions,
        grantedBy: await getCurrentUserId(),
        expiresAt,
      },
    });

    // Clear user permission cache
    await clearUserPermissionCache(userId);

    // Audit log
    await logAction('PERMISSION_GRANTED', 'USER', userId, {
      permission,
      conditions,
      expiresAt,
    });
  }
);
```

### 3. Resource Management Actions

#### createResource
```typescript
export const createResource = requiresPermission('CREATE_RESOURCES')(
  async (resourceData: CreateResourceData): Promise<Resource> => {
    // Validate resource data
    const validation = await validateResourceData(resourceData);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Create resource
    const resource = await prisma.resource.create({
      data: {
        ...resourceData,
        ownerId: await getCurrentUserId(),
        organizationId: await getCurrentUserOrganization(),
      },
    });

    // Audit log
    await logAction('RESOURCE_CREATED', 'RESOURCE', resource.id, { resource });

    return resource;
  }
);
```

#### grantResourcePermission
```typescript
export const grantResourcePermission = requiresPermission('MANAGE_RESOURCE_PERMISSIONS')(
  async (resourceId: string, userId: string, permissionType: string, expiresAt?: Date): Promise<void> => {
    // Check resource ownership or admin permissions
    const hasAccess = await checkResourceOwnership(resourceId) ||
                     await hasPermission(await getCurrentUserId(), 'ADMIN_ALL_RESOURCES');

    if (!hasAccess) {
      throw new Error('Insufficient permissions to grant resource access');
    }

    // Create resource permission
    await prisma.resourcePermission.create({
      data: {
        resourceId,
        userId,
        permissionType,
        grantedBy: await getCurrentUserId(),
        expiresAt,
      },
    });

    // Audit log
    await logAction('RESOURCE_PERMISSION_GRANTED', 'RESOURCE', resourceId, {
      userId,
      permissionType,
      expiresAt,
    });
  }
);
```

### 4. Audit and Monitoring Actions

#### getAuditLogs
```typescript
export const getAuditLogs = requiresPermission('VIEW_AUDIT_LOGS')(
  async (filters: AuditLogFilters): Promise<PaginatedAuditLogs> => {
    // Build query based on filters
    const where = buildAuditLogWhere(filters);

    // Get logs with pagination
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      skip: filters.offset || 0,
      take: filters.limit || 50,
    });

    const total = await prisma.auditLog.count({ where });

    return {
      logs,
      total,
      page: Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1,
      totalPages: Math.ceil(total / (filters.limit || 50)),
    };
  }
);
```

#### getSecurityAlerts
```typescript
export const getSecurityAlerts = requiresPermission('VIEW_SECURITY_ALERTS')(
  async (filters: SecurityAlertFilters): Promise<SecurityAlert[]> => {
    // Get security alerts based on filters
    const alerts = await prisma.securityAlert.findMany({
      where: buildSecurityAlertWhere(filters),
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    return alerts;
  }
);
```

---

## Middleware & Guards

### 1. withPermission Middleware

Protects API routes with permission checks.

```typescript
// Usage
export const GET = withPermission('READ_USERS')(
  async (req: NextRequest, context: any) => {
    // Protected route logic
    const users = await getUsers();
    return NextResponse.json(users);
  }
);

// Advanced usage with multiple permissions
export const POST = withPermission(
  ['CREATE_USERS', 'MANAGE_USERS'],
  { requireAll: false }
)(async (req: NextRequest, context: any) => {
  // User needs either CREATE_USERS OR MANAGE_USERS
  const userData = await req.json();
  const user = await createUser(userData);
  return NextResponse.json(user);
});

// Complex permission rule
export const DELETE = withPermission({
  name: 'Delete User with Approval',
  permissions: ['DELETE_USERS'],
  requireAll: true,
  hierarchyCheck: true,
  riskAssessment: {
    level: 'HIGH',
    factors: [{ type: 'RESOURCE_SENSITIVITY', weight: 1.0 }],
    requiresApproval: true,
    auditLevel: 'COMPREHENSIVE'
  }
})(async (req: NextRequest, context: any) => {
  // High-risk operation with approval workflow
  const userId = context.params.id;
  await deleteUser(userId);
  return NextResponse.json({ success: true });
});
```

### 2. requiresPermission Decorator

Protects server actions with permission checks.

```typescript
// Basic usage
export const createUser = requiresPermission('CREATE_USERS')(
  async (userData: CreateUserData) => {
    const user = await prisma.user.create({ data: userData });
    return user;
  }
);

// Advanced usage with context
export const deleteUser = requiresPermission(
  'DELETE_USERS',
  {
    context: {
      sensitiveOperation: true,
      resourceType: 'user'
    }
  }
)(async (userId: string) => {
  await prisma.user.delete({ where: { id: userId } });
});
```

### 3. withRateLimit Middleware

Permission-based rate limiting.

```typescript
export const POST = withRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  skipSuccessful: true,
  keyGenerator: (req, user) => `${user.id}:${req.nextUrl.pathname}`
})(
  withPermission('CREATE_RECORDS')(
    async (req: NextRequest, context: any) => {
      // Rate-limited protected route
      return NextResponse.json({ success: true });
    }
  )
);
```

### 4. withAuditLog Middleware

Comprehensive request/response logging.

```typescript
export const PUT = withAuditLog({
  logLevel: 'COMPREHENSIVE',
  includeRequestBody: true,
  includeResponseBody: false
})(
  withPermission('UPDATE_SENSITIVE_DATA')(
    async (req: NextRequest, context: any) => {
      // Audited protected route
      return NextResponse.json({ updated: true });
    }
  )
);
```

---

## Security Features

### 1. Risk Assessment Engine

Automated risk scoring and mitigation strategies.

#### Risk Factors:
- **User Risk Profile** - Historical behavior analysis
- **Action Risk Level** - Operation sensitivity scoring
- **Context Risk** - Time, location, device analysis
- **Pattern Analysis** - Unusual activity detection
- **Resource Sensitivity** - Data classification impact

#### Risk Levels:
- **LOW (0-25)** - Standard operations with basic logging
- **MEDIUM (26-50)** - Enhanced monitoring with optional approval
- **HIGH (51-75)** - Mandatory approval with comprehensive audit
- **CRITICAL (76-100)** - Emergency access only with mandatory review

#### Risk Calculation:
```typescript
interface RiskAssessment {
  score: number; // 0-100
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: RiskFactor[];
  mitigationStrategies: string[];
  requiresApproval: boolean;
  autoBlock: boolean;
}

interface RiskFactor {
  type: string;
  weight: number; // 0-1
  score: number; // 0-100
  description: string;
}
```

### 2. Approval Workflows

Multi-stage approval processes for sensitive operations.

#### Approval Chain Example:
```typescript
interface ApprovalWorkflow {
  id: string;
  name: string;
  triggerConditions: TriggerCondition[];
  approvalChain: ApprovalLevel[];
  timeoutMinutes: number;
  escalationChain: string[];
  autoApproval: AutoApprovalRule[];
}

interface ApprovalLevel {
  level: number;
  requiredApprovers: number;
  approverRoles: string[];
  approverUsers: string[];
  canSkip: boolean;
  skipConditions: SkipCondition[];
}
```

### 3. Session Management

Advanced session tracking and security controls.

#### Session Features:
- **Device Fingerprinting** - Hardware and software identification
- **IP Geolocation** - Location-based access control
- **Concurrent Session Limits** - Prevent session hijacking
- **Idle Timeout** - Automatic session expiration
- **Activity Monitoring** - Real-time session tracking
- **Risk-based Authentication** - Additional verification for high-risk activities

#### Session Data:
```typescript
interface Session {
  id: string;
  userId: string;
  sessionToken: string;
  deviceInfo: DeviceInfo;
  ipAddress: string;
  location: LocationData;
  permissionsSnapshot: string[];
  riskScore: number;
  isActive: boolean;
  lastActivity: Date;
  expiresAt: Date;
  createdAt: Date;
}

interface DeviceInfo {
  userAgent: string;
  browser: string;
  os: string;
  device: string;
  fingerprint: string;
}
```

### 4. Emergency Access Controls

Break-glass procedures for critical situations.

#### Emergency Access Features:
- **Temporary Elevation** - Time-limited permission grants
- **Justification Required** - Mandatory reason documentation
- **Automatic Audit** - Enhanced logging for emergency access
- **Approval Required** - Multi-person authorization
- **Automatic Expiry** - Time-bounded access grants
- **Review Required** - Mandatory post-incident review

#### Emergency Access Flow:
```typescript
// Request emergency access
const requestId = await permissionManager.requestEmergencyAccess(
  userId,
  ['EMERGENCY_SYSTEM_ACCESS'],
  'System outage - need to restore service'
);

// Approve emergency access
await permissionManager.approveEmergencyAccess(requestId, approverId);

// Emergency session created with enhanced monitoring
const emergencySession = await permissionManager.createEmergencySession(
  userId,
  permissions,
  expiresAt,
  justification
);
```

### 5. Comprehensive Auditing

Complete activity trail for compliance and security.

#### Audit Features:
- **Complete Action Logging** - Every permission check and action
- **Context Preservation** - Full request context and metadata
- **Change Tracking** - Before/after state capture
- **Risk Context** - Risk assessment results
- **Session Correlation** - Link actions to sessions
- **Compliance Reporting** - Automated compliance report generation

#### Audit Log Structure:
```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  permission?: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failed' | 'denied' | 'warning';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  duration?: number;
  permissionContext: PermissionContext;
  riskAssessment?: RiskAssessment;
  approvalChain?: string[];
  changes?: {
    before?: any;
    after?: any;
  };
  metadata?: any;
}
```

---

## Integration Guide

### 1. Database Migration

```bash
# Run the enterprise permissions migration
psql -d stockflow -f prisma/migrations/add_enterprise_permissions.sql

# Regenerate Prisma client
npx prisma generate
```

### 2. Environment Configuration

```env
# Add to .env
PERMISSION_CACHE_TTL=900000  # 15 minutes
PERMISSION_RISK_THRESHOLD=75
PERMISSION_MAX_CONCURRENT_SESSIONS=5
PERMISSION_SESSION_TIMEOUT=28800000  # 8 hours
PERMISSION_AUDIT_LEVEL=DETAILED
PERMISSION_ENABLE_EMERGENCY_ACCESS=true
```

### 3. Update Existing Routes

```typescript
// Before
export async function GET() {
  // unprotected route
  const users = await getUsers();
  return NextResponse.json(users);
}

// After
import { withPermission } from '@/lib/enterprise-permissions/middleware';
import { SYSTEM_PERMISSIONS } from '@/lib/enterprise-permissions/permissions';

export const GET = withPermission(SYSTEM_PERMISSIONS.READ_USERS)(
  async (req, context) => {
    const users = await getUsers();
    return NextResponse.json(users);
  }
);
```

### 4. Update React Components

```typescript
// Before
{user.role === 'admin' && <AdminButton />}

// After
import { PermissionGate } from '@/lib/enterprise-permissions/components';
import { SYSTEM_PERMISSIONS } from '@/lib/enterprise-permissions/permissions';

<PermissionGate permission={SYSTEM_PERMISSIONS.MANAGE_USERS}>
  <AdminButton />
</PermissionGate>
```

### 5. Configure Permission System

```typescript
import { PermissionManager } from '@/lib/enterprise-permissions/manager';

const config: PermissionConfig = {
  enableRiskAssessment: true,
  enableApprovalWorkflows: true,
  auditLevel: 'DETAILED',
  maxConcurrentSessions: 5,
  sessionTimeoutMinutes: 480,
  cachePermissions: true,
  cacheTTLMinutes: 15,
  riskScoreThreshold: 75,
};

const permissionManager = new PermissionManager(prisma, config);
```

### 6. Add Permission Navigation

```typescript
// Add to navigation config
{
  title: "Permission Management",
  icon: Shield,
  permission: SYSTEM_PERMISSIONS.MANAGE_PERMISSIONS,
  gradient: "from-violet-500 to-purple-600",
  children: [
    { title: "Dashboard", href: "/dashboard/permissions", permission: SYSTEM_PERMISSIONS.VIEW_PERMISSIONS },
    { title: "Role Management", href: "/dashboard/permissions/roles", permission: SYSTEM_PERMISSIONS.MANAGE_ROLES },
    { title: "User Assignment", href: "/dashboard/permissions/users", permission: SYSTEM_PERMISSIONS.ASSIGN_PERMISSIONS },
    { title: "Audit Logs", href: "/dashboard/permissions/audit", permission: SYSTEM_PERMISSIONS.VIEW_AUDIT_LOGS },
    { title: "Resource Access", href: "/dashboard/permissions/resources", permission: SYSTEM_PERMISSIONS.MANAGE_RESOURCES },
  ]
},
```

---

## Best Practices

### 1. Permission Design

#### Principle of Least Privilege
- Grant users only the minimum permissions needed for their role
- Use time-limited permissions for temporary access
- Regular permission audits and cleanup
- Implement permission expiration for sensitive access

#### Granular Permissions
- Create specific permissions for distinct actions
- Avoid overly broad permissions that grant excessive access
- Use resource-specific permissions when possible
- Implement action-based permissions (read, write, delete, admin)

#### Role Hierarchy
- Design clear role hierarchies with logical inheritance
- Avoid role sprawl with too many similar roles
- Use role templates for common permission sets
- Regular role review and consolidation

### 2. Security Implementation

#### Defense in Depth
- Multiple permission checks (role + resource + context)
- Risk assessment for sensitive operations
- Comprehensive audit logging
- Session security and monitoring

#### Context-Aware Security
- Implement time-based restrictions for sensitive operations
- Use location-based access controls when appropriate
- Consider device and network context in permission decisions
- Implement anomaly detection for unusual access patterns

#### Approval Workflows
- Multi-stage approval for high-risk operations
- Segregation of duties for critical processes
- Time-limited approvals with automatic expiry
- Emergency access procedures with enhanced monitoring

### 3. Performance Optimization

#### Caching Strategy
- Cache user permissions for faster access checks
- Implement cache invalidation on permission changes
- Use distributed caching for multi-server deployments
- Balance cache TTL with security requirements

#### Database Optimization
- Index frequently queried permission tables
- Optimize complex permission queries
- Use database views for common permission checks
- Regular database maintenance and optimization

#### API Performance
- Batch permission checks when possible
- Implement pagination for large permission lists
- Use background jobs for expensive permission operations
- Monitor API performance and optimize bottlenecks

### 4. Monitoring and Compliance

#### Audit Requirements
- Log all permission checks and changes
- Retain audit logs per compliance requirements
- Implement audit log integrity protection
- Regular audit log review and analysis

#### Compliance Reporting
- Automated compliance report generation
- Regular access reviews and certifications
- Permission change tracking and approval
- Violation detection and alerting

#### Security Monitoring
- Real-time security alert monitoring
- Anomaly detection for unusual access patterns
- Risk-based authentication implementation
- Incident response procedures for security events

### 5. Maintenance and Governance

#### Regular Reviews
- Quarterly permission reviews and cleanup
- Annual role and permission audits
- Regular security assessment and updates
- User access certification processes

#### Documentation
- Maintain up-to-date permission documentation
- Document approval workflows and procedures
- Create user guides for permission management
- Regular training on permission system usage

#### Change Management
- Formal change approval process for permission modifications
- Testing procedures for permission system changes
- Rollback procedures for permission system issues
- Version control for permission configuration

---

## Conclusion

The StockFlow Enterprise RBAC system provides a comprehensive, scalable, and secure authorization framework that addresses all aspects of enterprise permission management. From granular permission control to advanced security features like risk assessment and audit logging, the system ensures that your organization can maintain strict access control while enabling productive user workflows.

The modular architecture allows for easy customization and extension, while the comprehensive UI components provide a professional interface for managing all aspects of the permission system. The extensive hook system and server actions make integration with existing applications straightforward and maintainable.

This documentation serves as a complete reference for understanding, implementing, and maintaining the enterprise RBAC system in your StockFlow application.