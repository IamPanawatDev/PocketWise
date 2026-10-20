using PocketWise.Domain.Entities;

namespace PocketWise.Application.Interfaces;

public interface IRolePermissionRepository
{
    Task<List<ApplicationRole>> GetAllRolesAsync(CancellationToken cancellationToken = default);
    Task<ApplicationRole?> GetRoleByIdAsync(long roleId, CancellationToken cancellationToken = default);
    Task<ApplicationRole?> GetRoleByNameAsync(string name, CancellationToken cancellationToken = default);
    Task<bool> RoleExistsAsync(string name, long? excludeRoleId = null, CancellationToken cancellationToken = default);
    Task AddRoleAsync(ApplicationRole role, CancellationToken cancellationToken = default);
    Task DeleteRoleAsync(ApplicationRole role, CancellationToken cancellationToken = default);

    Task<List<Permission>> GetAllPermissionsAsync(CancellationToken cancellationToken = default);
    Task<List<Permission>> GetPermissionsByRoleIdAsync(long roleId, CancellationToken cancellationToken = default);
    Task<Dictionary<long, int>> GetRoleUserCountsAsync(CancellationToken cancellationToken = default);
    Task<Dictionary<long, int>> GetRolePermissionCountsAsync(CancellationToken cancellationToken = default);

    Task UpdateRolePermissionsAsync(long roleId, IEnumerable<int> permissionIds, CancellationToken cancellationToken = default);

    Task<List<ApplicationUser>> GetUsersAsync(CancellationToken cancellationToken = default);
    Task<Dictionary<long, List<string>>> GetUserRoleNamesMapAsync(CancellationToken cancellationToken = default);
    Task AssignUserRolesAsync(long userId, IEnumerable<string> roleNames, CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
