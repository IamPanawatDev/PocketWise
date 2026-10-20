using PocketWise.Application.DTOs.Roles;
using PocketWise.Application.Features.Roles;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using Xunit;

namespace PocketWise.UnitTests;

public class RolePermissionServiceTests
{
    private class FakeRolePermissionRepository : IRolePermissionRepository
    {
        public List<ApplicationRole> Roles { get; } = new();
        public List<Permission> Permissions { get; } = new();
        public List<ApplicationUser> Users { get; } = new();
        public Dictionary<long, List<string>> UserRoleMap { get; } = new();
        public Dictionary<long, List<int>> RolePermissionMap { get; } = new();
        public int SaveChangesCount { get; private set; }

        public Task<List<ApplicationRole>> GetAllRolesAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult(Roles.OrderBy(r => r.Id).ToList());

        public Task<ApplicationRole?> GetRoleByIdAsync(long roleId, CancellationToken cancellationToken = default)
        {
            var role = Roles.FirstOrDefault(r => r.Id == roleId);
            if (role != null && RolePermissionMap.TryGetValue(roleId, out var permIds))
            {
                role.RolePermissions = permIds.Select(pid => new ApplicationRolePermission
                {
                    RoleId = roleId,
                    PermissionId = pid,
                    Permission = Permissions.FirstOrDefault(p => p.PermissionId == pid) ?? new Permission { PermissionId = pid }
                }).ToList();
            }
            return Task.FromResult(role);
        }

        public Task<ApplicationRole?> GetRoleByNameAsync(string name, CancellationToken cancellationToken = default) =>
            Task.FromResult(Roles.FirstOrDefault(r => string.Equals(r.NormalizedName, name.Trim().ToUpperInvariant(), StringComparison.OrdinalIgnoreCase)));

        public Task<bool> RoleExistsAsync(string name, long? excludeRoleId = null, CancellationToken cancellationToken = default)
        {
            var normalized = name.Trim().ToUpperInvariant();
            var exists = Roles.Any(r => r.NormalizedName == normalized && (!excludeRoleId.HasValue || r.Id != excludeRoleId.Value));
            return Task.FromResult(exists);
        }

        public Task AddRoleAsync(ApplicationRole role, CancellationToken cancellationToken = default)
        {
            if (role.Id == 0) role.Id = Roles.Count + 1;
            Roles.Add(role);
            return Task.CompletedTask;
        }

        public Task DeleteRoleAsync(ApplicationRole role, CancellationToken cancellationToken = default)
        {
            Roles.Remove(role);
            return Task.CompletedTask;
        }

        public Task<List<Permission>> GetAllPermissionsAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult(Permissions.OrderBy(p => p.Module).ThenBy(p => p.PermissionId).ToList());

        public Task<List<Permission>> GetPermissionsByRoleIdAsync(long roleId, CancellationToken cancellationToken = default)
        {
            var permIds = RolePermissionMap.GetValueOrDefault(roleId, []);
            var result = Permissions.Where(p => permIds.Contains(p.PermissionId)).ToList();
            return Task.FromResult(result);
        }

        public Task<Dictionary<long, int>> GetRoleUserCountsAsync(CancellationToken cancellationToken = default)
        {
            var counts = new Dictionary<long, int>();
            foreach (var kvp in UserRoleMap)
            {
                foreach (var roleName in kvp.Value)
                {
                    var r = Roles.FirstOrDefault(x => string.Equals(x.Name, roleName, StringComparison.OrdinalIgnoreCase));
                    if (r != null)
                    {
                        counts[r.Id] = counts.GetValueOrDefault(r.Id, 0) + 1;
                    }
                }
            }
            return Task.FromResult(counts);
        }

        public Task<Dictionary<long, int>> GetRolePermissionCountsAsync(CancellationToken cancellationToken = default)
        {
            var counts = RolePermissionMap.ToDictionary(k => k.Key, v => v.Value.Count);
            return Task.FromResult(counts);
        }

        public Task UpdateRolePermissionsAsync(long roleId, IEnumerable<int> permissionIds, CancellationToken cancellationToken = default)
        {
            RolePermissionMap[roleId] = permissionIds.Distinct().ToList();
            return Task.CompletedTask;
        }

        public Task<List<ApplicationUser>> GetUsersAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult(Users.OrderBy(u => u.Id).ToList());

