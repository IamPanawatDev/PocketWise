export interface PermissionResponse {
  permissionId: number;
  permissionCode: string;
  permissionName: string;
  module: string;
  description: string | null;
}

export interface RoleResponse {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  userCount: number;
  permissionCount: number;
  createdAt: string;
}

export interface RoleDetailResponse {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  permissions: PermissionResponse[];
  createdAt: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissionIds?: number[];
}

export interface UpdateRoleRequest {
  name: string;
  description?: string;
  isActive: boolean;
}

export interface UpdateRolePermissionsRequest {
  permissionIds: number[];
}

export interface UserWithRolesResponse {
  userId: number;
  email: string;
  displayName: string;
  isActive: boolean;
  roles: string[];
  createdAt: string;
}

export interface AssignUserRolesRequest {
  roleNames: string[];
}
