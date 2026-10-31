using PocketWise.Application.DTOs.Roles;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;

namespace PocketWise.Application.Features.Roles;

public class RolePermissionService : IRolePermissionService
{
    private readonly IRolePermissionRepository _repository;
    private readonly IAuditLogService? _auditLogService;

    public RolePermissionService(
        IRolePermissionRepository repository,
        IAuditLogService? auditLogService = null)
    {
        _repository = repository;
        _auditLogService = auditLogService;
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

    public async Task<RoleDetailResponse> CreateRoleAsync(long actorUserId, CreateRoleRequest request, CancellationToken cancellationToken = default)
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

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                actorUserId,
                AuditAction.Create,
                "Roles",
                role.Id.ToString(),
                new
                {
                    role.Name,
                    role.Description,
                    request.PermissionIds
                },
                cancellationToken);
        }

        return (await GetRoleByIdAsync(role.Id, cancellationToken))!;
    }

    public async Task<RoleDetailResponse?> UpdateRoleAsync(long roleId, long actorUserId, UpdateRoleRequest request, CancellationToken cancellationToken = default)
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

        var beforeState = new
        {
            role.Name,
            role.Description,
            role.IsActive
        };

        role.Name = roleName;
        role.NormalizedName = roleName.ToUpperInvariant();
        role.Description = request.Description?.Trim();
        role.IsActive = request.IsActive;
        role.UpdatedAt = DateTime.UtcNow;

        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                actorUserId,
                AuditAction.Update,
                "Roles",
                roleId.ToString(),
                new
                {
                    Before = beforeState,
                    After = new
                    {
                        role.Name,
                        role.Description,
                        role.IsActive
                    }
                },
                cancellationToken);
        }

        return await GetRoleByIdAsync(roleId, cancellationToken);
    }

    public async Task<bool> DeleteRoleAsync(long roleId, long actorUserId, CancellationToken cancellationToken = default)
    {
        var role = await _repository.GetRoleByIdAsync(roleId, cancellationToken);
        if (role == null) return false;

        // Prevent deleting core system role
        if (string.Equals(role.NormalizedName, "SUPERADMIN", StringComparison.OrdinalIgnoreCase) || string.Equals(role.NormalizedName, "ADMIN", StringComparison.OrdinalIgnoreCase) || string.Equals(role.NormalizedName, "MEMBER", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("ไม่สามารถลบบทบาทมาตรฐานของระบบได้");
        }

        await _repository.DeleteRoleAsync(role, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                actorUserId,
                AuditAction.Delete,
                "Roles",
                roleId.ToString(),
                new { role.Name },
                cancellationToken);
        }

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

    public async Task<RoleDetailResponse?> UpdateRolePermissionsAsync(long roleId, long actorUserId, UpdateRolePermissionsRequest request, CancellationToken cancellationToken = default)
    {
        var role = await _repository.GetRoleByIdAsync(roleId, cancellationToken);
        if (role == null) return null;

        await _repository.UpdateRolePermissionsAsync(roleId, request.PermissionIds, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                actorUserId,
                AuditAction.Update,
                "RolePermissions",
                roleId.ToString(),
                new { RoleId = roleId, PermissionIds = request.PermissionIds },
                cancellationToken);
        }

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

    public async Task<UserWithRolesResponse?> AssignUserRolesAsync(long userId, long actorUserId, AssignUserRolesRequest request, CancellationToken cancellationToken = default)
    {
        var users = await _repository.GetUsersAsync(cancellationToken);
        var targetUser = users.FirstOrDefault(u => u.Id == userId);
        if (targetUser == null) return null;

        await _repository.AssignUserRolesAsync(userId, request.RoleNames, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                actorUserId,
                AuditAction.Update,
                "UserRoles",
                userId.ToString(),
                new { TargetUserId = userId, AssignedRoles = request.RoleNames },
                cancellationToken);
        }

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
