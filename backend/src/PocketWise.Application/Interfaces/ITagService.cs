using PocketWise.Application.DTOs.Tags;

namespace PocketWise.Application.Interfaces;

public interface ITagService
{
    Task<IReadOnlyList<TagResponse>> GetAllAsync(long userId, CancellationToken cancellationToken = default);
    Task<TagResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<TagResponse> CreateAsync(long userId, CreateTagRequest request, CancellationToken cancellationToken = default);
    Task<TagResponse?> UpdateAsync(long id, long userId, UpdateTagRequest request, CancellationToken cancellationToken = default);
    Task ReorderAsync(long userId, ReorderTagsRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, long userId, CancellationToken cancellationToken = default);
}
