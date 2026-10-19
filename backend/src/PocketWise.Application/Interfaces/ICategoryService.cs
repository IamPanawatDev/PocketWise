using PocketWise.Application.DTOs.Categories;

namespace PocketWise.Application.Interfaces;

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryResponse>> GetAllAsync(long userId, CancellationToken cancellationToken = default);
    Task<CategoryResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<CategoryResponse> CreateAsync(long userId, CreateCategoryRequest request, CancellationToken cancellationToken = default);
    Task<CategoryResponse?> UpdateAsync(long id, long userId, UpdateCategoryRequest request, CancellationToken cancellationToken = default);
    Task ReorderAsync(long userId, ReorderCategoriesRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(long id, long userId, CancellationToken cancellationToken = default);
}
