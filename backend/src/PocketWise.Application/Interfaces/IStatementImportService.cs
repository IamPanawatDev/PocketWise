using PocketWise.Application.Features.Imports.DTOs;

namespace PocketWise.Application.Interfaces;

public interface IStatementImportService
{
    Task<CreditCardStatementImportResponse> ImportStatementAsync(
        long userId,
        long creditCardId,
        Stream fileStream,
        string fileName,
        string? format = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CreditCardStatementImportResponse>> GetStatementsByCardIdAsync(
        long userId,
        long creditCardId,
        CancellationToken cancellationToken = default);

    Task<CreditCardStatementImportResponse?> GetStatementByIdAsync(
        long userId,
        long statementId,
        CancellationToken cancellationToken = default);

    Task<BatchConfirmStatementItemsResponse> ConfirmStatementItemsAsync(
        long userId,
        long statementId,
        ConfirmStatementItemsRequest request,
        CancellationToken cancellationToken = default);
}
