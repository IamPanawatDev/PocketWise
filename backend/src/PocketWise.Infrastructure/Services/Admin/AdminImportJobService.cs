using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.Admin;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Services.Admin;

public class AdminImportJobService : IAdminImportJobService
{
    private readonly PocketWiseDbContext _context;
    private readonly ISecurityEventService _securityEventService;
    private readonly ILogger<AdminImportJobService> _logger;

    public AdminImportJobService(
        PocketWiseDbContext context,
        ISecurityEventService securityEventService,
        ILogger<AdminImportJobService> logger)
    {
        _context = context;
        _securityEventService = securityEventService;
        _logger = logger;
    }

    public async Task<PagedResult<AdminImportJobListResponse>> GetImportJobsPagedAsync(
        AdminImportJobFilterRequest filter,
        CancellationToken cancellationToken = default)
    {
        var query = _context.ImportJobs
            .Include(j => j.User)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Status) && Enum.TryParse<ImportJobStatus>(filter.Status, true, out var status))
        {
            query = query.Where(j => j.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(filter.JobType) && Enum.TryParse<ImportType>(filter.JobType, true, out var importType))
        {
            query = query.Where(j => j.ImportType == importType);
        }

        if (filter.UserId.HasValue)
        {
            query = query.Where(j => j.UserId == filter.UserId.Value);
        }

        if (filter.FromDate.HasValue)
        {
            query = query.Where(j => j.CreatedAt >= filter.FromDate.Value.ToUniversalTime());
        }

        if (filter.ToDate.HasValue)
        {
            query = query.Where(j => j.CreatedAt <= filter.ToDate.Value.ToUniversalTime());
        }

        if (!string.IsNullOrWhiteSpace(filter.Q))
        {
            var search = filter.Q.Trim().ToLower();
            query = query.Where(j =>
                (j.FileName != null && j.FileName.ToLower().Contains(search)) ||
                (j.User.Email != null && j.User.Email.ToLower().Contains(search)) ||
                j.User.DisplayName.ToLower().Contains(search));
        }

        var total = await query.CountAsync(cancellationToken);

        var page = Math.Max(1, filter.Page);
        var pageSize = Math.Clamp(filter.PageSize, 1, 100);

        var items = await query
            .OrderByDescending(j => j.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(j => new AdminImportJobListResponse
            {
                ImportJobId = j.ImportJobId,
                UserId = j.UserId,
                UserEmail = j.User.Email,
                UserDisplayName = j.User.DisplayName,
                JobType = j.ImportType.ToString(),
                Status = j.Status.ToString(),
                FileName = j.FileName ?? string.Empty,
                TotalRecords = j.TotalRecords,
                SuccessRecords = j.ImportedRecords,
                FailedRecords = j.TotalRecords - j.ImportedRecords - j.DuplicateRecords > 0 ? j.TotalRecords - j.ImportedRecords - j.DuplicateRecords : 0,
                RetryCount = j.RetryCount,
                ErrorMessage = j.ErrorMessage,
                CreatedAt = j.CreatedAt,
                CompletedAt = j.CompletedAt
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<AdminImportJobListResponse>(items, page, pageSize, total);
    }

    public async Task<bool> RetryImportJobAsync(long jobId, long adminUserId, CancellationToken cancellationToken = default)
    {
        var job = await _context.ImportJobs.FirstOrDefaultAsync(j => j.ImportJobId == jobId, cancellationToken);
        if (job == null) return false;

        if (job.Status != ImportJobStatus.Failed)
        {
            throw new InvalidOperationException("สามารถลองใหม่ได้เฉพาะงานที่สถานะ ล้มเหลว (Failed) เท่านั้น");
        }

        if (job.RetryCount >= 5)
        {
            throw new InvalidOperationException("งานนี้ลองใหม่ครบจำนวนสูงสุด 5 ครั้งแล้ว ไม่สามารถลองใหม่ได้อีก");
        }

        job.RetryCount += 1;
        job.Status = ImportJobStatus.Pending;
        job.ErrorMessage = null;
        job.StartedAt = null;
        job.CompletedAt = null;

        await _context.SaveChangesAsync(cancellationToken);

        await _securityEventService.LogEventAsync(
            "IMPORT_JOB_RETRIED",
            targetUserId: job.UserId,
            actorUserId: adminUserId,
            succeeded: true,
            ipAddress: null,
            userAgent: null,
            details: new { jobId, retryCount = job.RetryCount },
            cancellationToken: cancellationToken);

        return true;
    }

    public async Task<bool> CancelImportJobAsync(long jobId, long adminUserId, CancellationToken cancellationToken = default)
    {
        var job = await _context.ImportJobs.FirstOrDefaultAsync(j => j.ImportJobId == jobId, cancellationToken);
        if (job == null) return false;

        if (job.Status != ImportJobStatus.Pending && job.Status != ImportJobStatus.Processing && job.Status != ImportJobStatus.NeedsReview)
        {
            throw new InvalidOperationException("สามารถยกเลิกได้เฉพาะงานที่อยู่ระหว่างรอดำเนินการหรือประมวลผลเท่านั้น");
        }

        job.Status = ImportJobStatus.Cancelled;
        job.CompletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        await _securityEventService.LogEventAsync(
            "IMPORT_JOB_CANCELLED",
            targetUserId: job.UserId,
            actorUserId: adminUserId,
            succeeded: true,
            ipAddress: null,
            userAgent: null,
            details: new { jobId },
            cancellationToken: cancellationToken);

        return true;
    }
}
