using PocketWise.Application.DTOs.Transactions;
using PocketWise.Application.Features.Imports.DTOs;

namespace PocketWise.Application.Interfaces;

public interface ISlipImportService
{
    Task<SlipImportResponse> UploadSlipAsync(
        long userId,
        Stream fileStream,
        string fileName,
        string contentType,
        long fileSize,
        string? bankCode = null,
        CancellationToken cancellationToken = default);

    Task<SlipImportResponse?> GetSlipByIdAsync(
        long userId,
        long slipId,
        CancellationToken cancellationToken = default);

    Task<(Stream Stream, string ContentType, string FileName)?> GetSlipFileStreamAsync(
        long userId,
        long slipId,
        CancellationToken cancellationToken = default);

    Task<TransactionResponse> ConfirmSlipAsync(
        long userId,
        long slipId,
        ConfirmSlipRequest request,
        CancellationToken cancellationToken = default);

    Task<bool> RejectSlipAsync(
        long userId,
        long slipId,
        CancellationToken cancellationToken = default);
}
