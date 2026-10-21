using System.Text.Json;
using Microsoft.Extensions.Logging.Abstractions;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.AuditLogs;
using PocketWise.Application.Features.AuditLogs;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using Xunit;

namespace PocketWise.UnitTests;

public class AuditLogServiceTests
{
    private class FakeAuditLogRepository : IAuditLogRepository
    {
        public List<AuditLog> Logs { get; } = new();

        public Task AddAsync(AuditLog log, CancellationToken cancellationToken = default)
        {
            if (log.AuditLogId == 0) log.AuditLogId = Logs.Count + 1;
            Logs.Add(log);
            return Task.CompletedTask;
        }

        public Task<PagedResult<AuditLog>> GetPagedAsync(
            long? userId,
            AuditLogFilter filter,
            int page,
            int pageSize,
            CancellationToken cancellationToken = default)
        {
            var query = Logs.AsQueryable();

            if (userId.HasValue)
            {
                query = query.Where(a => a.UserId == userId.Value);
            }
            else if (filter.UserId.HasValue)
            {
                query = query.Where(a => a.UserId == filter.UserId.Value);
            }

            if (filter.Action.HasValue)
            {
                query = query.Where(a => a.Action == filter.Action.Value);
            }

            if (!string.IsNullOrWhiteSpace(filter.EntityType))
            {
                query = query.Where(a => a.EntityType == filter.EntityType);
            }

            if (!string.IsNullOrWhiteSpace(filter.EntityId))
            {
                query = query.Where(a => a.EntityId == filter.EntityId);
            }

            if (filter.FromDate.HasValue)
            {
                query = query.Where(a => a.OccurredAt >= filter.FromDate.Value);
            }

            if (filter.ToDate.HasValue)
            {
                query = query.Where(a => a.OccurredAt <= filter.ToDate.Value);
            }

            if (!string.IsNullOrWhiteSpace(filter.Q))
            {
                var q = filter.Q.Trim();
                query = query.Where(a =>
                    a.EntityType.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                    (a.EntityId != null && a.EntityId.Contains(q, StringComparison.OrdinalIgnoreCase)) ||
                    (a.DetailsJson != null && a.DetailsJson.Contains(q, StringComparison.OrdinalIgnoreCase)));
            }

            var total = query.Count();
            var items = query.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            return Task.FromResult(new PagedResult<AuditLog>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalItems = total,
                TotalPages = (int)Math.Ceiling(total / (double)pageSize)
            });
        }

