export type Permission = {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Role = {
  id: string;
  name: string;
  description: string;
  color?: string;
  isSystemRole: boolean;
  isActive: boolean;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    permissions: number;
    users: number;
    assignments: number;
  };
  permissions?: Permission[];
};

export type RolePermission = {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: Date;
  updatedAt: Date;
  role: Role;
  permission: Permission;
};

export type UserRole = {
  id: string;
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
  expiresAt?: Date;
  isActive: boolean;
  role: Role;
};

export type EnhancedRole = Role & {
  permissions?: Permission[];
  userCount?: number;
  lastModified?: Date;
  modifiedBy?: string;
  assignmentHistory?: UserRole[];
};