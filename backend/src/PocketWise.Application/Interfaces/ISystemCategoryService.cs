using PocketWise.Application.DTOs.Categories;

namespace PocketWise.Application.Interfaces;

public interface ISystemCategoryService
{
    Task<IReadOnlyList<CategoryResponse>> GetSystemCategoriesAsync(CancellationToken cancellationToken = default);
    Task<CategoryResponse?> GetSystemCategoryByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<CategoryResponse> CreateSystemCategoryAsync(long actorUserId, CreateCategoryRequest request, CancellationToken cancellationToken = default);
    Task<CategoryResponse?> UpdateSystemCategoryAsync(long id, long actorUserId, UpdateCategoryRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteSystemCategoryAsync(long id, long actorUserId, CancellationToken cancellationToken = default);
    Task ReorderSystemCategoriesAsync(long actorUserId, ReorderCategoriesRequest request, CancellationToken cancellationToken = default);
    Task<int> SeedDefaultCategoriesAsync(long actorUserId, CancellationToken cancellationToken = default);
}
