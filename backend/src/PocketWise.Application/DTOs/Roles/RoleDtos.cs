namespace PocketWise.Application.DTOs.Roles;

public record PermissionResponse(
    int PermissionId,
    string PermissionCode,
    string PermissionName,
    string Module,
    string? Description
);

public record RoleResponse(
    long Id,
    string Name,
    string? Description,
    bool IsActive,
    int UserCount,
    int PermissionCount,
    DateTime CreatedAt
);

public record RoleDetailResponse(
    long Id,
    string Name,
    string? Description,
    bool IsActive,
    List<PermissionResponse> Permissions,
    DateTime CreatedAt
);

public record CreateRoleRequest(
    string Name,
    string? Description,
    List<int>? PermissionIds
);

public record UpdateRoleRequest(
    string Name,
    string? Description,
    bool IsActive
);

public record UpdateRolePermissionsRequest(
    List<int> PermissionIds
);

public record UserWithRolesResponse(
    long UserId,
    string Email,
    string DisplayName,
    bool IsActive,
    List<string> Roles,
    DateTime CreatedAt
);

public record AssignUserRolesRequest(
    List<string> RoleNames
);
