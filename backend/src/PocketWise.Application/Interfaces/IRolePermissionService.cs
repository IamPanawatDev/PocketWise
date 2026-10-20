using PocketWise.Application.DTOs.Roles;

namespace PocketWise.Application.Interfaces;

public interface IRolePermissionService
{
    Task<List<RoleResponse>> GetRolesAsync(CancellationToken cancellationToken = default);
    Task<RoleDetailResponse?> GetRoleByIdAsync(long roleId, CancellationToken cancellationToken = default);
    Task<RoleDetailResponse> CreateRoleAsync(CreateRoleRequest request, CancellationToken cancellationToken = default);
    Task<RoleDetailResponse?> UpdateRoleAsync(long roleId, UpdateRoleRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteRoleAsync(long roleId, CancellationToken cancellationToken = default);

    Task<List<PermissionResponse>> GetAllPermissionsAsync(CancellationToken cancellationToken = default);
    Task<RoleDetailResponse?> UpdateRolePermissionsAsync(long roleId, UpdateRolePermissionsRequest request, CancellationToken cancellationToken = default);

    Task<List<UserWithRolesResponse>> GetUsersWithRolesAsync(CancellationToken cancellationToken = default);
    Task<UserWithRolesResponse?> AssignUserRolesAsync(long userId, AssignUserRolesRequest request, CancellationToken cancellationToken = default);
}
