using FluentValidation;
using FluentValidation.Results;
using PocketWise.Application.DTOs.Categories;
using PocketWise.Application.Features.Categories;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Domain.Rules;
using Xunit;

namespace PocketWise.UnitTests;

public class SystemCategoryServiceTests
{
    private class FakeCategoryRepository : ICategoryRepository
    {
        public List<Category> Categories { get; } = new();
        public HashSet<long> CategoriesWithTransactions { get; } = new();

        public Task<Category?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default) =>
            Task.FromResult(Categories.FirstOrDefault(c => c.CategoryId == id && (c.UserId == userId || c.IsSystem)));

        public Task<IReadOnlyList<Category>> GetAllAsync(long userId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Category>>(Categories.Where(c => c.UserId == userId || c.IsSystem).OrderBy(c => c.SortOrder).ToList());

        public Task AddAsync(Category category, CancellationToken cancellationToken = default)
        {
            if (category.CategoryId == 0)
            {
                category.CategoryId = Categories.Count > 0 ? Categories.Max(c => c.CategoryId) + 1 : 1;
            }
            Categories.Add(category);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(Category category, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task DeleteAsync(Category category, CancellationToken cancellationToken = default)
        {
            Categories.Remove(category);
            return Task.CompletedTask;
        }

        public Task<bool> NameExistsAsync(long userId, string name, long? excludeId = null, CancellationToken cancellationToken = default) =>
            Task.FromResult(Categories.Any(c => c.UserId == userId && c.CategoryName.Equals(name, StringComparison.OrdinalIgnoreCase) && (!excludeId.HasValue || c.CategoryId != excludeId.Value)));

        public Task<bool> HasTransactionsAsync(long categoryId, CancellationToken cancellationToken = default) =>
            Task.FromResult(CategoriesWithTransactions.Contains(categoryId));

        public Task<IReadOnlyList<Category>> GetSystemCategoriesAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Category>>(Categories.Where(c => c.IsSystem).OrderBy(c => c.SortOrder).ToList());

        public Task<Category?> GetSystemCategoryByIdAsync(long id, CancellationToken cancellationToken = default) =>
            Task.FromResult(Categories.FirstOrDefault(c => c.IsSystem && c.CategoryId == id));

        public Task<bool> SystemNameExistsAsync(string name, long? excludeId = null, CancellationToken cancellationToken = default) =>
            Task.FromResult(Categories.Any(c => c.IsSystem && c.CategoryName.Equals(name, StringComparison.OrdinalIgnoreCase) && (!excludeId.HasValue || c.CategoryId != excludeId.Value)));

        public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private class FakeValidator<T> : IValidator<T>
    {
        public ValidationResult Validate(T instance) => new();
        public ValidationResult Validate(IValidationContext context) => new();
        public Task<ValidationResult> ValidateAsync(T instance, CancellationToken cancellation = default) =>
            Task.FromResult(new ValidationResult());
        public Task<ValidationResult> ValidateAsync(IValidationContext context, CancellationToken cancellation = default) =>
            Task.FromResult(new ValidationResult());
        public IValidatorDescriptor CreateDescriptor() => throw new NotImplementedException();
        public bool CanValidateInstancesOfType(Type type) => type == typeof(T);
    }

    [Fact]
    public async Task SeedDefaultCategoriesAsync_WhenEmpty_SeedsTwelveCategories()
    {
        var repo = new FakeCategoryRepository();
        var service = new SystemCategoryService(repo, new FakeValidator<CreateCategoryRequest>(), new FakeValidator<UpdateCategoryRequest>());

        var added = await service.SeedDefaultCategoriesAsync(1);
        Assert.Equal(12, added);

        var list = await service.GetSystemCategoriesAsync();
        Assert.Equal(12, list.Count);
        Assert.Contains(list, c => c.CategoryName == "อาหารและเครื่องดื่ม" && c.CategoryType == CategoryType.Expense);
        Assert.Contains(list, c => c.CategoryName == "เงินเดือน" && c.CategoryType == CategoryType.Income);

        // Run seed again - should be idempotent
        var addedSecondTime = await service.SeedDefaultCategoriesAsync(1);
        Assert.Equal(0, addedSecondTime);
        Assert.Equal(12, (await service.GetSystemCategoriesAsync()).Count);
    }

    [Fact]
    public async Task CreateSystemCategoryAsync_Success_AndThrowsOnDuplicate()
    {
        var repo = new FakeCategoryRepository();
        var service = new SystemCategoryService(repo, new FakeValidator<CreateCategoryRequest>(), new FakeValidator<UpdateCategoryRequest>());

        var created = await service.CreateSystemCategoryAsync(1, new CreateCategoryRequest
        {
            CategoryName = "เงินปันผล",
            CategoryType = CategoryType.Income,
            Icon = "TrendingUp",
            Color = "#10B981"
        });

        Assert.NotNull(created);
        Assert.True(created.IsSystem);
        Assert.Equal("เงินปันผล", created.CategoryName);

        // Duplicate name should throw BusinessException
        await Assert.ThrowsAsync<BusinessException>(() =>
            service.CreateSystemCategoryAsync(1, new CreateCategoryRequest
            {
                CategoryName = "เงินปันผล",
                CategoryType = CategoryType.Income,
                Icon = "TrendingUp",
                Color = "#10B981"
            }));
    }

    [Fact]
    public async Task DeleteSystemCategoryAsync_WithTransactions_ThrowsConflict()
    {
        var repo = new FakeCategoryRepository();
        var service = new SystemCategoryService(repo, new FakeValidator<CreateCategoryRequest>(), new FakeValidator<UpdateCategoryRequest>());

        var cat = await service.CreateSystemCategoryAsync(1, new CreateCategoryRequest
        {
            CategoryName = "อาหาร",
            CategoryType = CategoryType.Expense,
            Icon = "Utensils",
            Color = "#EF4444"
        });

        repo.CategoriesWithTransactions.Add(cat.CategoryId);

        var ex = await Assert.ThrowsAsync<BusinessException>(() => service.DeleteSystemCategoryAsync(cat.CategoryId, 1));
        Assert.Equal("CONFLICT", ex.Code);
    }

    [Fact]
    public async Task ReorderSystemCategoriesAsync_UpdatesSortOrders()
    {
        var repo = new FakeCategoryRepository();
        var service = new SystemCategoryService(repo, new FakeValidator<CreateCategoryRequest>(), new FakeValidator<UpdateCategoryRequest>());

        var c1 = await service.CreateSystemCategoryAsync(1, new CreateCategoryRequest { CategoryName = "A", CategoryType = CategoryType.Expense, Icon = "A", Color = "#000" });
        var c2 = await service.CreateSystemCategoryAsync(1, new CreateCategoryRequest { CategoryName = "B", CategoryType = CategoryType.Expense, Icon = "B", Color = "#000" });

        await service.ReorderSystemCategoriesAsync(1, new ReorderCategoriesRequest
        {
            Items = new List<CategoryOrderItem>
            {
                new() { CategoryId = c2.CategoryId, SortOrder = 1 },
                new() { CategoryId = c1.CategoryId, SortOrder = 2 }
            }
        });

        var updated = await service.GetSystemCategoriesAsync();
        Assert.Equal(1, updated.First(c => c.CategoryId == c2.CategoryId).SortOrder);
        Assert.Equal(2, updated.First(c => c.CategoryId == c1.CategoryId).SortOrder);
    }
}
