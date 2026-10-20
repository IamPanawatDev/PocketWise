using PocketWise.Application.DTOs.Roles;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;

namespace PocketWise.Application.Features.Roles;

public class RolePermissionService : IRolePermissionService
{
    private readonly IRolePermissionRepository _repository;

    public RolePermissionService(IRolePermissionRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<RoleResponse>> GetRolesAsync(CancellationToken cancellationToken = default)
    {
        var roles = await _repository.GetAllRolesAsync(cancellationToken);
        var userCounts = await _repository.GetRoleUserCountsAsync(cancellationToken);
        var permCounts = await _repository.GetRolePermissionCountsAsync(cancellationToken);

        return roles.Select(r => new RoleResponse(
            r.Id,
            r.Name ?? string.Empty,
            r.Description,
            r.IsActive,
            userCounts.GetValueOrDefault(r.Id, 0),
            permCounts.GetValueOrDefault(r.Id, 0),
            r.CreatedAt
        )).ToList();
    }

    public async Task<RoleDetailResponse?> GetRoleByIdAsync(long roleId, CancellationToken cancellationToken = default)
    {
        var role = await _repository.GetRoleByIdAsync(roleId, cancellationToken);
        if (role == null) return null;

        var permissions = (role.RolePermissions ?? [])
            .Where(rp => rp.Permission != null)
            .Select(rp => new PermissionResponse(
                rp.Permission.PermissionId,
                rp.Permission.PermissionCode,
                rp.Permission.PermissionName,
                rp.Permission.Module,
                rp.Permission.Description
            ))
            .OrderBy(p => p.Module)
            .ThenBy(p => p.PermissionId)
            .ToList();

        return new RoleDetailResponse(
            role.Id,
            role.Name ?? string.Empty,
            role.Description,
            role.IsActive,
            permissions,
            role.CreatedAt
        );
    }

    public async Task<RoleDetailResponse> CreateRoleAsync(CreateRoleRequest request, CancellationToken cancellationToken = default)
    {
        var roleName = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(roleName))
        {
            throw new ArgumentException("ชื่อบทบาทต้องไม่เป็นค่าว่าง", nameof(request));
        }

        if (await _repository.RoleExistsAsync(roleName, null, cancellationToken))
        {
            throw new InvalidOperationException($"บทบาทชื่อ '{roleName}' มีอยู่ในระบบแล้ว");
        }

        var role = new ApplicationRole
        {
            Name = roleName,
            NormalizedName = roleName.ToUpperInvariant(),
            Description = request.Description?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddRoleAsync(role, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (request.PermissionIds != null && request.PermissionIds.Count > 0)
        {
            await _repository.UpdateRolePermissionsAsync(role.Id, request.PermissionIds, cancellationToken);
            await _repository.SaveChangesAsync(cancellationToken);
        }

        return (await GetRoleByIdAsync(role.Id, cancellationToken))!;
    }

    public async Task<RoleDetailResponse?> UpdateRoleAsync(long roleId, UpdateRoleRequest request, CancellationToken cancellationToken = default)
    {
        var role = await _repository.GetRoleByIdAsync(roleId, cancellationToken);
        if (role == null) return null;

        var roleName = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(roleName))
        {
            throw new ArgumentException("ชื่อบทบาทต้องไม่เป็นค่าว่าง", nameof(request));
        }

        if (await _repository.RoleExistsAsync(roleName, roleId, cancellationToken))
        {
            throw new InvalidOperationException($"บทบาทชื่อ '{roleName}' มีอยู่ในระบบแล้ว");
        }

        role.Name = roleName;
        role.NormalizedName = roleName.ToUpperInvariant();
        role.Description = request.Description?.Trim();
        role.IsActive = request.IsActive;
        role.UpdatedAt = DateTime.UtcNow;

        await _repository.SaveChangesAsync(cancellationToken);

        return await GetRoleByIdAsync(roleId, cancellationToken);
    }

    public async Task<bool> DeleteRoleAsync(long roleId, CancellationToken cancellationToken = default)
    {
        var role = await _repository.GetRoleByIdAsync(roleId, cancellationToken);
        if (role == null) return false;

        // Prevent deleting core system role
        if (string.Equals(role.NormalizedName, "ADMIN", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("ไม่สามารถลบบทบาท Admin ของระบบได้");
        }

        await _repository.DeleteRoleAsync(role, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<List<PermissionResponse>> GetAllPermissionsAsync(CancellationToken cancellationToken = default)
    {
        var permissions = await _repository.GetAllPermissionsAsync(cancellationToken);
        return permissions.Select(p => new PermissionResponse(
            p.PermissionId,
            p.PermissionCode,
            p.PermissionName,
            p.Module,
            p.Description
        )).ToList();
    }

    public async Task<RoleDetailResponse?> UpdateRolePermissionsAsync(long roleId, UpdateRolePermissionsRequest request, CancellationToken cancellationToken = default)
    {
        var role = await _repository.GetRoleByIdAsync(roleId, cancellationToken);
        if (role == null) return null;

        await _repository.UpdateRolePermissionsAsync(roleId, request.PermissionIds, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return await GetRoleByIdAsync(roleId, cancellationToken);
    }

    public async Task<List<UserWithRolesResponse>> GetUsersWithRolesAsync(CancellationToken cancellationToken = default)
    {
        var users = await _repository.GetUsersAsync(cancellationToken);
        var roleMap = await _repository.GetUserRoleNamesMapAsync(cancellationToken);

        return users.Select(u => new UserWithRolesResponse(
            u.Id,
            u.Email ?? string.Empty,
            u.DisplayName,
            u.IsActive,
            roleMap.GetValueOrDefault(u.Id, []),
            u.CreatedAt
        )).ToList();
    }

    public async Task<UserWithRolesResponse?> AssignUserRolesAsync(long userId, AssignUserRolesRequest request, CancellationToken cancellationToken = default)
    {
        var users = await _repository.GetUsersAsync(cancellationToken);
        var targetUser = users.FirstOrDefault(u => u.Id == userId);
        if (targetUser == null) return null;

        await _repository.AssignUserRolesAsync(userId, request.RoleNames, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        var updatedMap = await _repository.GetUserRoleNamesMapAsync(cancellationToken);
        return new UserWithRolesResponse(
            targetUser.Id,
            targetUser.Email ?? string.Empty,
            targetUser.DisplayName,
            targetUser.IsActive,
            updatedMap.GetValueOrDefault(targetUser.Id, []),
            targetUser.CreatedAt
        );
    }
}