        public Task<AuditLog?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Logs.FirstOrDefault(l => l.AuditLogId == id));
        }

        public Task<IReadOnlyList<string>> GetEntityTypesAsync(long? userId, CancellationToken cancellationToken = default)
        {
            var query = Logs.AsQueryable();
            if (userId.HasValue)
            {
                query = query.Where(l => l.UserId == userId.Value);
            }

            IReadOnlyList<string> result = query.Select(l => l.EntityType).Distinct().OrderBy(e => e).ToList();
            return Task.FromResult(result);
        }

        public bool IsEnabled { get; set; } = true;

        public Task<int> GetTotalCountAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Logs.Count);
        }

        public Task<(DateTime? Oldest, DateTime? Latest)> GetDateRangeAsync(CancellationToken cancellationToken = default)
        {
            if (Logs.Count == 0) return Task.FromResult(((DateTime?)null, (DateTime?)null));
            return Task.FromResult(((DateTime?)Logs.Min(l => l.OccurredAt), (DateTime?)Logs.Max(l => l.OccurredAt)));
        }

        public Task<int> PurgeOlderThanAsync(DateTime? cutoffDate, CancellationToken cancellationToken = default)
        {
            int removed;
            if (cutoffDate.HasValue)
            {
                removed = Logs.RemoveAll(l => l.OccurredAt < cutoffDate.Value);
            }
            else
            {
                removed = Logs.Count;
                Logs.Clear();
            }
            return Task.FromResult(removed);
        }

        public Task<bool> IsAuditLogEnabledAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(IsEnabled);
        }

        public Task SetAuditLogEnabledAsync(bool enabled, long? updatedByUserId, CancellationToken cancellationToken = default)
        {
            IsEnabled = enabled;
            return Task.CompletedTask;
        }
    }

    private readonly FakeAuditLogRepository _fakeRepo = new();
    private readonly AuditLogService _service;

    public AuditLogServiceTests()
    {
        _service = new AuditLogService(_fakeRepo, NullLogger<AuditLogService>.Instance);
    }

    [Fact]
    public async Task LogAsync_RecordsAuditLog_AndMasksSensitiveFields()
    {
        // Arrange
        var details = new
        {
            description = "โอนเงิน",
            password = "supersecretpassword",
            token = "jwt.token.here",
            fullCardNumber = "4111222233334444",
            nested = new
            {
                cvv = "123",
                normalField = "visibleValue"
            }
        };

        // Act
        await _service.LogAsync(101, AuditAction.Create, "Transactions", "501", details);

        // Assert
        Assert.Single(_fakeRepo.Logs);
        var log = _fakeRepo.Logs[0];
        Assert.Equal(101, log.UserId);
        Assert.Equal(AuditAction.Create, log.Action);
        Assert.Equal("Transactions", log.EntityType);
        Assert.Equal("501", log.EntityId);
        Assert.NotNull(log.DetailsJson);

        using var doc = JsonDocument.Parse(log.DetailsJson);
        var root = doc.RootElement;
        Assert.Equal("โอนเงิน", root.GetProperty("description").GetString());
        Assert.Equal("***MASKED***", root.GetProperty("password").GetString());
        Assert.Equal("***MASKED***", root.GetProperty("token").GetString());
        Assert.Equal("***MASKED***", root.GetProperty("fullCardNumber").GetString());
        Assert.Equal("***MASKED***", root.GetProperty("nested").GetProperty("cvv").GetString());
        Assert.Equal("visibleValue", root.GetProperty("nested").GetProperty("normalField").GetString());
    }

    [Fact]
    public async Task GetLogsPagedAsync_ForNonAdmin_EnforcesCurrentUserId()
    {
        // Arrange
        _fakeRepo.Logs.Add(new AuditLog { AuditLogId = 1, UserId = 101, Action = AuditAction.Create, EntityType = "Transactions" });
        _fakeRepo.Logs.Add(new AuditLog { AuditLogId = 2, UserId = 202, Action = AuditAction.Update, EntityType = "Transactions" });

        var filter = new AuditLogFilter { UserId = 202 }; // Non-admin attempts to query another user's logs

        // Act
        var result = await _service.GetLogsPagedAsync(currentUserId: 101, isAdmin: false, filter, page: 1, pageSize: 10);

        // Assert: must only return user 101's logs
        Assert.Single(result.Items);
        Assert.Equal(101, result.Items[0].UserId);
    }

    [Fact]
    public async Task GetLogsPagedAsync_ForAdmin_CanQueryAnyUser()
    {
        // Arrange
        _fakeRepo.Logs.Add(new AuditLog { AuditLogId = 1, UserId = 101, Action = AuditAction.Create, EntityType = "Transactions" });
        _fakeRepo.Logs.Add(new AuditLog { AuditLogId = 2, UserId = 202, Action = AuditAction.Update, EntityType = "Budgets" });

        var filter = new AuditLogFilter { UserId = 202 };

        // Act
        var result = await _service.GetLogsPagedAsync(currentUserId: 999, isAdmin: true, filter, page: 1, pageSize: 10);

        // Assert: admin can query user 202's logs
        Assert.Single(result.Items);
        Assert.Equal(202, result.Items[0].UserId);
        Assert.Equal("Budgets", result.Items[0].EntityType);
    }

    [Fact]
    public async Task GetLogsPagedAsync_FiltersByActionAndEntityType()
    {
        // Arrange
        _fakeRepo.Logs.Add(new AuditLog { AuditLogId = 1, UserId = 101, Action = AuditAction.Create, EntityType = "Transactions" });
        _fakeRepo.Logs.Add(new AuditLog { AuditLogId = 2, UserId = 101, Action = AuditAction.Delete, EntityType = "Transactions" });
        _fakeRepo.Logs.Add(new AuditLog { AuditLogId = 3, UserId = 101, Action = AuditAction.Create, EntityType = "Categories" });

        var filter = new AuditLogFilter { Action = AuditAction.Create, EntityType = "Transactions" };

        // Act
        var result = await _service.GetLogsPagedAsync(currentUserId: 101, isAdmin: false, filter, page: 1, pageSize: 10);

        // Assert
        Assert.Single(result.Items);
        Assert.Equal(1, result.Items[0].AuditLogId);
        Assert.Equal("Create", result.Items[0].Action);
        Assert.Equal("Transactions", result.Items[0].EntityType);
    }

    [Fact]
    public async Task GetLogByIdAsync_ReturnsLog_WhenOwnerOrAdmin()
    {
        // Arrange
        _fakeRepo.Logs.Add(new AuditLog { AuditLogId = 1, UserId = 101, Action = AuditAction.Create, EntityType = "Transactions" });

        // Act
        var ownerResult = await _service.GetLogByIdAsync(1, currentUserId: 101, isAdmin: false);
        var adminResult = await _service.GetLogByIdAsync(1, currentUserId: 999, isAdmin: true);

        // Assert
        Assert.NotNull(ownerResult);
        Assert.Equal(1, ownerResult.AuditLogId);
        Assert.NotNull(adminResult);
        Assert.Equal(1, adminResult.AuditLogId);
    }

    [Fact]
    public async Task GetLogByIdAsync_ReturnsNull_WhenNonAdminAccessesOtherUserLog()
    {
        // Arrange
        _fakeRepo.Logs.Add(new AuditLog { AuditLogId = 1, UserId = 101, Action = AuditAction.Create, EntityType = "Transactions" });

        // Act
        var otherUserResult = await _service.GetLogByIdAsync(1, currentUserId: 202, isAdmin: false);

        // Assert
        Assert.Null(otherUserResult);
    }

    [Fact]
    public async Task GetEntityTypesAsync_ReturnsDistinctTypes()
    {
        // Arrange
        _fakeRepo.Logs.Add(new AuditLog { AuditLogId = 1, UserId = 101, EntityType = "Transactions" });
        _fakeRepo.Logs.Add(new AuditLog { AuditLogId = 2, UserId = 101, EntityType = "Transactions" });
        _fakeRepo.Logs.Add(new AuditLog { AuditLogId = 3, UserId = 101, EntityType = "Budgets" });
        _fakeRepo.Logs.Add(new AuditLog { AuditLogId = 4, UserId = 202, EntityType = "CreditCards" });

        // Act
        var userTypes = await _service.GetEntityTypesAsync(currentUserId: 101, isAdmin: false);
        var adminTypes = await _service.GetEntityTypesAsync(currentUserId: 999, isAdmin: true);

        // Assert
        Assert.Equal(2, userTypes.Count);
        Assert.Contains("Transactions", userTypes);
        Assert.Contains("Budgets", userTypes);
        Assert.DoesNotContain("CreditCards", userTypes);

        Assert.Equal(3, adminTypes.Count);
        Assert.Contains("CreditCards", adminTypes);
    }

    [Fact]
    public async Task GetSettingsAsync_ReturnsRepositorySettings()
    {
        // Arrange
        _fakeRepo.IsEnabled = true;
        _fakeRepo.Logs.Add(new AuditLog { AuditLogId = 1, OccurredAt = DateTime.UtcNow.AddDays(-5) });
        _fakeRepo.Logs.Add(new AuditLog { AuditLogId = 2, OccurredAt = DateTime.UtcNow });

        // Act
        var settings = await _service.GetSettingsAsync();

        // Assert
        Assert.True(settings.IsEnabled);
        Assert.Equal(2, settings.TotalLogs);
        Assert.NotNull(settings.OldestLogDate);
        Assert.NotNull(settings.LatestLogDate);
    }

    [Fact]
    public async Task SetSettingsAsync_UpdatesStatus_AndInvalidatesCache()
    {
        // Act
        await _service.SetSettingsAsync(false, actorUserId: 99);

        // Assert
        Assert.False(_fakeRepo.IsEnabled);
    }

    [Fact]
    public async Task LogAsync_SkipsRecording_WhenAuditLogIsDisabled()
    {
        // Arrange: disable audit log
        await _service.SetSettingsAsync(false, actorUserId: 99);
        _fakeRepo.Logs.Clear();

        // Act
        await _service.LogAsync(1, AuditAction.Create, "Transactions", "123", new { Amount = 100 });

        // Assert
        Assert.Empty(_fakeRepo.Logs);
    }

    [Fact]
    public async Task LogAsync_UsesCurrentUserContext_WhenUserIdIsNull()
    {
        // Arrange
        var fakeContext = new FakeCurrentUserContext(userId: 777, email: "context@user.com");
        var serviceWithContext = new AuditLogService(_fakeRepo, NullLogger<AuditLogService>.Instance, fakeContext);

        // Act
        await serviceWithContext.LogAsync(null, AuditAction.Create, "TestEntity", "1");

        // Assert
        Assert.Single(_fakeRepo.Logs);
        Assert.Equal(777, _fakeRepo.Logs[0].UserId);
    }

    [Fact]
    public async Task PurgeLogsAsync_PurgesOldLogs_Successfully()
    {
        // Arrange
        _fakeRepo.Logs.Add(new AuditLog { AuditLogId = 1, OccurredAt = DateTime.UtcNow.AddDays(-100) });
        _fakeRepo.Logs.Add(new AuditLog { AuditLogId = 2, OccurredAt = DateTime.UtcNow.AddDays(-10) });

        // Act - purge older than 30 days
        var purgeResult = await _service.PurgeLogsAsync(30, actorUserId: 99);

        // Assert
        Assert.Equal(1, purgeResult.DeletedCount);
        // Remains: un-purged log #2, plus the new audit log recording the purge action itself
        Assert.Equal(2, _fakeRepo.Logs.Count);
        Assert.Contains(_fakeRepo.Logs, l => l.AuditLogId == 2);
        Assert.Contains(_fakeRepo.Logs, l => l.EntityType == "AuditLogs" && l.EntityId == "purge");
    }

    private class FakeCurrentUserContext : ICurrentUserContext
    {
        public FakeCurrentUserContext(long? userId, string? email)
        {
            UserId = userId;
            UserEmail = email;
            IsAuthenticated = userId.HasValue;
        }

        public long? UserId { get; }
        public string? UserEmail { get; }
        public bool IsAuthenticated { get; }
    }
}
