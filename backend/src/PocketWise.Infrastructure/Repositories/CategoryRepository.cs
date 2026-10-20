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
        return await _context.Categories
            .AsNoTracking()
            .Where(c => c.UserId == userId || c.IsSystem)
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.CategoryName)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> NameExistsAsync(long userId, string name, long? excludeId = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Categories.Where(c => c.UserId == userId && c.CategoryName == name);
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
        return await _context.Transactions.AnyAsync(t => t.CategoryId == id, cancellationToken);
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
        var query = _context.Categories.Where(c => c.IsSystem && c.CategoryName == name);
        if (excludeId.HasValue)
        {
            query = query.Where(c => c.CategoryId != excludeId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    public Task DeleteAsync(Category category, CancellationToken cancellationToken = default)
    {
        _context.Categories.Remove(category);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
