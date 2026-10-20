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
}