        public Task<Dictionary<long, List<string>>> GetUserRoleNamesMapAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult(UserRoleMap.ToDictionary(k => k.Key, v => v.Value.ToList()));

        public Task AssignUserRolesAsync(long userId, IEnumerable<string> roleNames, CancellationToken cancellationToken = default)
        {
            UserRoleMap[userId] = roleNames.Distinct().ToList();
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveChangesCount++;
            return Task.CompletedTask;
        }
    }

    private readonly FakeRolePermissionRepository _fakeRepo;
    private readonly RolePermissionService _service;

    public RolePermissionServiceTests()
    {
        _fakeRepo = new FakeRolePermissionRepository();
        _service = new RolePermissionService(_fakeRepo);
    }

    [Fact]
    public async Task GetRolesAsync_ReturnsMappedRolesWithCounts()
    {
        // Arrange
        _fakeRepo.Roles.Add(new ApplicationRole { Id = 1, Name = "Admin", NormalizedName = "ADMIN", Description = "System Admin", IsActive = true, CreatedAt = DateTime.UtcNow });
        _fakeRepo.Roles.Add(new ApplicationRole { Id = 2, Name = "Member", NormalizedName = "MEMBER", Description = "Regular Member", IsActive = true, CreatedAt = DateTime.UtcNow });

        _fakeRepo.UserRoleMap[10] = new List<string> { "Admin", "Member" };
        _fakeRepo.RolePermissionMap[1] = new List<int> { 1, 2, 3 };
        _fakeRepo.RolePermissionMap[2] = new List<int> { 1 };

        // Act
        var result = await _service.GetRolesAsync();

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Equal("Admin", result[0].Name);
        Assert.Equal(1, result[0].UserCount);
        Assert.Equal(3, result[0].PermissionCount);
        Assert.Equal("Member", result[1].Name);
        Assert.Equal(1, result[1].UserCount);
        Assert.Equal(1, result[1].PermissionCount);
    }

    [Fact]
    public async Task CreateRoleAsync_Throws_WhenDuplicateName()
    {
        // Arrange
        _fakeRepo.Roles.Add(new ApplicationRole { Id = 1, Name = "Admin", NormalizedName = "ADMIN" });
        var request = new CreateRoleRequest("Admin", "Duplicate role", null);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateRoleAsync(request));
    }

    [Fact]
    public async Task CreateRoleAsync_Throws_WhenNameIsEmpty()
    {
        // Arrange
        var request = new CreateRoleRequest("   ", "Empty", null);

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => _service.CreateRoleAsync(request));
    }

    [Fact]
    public async Task DeleteRoleAsync_Throws_WhenDeletingAdminRole()
    {
        // Arrange
        _fakeRepo.Roles.Add(new ApplicationRole { Id = 1, Name = "Admin", NormalizedName = "ADMIN" });

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.DeleteRoleAsync(1));
    }

    [Fact]
    public async Task UpdateRolePermissionsAsync_UpdatesAndReturnsRole()
    {
        // Arrange
        _fakeRepo.Roles.Add(new ApplicationRole { Id = 2, Name = "Member", NormalizedName = "MEMBER" });
        _fakeRepo.Permissions.Add(new Permission { PermissionId = 1, PermissionCode = "TRANSACTIONS_VIEW", PermissionName = "ดูธุรกรรม", Module = "Transactions" });
        _fakeRepo.Permissions.Add(new Permission { PermissionId = 2, PermissionCode = "TRANSACTIONS_CREATE", PermissionName = "สร้างธุรกรรม", Module = "Transactions" });

        var request = new UpdateRolePermissionsRequest(new List<int> { 1, 2 });

        // Act
        var result = await _service.UpdateRolePermissionsAsync(2, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Permissions.Count);
        Assert.True(_fakeRepo.SaveChangesCount > 0);
    }

    [Fact]
    public async Task AssignUserRolesAsync_AssignsRolesSuccessfully()
    {
        // Arrange
        _fakeRepo.Users.Add(new ApplicationUser { Id = 10, Email = "user@test.com", DisplayName = "Test User", IsActive = true, CreatedAt = DateTime.UtcNow });

        var request = new AssignUserRolesRequest(new List<string> { "Member" });

        // Act
        var result = await _service.AssignUserRolesAsync(10, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(10, result.UserId);
        Assert.Contains("Member", result.Roles);
        Assert.True(_fakeRepo.SaveChangesCount > 0);
    }
}
