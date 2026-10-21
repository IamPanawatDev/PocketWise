using PocketWise.Application.Features.Imports.DTOs;

namespace PocketWise.Application.Interfaces;

public interface IStatementParserService
{
    Task<ParsedStatementData> ParseStatementAsync(Stream stream, string fileName, string? format = null, CancellationToken cancellationToken = default);
}
