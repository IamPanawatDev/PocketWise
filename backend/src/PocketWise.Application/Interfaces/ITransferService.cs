using PocketWise.Application.DTOs.Transfers;

namespace PocketWise.Application.Interfaces;

public interface ITransferService
{
    Task<IReadOnlyList<TransferResponse>> GetAllAsync(long userId, CancellationToken cancellationToken = default);
    Task<TransferResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<TransferResponse> CreateAsync(long userId, CreateTransferRequest request, CancellationToken cancellationToken = default);
}
