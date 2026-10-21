using PocketWise.Application.DTOs;
using PocketWise.Application.Features.Imports.DTOs;
using PocketWise.Domain.Enums;

namespace PocketWise.Application.Interfaces;

public interface IImportJobService
{
    Task<PagedResult<ImportJobResponse>> GetJobsAsync(
        long userId,
        int page,
        int pageSize,
        ImportType? type = null,
        CancellationToken cancellationToken = default);

    Task<ImportJobResponse?> GetJobByIdAsync(
        long userId,
        long jobId,
        CancellationToken cancellationToken = default);
}
