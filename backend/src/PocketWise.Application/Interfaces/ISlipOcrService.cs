using PocketWise.Application.Features.Imports.DTOs;

namespace PocketWise.Application.Interfaces;

public interface ISlipOcrService
{
    Task<SlipExtractedData> ExtractDataAsync(Stream fileStream, string fileName, string contentType, CancellationToken cancellationToken = default);
}
