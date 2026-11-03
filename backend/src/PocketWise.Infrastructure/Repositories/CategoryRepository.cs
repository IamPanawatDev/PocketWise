using Microsoft.EntityFrameworkCore;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Repositories;

public class CategoryRepository : ICategoryRepository
{
    private readonly PocketWiseDbContext _context;

    public CategoryRepository(PocketWiseDbContext context)
    {
        _context = context;
    }

    public async Task<Category?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        return await _context.Categories
            .FirstOrDefaultAsync(c => c.CategoryId == id && (c.UserId == userId || c.IsSystem), cancellationToken);
    }

    public async Task<IReadOnlyList<Category>> GetAllAsync(long userId, CancellationToken cancellationToken = default)
    {
        var categories = await _context.Categories
            .AsNoTracking()
            .Where(c => c.UserId == userId || c.IsSystem)
            .ToListAsync(cancellationToken);

        var userOrders = await _context.UserCategoryOrders
            .AsNoTracking()
            .Where(o => o.UserId == userId)
            .ToDictionaryAsync(o => o.CategoryId, o => o.SortOrder, cancellationToken);

        if (userOrders.Count > 0)
        {
            return categories
                .OrderBy(c => userOrders.TryGetValue(c.CategoryId, out var order) ? order : (c.IsSystem ? 1000 + c.SortOrder : 2000 + c.SortOrder))
                .ThenBy(c => c.CategoryName)
                .ToList();
        }

        return categories
            .OrderBy(c => c.IsSystem ? 0 : 1)
            .ThenBy(c => c.SortOrder)
            .ThenBy(c => c.CategoryName)
            .ToList();
    }

    public async Task<bool> NameExistsAsync(long userId, string name, long? excludeId = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Categories
            .Where(c => (c.UserId == userId || c.IsSystem) && c.CategoryName == name);

        if (excludeId.HasValue)
        {
            query = query.Where(c => c.CategoryId != excludeId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    public Task AddAsync(Category category, CancellationToken cancellationToken = default)
    {
        _context.Categories.Add(category);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Category category, CancellationToken cancellationToken = default)
    {
        _context.Categories.Update(category);
        return Task.CompletedTask;
    }

    public async Task<bool> HasTransactionsAsync(long id, CancellationToken cancellationToken = default)
    {
        return await _context.Transactions
            .AnyAsync(t => t.CategoryId == id, cancellationToken);
    }

    public async Task<IReadOnlyList<Category>> GetSystemCategoriesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Categories
            .AsNoTracking()
            .Where(c => c.IsSystem)
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.CategoryName)
            .ToListAsync(cancellationToken);
    }

    public async Task<Category?> GetSystemCategoryByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        return await _context.Categories
            .FirstOrDefaultAsync(c => c.CategoryId == id && c.IsSystem, cancellationToken);
    }

    public async Task<bool> SystemNameExistsAsync(string name, long? excludeId = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Categories
            .Where(c => c.IsSystem && c.CategoryName == name);

        if (excludeId.HasValue)
        {
            query = query.Where(c => c.CategoryId != excludeId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    public async Task UpsertUserCategoryOrdersAsync(long userId, IEnumerable<(long CategoryId, int SortOrder)> orders, CancellationToken cancellationToken = default)
    {
        var existingOrders = await _context.UserCategoryOrders
            .Where(o => o.UserId == userId)
            .ToListAsync(cancellationToken);

        var existingMap = existingOrders.ToDictionary(o => o.CategoryId);

        foreach (var (categoryId, sortOrder) in orders)
        {
            if (existingMap.TryGetValue(categoryId, out var existing))
            {
                existing.SortOrder = sortOrder;
            }
            else
            {
                _context.UserCategoryOrders.Add(new UserCategoryOrder
                {
                    UserId = userId,
                    CategoryId = categoryId,
                    SortOrder = sortOrder,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }
    }

    public Task DeleteAsync(Category category, CancellationToken cancellationToken = default)
    {
        _context.Categories.Remove(category);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return _context.SaveChangesAsync(cancellationToken);
    }
}
