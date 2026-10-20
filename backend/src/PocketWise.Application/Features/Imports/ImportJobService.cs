using PocketWise.Application.DTOs;
using PocketWise.Application.Features.Imports.DTOs;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;

namespace PocketWise.Application.Features.Imports;

public class ImportJobService : IImportJobService
{
    private readonly IImportRepository _repository;

    public ImportJobService(IImportRepository repository)
    {
        _repository = repository;
    }

    public async Task<PagedResult<ImportJobResponse>> GetJobsAsync(
        long userId,
        int page,
        int pageSize,
        ImportType? type = null,
        CancellationToken cancellationToken = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 100) pageSize = 100;

        var paged = await _repository.GetImportJobsPagedAsync(userId, page, pageSize, type, cancellationToken);

        return new PagedResult<ImportJobResponse>
        {
            Items = paged.Items.Select(MapToResponse).ToList(),
            Page = paged.Page,
            PageSize = paged.PageSize,
            TotalItems = paged.TotalItems,
            TotalPages = paged.TotalPages
        };
    }

    public async Task<ImportJobResponse?> GetJobByIdAsync(
        long userId,
        long jobId,
        CancellationToken cancellationToken = default)
    {
        var job = await _repository.GetImportJobByIdAsync(userId, jobId, cancellationToken);
        if (job == null) return null;

        return MapToResponse(job);
    }

    private static ImportJobResponse MapToResponse(ImportJob job)
    {
        return new ImportJobResponse
        {
            ImportJobId = job.ImportJobId,
            ImportType = job.ImportType switch
            {
                ImportType.Slip => "slip",
                ImportType.CardStatement => "cardStatement",
                _ => job.ImportType.ToString().ToLowerInvariant()
            },
            FileName = job.FileName,
            Status = job.Status switch
            {
                ImportJobStatus.Pending => "pending",
                ImportJobStatus.Processing => "processing",
                ImportJobStatus.NeedsReview => "needsReview",
                ImportJobStatus.Completed => "completed",
                ImportJobStatus.Failed => "failed",
                _ => job.Status.ToString().ToLowerInvariant()
            },
            TotalRecords = job.TotalRecords,
            ImportedRecords = job.ImportedRecords,
            DuplicateRecords = job.DuplicateRecords,
            ErrorMessage = job.ErrorMessage,
            StartedAt = job.StartedAt,
            CompletedAt = job.CompletedAt,
            CreatedAt = job.CreatedAt
        };
    }
}
