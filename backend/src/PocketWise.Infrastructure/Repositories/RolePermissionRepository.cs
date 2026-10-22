using Microsoft.EntityFrameworkCore;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Repositories;

public class RolePermissionRepository : IRolePermissionRepository
{
    private readonly PocketWiseDbContext _context;

    public RolePermissionRepository(PocketWiseDbContext context)
    {
        _context = context;
    }

    public async Task<List<ApplicationRole>> GetAllRolesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Roles
            .OrderBy(r => r.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task<ApplicationRole?> GetRoleByIdAsync(long roleId, CancellationToken cancellationToken = default)
    {
        return await _context.Roles
            .Include(r => r.RolePermissions)
            .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);
    }

    public async Task<ApplicationRole?> GetRoleByNameAsync(string name, CancellationToken cancellationToken = default)
    {
        var normalized = name.Trim().ToUpperInvariant();
        return await _context.Roles
            .FirstOrDefaultAsync(r => r.NormalizedName == normalized, cancellationToken);
    }

    public async Task<bool> RoleExistsAsync(string name, long? excludeRoleId = null, CancellationToken cancellationToken = default)
    {
        var normalized = name.Trim().ToUpperInvariant();
        var query = _context.Roles.Where(r => r.NormalizedName == normalized);
        if (excludeRoleId.HasValue)
        {
            query = query.Where(r => r.Id != excludeRoleId.Value);
        }
        return await query.AnyAsync(cancellationToken);
    }

    public async Task AddRoleAsync(ApplicationRole role, CancellationToken cancellationToken = default)
    {
        await _context.Roles.AddAsync(role, cancellationToken);
    }

    public Task DeleteRoleAsync(ApplicationRole role, CancellationToken cancellationToken = default)
    {
        _context.Roles.Remove(role);
        return Task.CompletedTask;
    }

    public async Task<List<Permission>> GetAllPermissionsAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Permissions
            .OrderBy(p => p.Module)
            .ThenBy(p => p.PermissionId)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<Permission>> GetPermissionsByRoleIdAsync(long roleId, CancellationToken cancellationToken = default)
    {
        return await _context.ApplicationRolePermissions
            .Where(rp => rp.RoleId == roleId)
            .Select(rp => rp.Permission)
            .OrderBy(p => p.Module)
            .ThenBy(p => p.PermissionId)
            .ToListAsync(cancellationToken);
    }

    public async Task<List<string>> GetPermissionCodesByUserIdAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await (from ur in _context.UserRoles
                      where ur.UserId == userId
                      join rp in _context.ApplicationRolePermissions on ur.RoleId equals rp.RoleId
                      join p in _context.Permissions on rp.PermissionId equals p.PermissionId
                      select p.PermissionCode)
                      .Distinct()
                      .ToListAsync(cancellationToken);
    }

    public async Task<Dictionary<long, int>> GetRoleUserCountsAsync(CancellationToken cancellationToken = default)
    {
        return await _context.UserRoles
            .GroupBy(ur => ur.RoleId)
            .Select(g => new { RoleId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.RoleId, x => x.Count, cancellationToken);
    }

    public async Task<Dictionary<long, int>> GetRolePermissionCountsAsync(CancellationToken cancellationToken = default)
    {
        return await _context.ApplicationRolePermissions
            .GroupBy(rp => rp.RoleId)
            .Select(g => new { RoleId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.RoleId, x => x.Count, cancellationToken);
    }

    public async Task UpdateRolePermissionsAsync(long roleId, IEnumerable<int> permissionIds, CancellationToken cancellationToken = default)
    {
        var existing = await _context.ApplicationRolePermissions
            .Where(rp => rp.RoleId == roleId)
            .ToListAsync(cancellationToken);

        _context.ApplicationRolePermissions.RemoveRange(existing);

        var distinctIds = permissionIds.Distinct().ToList();
        var newRolePermissions = distinctIds.Select(pid => new ApplicationRolePermission
        {
            RoleId = roleId,
            PermissionId = pid,
            CreatedAt = DateTime.UtcNow
        });

        await _context.ApplicationRolePermissions.AddRangeAsync(newRolePermissions, cancellationToken);
    }

    public async Task<List<ApplicationUser>> GetUsersAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Users
            .OrderBy(u => u.Id)
            .ToListAsync(cancellationToken);
    }

    public async Task<Dictionary<long, List<string>>> GetUserRoleNamesMapAsync(CancellationToken cancellationToken = default)
    {
        var list = await (from ur in _context.UserRoles
                          join r in _context.Roles on ur.RoleId equals r.Id
                          select new { ur.UserId, RoleName = r.Name! })
                          .ToListAsync(cancellationToken);

        return list
            .GroupBy(x => x.UserId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.RoleName).Distinct().ToList());
    }

    public async Task AssignUserRolesAsync(long userId, IEnumerable<string> roleNames, CancellationToken cancellationToken = default)
    {
        var normalizedNames = roleNames.Select(n => n.Trim().ToUpperInvariant()).Distinct().ToList();
        var matchingRoles = await _context.Roles
            .Where(r => normalizedNames.Contains(r.NormalizedName!))
            .ToListAsync(cancellationToken);

        var existingUserRoles = await _context.UserRoles
            .Where(ur => ur.UserId == userId)
            .ToListAsync(cancellationToken);

        _context.UserRoles.RemoveRange(existingUserRoles);

        var newUserRoles = matchingRoles.Select(r => new ApplicationUserRole
        {
            UserId = userId,
            RoleId = r.Id,
            AssignedAt = DateTime.UtcNow
        });

        await _context.UserRoles.AddRangeAsync(newUserRoles, cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
