using Microsoft.EntityFrameworkCore;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Repositories;

public class CategoryRuleRepository : ICategoryRuleRepository
{
    private readonly PocketWiseDbContext _context;

    public CategoryRuleRepository(PocketWiseDbContext context)
    {
        _context = context;
    }

    public async Task<CategoryRule?> GetByIdAsync(long id, long? userId, CancellationToken cancellationToken = default)
    {
        return await _context.CategoryRules
            .Include(r => r.Category)
            .FirstOrDefaultAsync(r =>
                r.CategoryRuleId == id && (r.UserId == userId || r.UserId == null),
                cancellationToken);
    }

    public async Task<IReadOnlyList<CategoryRule>> GetAllAsync(long? userId, CancellationToken cancellationToken = default)
    {
        return await _context.CategoryRules
            .AsNoTracking()
            .Include(r => r.Category)
            .Where(r => r.UserId == userId || r.UserId == null)
            .OrderBy(r => r.Priority)
            .ThenBy(r => r.RuleName)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<CategoryRule>> GetMatchingRulesAsync(long? userId, string text, CancellationToken cancellationToken = default)
    {
        var normalized = (text ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(normalized))
        {
            return [];
        }

        var rules = await _context.CategoryRules
            .AsNoTracking()
            .Include(r => r.Category)
            .Where(r => (r.UserId == userId || r.UserId == null) && r.IsActive)
            .ToListAsync(cancellationToken);

        return rules
            .Where(r =>
                r.MatchType != CategoryMatchType.BankReference &&
                normalized.Contains(r.MatchPattern.Trim().ToLowerInvariant()))
            .ToList();
    }

    public Task<bool> CategoryExistsAsync(long? userId, long categoryId, CancellationToken cancellationToken = default)
    {
        return _context.Categories.AnyAsync(
            c => c.CategoryId == categoryId && (c.UserId == userId || c.UserId == null || c.IsSystem),
            cancellationToken);
    }

    public Task AddAsync(CategoryRule rule, CancellationToken cancellationToken = default)
    {
        _context.CategoryRules.Add(rule);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(CategoryRule rule, CancellationToken cancellationToken = default)
    {
        _context.CategoryRules.Update(rule);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(CategoryRule rule, CancellationToken cancellationToken = default)
    {
        _context.CategoryRules.Remove(rule);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
